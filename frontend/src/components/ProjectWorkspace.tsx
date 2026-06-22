import { Check, Plus, Save, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { api } from "../api/client";
import { AIStoryPanel } from "./AIStoryPanel";
import { ShotList } from "./ShotList";
import { assetTypes, type Asset, type AssetInput, type AudioPlan, type Character, type CharacterInput, type ChecklistItem, type Location, type LocationInput, type Project, type ProjectInput, type Shot, type ShotInput, type StoryInterview, type StoryWorkspace } from "../types";

const interviewLabels: Record<keyof StoryInterview, string> = {
  id: "id",
  project_id: "project_id",
  title_answer: "What is the title?",
  magical_discovery: "What is the magical discovery?",
  main_kid_characters: "Who are the main kid characters?",
  adventure_beginning: "Where does the adventure begin?",
  main_adventure_location: "What is the main adventure location?",
  small_problem: "What small problem happens?",
  teamwork_solution: "How do the kids solve it together?",
  ending_feel: "What should the ending feel like?",
  visual_style: "What visual style should the film use?",
  avoid: "What should the film avoid?",
};

const workspaceLabels: Record<keyof StoryWorkspace, string> = {
  id: "id",
  project_id: "project_id",
  logline: "Logline",
  synopsis: "Synopsis",
  three_act_structure: "Three-act structure",
  cinematic_screenplay: "Cinematic screenplay",
  simple_dialogue_version: "Simple dialogue version",
  voiceover_draft: "Voiceover draft",
  subtitle_draft: "Subtitle draft",
};

const emptyInterview: StoryInterview = {
  title_answer: "",
  magical_discovery: "",
  main_kid_characters: "",
  adventure_beginning: "",
  main_adventure_location: "",
  small_problem: "",
  teamwork_solution: "",
  ending_feel: "",
  visual_style: "",
  avoid: "",
};

const emptyWorkspace: StoryWorkspace = {
  logline: "",
  synopsis: "",
  three_act_structure: "",
  cinematic_screenplay: "",
  simple_dialogue_version: "",
  voiceover_draft: "",
  subtitle_draft: "",
};

const emptyCharacter: CharacterInput = {
  name: "",
  role: "",
  age: "",
  appearance: "",
  outfit: "",
  personality: "",
  voice_style: "",
  continuity_prompt: "",
  negative_prompt: "",
  notes: "",
};

const emptyLocation: LocationInput = {
  name: "",
  description: "",
  mood: "",
  lighting: "",
  color_palette: "",
  continuity_prompt: "",
  negative_prompt: "",
  safety_notes: "",
  notes: "",
};

const emptyAsset: AssetInput = {
  shot_id: null,
  asset_type: "other",
  filename_or_path: "",
  notes: "",
};

const emptyAudio: AudioPlan = {
  music_prompt: "",
  sound_effects_list: "",
  voiceover_script: "",
  subtitle_script: "",
  audio_notes: "",
};

const tabs = ["Setup", "Interview", "Story", "Characters", "Locations", "Shots", "Assets", "Audio", "Checklist"] as const;
type Tab = (typeof tabs)[number];

type Props = {
  project: Project;
  onRefreshProject: () => Promise<void>;
};

export function ProjectWorkspace({ project, onRefreshProject }: Props) {
  const [tab, setTab] = useState<Tab>("Setup");
  const [loading, setLoading] = useState(false);
  const [interview, setInterview] = useState<StoryInterview>(emptyInterview);
  const [workspace, setWorkspace] = useState<StoryWorkspace>(emptyWorkspace);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [shots, setShots] = useState<Shot[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [audio, setAudio] = useState<AudioPlan>(emptyAudio);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [setupDraft, setSetupDraft] = useState<ProjectInput>(project);
  const [safetyText, setSafetyText] = useState(project.safety_rules.join("\n"));

  async function loadProjectData() {
    setLoading(true);
    const [nextInterview, nextWorkspace, nextCharacters, nextLocations, nextShots, nextAssets, nextAudio, nextChecklist] =
      await Promise.all([
        api.getStoryInterview(project.id),
        api.getWorkspace(project.id),
        api.listCharacters(project.id),
        api.listLocations(project.id),
        api.listShots(project.id),
        api.listAssets(project.id),
        api.getAudioPlan(project.id),
        api.getChecklist(project.id),
      ]);
    setInterview(nextInterview);
    setWorkspace(nextWorkspace);
    setCharacters(nextCharacters);
    setLocations(nextLocations);
    setShots(nextShots);
    setAssets(nextAssets);
    setAudio(nextAudio);
    setChecklist(nextChecklist);
    setLoading(false);
  }

  useEffect(() => {
    setSetupDraft({
      title: project.title,
      genre: project.genre,
      target_runtime_seconds: project.target_runtime_seconds,
      audience_age: project.audience_age,
      tone: project.tone,
      aspect_ratio: project.aspect_ratio,
      visual_style: project.visual_style,
      safety_rules: project.safety_rules,
    });
    setSafetyText(project.safety_rules.join("\n"));
    void loadProjectData();
  }, [project.id]);

  async function refreshShotsAndProject() {
    setShots(await api.listShots(project.id));
    await onRefreshProject();
  }

  async function refreshAllProjectData() {
    await loadProjectData();
    await onRefreshProject();
  }

  return (
    <section className="project-workspace">
      <div className="workspace-title">
        <div>
          <p className="eyebrow">Active project</p>
          <h2>{project.title}</h2>
        </div>
        {loading ? <span className="runtime-pill">Loading</span> : <span className="runtime-pill">{project.current_planned_runtime}s planned</span>}
      </div>

      <nav className="tabs" aria-label="Project sections">
        {tabs.map((item) => (
          <button key={item} className={item === tab ? "active" : ""} onClick={() => setTab(item)}>{item}</button>
        ))}
      </nav>

      {tab === "Setup" && (
        <form
          className="workspace-band"
          onSubmit={(event) => {
            event.preventDefault();
            void api.updateProject(project.id, {
              ...setupDraft,
              safety_rules: safetyText.split("\n").map((item) => item.trim()).filter(Boolean),
            }).then(onRefreshProject);
          }}
        >
          <SectionHead label="Project setup" action="Save setup" />
          <div className="form-grid">
            <TextInput label="Title" value={setupDraft.title} onChange={(value) => setSetupDraft({ ...setupDraft, title: value })} />
            <TextInput label="Genre" value={setupDraft.genre} onChange={(value) => setSetupDraft({ ...setupDraft, genre: value })} />
            <label>Target runtime<input type="number" value={setupDraft.target_runtime_seconds} onChange={(event) => setSetupDraft({ ...setupDraft, target_runtime_seconds: Number(event.target.value) })} /></label>
            <TextInput label="Audience age" value={setupDraft.audience_age} onChange={(value) => setSetupDraft({ ...setupDraft, audience_age: value })} />
            <TextInput label="Tone" value={setupDraft.tone} onChange={(value) => setSetupDraft({ ...setupDraft, tone: value })} />
            <TextInput label="Aspect ratio" value={setupDraft.aspect_ratio} onChange={(value) => setSetupDraft({ ...setupDraft, aspect_ratio: value })} />
          </div>
          <TextArea label="Visual style" value={setupDraft.visual_style} onChange={(value) => setSetupDraft({ ...setupDraft, visual_style: value })} />
          <TextArea label="Safety rules" value={safetyText} onChange={setSafetyText} />
        </form>
      )}

      {tab === "Interview" && (
        <TextSection
          title="Story interview"
          values={interview}
          labels={interviewLabels}
          hidden={["id", "project_id"]}
          onChange={setInterview}
          onSave={() => api.saveStoryInterview(project.id, interview)}
        />
      )}

      {tab === "Story" && (
        <TextSection
          title="Story and screenplay workspace"
          values={workspace}
          labels={workspaceLabels}
          hidden={["id", "project_id"]}
          onChange={setWorkspace}
          onSave={() => api.saveWorkspace(project.id, workspace)}
          extra={
            <AIStoryPanel
              projectId={project.id}
              workspace={workspace}
              audio={audio}
              shots={shots}
              onApplied={refreshAllProjectData}
            />
          }
        />
      )}

      {tab === "Characters" && (
        <CharacterSection
          characters={characters}
          onCreate={async (payload) => setCharacters([...characters, await api.createCharacter(project.id, payload)])}
          onUpdate={async (id, payload) => {
            const updated = await api.updateCharacter(id, payload);
            setCharacters(characters.map((item) => item.id === id ? updated : item));
          }}
          onDelete={async (id) => { await api.deleteCharacter(id); setCharacters(characters.filter((item) => item.id !== id)); }}
        />
      )}

      {tab === "Locations" && (
        <LocationSection
          locations={locations}
          onCreate={async (payload) => setLocations([...locations, await api.createLocation(project.id, payload)])}
          onUpdate={async (id, payload) => {
            const updated = await api.updateLocation(id, payload);
            setLocations(locations.map((item) => item.id === id ? updated : item));
          }}
          onDelete={async (id) => { await api.deleteLocation(id); setLocations(locations.filter((item) => item.id !== id)); }}
        />
      )}

      {tab === "Shots" && (
        <ShotList
          shots={shots}
          targetRuntime={project.target_runtime_seconds}
          onCreate={async (payload) => { await api.createShot(project.id, payload); await refreshShotsAndProject(); }}
          onUpdate={async (id, payload) => { await api.updateShot(id, payload); await refreshShotsAndProject(); }}
          onDelete={async (id) => { await api.deleteShot(id); await refreshShotsAndProject(); }}
          onReorder={async (ids) => { setShots(await api.reorderShots(project.id, ids)); await onRefreshProject(); }}
        />
      )}

      {tab === "Assets" && (
        <AssetSection
          shots={shots}
          assets={assets}
          onCreate={async (payload) => setAssets([await api.createAsset(project.id, payload), ...assets])}
          onDelete={async (id) => { await api.deleteAsset(id); setAssets(assets.filter((item) => item.id !== id)); }}
        />
      )}

      {tab === "Audio" && (
        <TextSection
          title="Audio plan"
          values={audio}
          labels={{
            id: "id",
            project_id: "project_id",
            music_prompt: "Music prompt",
            sound_effects_list: "Sound effects list",
            voiceover_script: "Voiceover script",
            subtitle_script: "Subtitle script",
            audio_notes: "Audio notes",
          }}
          hidden={["id", "project_id"]}
          onChange={setAudio}
          onSave={() => api.saveAudioPlan(project.id, audio)}
        />
      )}

      {tab === "Checklist" && (
        <section className="workspace-band">
          <SectionHead label="Final checklist" action={undefined} />
          <div className="checklist">
            {checklist.map((item) => (
              <label key={item.id} className="check-item">
                <input
                  type="checkbox"
                  checked={item.checked}
                  onChange={async (event) => {
                    const updated = await api.updateChecklistItem(item.id, event.target.checked);
                    setChecklist(checklist.map((current) => current.id === item.id ? updated : current));
                  }}
                />
                <span>{item.label}</span>
              </label>
            ))}
          </div>
        </section>
      )}
    </section>
  );
}

function SectionHead({ label, action }: { label: string; action?: string }) {
  return (
    <div className="section-heading compact">
      <div>
        <p className="eyebrow">{label}</p>
        <h2>{label}</h2>
      </div>
      {action ? <button className="primary" type="submit"><Save size={16} /> {action}</button> : null}
    </div>
  );
}

function TextInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label>{label}<input value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label>{label}<textarea value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function TextSection<T extends object>({
  title,
  values,
  labels,
  hidden,
  onChange,
  onSave,
  extra,
}: {
  title: string;
  values: T;
  labels: Record<keyof T, string>;
  hidden: (keyof T)[];
  onChange: (values: T) => void;
  onSave: () => Promise<unknown>;
  extra?: ReactNode;
}) {
  return (
    <form className="workspace-band" onSubmit={(event) => { event.preventDefault(); void onSave(); }}>
      <SectionHead label={title} action="Save" />
      {(Object.keys(values) as (keyof T)[]).filter((key) => !hidden.includes(key)).map((key) => (
        <TextArea
          key={String(key)}
          label={labels[key as keyof T]}
          value={String(values[key] ?? "")}
          onChange={(value) => onChange({ ...values, [key]: value })}
        />
      ))}
      {extra}
    </form>
  );
}

function CharacterSection({
  characters,
  onCreate,
  onUpdate,
  onDelete,
}: {
  characters: Character[];
  onCreate: (payload: CharacterInput) => Promise<void>;
  onUpdate: (id: number, payload: Partial<CharacterInput>) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}) {
  const [draft, setDraft] = useState<CharacterInput>(emptyCharacter);
  return (
    <section className="workspace-band">
      <div className="section-heading compact"><h2>Character bible</h2></div>
      <form className="resource-form" onSubmit={(event) => { event.preventDefault(); void onCreate(draft).then(() => setDraft(emptyCharacter)); }}>
        <TextInput label="Name" value={draft.name} onChange={(value) => setDraft({ ...draft, name: value })} />
        <TextInput label="Role" value={draft.role} onChange={(value) => setDraft({ ...draft, role: value })} />
        <TextInput label="Age" value={draft.age} onChange={(value) => setDraft({ ...draft, age: value })} />
        <TextArea label="Appearance" value={draft.appearance} onChange={(value) => setDraft({ ...draft, appearance: value })} />
        <TextArea label="Outfit" value={draft.outfit} onChange={(value) => setDraft({ ...draft, outfit: value })} />
        <TextArea label="Personality" value={draft.personality} onChange={(value) => setDraft({ ...draft, personality: value })} />
        <TextArea label="Voice style" value={draft.voice_style} onChange={(value) => setDraft({ ...draft, voice_style: value })} />
        <TextArea label="Continuity prompt" value={draft.continuity_prompt} onChange={(value) => setDraft({ ...draft, continuity_prompt: value })} />
        <TextArea label="Negative prompt" value={draft.negative_prompt} onChange={(value) => setDraft({ ...draft, negative_prompt: value })} />
        <TextArea label="Notes" value={draft.notes} onChange={(value) => setDraft({ ...draft, notes: value })} />
        <button className="primary" type="submit"><Plus size={16} /> Add character</button>
      </form>
      <div className="resource-list">
        {characters.map((character) => (
          <CharacterCard key={character.id} character={character} onUpdate={onUpdate} onDelete={onDelete} />
        ))}
      </div>
    </section>
  );
}

function CharacterCard({ character, onUpdate, onDelete }: { character: Character; onUpdate: (id: number, payload: Partial<CharacterInput>) => Promise<void>; onDelete: (id: number) => Promise<void> }) {
  const [draft, setDraft] = useState<CharacterInput>(character);
  return (
    <article className="resource-card editable">
      <div className="form-grid">
        <TextInput label="Name" value={draft.name} onChange={(value) => setDraft({ ...draft, name: value })} />
        <TextInput label="Role" value={draft.role} onChange={(value) => setDraft({ ...draft, role: value })} />
        <TextInput label="Age" value={draft.age} onChange={(value) => setDraft({ ...draft, age: value })} />
      </div>
      <TextArea label="Appearance" value={draft.appearance} onChange={(value) => setDraft({ ...draft, appearance: value })} />
      <TextArea label="Outfit" value={draft.outfit} onChange={(value) => setDraft({ ...draft, outfit: value })} />
      <TextArea label="Personality" value={draft.personality} onChange={(value) => setDraft({ ...draft, personality: value })} />
      <TextArea label="Voice style" value={draft.voice_style} onChange={(value) => setDraft({ ...draft, voice_style: value })} />
      <TextArea label="Continuity prompt" value={draft.continuity_prompt} onChange={(value) => setDraft({ ...draft, continuity_prompt: value })} />
      <TextArea label="Negative prompt" value={draft.negative_prompt} onChange={(value) => setDraft({ ...draft, negative_prompt: value })} />
      <TextArea label="Notes" value={draft.notes} onChange={(value) => setDraft({ ...draft, notes: value })} />
      <div className="row-actions">
        <button className="ghost" onClick={() => void onUpdate(character.id, draft)}><Check size={16} /> Save</button>
        <button className="danger" onClick={() => window.confirm(`Delete ${character.name}?`) && void onDelete(character.id)}><Trash2 size={16} /> Delete</button>
      </div>
    </article>
  );
}

function LocationSection({
  locations,
  onCreate,
  onUpdate,
  onDelete,
}: {
  locations: Location[];
  onCreate: (payload: LocationInput) => Promise<void>;
  onUpdate: (id: number, payload: Partial<LocationInput>) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}) {
  const [draft, setDraft] = useState<LocationInput>(emptyLocation);
  return (
    <section className="workspace-band">
      <div className="section-heading compact"><h2>Location bible</h2></div>
      <form className="resource-form" onSubmit={(event) => { event.preventDefault(); void onCreate(draft).then(() => setDraft(emptyLocation)); }}>
        <TextInput label="Name" value={draft.name} onChange={(value) => setDraft({ ...draft, name: value })} />
        <TextArea label="Description" value={draft.description} onChange={(value) => setDraft({ ...draft, description: value })} />
        <TextInput label="Mood" value={draft.mood} onChange={(value) => setDraft({ ...draft, mood: value })} />
        <TextInput label="Lighting" value={draft.lighting} onChange={(value) => setDraft({ ...draft, lighting: value })} />
        <TextInput label="Color palette" value={draft.color_palette} onChange={(value) => setDraft({ ...draft, color_palette: value })} />
        <TextArea label="Continuity prompt" value={draft.continuity_prompt} onChange={(value) => setDraft({ ...draft, continuity_prompt: value })} />
        <TextArea label="Negative prompt" value={draft.negative_prompt} onChange={(value) => setDraft({ ...draft, negative_prompt: value })} />
        <TextArea label="Safety notes" value={draft.safety_notes} onChange={(value) => setDraft({ ...draft, safety_notes: value })} />
        <TextArea label="Notes" value={draft.notes} onChange={(value) => setDraft({ ...draft, notes: value })} />
        <button className="primary" type="submit"><Plus size={16} /> Add location</button>
      </form>
      <div className="resource-list">
        {locations.map((location) => (
          <LocationCard key={location.id} location={location} onUpdate={onUpdate} onDelete={onDelete} />
        ))}
      </div>
    </section>
  );
}

function LocationCard({ location, onUpdate, onDelete }: { location: Location; onUpdate: (id: number, payload: Partial<LocationInput>) => Promise<void>; onDelete: (id: number) => Promise<void> }) {
  const [draft, setDraft] = useState<LocationInput>(location);
  return (
    <article className="resource-card editable">
      <div className="form-grid">
        <TextInput label="Name" value={draft.name} onChange={(value) => setDraft({ ...draft, name: value })} />
        <TextInput label="Mood" value={draft.mood} onChange={(value) => setDraft({ ...draft, mood: value })} />
        <TextInput label="Lighting" value={draft.lighting} onChange={(value) => setDraft({ ...draft, lighting: value })} />
        <TextInput label="Color palette" value={draft.color_palette} onChange={(value) => setDraft({ ...draft, color_palette: value })} />
      </div>
      <TextArea label="Description" value={draft.description} onChange={(value) => setDraft({ ...draft, description: value })} />
      <TextArea label="Continuity prompt" value={draft.continuity_prompt} onChange={(value) => setDraft({ ...draft, continuity_prompt: value })} />
      <TextArea label="Negative prompt" value={draft.negative_prompt} onChange={(value) => setDraft({ ...draft, negative_prompt: value })} />
      <TextArea label="Safety notes" value={draft.safety_notes} onChange={(value) => setDraft({ ...draft, safety_notes: value })} />
      <TextArea label="Notes" value={draft.notes} onChange={(value) => setDraft({ ...draft, notes: value })} />
      <div className="row-actions">
        <button className="ghost" onClick={() => void onUpdate(location.id, draft)}><Check size={16} /> Save</button>
        <button className="danger" onClick={() => window.confirm(`Delete ${location.name}?`) && void onDelete(location.id)}><Trash2 size={16} /> Delete</button>
      </div>
    </article>
  );
}

function AssetSection({ shots, assets, onCreate, onDelete }: { shots: Shot[]; assets: Asset[]; onCreate: (payload: AssetInput) => Promise<void>; onDelete: (id: number) => Promise<void> }) {
  const [draft, setDraft] = useState<AssetInput>(emptyAsset);
  return (
    <section className="workspace-band">
      <div className="section-heading compact"><h2>Asset tracking</h2></div>
      <form className="asset-form" onSubmit={(event) => { event.preventDefault(); void onCreate(draft).then(() => setDraft(emptyAsset)); }}>
        <label>Asset type<select value={draft.asset_type} onChange={(event) => setDraft({ ...draft, asset_type: event.target.value as AssetInput["asset_type"] })}>{assetTypes.map((type) => <option key={type}>{type}</option>)}</select></label>
        <label>Shot<select value={draft.shot_id ?? ""} onChange={(event) => setDraft({ ...draft, shot_id: event.target.value ? Number(event.target.value) : null })}><option value="">Project-level</option>{shots.map((shot) => <option key={shot.id} value={shot.id}>Shot {shot.shot_number}</option>)}</select></label>
        <TextInput label="Filename or path" value={draft.filename_or_path} onChange={(value) => setDraft({ ...draft, filename_or_path: value })} />
        <TextArea label="Notes" value={draft.notes} onChange={(value) => setDraft({ ...draft, notes: value })} />
        <button className="primary" type="submit"><Plus size={16} /> Track asset</button>
      </form>
      <div className="resource-list">
        {assets.map((asset) => (
          <article key={asset.id} className="resource-card">
            <strong>{asset.filename_or_path}</strong><span>{asset.asset_type}</span><p>{asset.notes}</p>
            <button className="danger" onClick={() => void onDelete(asset.id)}><Trash2 size={16} /> Delete</button>
          </article>
        ))}
      </div>
    </section>
  );
}
