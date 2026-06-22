import { ArrowDown, ArrowUp, Copy, Plus, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { api } from "../api/client";
import { buildWanPackage, plannedRuntime, progressFromShots, remainingRuntime } from "../planner";
import { shotStatuses, type Asset, type Shot, type ShotInput, type ShotQualityReview, type ShotQualityReviewInput } from "../types";
import { AIShotPromptPanel } from "./AIShotPromptPanel";
import { AssetPreviewCard } from "./AssetManager";

const emptyShot: ShotInput = {
  scene_number: 1,
  duration_seconds: 4,
  purpose: "",
  camera_framing: "",
  camera_movement: "",
  characters_present: "",
  location_name: "",
  action: "",
  emotion: "",
  image_prompt: "",
  start_frame_prompt: "",
  end_frame_prompt: "",
  video_prompt: "",
  negative_prompt: "no violence, no blood, no weapons, no horror, no unsafe stunts",
  status: "Draft",
  notes: "",
};

type Props = {
  projectId: number;
  shots: Shot[];
  assets: Asset[];
  targetRuntime: number;
  onCreate: (shot: ShotInput) => Promise<void>;
  onUpdate: (id: number, shot: Partial<ShotInput>) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onReorder: (shotIds: number[]) => Promise<void>;
  onPromptsApplied: () => Promise<void>;
  onQualityReviewSaved: () => Promise<void>;
};

export function ShotList({
  projectId,
  shots,
  assets,
  targetRuntime,
  onCreate,
  onUpdate,
  onDelete,
  onReorder,
  onPromptsApplied,
  onQualityReviewSaved,
}: Props) {
  const [selectedId, setSelectedId] = useState<number | null>(shots[0]?.id ?? null);
  const selected = shots.find((shot) => shot.id === selectedId) ?? shots[0];
  const selectedAssets = selected ? assets.filter((asset) => asset.shot_id === selected.id) : [];
  const [draft, setDraft] = useState<ShotInput>(emptyShot);

  async function copyText(text: string) {
    await navigator.clipboard.writeText(text);
  }

  async function move(shot: Shot, direction: -1 | 1) {
    const index = shots.findIndex((item) => item.id === shot.id);
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= shots.length) {
      return;
    }
    const ids = shots.map((item) => item.id);
    [ids[index], ids[nextIndex]] = [ids[nextIndex], ids[index]];
    await onReorder(ids);
  }

  const total = plannedRuntime(shots);
  const remaining = remainingRuntime(targetRuntime, shots);
  const progress = progressFromShots(shots);

  return (
    <section className="workspace-band" aria-label="Timeline Shot List">
      <div className="section-heading compact">
        <div>
          <p className="eyebrow">Timeline shot list</p>
          <h2>{total}s planned | {remaining}s remaining</h2>
        </div>
        <span className="runtime-pill">{progress}% approved/final</span>
      </div>

      <form
        className="shot-add"
        onSubmit={(event) => {
          event.preventDefault();
          void onCreate(draft).then(() => setDraft(emptyShot));
        }}
      >
        <label>
          Purpose
          <input value={draft.purpose} onChange={(event) => setDraft({ ...draft, purpose: event.target.value })} />
        </label>
        <label>
          Duration
          <input
            type="number"
            min={1}
            value={draft.duration_seconds}
            onChange={(event) => setDraft({ ...draft, duration_seconds: Number(event.target.value) })}
          />
        </label>
        <button className="primary" type="submit"><Plus size={16} /> Add shot</button>
      </form>

      <AIShotPromptPanel
        projectId={projectId}
        shots={shots}
        selectedShotId={selected?.id ?? null}
        onApplied={onPromptsApplied}
      />

      <div className="shot-layout">
        <div className="shot-table" role="list">
          {shots.map((shot) => (
            <div
              role="listitem"
              className={selected?.id === shot.id ? "shot-row selected" : "shot-row"}
              key={shot.id}
            >
              <button type="button" className="shot-main" onClick={() => setSelectedId(shot.id)}>
                <span className="shot-number">{shot.shot_number}</span>
                <span>
                  <strong>{shot.purpose || "Untitled shot"}</strong>
                  <small>{shot.duration_seconds}s | {shot.status}</small>
                </span>
              </button>
              <span className="shot-actions">
                <button type="button" title="Move up" onClick={() => void move(shot, -1)}><ArrowUp size={14} /></button>
                <button type="button" title="Move down" onClick={() => void move(shot, 1)}><ArrowDown size={14} /></button>
              </span>
            </div>
          ))}
        </div>

        {selected ? (
          <ShotDetail
            shot={selected}
            assets={selectedAssets}
            onCopy={copyText}
            onDelete={onDelete}
            onUpdate={onUpdate}
            onQualityReviewSaved={onQualityReviewSaved}
          />
        ) : (
          <div className="empty-state">Add the first shot to begin the 30-45 shot plan.</div>
        )}
      </div>
    </section>
  );
}

