import { Save, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { api } from "../api/client";
import type { GeneratedShotPromptPackage, Shot, ShotPromptApplyResponse } from "../types";

type PromptMode = "selected" | "all";
type Operation = "generate" | "apply" | null;

const promptFields = [
  "image_prompt",
  "start_frame_prompt",
  "end_frame_prompt",
  "video_prompt",
  "negative_prompt",
] as const;

const generateSteps = [
  "Collecting shot context",
  "Preparing Wan 2.2 prompt instructions",
  "Waiting for OpenAI response",
  "Validating prompt packages",
  "Preparing preview",
];

const applySteps = [
  "Checking overwrite settings",
  "Saving prompt fields",
  "Updating shot status",
  "Refreshing shot list",
];

const GENERATE_TIMEOUT_SECONDS = 120;
const APPLY_TIMEOUT_SECONDS = 10;

type Props = {
  projectId: number;
  shots: Shot[];
  selectedShotId: number | null;
  onApplied: () => Promise<void>;
};

export function AIShotPromptPanel({ projectId, shots, selectedShotId, onApplied }: Props) {
  const [mode, setMode] = useState<PromptMode>("selected");
  const [overwrite, setOverwrite] = useState(false);
  const [operation, setOperation] = useState<Operation>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<GeneratedShotPromptPackage[]>([]);
  const [applyResult, setApplyResult] = useState<ShotPromptApplyResponse | null>(null);

  const loading = operation !== null;
  const selectedAvailable = Boolean(selectedShotId);
  const targetShots = useMemo(() => {
    if (mode === "selected" && selectedShotId) {
      return shots.filter((shot) => shot.id === selectedShotId);
    }
    return shots;
  }, [mode, selectedShotId, shots]);
  const hasExistingPrompts = targetShots.some(hasPromptContent);

  useEffect(() => {
    if (!selectedAvailable && mode === "selected") {
      setMode("all");
    }
  }, [mode, selectedAvailable]);

  useEffect(() => {
    if (!operation) {
      setElapsedSeconds(0);
      return;
    }
    const startedAt = Date.now();
    const intervalId = window.setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 500);
    return () => window.clearInterval(intervalId);
  }, [operation]);

  async function generatePreview() {
    setOperation("generate");
    setError(null);
    setApplyResult(null);
    try {
      const shot_ids = mode === "selected" && selectedShotId ? [selectedShotId] : undefined;
      setPreview(await api.previewShotPrompts(projectId, { shot_ids, overwrite }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to generate Wan 2.2 prompts.");
    } finally {
      setOperation(null);
    }
  }

  async function applyPreview() {
    if (!preview.length) {
      return;
    }
    if (overwrite && hasExistingPrompts && !window.confirm("Overwrite existing prompt fields for selected shots?")) {
      return;
    }
    setOperation("apply");
    setError(null);
    try {
      const result = await api.applyShotPrompts(projectId, { packages: preview, overwrite });
      setApplyResult(result);
      await onApplied();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to apply Wan 2.2 prompts.");
    } finally {
      setOperation(null);
    }
  }

  return (
    <section className="ai-panel" aria-label="AI Wan 2.2 prompt generator">
      <div className="section-heading compact">
        <div>
          <p className="eyebrow">AI shot prompts</p>
          <h2>Generate Wan 2.2 Prompts</h2>
        </div>
        <button type="button" className="primary" onClick={generatePreview} disabled={loading || shots.length === 0}>
          <Sparkles size={16} /> {operation === "generate" ? "Generating" : "Generate Wan 2.2 Prompts"}
        </button>
      </div>

      <p className="muted-note">Uses your backend OpenAI key only. This prepares copy-ready prompts from existing shots and project context; the guided interview is not required. WaveSpeed video generation is not enabled yet.</p>
      {shots.length === 0 ? <p className="warning-note">Add storyboard shots before generating Wan 2.2 prompts.</p> : null}
      {hasExistingPrompts ? <p className="warning-note">Selected shots already contain prompt fields. Keep overwrite off to preserve manual prompt edits.</p> : null}

      <div className="apply-controls">
        <Choice
          label="Selected shot only"
          checked={mode === "selected"}
          disabled={!selectedAvailable}
          onChange={() => setMode("selected")}
        />
        <Choice label="All shots" checked={mode === "all"} onChange={() => setMode("all")} />
        <Choice label="Allow overwrite" checked={overwrite} onChange={() => setOverwrite(!overwrite)} />
      </div>

      {operation ? <ProgressLoader operation={operation} elapsedSeconds={elapsedSeconds} /> : null}
      {error ? <div className="app-error">{error}</div> : null}

      {preview.length ? (
        <div className="ai-preview">
          <div className="suggestion-strip">
            <span>{preview.length} prompt packages ready</span>
            <span>{mode === "selected" ? "Selected shot" : "All shots"}</span>
          </div>

          <div className="preview-grid shot-prompt-preview">
            {preview.map((packageItem) => (
              <article className="preview-block" key={packageItem.shot_id}>
                <h3>Shot {packageItem.shot_number}</h3>
                <PromptPreviewField label="Image prompt" content={packageItem.image_prompt} />
                <PromptPreviewField label="Start frame prompt" content={packageItem.start_frame_prompt} />
                <PromptPreviewField label="End frame prompt" content={packageItem.end_frame_prompt} />
                <PromptPreviewField label="Video prompt" content={packageItem.video_prompt} />
                <PromptPreviewField label="Negative prompt" content={packageItem.negative_prompt} />
                {packageItem.notes ? <PromptPreviewField label="Notes" content={packageItem.notes} /> : null}
              </article>
            ))}
          </div>

          <button type="button" className="primary" onClick={applyPreview} disabled={loading}>
            <Save size={16} /> Apply selected prompt packages
          </button>
        </div>
      ) : null}

      {applyResult ? (
        <div className="success-note">
          Updated {applyResult.updated_shots} shots and applied {applyResult.applied.length} prompt fields.
          {applyResult.skipped.length ? ` Skipped: ${applyResult.skipped.join(", ")}.` : ""}
        </div>
      ) : null}
    </section>
  );
}

function ProgressLoader({ operation, elapsedSeconds }: { operation: Exclude<Operation, null>; elapsedSeconds: number }) {
  const steps = operation === "generate" ? generateSteps : applySteps;
  const timeoutSeconds = operation === "generate" ? GENERATE_TIMEOUT_SECONDS : APPLY_TIMEOUT_SECONDS;
  const currentIndex = currentStepIndex(elapsedSeconds, steps.length, timeoutSeconds);
  const progress = Math.min(95, Math.max(8, Math.round((elapsedSeconds / timeoutSeconds) * 88)));

  return (
    <div className="progress-loader" role="status" aria-live="polite">
      <div className="progress-header">
        <strong>{steps[currentIndex]}</strong>
        <span>{elapsedSeconds}s elapsed</span>
      </div>
      <div className="progress-track" aria-label={`${progress}% progress`}>
        <span style={{ width: `${progress}%` }} />
      </div>
      <ol className="progress-steps">
        {steps.map((step, index) => (
          <li key={step} className={index < currentIndex ? "done" : index === currentIndex ? "active" : ""}>
            <span>{index + 1}</span>
            {step}
          </li>
        ))}
      </ol>
      <p className="progress-hint">
        {operation === "generate"
          ? "The backend sends one structured OpenAI prompt request. Progress is staged until the packages return."
          : "Applying selected prompt packages locally to the project database."}
      </p>
    </div>
  );
}

function PromptPreviewField({ label, content }: { label: string; content: string }) {
  return (
    <div className="prompt-preview-field">
      <strong>{label}</strong>
      <p>{content}</p>
    </div>
  );
}

function Choice({
  label,
  checked,
  disabled = false,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
}) {
  return (
    <label className="inline-choice">
      <input type="checkbox" checked={checked} disabled={disabled} onChange={onChange} />
      <span>{label}</span>
    </label>
  );
}

function currentStepIndex(elapsedSeconds: number, stepCount: number, timeoutSeconds: number): number {
  if (elapsedSeconds <= 1) {
    return 0;
  }
  if (elapsedSeconds >= timeoutSeconds - 3) {
    return stepCount - 1;
  }
  return Math.min(stepCount - 2, Math.floor((elapsedSeconds / timeoutSeconds) * (stepCount - 1)) + 1);
}

function hasPromptContent(shot: Shot): boolean {
  return promptFields.some((field) => Boolean(shot[field]?.trim()));
}
