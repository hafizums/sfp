import { Check, Copy, Plus, Save, Trash2, Upload } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { api } from "../api/client";
import { AssetGrid, AssetManager } from "./AssetManager";
import { AIStoryPanel } from "./AIStoryPanel";
import { ProductionBiblePanel } from "./ProductionBiblePanel";
import { ShotList } from "./ShotList";
import { type Asset, type AudioPlan, type Character, type CharacterInput, type ChecklistItem, type Location, type LocationInput, type ProductionBible, type Project, type ProjectInput, type Shot, type ShotInput, type StoryInterview, type StoryWorkspace } from "../types";

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

const emptyAudio: AudioPlan = {
  music_prompt: "",
  sound_effects_list: "",
  voiceover_script: "",
  subtitle_script: "",
  audio_notes: "",
};

const tabs = ["Setup", "Interview", "Story", "Production Bible", "Characters", "Locations", "Shots", "Assets", "Audio", "Checklist"] as const;
type Tab = (typeof tabs)[number];

const workflowSteps = [
  "Setup",
  "Add story context",
  "Build bible",
  "Plan shots",
  "Generate prompts",
  "Upload assets",
  "Review takes",
  "Finalize",
];

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
  const [productionBible, setProductionBible] = useState<ProductionBible | null>(null);
  const [audio, setAudio] = useState<AudioPlan>(emptyAudio);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [setupDraft, setSetupDraft] = useState<ProjectInput>(project);
  const [safetyText, setSafetyText] = useState(project.safety_rules.join("\n"));

  async function loadProjectData() {
    setLoading(true);
    const [nextInterview, nextWorkspace, nextProductionBible, nextCharacters, nextLocations, nextShots, nextAssets, nextAudio, nextChecklist] =
      await Promise.all([
        api.getStoryInterview(project.id),
        api.getWorkspace(project.id),
        api.getProductionBible(project.id),
        api.listCharacters(project.id),
        api.listLocations(project.id),
        api.listShots(project.id),
        api.listAssets(project.id),
        api.getAudioPlan(project.id),
        api.getChecklist(project.id),
      ]);
    setInterview(nextInterview);
    setWorkspace(nextWorkspace);
    setProductionBible(nextProductionBible);
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

      <ol className="workflow-rail" aria-label="Production workflow">
        {workflowSteps.map((step, index) => <li key={step}><span>{index + 1}</span>{step}</li>)}
      </ol>

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
          helper="Optional guided interview. You can skip this if you already have a story or shot list."
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
          helper="Draft or refine the story here. You can generate from interview, manual story text, production bible, characters, locations, or existing shots."
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

      {tab === "Production Bible" && (
        <ProductionBiblePanel
          projectId={project.id}
          bible={productionBible}
          onBibleChange={setProductionBible}
          onRefreshProject={onRefreshProject}
        />
      )}

      {tab === "Characters" && (
        <CharacterSection
          projectId={project.id}
          characters={characters}
          assets={assets}
          productionBible={productionBible}
          onAssetsChange={setAssets}
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
          projectId={project.id}
          locations={locations}
          assets={assets}
          productionBible={productionBible}
          onAssetsChange={setAssets}
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
          projectId={project.id}
          shots={shots}
          assets={assets}
          targetRuntime={project.target_runtime_seconds}
          onCreate={async (payload) => { await api.createShot(project.id, payload); await refreshShotsAndProject(); }}
          onUpdate={async (id, payload) => { await api.updateShot(id, payload); await refreshShotsAndProject(); }}
          onDelete={async (id) => { await api.deleteShot(id); await refreshShotsAndProject(); }}
          onReorder={async (ids) => { setShots(await api.reorderShots(project.id, ids)); await onRefreshProject(); }}
          onPromptsApplied={refreshShotsAndProject}
          onQualityReviewSaved={onRefreshProject}
          onTakeChanged={onRefreshProject}
        />
      )}

      {tab === "Assets" && (
        <AssetManager
          projectId={project.id}
          shots={shots}
          assets={assets}
          onAssetsChange={setAssets}
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
  helper,
}: {
  title: string;
  values: T;
  labels: Record<keyof T, string>;
  hidden: (keyof T)[];
  onChange: (values: T) => void;
  onSave: () => Promise<unknown>;
  extra?: ReactNode;
  helper?: string;
}) {
  return (
    <form className="workspace-band" onSubmit={(event) => { event.preventDefault(); void onSave(); }}>
      <SectionHead label={title} action="Save" />
      {helper ? <p className="muted-note">{helper}</p> : null}
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
  projectId,
  characters,
  assets,
  productionBible,
  onAssetsChange,
  onCreate,
  onUpdate,
  onDelete,
}: {
  projectId: number;
  characters: Character[];
  assets: Asset[];
  productionBible: ProductionBible | null;
  onAssetsChange: (assets: Asset[]) => void;
  onCreate: (payload: CharacterInput) => Promise<void>;
  onUpdate: (id: number, payload: Partial<CharacterInput>) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}) {
  const [draft, setDraft] = useState<CharacterInput>(emptyCharacter);
  const [assetFile, setAssetFile] = useState<File | null>(null);
  const [assetNotes, setAssetNotes] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [copiedDraftPrompt, setCopiedDraftPrompt] = useState(false);
  const [copiedCombinedPrompt, setCopiedCombinedPrompt] = useState(false);
  const draftPrompt = buildCharacterPrompt(draft, productionBible);
  const combinedPrompt = characters.map((character) => buildCharacterPrompt(character, productionBible)).filter(Boolean).join("\n\n---\n\n");
  const characterAssets = assets.filter((asset) => asset.asset_type === "character_reference");

  async function copyDraftPrompt() {
    await navigator.clipboard.writeText(draftPrompt);
    setCopiedDraftPrompt(true);
    window.setTimeout(() => setCopiedDraftPrompt(false), 1500);
  }

  async function copyCombinedPrompt() {
    await navigator.clipboard.writeText(combinedPrompt);
    setCopiedCombinedPrompt(true);
    window.setTimeout(() => setCopiedCombinedPrompt(false), 1500);
  }

  async function uploadCharacterAsset() {
    if (!assetFile) {
      setUploadError("Choose a character asset file before uploading.");
      return;
    }
    setUploading(true);
    setUploadError(null);
    try {
      const asset = await api.uploadAsset(projectId, {
        asset_type: "character_reference",
        shot_id: null,
        notes: assetNotes,
        file: assetFile,
      });
      onAssetsChange([asset, ...assets]);
      setAssetFile(null);
      setAssetNotes("");
    } catch (caught) {
      setUploadError(caught instanceof Error ? caught.message : "Unable to upload character asset.");
    } finally {
      setUploading(false);
    }
  }

  async function deleteCharacterAsset(asset: Asset) {
    if (!window.confirm(`Delete "${asset.original_filename || asset.filename_or_path || asset.stored_filename}" and remove its local file if uploaded?`)) {
      return;
    }
    await api.deleteAsset(asset.id);
    onAssetsChange(assets.filter((item) => item.id !== asset.id));
  }

  return (
    <section className="workspace-band">
      <div className="section-heading compact">
        <div>
          <p className="eyebrow">Continuity</p>
          <h2>Character bible</h2>
        </div>
      </div>
      <p className="muted-note">Keep names, outfits, voices, and negative prompts consistent before generating shot prompts.</p>
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

      <section className="prompt-group" aria-label="Character draft prompt">
        <div className="section-heading compact">
          <div>
            <p className="eyebrow">Character prompt</p>
            <h3>Draft copy prompt</h3>
          </div>
          {copiedDraftPrompt ? <span className="success-pill" role="status">Character prompt copied</span> : null}
        </div>
        <label>
          Prompt
          <textarea value={draftPrompt} readOnly placeholder="Fill the character fields to build a prompt." />
        </label>
        <button type="button" className="ghost" onClick={() => void copyDraftPrompt()} disabled={!draftPrompt.trim()}>
          <Copy size={16} /> {copiedDraftPrompt ? "Copied prompt" : "Copy character prompt"}
        </button>
      </section>

      <section className="prompt-group" aria-label="Combined character prompt">
        <div className="section-heading compact">
          <div>
            <p className="eyebrow">Combined prompt</p>
            <h3>All saved characters</h3>
          </div>
          {copiedCombinedPrompt ? <span className="success-pill" role="status">Combined prompt copied</span> : null}
        </div>
        <label>
          Combined prompt
          <textarea value={combinedPrompt} readOnly placeholder="Add characters to build a combined prompt." />
        </label>
        <button type="button" className="ghost" onClick={() => void copyCombinedPrompt()} disabled={!combinedPrompt.trim()}>
          <Copy size={16} /> {copiedCombinedPrompt ? "Copied combined prompt" : "Copy combined prompt"}
        </button>
      </section>

      <form className="asset-upload-form" aria-label="Character asset upload" onSubmit={(event) => { event.preventDefault(); void uploadCharacterAsset(); }}>
        <label>Character asset<input type="file" onChange={(event) => setAssetFile(event.target.files?.[0] ?? null)} /></label>
        <label>Notes<textarea value={assetNotes} onChange={(event) => setAssetNotes(event.target.value)} placeholder="Character name, pose, outfit, reference use" /></label>
        <button className="primary" type="submit" disabled={uploading}><Upload size={16} /> {uploading ? "Uploading" : "Upload character asset"}</button>
      </form>
      {uploadError ? <div className="app-error">{uploadError}</div> : null}

      <AssetGrid assets={characterAssets} shots={[]} onDelete={(asset) => void deleteCharacterAsset(asset)} />

      <div className="resource-list">
        {characters.map((character) => (
          <CharacterCard
            key={character.id}
            projectId={projectId}
            character={character}
            assets={assets}
            productionBible={productionBible}
            onAssetsChange={onAssetsChange}
            onUpdate={onUpdate}
            onDelete={onDelete}
          />
        ))}
      </div>
    </section>
  );
}

function buildCharacterPrompt(character: CharacterInput, productionBible: ProductionBible | null): string {
  const characterPrompt = [
    character.name ? `Character name: ${character.name}` : "",
    character.role ? `Role: ${character.role}` : "",
    character.age ? `Age: ${character.age}` : "",
    character.appearance ? `Appearance: ${character.appearance}` : "",
    character.outfit ? `Outfit: ${character.outfit}` : "",
    character.personality ? `Personality: ${character.personality}` : "",
    character.voice_style ? `Voice style: ${character.voice_style}` : "",
    character.continuity_prompt ? `Continuity prompt: ${character.continuity_prompt}` : "",
    character.negative_prompt ? `Negative prompt: ${character.negative_prompt}` : "",
    character.notes ? `Notes: ${character.notes}` : "",
  ].filter(Boolean).join("\n");
  return appendProductionBibleContext(characterPrompt, productionBible);
}

function appendProductionBibleContext(basePrompt: string, productionBible: ProductionBible | null): string {
  const bibleContext = buildProductionBiblePromptContext(productionBible);
  return [basePrompt, bibleContext].filter(Boolean).join("\n\n");
}

function buildProductionBiblePromptContext(productionBible: ProductionBible | null): string {
  if (!productionBible) {
    return "";
  }
  const lines = [
    productionBible.visual_style ? `Visual style: ${productionBible.visual_style}` : "",
    productionBible.color_palette ? `Color palette: ${productionBible.color_palette}` : "",
    productionBible.lighting_style ? `Lighting style: ${productionBible.lighting_style}` : "",
    productionBible.camera_language ? `Camera language: ${productionBible.camera_language}` : "",
    productionBible.character_consistency_rules ? `Character consistency rules: ${productionBible.character_consistency_rules}` : "",
    productionBible.location_consistency_rules ? `Location consistency rules: ${productionBible.location_consistency_rules}` : "",
    productionBible.prop_consistency_rules ? `Prop consistency rules: ${productionBible.prop_consistency_rules}` : "",
    productionBible.safety_rules ? `Safety rules: ${productionBible.safety_rules}` : "",
    productionBible.negative_prompt_rules ? `Negative prompt rules: ${productionBible.negative_prompt_rules}` : "",
    productionBible.final_delivery_specs ? `Final delivery specs: ${productionBible.final_delivery_specs}` : "",
  ].filter(Boolean);
  return lines.length ? `Production Bible context:\n${lines.join("\n")}` : "";
}

function characterAssetTag(characterId: number): string {
  return `character_id:${characterId}`;
}

function locationAssetTag(locationId: number): string {
  return `location_id:${locationId}`;
}

function taggedAssetNotes(tag: string, notes: string): string {
  return `[${tag}]${notes.trim() ? ` ${notes.trim()}` : ""}`;
}

function assetHasTag(asset: Asset, tag: string): boolean {
  return asset.notes.includes(`[${tag}]`);
}

function CharacterCard({
  projectId,
  character,
  assets,
  productionBible,
  onAssetsChange,
  onUpdate,
  onDelete,
}: {
  projectId: number;
  character: Character;
  assets: Asset[];
  productionBible: ProductionBible | null;
  onAssetsChange: (assets: Asset[]) => void;
  onUpdate: (id: number, payload: Partial<CharacterInput>) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}) {
  const [draft, setDraft] = useState<CharacterInput>(character);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageNotes, setImageNotes] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const prompt = buildCharacterPrompt(draft, productionBible);
  const assignedAssets = assets.filter((asset) =>
    asset.asset_type === "character_reference" && assetHasTag(asset, characterAssetTag(character.id)),
  );

  async function copyPrompt() {
    await navigator.clipboard.writeText(prompt);
    setCopiedPrompt(true);
    window.setTimeout(() => setCopiedPrompt(false), 1500);
  }

  async function uploadCharacterImage() {
    if (!imageFile) {
      setImageError("Choose an image before uploading.");
      return;
    }
    setUploadingImage(true);
    setImageError(null);
    try {
      const asset = await api.uploadAsset(projectId, {
        asset_type: "character_reference",
        shot_id: null,
        notes: taggedAssetNotes(characterAssetTag(character.id), imageNotes || draft.name),
        file: imageFile,
      });
      onAssetsChange([asset, ...assets]);
      setImageFile(null);
      setImageNotes("");
    } catch (caught) {
      setImageError(caught instanceof Error ? caught.message : "Unable to upload character image.");
    } finally {
      setUploadingImage(false);
    }
  }

  async function deleteCharacterImage(asset: Asset) {
    if (!window.confirm(`Delete "${asset.original_filename || asset.filename_or_path || asset.stored_filename}" and remove its local file if uploaded?`)) {
      return;
    }
    await api.deleteAsset(asset.id);
    onAssetsChange(assets.filter((item) => item.id !== asset.id));
  }

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
      <label>
        Character prompt
        <textarea value={prompt} readOnly />
      </label>
      <form className="asset-upload-form" aria-label={`Upload image for ${character.name}`} onSubmit={(event) => { event.preventDefault(); void uploadCharacterImage(); }}>
        <label>Character image<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => setImageFile(event.target.files?.[0] ?? null)} /></label>
        <label>Image notes<textarea value={imageNotes} onChange={(event) => setImageNotes(event.target.value)} placeholder="Pose, expression, outfit, angle" /></label>
        <button className="ghost" type="submit" disabled={uploadingImage}><Upload size={16} /> {uploadingImage ? "Uploading" : "Upload image"}</button>
      </form>
      {imageError ? <div className="app-error">{imageError}</div> : null}
      <AssetGrid assets={assignedAssets} shots={[]} onDelete={(asset) => void deleteCharacterImage(asset)} />
      <div className="row-actions">
        <button className="ghost" type="button" onClick={() => void copyPrompt()} disabled={!prompt.trim()}><Copy size={16} /> {copiedPrompt ? "Copied prompt" : "Copy prompt"}</button>
        <button className="ghost" onClick={() => void onUpdate(character.id, draft)}><Check size={16} /> Save</button>
        <button className="danger" onClick={() => window.confirm(`Delete ${character.name}?`) && void onDelete(character.id)}><Trash2 size={16} /> Delete</button>
      </div>
    </article>
  );
}