function ShotDetail({
  shot,
  assets,
  onCopy,
  onUpdate,
  onDelete,
  onQualityReviewSaved,
}: {
  shot: Shot;
  assets: Asset[];
  onCopy: (text: string) => Promise<void>;
  onUpdate: (id: number, shot: Partial<ShotInput>) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onQualityReviewSaved: () => Promise<void>;
}) {
  const [copiedLabel, setCopiedLabel] = useState<string | null>(null);
  const [draft, setDraft] = useState<ShotInput>({
    scene_number: shot.scene_number,
    duration_seconds: shot.duration_seconds,
    purpose: shot.purpose,
    camera_framing: shot.camera_framing,
    camera_movement: shot.camera_movement,
    characters_present: shot.characters_present,
    location_name: shot.location_name,
    action: shot.action,
    emotion: shot.emotion,
    image_prompt: shot.image_prompt,
    start_frame_prompt: shot.start_frame_prompt,
    end_frame_prompt: shot.end_frame_prompt,
    video_prompt: shot.video_prompt,
    negative_prompt: shot.negative_prompt,
    status: shot.status,
    notes: shot.notes,
  });

  useEffect(() => {
    setDraft({
      scene_number: shot.scene_number,
      duration_seconds: shot.duration_seconds,
      purpose: shot.purpose,
      camera_framing: shot.camera_framing,
      camera_movement: shot.camera_movement,
      characters_present: shot.characters_present,
      location_name: shot.location_name,
      action: shot.action,
      emotion: shot.emotion,
      image_prompt: shot.image_prompt,
      start_frame_prompt: shot.start_frame_prompt,
      end_frame_prompt: shot.end_frame_prompt,
      video_prompt: shot.video_prompt,
      negative_prompt: shot.negative_prompt,
      status: shot.status,
      notes: shot.notes,
    });
  }, [shot]);

  const field = <K extends keyof ShotInput>(key: K, value: ShotInput[K]) => setDraft({ ...draft, [key]: value });

  async function copyWithFeedback(label: string, text: string) {
    await onCopy(text);
    setCopiedLabel(label);
    window.setTimeout(() => setCopiedLabel((current) => current === label ? null : current), 1800);
  }

  return (
    <form
      className="shot-detail"
      onSubmit={(event) => {
        event.preventDefault();
        void onUpdate(shot.id, draft);
      }}
    >
      <div className="detail-heading">
        <div>
          <p className="eyebrow">Selected shot</p>
          <h3>Shot {shot.shot_number}: {shot.purpose || "Untitled shot"}</h3>
        </div>
        <div className="row-actions">
          <button type="submit" className="primary"><Save size={16} /> Save</button>
          <button
            type="button"
            className="danger"
            onClick={() => {
              if (window.confirm(`Delete shot ${shot.shot_number}?`)) {
                void onDelete(shot.id);
              }
            }}
          >
            <Trash2 size={16} /> Delete
          </button>
        </div>
      </div>

      <div className="form-grid">
        <label>Scene<input type="number" min={1} value={draft.scene_number} onChange={(event) => field("scene_number", Number(event.target.value))} /></label>
        <label>Duration<input type="number" min={1} value={draft.duration_seconds} onChange={(event) => field("duration_seconds", Number(event.target.value))} /></label>
        <label>Status<select value={draft.status} onChange={(event) => field("status", event.target.value as ShotInput["status"])}>{shotStatuses.map((status) => <option key={status}>{status}</option>)}</select></label>
        <label>Location<input value={draft.location_name} onChange={(event) => field("location_name", event.target.value)} /></label>
      </div>
      <label>Purpose<input value={draft.purpose} onChange={(event) => field("purpose", event.target.value)} /></label>
      <div className="form-grid">
        <label>Camera framing<input value={draft.camera_framing} onChange={(event) => field("camera_framing", event.target.value)} /></label>
        <label>Camera movement<input value={draft.camera_movement} onChange={(event) => field("camera_movement", event.target.value)} /></label>
      </div>
      <label>Characters present<textarea value={draft.characters_present} onChange={(event) => field("characters_present", event.target.value)} /></label>
      <label>Action<textarea value={draft.action} onChange={(event) => field("action", event.target.value)} /></label>
      <label>Emotion<textarea value={draft.emotion} onChange={(event) => field("emotion", event.target.value)} /></label>

      <ShotAssets assets={assets} shot={shot} />

      <ShotQualityGate shot={shot} onSaved={onQualityReviewSaved} />

      <section className="prompt-group" aria-label="Wan 2.2 prompt fields">
        <div className="section-heading compact">
          <div>
            <p className="eyebrow">Wan 2.2 prompts</p>
            <h3>Copy-ready prompt fields</h3>
          </div>
          {copiedLabel ? <span className="success-pill" role="status">{copiedLabel} copied</span> : null}
        </div>
        <PromptField label="Image prompt" value={draft.image_prompt} onChange={(value) => field("image_prompt", value)} onCopy={() => copyWithFeedback("Image prompt", draft.image_prompt)} copied={copiedLabel === "Image prompt"} />
        <PromptField label="Start frame prompt" value={draft.start_frame_prompt} onChange={(value) => field("start_frame_prompt", value)} onCopy={() => copyWithFeedback("Start frame prompt", draft.start_frame_prompt)} copied={copiedLabel === "Start frame prompt"} />
        <PromptField label="End frame prompt" value={draft.end_frame_prompt} onChange={(value) => field("end_frame_prompt", value)} onCopy={() => copyWithFeedback("End frame prompt", draft.end_frame_prompt)} copied={copiedLabel === "End frame prompt"} />
        <PromptField label="Video prompt" value={draft.video_prompt} onChange={(value) => field("video_prompt", value)} onCopy={() => copyWithFeedback("Video prompt", draft.video_prompt)} copied={copiedLabel === "Video prompt"} />
        <PromptField label="Negative prompt" value={draft.negative_prompt} onChange={(value) => field("negative_prompt", value)} onCopy={() => copyWithFeedback("Negative prompt", draft.negative_prompt)} copied={copiedLabel === "Negative prompt"} />
        <button type="button" className="primary icon-text" onClick={() => copyWithFeedback("Wan package", buildWanPackage({ ...shot, ...draft }))}>
          <Copy size={16} /> {copiedLabel === "Wan package" ? "Copied Wan package" : "Copy Wan 2.2 package"}
        </button>
      </section>
      <label>Notes<textarea value={draft.notes} onChange={(event) => field("notes", event.target.value)} /></label>
    </form>
  );
}

