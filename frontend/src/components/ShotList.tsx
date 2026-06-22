import { ArrowDown, ArrowUp, Copy, Plus, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { api } from "../api/client";
import { buildWanPackage, plannedRuntime, progressFromShots, remainingRuntime } from "../planner";
import {
  shotStatuses,
  shotTakeStatuses,
  type Asset,
  type Shot,
  type ShotInput,
  type ShotQualityReview,
  type ShotQualityReviewInput,
  type ShotTake,
  type ShotTakeCreateInput,
  type ShotTakeInput,
} from "../types";
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
  onTakeChanged: () => Promise<void>;
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
  onTakeChanged,
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
            onTakeChanged={onTakeChanged}
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
  onTakeChanged,
}: {
  shot: Shot;
  assets: Asset[];
  onCopy: (text: string) => Promise<void>;
  onUpdate: (id: number, shot: Partial<ShotInput>) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onQualityReviewSaved: () => Promise<void>;
  onTakeChanged: () => Promise<void>;
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

      <ShotTakesSection shot={shot} assets={assets} onChanged={onTakeChanged} />

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

const emptyTakeDraft: ShotTakeCreateInput = {
  status: "Draft",
  source_type: "manual_upload",
  start_frame_asset_id: null,
  end_frame_asset_id: null,
  video_asset_id: null,
  audio_asset_id: null,
  subtitle_asset_id: null,
  review_notes: "",
  visual_quality_score: 0,
  motion_quality_score: 0,
  character_consistency_score: 0,
  location_continuity_score: 0,
  safety_score: 0,
};

function ShotTakesSection({ shot, assets, onChanged }: { shot: Shot; assets: Asset[]; onChanged: () => Promise<void> }) {
  const [takes, setTakes] = useState<ShotTake[]>([]);
  const [draft, setDraft] = useState<ShotTakeCreateInput>(emptyTakeDraft);
  const [copiedTakeId, setCopiedTakeId] = useState<number | null>(null);

  async function refreshTakes() {
    setTakes(await api.listShotTakes(shot.id));
  }

  useEffect(() => {
    void refreshTakes();
    setDraft(emptyTakeDraft);
  }, [shot.id]);

  async function createTake() {
    await api.createShotTake(shot.id, draft);
    setDraft(emptyTakeDraft);
    await refreshTakes();
    await onChanged();
  }

  async function copySnapshot(take: ShotTake) {
    await navigator.clipboard.writeText(take.prompt_snapshot);
    setCopiedTakeId(take.id);
    window.setTimeout(() => setCopiedTakeId((current) => current === take.id ? null : current), 1500);
  }

  async function refreshAfter(action: Promise<unknown>) {
    await action;
    await refreshTakes();
    await onChanged();
  }

  const approvedTake = takes.find((take) => take.approved_for_final);

  return (
    <section className="shot-takes" aria-label="Shot takes">
      <div className="section-heading compact">
        <div>
          <p className="eyebrow">Takes</p>
          <h3>{approvedTake ? `Approved take: ${approvedTake.take_label}` : "Shot takes and approvals"}</h3>
        </div>
        {approvedTake ? <span className="success-pill">Final take</span> : null}
      </div>

      <div className="take-form">
        <div className="form-grid">
          <label>Status<select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as ShotTakeInput["status"] })}>{shotTakeStatuses.map((status) => <option key={status}>{status}</option>)}</select></label>
          <AssetSelect label="Start frame" value={draft.start_frame_asset_id ?? null} assets={assets} onChange={(value) => setDraft({ ...draft, start_frame_asset_id: value })} />
          <AssetSelect label="End frame" value={draft.end_frame_asset_id ?? null} assets={assets} onChange={(value) => setDraft({ ...draft, end_frame_asset_id: value })} />
          <AssetSelect label="Generated video" value={draft.video_asset_id ?? null} assets={assets} onChange={(value) => setDraft({ ...draft, video_asset_id: value })} />
          <AssetSelect label="Audio" value={draft.audio_asset_id ?? null} assets={assets} onChange={(value) => setDraft({ ...draft, audio_asset_id: value })} />
          <AssetSelect label="Subtitle" value={draft.subtitle_asset_id ?? null} assets={assets} onChange={(value) => setDraft({ ...draft, subtitle_asset_id: value })} />
        </div>
        <label>Review notes<textarea value={draft.review_notes ?? ""} onChange={(event) => setDraft({ ...draft, review_notes: event.target.value })} /></label>
        <button type="button" className="primary" onClick={() => void createTake()}><Plus size={16} /> Create take</button>
      </div>

      {!takes.length ? (
        <div className="empty-state">No takes yet. Create Take A after uploading generated assets or before future provider jobs.</div>
      ) : (
        <div className="take-list">
          {takes.map((take) => (
            <TakeCard
              key={take.id}
              take={take}
              assets={assets}
              copied={copiedTakeId === take.id}
              onCopy={() => copySnapshot(take)}
              onRefresh={refreshAfter}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function TakeCard({
  take,
  assets,
  copied,
  onCopy,
  onRefresh,
}: {
  take: ShotTake;
  assets: Asset[];
  copied: boolean;
  onCopy: () => Promise<void>;
  onRefresh: (action: Promise<unknown>) => Promise<void>;
}) {
  const [draft, setDraft] = useState<ShotTakeInput>(takeToInput(take));

  useEffect(() => {
    setDraft(takeToInput(take));
  }, [take]);

  async function save() {
    await onRefresh(api.updateShotTake(take.id, draft));
  }

  async function deleteTake() {
    if (window.confirm(`Delete ${take.take_label}? Linked assets will stay in the project.`)) {
      await onRefresh(api.deleteShotTake(take.id));
    }
  }

  return (
    <article className={take.approved_for_final ? "take-card approved" : "take-card"}>
      <div className="asset-card-heading">
        <div>
          <strong>{take.take_label}</strong>
          <span>{take.status}{take.approved_for_final ? " | Approved final take" : ""}</span>
        </div>
        <div className="row-actions">
          <button type="button" className="ghost" onClick={() => void onRefresh(api.approveShotTake(take.id))}>Approve</button>
          <button type="button" className="ghost" onClick={() => void onRefresh(api.rejectShotTake(take.id, draft.rejected_reason))}>Reject</button>
          <button type="button" className="danger" onClick={() => void deleteTake()}>Delete</button>
        </div>
      </div>

      <div className="asset-meta">
        <span>Start: {assetLabelById(assets, take.start_frame_asset_id)}</span>
        <span>End: {assetLabelById(assets, take.end_frame_asset_id)}</span>
        <span>Video: {assetLabelById(assets, take.video_asset_id)}</span>
        <span>Audio: {assetLabelById(assets, take.audio_asset_id)}</span>
        <span>Subtitle: {assetLabelById(assets, take.subtitle_asset_id)}</span>
      </div>

      <div className="form-grid">
        <label>Status<select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as ShotTakeInput["status"] })}>{shotTakeStatuses.map((status) => <option key={status}>{status}</option>)}</select></label>
        <AssetSelect label="Start frame" value={draft.start_frame_asset_id} assets={assets} onChange={(value) => setDraft({ ...draft, start_frame_asset_id: value })} />
        <AssetSelect label="End frame" value={draft.end_frame_asset_id} assets={assets} onChange={(value) => setDraft({ ...draft, end_frame_asset_id: value })} />
        <AssetSelect label="Generated video" value={draft.video_asset_id} assets={assets} onChange={(value) => setDraft({ ...draft, video_asset_id: value })} />
        <AssetSelect label="Audio" value={draft.audio_asset_id} assets={assets} onChange={(value) => setDraft({ ...draft, audio_asset_id: value })} />
        <AssetSelect label="Subtitle" value={draft.subtitle_asset_id} assets={assets} onChange={(value) => setDraft({ ...draft, subtitle_asset_id: value })} />
        <ScoreInput label="Visual quality" value={draft.visual_quality_score} onChange={(value) => setDraft({ ...draft, visual_quality_score: value })} />
        <ScoreInput label="Motion quality" value={draft.motion_quality_score} onChange={(value) => setDraft({ ...draft, motion_quality_score: value })} />
        <ScoreInput label="Character consistency" value={draft.character_consistency_score} onChange={(value) => setDraft({ ...draft, character_consistency_score: value })} />
        <ScoreInput label="Location continuity" value={draft.location_continuity_score} onChange={(value) => setDraft({ ...draft, location_continuity_score: value })} />
        <ScoreInput label="Safety" value={draft.safety_score} onChange={(value) => setDraft({ ...draft, safety_score: value })} />
      </div>

      <label>Review notes<textarea value={draft.review_notes} onChange={(event) => setDraft({ ...draft, review_notes: event.target.value })} /></label>
      <label>Rejected reason<textarea value={draft.rejected_reason} onChange={(event) => setDraft({ ...draft, rejected_reason: event.target.value })} /></label>
      <label>Prompt snapshot<textarea value={draft.prompt_snapshot} onChange={(event) => setDraft({ ...draft, prompt_snapshot: event.target.value })} /></label>
      <label>Negative prompt snapshot<textarea value={draft.negative_prompt_snapshot} onChange={(event) => setDraft({ ...draft, negative_prompt_snapshot: event.target.value })} /></label>
      <div className="row-actions">
        <button type="button" className="ghost" onClick={() => void onCopy()}><Copy size={16} /> {copied ? "Copied snapshot" : "Copy prompt snapshot"}</button>
        <button type="button" className="ghost" onClick={() => void save()}><Save size={16} /> Save take</button>
      </div>
    </article>
  );
}

function AssetSelect({
  label,
  value,
  assets,
  onChange,
}: {
  label: string;
  value: number | null;
  assets: Asset[];
  onChange: (value: number | null) => void;
}) {
  return (
    <label>{label}<select value={value ?? ""} onChange={(event) => onChange(event.target.value ? Number(event.target.value) : null)}>
      <option value="">None</option>
      {assets.map((asset) => <option key={asset.id} value={asset.id}>{assetLabel(asset)}</option>)}
    </select></label>
  );
}

function ScoreInput({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <label>{label}<input type="number" min={0} max={5} value={value} onChange={(event) => onChange(Number(event.target.value))} /></label>;
}

function takeToInput(take: ShotTake): ShotTakeInput {
  return {
    take_label: take.take_label,
    status: take.status,
    source_type: take.source_type,
    prompt_snapshot: take.prompt_snapshot,
    negative_prompt_snapshot: take.negative_prompt_snapshot,
    start_frame_asset_id: take.start_frame_asset_id,
    end_frame_asset_id: take.end_frame_asset_id,
    video_asset_id: take.video_asset_id,
    audio_asset_id: take.audio_asset_id,
    subtitle_asset_id: take.subtitle_asset_id,
    provider_job_id: take.provider_job_id,
    review_notes: take.review_notes,
    visual_quality_score: take.visual_quality_score,
    motion_quality_score: take.motion_quality_score,
    character_consistency_score: take.character_consistency_score,
    location_continuity_score: take.location_continuity_score,
    safety_score: take.safety_score,
    approved_for_final: take.approved_for_final,
    rejected_reason: take.rejected_reason,
  };
}

function assetLabelById(assets: Asset[], assetId: number | null): string {
  if (!assetId) {
    return "None";
  }
  const asset = assets.find((item) => item.id === assetId);
  return asset ? assetLabel(asset) : `Asset ${assetId}`;
}

function assetLabel(asset: Asset): string {
  return asset.original_filename || asset.filename_or_path || asset.stored_filename || `Asset ${asset.id}`;
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