function LocationSection({
  projectId,
  locations,
  assets,
  productionBible,
  onAssetsChange,
  onCreate,
  onUpdate,
  onDelete,
}: {
  projectId: number;
  locations: Location[];
  assets: Asset[];
  productionBible: ProductionBible | null;
  onAssetsChange: (assets: Asset[]) => void;
  onCreate: (payload: LocationInput) => Promise<void>;
  onUpdate: (id: number, payload: Partial<LocationInput>) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}) {
  const [draft, setDraft] = useState<LocationInput>(emptyLocation);
  const [assetFile, setAssetFile] = useState<File | null>(null);
  const [assetNotes, setAssetNotes] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [copiedDraftPrompt, setCopiedDraftPrompt] = useState(false);
  const [copiedCombinedPrompt, setCopiedCombinedPrompt] = useState(false);
  const draftPrompt = buildLocationPrompt(draft, productionBible);
  const combinedPrompt = locations.map((location) => buildLocationPrompt(location, productionBible)).filter(Boolean).join("\n\n---\n\n");
  const locationAssets = assets.filter((asset) => asset.asset_type === "location_reference");

  async function copyDraftPrompt() {
    await navigator.clipboard.writeText(draftPrompt);
    setCopiedDraftPrompt(true);
    window.setTimeout(() => setCopiedDraftPrompt(false), 1500);
  }

  async function copyCombinedPrompt() {
    await navigator.clipboard.writeText(combinedPrompt);
    setCopiedCombinedPrompt(true);
    window.setTimeout(() => setCopiedCombinedPrompt(false), 1500);
  }

  async function uploadLocationAsset() {
    if (!assetFile) {
      setUploadError("Choose a location asset file before uploading.");
      return;
    }
    setUploading(true);
    setUploadError(null);
    try {
      const asset = await api.uploadAsset(projectId, {
        asset_type: "location_reference",
        shot_id: null,
        notes: assetNotes,
        file: assetFile,
      });
      onAssetsChange([asset, ...assets]);
      setAssetFile(null);
      setAssetNotes("");
    } catch (caught) {
      setUploadError(caught instanceof Error ? caught.message : "Unable to upload location asset.");
    } finally {
      setUploading(false);
    }
  }

  async function deleteLocationAsset(asset: Asset) {
    if (!window.confirm(`Delete "${asset.original_filename || asset.filename_or_path || asset.stored_filename}" and remove its local file if uploaded?`)) {
      return;
    }
    await api.deleteAsset(asset.id);
    onAssetsChange(assets.filter((item) => item.id !== asset.id));
  }

  return (
    <section className="workspace-band">
      <div className="section-heading compact">
        <div>
          <p className="eyebrow">Continuity</p>
          <h2>Location bible</h2>
        </div>
      </div>
      <p className="muted-note">Use these location notes to keep lighting, palette, and safety details stable across prompts.</p>
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

      <section className="prompt-group" aria-label="Location draft prompt">
        <div className="section-heading compact">
          <div>
            <p className="eyebrow">Location prompt</p>
            <h3>Draft copy prompt</h3>
          </div>
          {copiedDraftPrompt ? <span className="success-pill" role="status">Location prompt copied</span> : null}
        </div>
        <label>
          Prompt
          <textarea value={draftPrompt} readOnly placeholder="Fill the location fields to build a prompt." />
        </label>
        <button type="button" className="ghost" onClick={() => void copyDraftPrompt()} disabled={!draftPrompt.trim()}>
          <Copy size={16} /> {copiedDraftPrompt ? "Copied prompt" : "Copy location prompt"}
        </button>
      </section>

      <section className="prompt-group" aria-label="Combined location prompt">
        <div className="section-heading compact">
          <div>
            <p className="eyebrow">Combined prompt</p>
            <h3>All saved locations</h3>
          </div>
          {copiedCombinedPrompt ? <span className="success-pill" role="status">Combined location prompt copied</span> : null}
        </div>
        <label>
          Combined prompt
          <textarea value={combinedPrompt} readOnly placeholder="Add locations to build a combined prompt." />
        </label>
        <button type="button" className="ghost" onClick={() => void copyCombinedPrompt()} disabled={!combinedPrompt.trim()}>
          <Copy size={16} /> {copiedCombinedPrompt ? "Copied combined prompt" : "Copy combined prompt"}
        </button>
      </section>

      <form className="asset-upload-form" aria-label="Location asset upload" onSubmit={(event) => { event.preventDefault(); void uploadLocationAsset(); }}>
        <label>Location asset<input type="file" onChange={(event) => setAssetFile(event.target.files?.[0] ?? null)} /></label>
        <label>Notes<textarea value={assetNotes} onChange={(event) => setAssetNotes(event.target.value)} placeholder="Location name, angle, mood, reference use" /></label>
        <button className="primary" type="submit" disabled={uploading}><Upload size={16} /> {uploading ? "Uploading" : "Upload location asset"}</button>
      </form>
      {uploadError ? <div className="app-error">{uploadError}</div> : null}

      <AssetGrid assets={locationAssets} shots={[]} onDelete={(asset) => void deleteLocationAsset(asset)} />

      <div className="resource-list">
        {locations.map((location) => (
          <LocationCard
            key={location.id}
            projectId={projectId}
            location={location}
            assets={assets}
            productionBible={productionBible}
            onAssetsChange={onAssetsChange}
            onUpdate={onUpdate}
            onDelete={onDelete}
          />
        ))}
      </div>
    </section>
  );
}