const qualityFields: Array<{ key: keyof ShotQualityReviewInput; label: string }> = [
  { key: "character_consistency_score", label: "Character consistency" },
  { key: "location_continuity_score", label: "Location continuity" },
  { key: "visual_style_score", label: "Visual style" },
  { key: "motion_quality_score", label: "Motion/camera quality" },
  { key: "safety_score", label: "Safety" },
  { key: "prompt_readiness_score", label: "Prompt readiness" },
  { key: "asset_readiness_score", label: "Asset readiness" },
];

function ShotQualityGate({ shot, onSaved }: { shot: Shot; onSaved: () => Promise<void> }) {
  const [review, setReview] = useState<ShotQualityReview | null>(null);
  const [draft, setDraft] = useState<ShotQualityReviewInput | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;
    void api.getShotQualityReview(shot.id).then((next) => {
      if (!active) {
        return;
      }
      setReview(next);
      setDraft(toQualityInput(next));
      setSaved(false);
    });
    return () => {
      active = false;
    };
  }, [shot.id]);

  async function save() {
    if (!draft) {
      return;
    }
    const next = await api.saveShotQualityReview(shot.id, draft);
    setReview(next);
    setDraft(toQualityInput(next));
    setSaved(true);
    await onSaved();
    window.setTimeout(() => setSaved(false), 1500);
  }

  if (!review || !draft) {
    return <section className="quality-gate" aria-label="Production Quality Gate">Loading quality gate.</section>;
  }

  return (
    <section className="quality-gate" aria-label="Production Quality Gate">
      <div className="section-heading compact">
        <div>
          <p className="eyebrow">Production Quality Gate</p>
          <h3>Shot review checklist</h3>
        </div>
        {saved ? <span className="success-pill" role="status">Quality gate saved</span> : null}
      </div>
      <div className="form-grid">
        {qualityFields.map((field) => (
          <label key={field.key}>
            {field.label}
            <input
              type="number"
              min={0}
              max={5}
              value={Number(draft[field.key] ?? 0)}
              onChange={(event) => setDraft({ ...draft, [field.key]: Number(event.target.value) })}
            />
          </label>
        ))}
      </div>
      <label>
        Review notes
        <textarea value={draft.review_notes} onChange={(event) => setDraft({ ...draft, review_notes: event.target.value })} />
      </label>
      <label className="check-item">
        <input
          type="checkbox"
          checked={draft.approved_for_final}
          onChange={(event) => setDraft({ ...draft, approved_for_final: event.target.checked })}
        />
        <span>Final approval readiness</span>
      </label>
      <button type="button" className="ghost" onClick={() => void save()}><Save size={16} /> Save quality gate</button>
    </section>
  );
}

