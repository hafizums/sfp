import { ArrowDown, ArrowUp, Copy, Plus, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { buildWanPackage, plannedRuntime, progressFromShots, remainingRuntime } from "../planner";
import { shotStatuses, type Shot, type ShotInput } from "../types";
import { AIShotPromptPanel } from "./AIShotPromptPanel";

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
  targetRuntime: number;
  onCreate: (shot: ShotInput) => Promise<void>;
  onUpdate: (id: number, shot: Partial<ShotInput>) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onReorder: (shotIds: number[]) => Promise<void>;
  onPromptsApplied: () => Promise<void>;
};

export function ShotList({
  projectId,
  shots,
  targetRuntime,
  onCreate,
  onUpdate,
  onDelete,
  onReorder,
  onPromptsApplied,
}: Props) {
  const [selectedId, setSelectedId] = useState<number | null>(shots[0]?.id ?? null);
  const selected = shots.find((shot) => shot.id === selectedId) ?? shots[0];
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
            onCopy={copyText}
            onDelete={onDelete}
            onUpdate={onUpdate}
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
  onCopy,
  onUpdate,
  onDelete,
}: {
  shot: Shot;
  onCopy: (text: string) => Promise<void>;
  onUpdate: (id: number, shot: Partial<ShotInput>) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}) {
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

  return (
    <form
      className="shot-detail"
      onSubmit={(event) => {
        event.preventDefault();
        void onUpdate(shot.id, draft);
      }}
    >
      <div className="detail-heading">
        <h3>Shot {shot.shot_number}</h3>
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

      <PromptField label="Image prompt" value={draft.image_prompt} onChange={(value) => field("image_prompt", value)} onCopy={() => onCopy(draft.image_prompt)} />
      <PromptField label="Start frame prompt" value={draft.start_frame_prompt} onChange={(value) => field("start_frame_prompt", value)} onCopy={() => onCopy(draft.start_frame_prompt)} />
      <PromptField label="End frame prompt" value={draft.end_frame_prompt} onChange={(value) => field("end_frame_prompt", value)} onCopy={() => onCopy(draft.end_frame_prompt)} />
      <PromptField label="Video prompt" value={draft.video_prompt} onChange={(value) => field("video_prompt", value)} onCopy={() => onCopy(draft.video_prompt)} />
      <PromptField label="Negative prompt" value={draft.negative_prompt} onChange={(value) => field("negative_prompt", value)} onCopy={() => onCopy(draft.negative_prompt)} />

      <button type="button" className="ghost icon-text" onClick={() => onCopy(buildWanPackage({ ...shot, ...draft }))}>
        <Copy size={16} /> Copy Wan 2.2 package
      </button>
      <label>Notes<textarea value={draft.notes} onChange={(event) => field("notes", event.target.value)} /></label>
    </form>
  );
}

function PromptField({ label, value, onChange, onCopy }: { label: string; value: string; onChange: (value: string) => void; onCopy: () => Promise<void> }) {
  return (
    <label className="prompt-field">
      <span>{label}</span>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} />
      <button type="button" className="ghost copy-button" onClick={onCopy}><Copy size={16} /> Copy</button>
    </label>
  );
}