function buildLocationPrompt(location: LocationInput, productionBible: ProductionBible | null): string {
  const locationPrompt = [
    location.name ? `Location name: ${location.name}` : "",
    location.description ? `Description: ${location.description}` : "",
    location.mood ? `Mood: ${location.mood}` : "",
    location.lighting ? `Lighting: ${location.lighting}` : "",
    location.color_palette ? `Color palette: ${location.color_palette}` : "",
    location.continuity_prompt ? `Continuity prompt: ${location.continuity_prompt}` : "",
    location.negative_prompt ? `Negative prompt: ${location.negative_prompt}` : "",
    location.safety_notes ? `Safety notes: ${location.safety_notes}` : "",
    location.notes ? `Notes: ${location.notes}` : "",
  ].filter(Boolean).join("\n");
  return appendProductionBibleContext(locationPrompt, productionBible);
}

function LocationCard({
  projectId,
  location,
  assets,
  productionBible,
  onAssetsChange,
  onUpdate,
  onDelete,
}: {
  projectId: number;
  location: Location;
  assets: Asset[];
  productionBible: ProductionBible | null;
  onAssetsChange: (assets: Asset[]) => void;
  onUpdate: (id: number, payload: Partial<LocationInput>) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}) {
  const [draft, setDraft] = useState<LocationInput>(location);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageNotes, setImageNotes] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const prompt = buildLocationPrompt(draft, productionBible);
  const assignedAssets = assets.filter((asset) =>
    asset.asset_type === "location_reference" && assetHasTag(asset, locationAssetTag(location.id)),
  );

  async function copyPrompt() {
    await navigator.clipboard.writeText(prompt);
    setCopiedPrompt(true);
    window.setTimeout(() => setCopiedPrompt(false), 1500);
  }

  async function uploadLocationImage() {
    if (!imageFile) {
      setImageError("Choose an image before uploading.");
      return;
    }
    setUploadingImage(true);
    setImageError(null);
    try {
      const asset = await api.uploadAsset(projectId, {
        asset_type: "location_reference",
        shot_id: null,
        notes: taggedAssetNotes(locationAssetTag(location.id), imageNotes || draft.name),
        file: imageFile,
      });
      onAssetsChange([asset, ...assets]);
      setImageFile(null);
      setImageNotes("");
    } catch (caught) {
      setImageError(caught instanceof Error ? caught.message : "Unable to upload location image.");
    } finally {
      setUploadingImage(false);
    }
  }

  async function deleteLocationImage(asset: Asset) {
    if (!window.confirm(`Delete "${asset.original_filename || asset.filename_or_path || asset.stored_filename}" and remove its local file if uploaded?`)) {
      return;
    }
    await api.deleteAsset(asset.id);
    onAssetsChange(assets.filter((item) => item.id !== asset.id));
  }

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
      <label>
        Location prompt
        <textarea value={prompt} readOnly />
      </label>
      <form className="asset-upload-form" aria-label={`Upload image for ${location.name}`} onSubmit={(event) => { event.preventDefault(); void uploadLocationImage(); }}>
        <label>Location image<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => setImageFile(event.target.files?.[0] ?? null)} /></label>
        <label>Image notes<textarea value={imageNotes} onChange={(event) => setImageNotes(event.target.value)} placeholder="Angle, lighting, mood, reference use" /></label>
        <button className="ghost" type="submit" disabled={uploadingImage}><Upload size={16} /> {uploadingImage ? "Uploading" : "Upload image"}</button>
      </form>
      {imageError ? <div className="app-error">{imageError}</div> : null}
      <AssetGrid assets={assignedAssets} shots={[]} onDelete={(asset) => void deleteLocationImage(asset)} />
      <div className="row-actions">
        <button className="ghost" type="button" onClick={() => void copyPrompt()} disabled={!prompt.trim()}><Copy size={16} /> {copiedPrompt ? "Copied prompt" : "Copy prompt"}</button>
        <button className="ghost" onClick={() => void onUpdate(location.id, draft)}><Check size={16} /> Save</button>
        <button className="danger" onClick={() => window.confirm(`Delete ${location.name}?`) && void onDelete(location.id)}><Trash2 size={16} /> Delete</button>
      </div>
    </article>
  );
}
