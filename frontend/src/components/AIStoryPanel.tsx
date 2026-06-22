import { Sparkles, Save } from "lucide-react";
import { useEffect, useState } from "react";

import { api } from "../api/client";
import type {
  AudioPlan,
  GeneratedStoryPackage,
  Shot,
  StoryPackageApplyResponse,
  StoryWorkspace,
} from "../types";

type ApplyChoices = {
  apply_workspace: boolean;
  apply_characters: boolean;
  apply_locations: boolean;
  apply_shots: boolean;
  apply_audio: boolean;
};

const defaultChoices: ApplyChoices = {
  apply_workspace: true,
  apply_characters: true,
  apply_locations: true,
  apply_shots: false,
  apply_audio: true,
};

type Operation = "generate" | "apply" | null;

const generateSteps = [
  "Collecting available story context",
  "Sending structured prompt to backend",
  "Waiting for OpenAI response",
  "Validating generated story package",
  "Preparing preview",
];

const applySteps = [
  "Checking overwrite settings",
  "Saving story workspace",
  "Creating selected characters, locations, and shots",
  "Saving audio plan",
  "Refreshing project data",
];

const GENERATE_TIMEOUT_SECONDS = 120;
const APPLY_TIMEOUT_SECONDS = 12;

type Props = {
  projectId: number;
  workspace: StoryWorkspace;
  audio: AudioPlan;
  shots: Shot[];
  onApplied: () => Promise<void>;
};

export function AIStoryPanel({ projectId, workspace, audio, shots, onApplied }: Props) {
  const [operation, setOperation] = useState<Operation>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<GeneratedStoryPackage | null>(null);
  const [choices, setChoices] = useState<ApplyChoices>(defaultChoices);
  const [overwrite, setOverwrite] = useState(false);
  const [applyResult, setApplyResult] = useState<StoryPackageApplyResponse | null>(null);

  const hasExistingContent = hasWorkspaceContent(workspace) || hasAudioContent(audio) || shots.length > 0;
  const loading = operation !== null;

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
      setPreview(await api.previewStoryPackage(projectId));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to generate story package.");
    } finally {
      setOperation(null);
    }
  }

  async function applyPreview() {
    if (!preview) {
      return;
    }
    if (overwrite && hasExistingContent && !window.confirm("Overwrite existing story, audio, or shot content?")) {
      return;
    }
    setOperation("apply");
    setError(null);
    try {
      const result = await api.applyStoryPackage(projectId, {
        package: preview,
        overwrite,
        ...choices,
      });
      setApplyResult(result);
      await onApplied();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to apply story package.");
    } finally {
      setOperation(null);
    }
  }

  return (
    <section className="ai-panel" aria-label="AI story package generator">
      <div className="section-heading compact">
        <div>
          <p className="eyebrow">AI story package</p>
          <h2>Generate Story Package</h2>
        </div>
        <button type="button" className="primary" onClick={generatePreview} disabled={loading}>
          <Sparkles size={16} /> {loading ? "Generating" : "Generate Story Package"}
        </button>
      </div>

      <p className="muted-note">
        You can generate from interview, manual story text, production bible, characters, locations, or existing shots. Uses your backend OpenAI key only. WaveSpeed video generation is not enabled yet.
      </p>
      {hasExistingContent ? <p className="warning-note">Existing story, audio, or shot content found. Keep overwrite off to preserve your manual work.</p> : null}
      {operation ? <ProgressLoader operation={operation} elapsedSeconds={elapsedSeconds} /> : null}
      {error ? <div className="app-error">{error}</div> : null}

      {preview ? (
        <div className="ai-preview">
          <div className="preview-grid">
            <PreviewBlock title="Logline" content={preview.logline} />
            <PreviewBlock title="Synopsis" content={preview.synopsis} />
            <PreviewBlock title="Three-act structure" content={preview.three_act_structure} />
            <PreviewBlock title="Cinematic screenplay" content={preview.cinematic_screenplay} />
            <PreviewBlock title="Simple dialogue" content={preview.simple_dialogue_version} />
            <PreviewBlock title="Voiceover" content={preview.voiceover_draft} />
            <PreviewBlock title="Subtitles" content={preview.subtitle_draft} />
            <PreviewBlock title="Music prompt" content={preview.audio_plan.music_prompt} />
            <PreviewBlock title="Sound effects" content={preview.audio_plan.sound_effects_list} />
            <PreviewBlock title="Safety review" content={preview.safety_review.final_safety_review_notes} />
          </div>

          <div className="suggestion-strip">
            <span>{preview.suggested_characters.length} character suggestions</span>
            <span>{preview.suggested_locations.length} location suggestions</span>
            <span>{preview.shot_storyboard.length} storyboard shots</span>
          </div>

          <div className="apply-controls">
            <Choice label="Story workspace" checked={choices.apply_workspace} onChange={(value) => setChoices({ ...choices, apply_workspace: value })} />
            <Choice label="Characters" checked={choices.apply_characters} onChange={(value) => setChoices({ ...choices, apply_characters: value })} />
            <Choice label="Locations" checked={choices.apply_locations} onChange={(value) => setChoices({ ...choices, apply_locations: value })} />
            <Choice label="Shots" checked={choices.apply_shots} onChange={(value) => setChoices({ ...choices, apply_shots: value })} />
            <Choice label="Audio" checked={choices.apply_audio} onChange={(value) => setChoices({ ...choices, apply_audio: value })} />
            <Choice label="Allow overwrite" checked={overwrite} onChange={setOverwrite} />
          </div>

          <button type="button" className="primary" onClick={applyPreview} disabled={loading}>
            <Save size={16} /> Apply checked sections to project
          </button>
        </div>
      ) : null}

      {applyResult ? (
        <div className="success-note">
          Applied {applyResult.applied.length} fields, created {applyResult.created_characters} characters, {applyResult.created_locations} locations, and {applyResult.created_shots} shots.
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
          ? "The backend sends one structured OpenAI request with the best available project context. Progress is staged while the package returns, which can take up to two minutes."
          : "Applying selected sections locally to the project database."}
      </p>
    </div>
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

function PreviewBlock({ title, content }: { title: string; content: string }) {
  return (
    <article className="preview-block">
      <h3>{title}</h3>
      <p>{content}</p>
    </article>
  );
}

function Choice({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="inline-choice">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

function hasWorkspaceContent(workspace: StoryWorkspace): boolean {
  return [
    workspace.logline,
    workspace.synopsis,
    workspace.three_act_structure,
    workspace.cinematic_screenplay,
    workspace.simple_dialogue_version,
    workspace.voiceover_draft,
    workspace.subtitle_draft,
  ].some((value) => Boolean(value?.trim()));
}

function hasAudioContent(audio: AudioPlan): boolean {
  return [
    audio.music_prompt,
    audio.sound_effects_list,
    audio.voiceover_script,
    audio.subtitle_script,
    audio.audio_notes,
  ].some((value) => Boolean(value?.trim()));
}