function toQualityInput(review: ShotQualityReview): ShotQualityReviewInput {
  return {
    character_consistency_score: review.character_consistency_score,
    location_continuity_score: review.location_continuity_score,
    visual_style_score: review.visual_style_score,
    motion_quality_score: review.motion_quality_score,
    safety_score: review.safety_score,
    prompt_readiness_score: review.prompt_readiness_score,
    asset_readiness_score: review.asset_readiness_score,
    review_notes: review.review_notes,
    approved_for_final: review.approved_for_final,
  };
}

function ShotAssets({ assets, shot }: { assets: Asset[]; shot: Shot }) {
  const productionAssets = assets.filter((asset) =>
    ["start_frame", "end_frame", "generated_video", "audio", "subtitle"].includes(asset.asset_type),
  );
  if (!productionAssets.length) {
    return null;
  }
  return (
    <section className="shot-assets" aria-label={`Shot ${shot.shot_number} attached assets`}>
      <div>
        <p className="eyebrow">Attached assets</p>
        <h3>Shot {shot.shot_number} previews</h3>
      </div>
      <div className="asset-grid compact">
        {productionAssets.map((asset) => <AssetPreviewCard key={asset.id} asset={asset} shot={shot} />)}
      </div>
    </section>
  );
}

function PromptField({
  label,
  value,
  onChange,
  onCopy,
  copied,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onCopy: () => Promise<void>;
  copied: boolean;
}) {
  return (
    <label className="prompt-field">
      <span>{label}</span>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} />
      <button type="button" className="ghost copy-button" onClick={onCopy} disabled={!value.trim()}>
        <Copy size={16} /> {copied ? "Copied" : "Copy"}
      </button>
    </label>
  );
}
