export const shotStatuses = [
  "Draft",
  "Prompt ready",
  "Image generated",
  "Start frame approved",
  "End frame approved",
  "Video generated",
  "Needs redo",
  "Approved",
  "Added to final edit",
] as const;

export const assetTypes = [
  "character_reference",
  "location_reference",
  "start_frame",
  "end_frame",
  "generated_video",
  "audio",
  "subtitle",
  "other",
] as const;

export type ShotStatus = (typeof shotStatuses)[number];
export type AssetType = (typeof assetTypes)[number];

export type Project = {
  id: number;
  title: string;
  genre: string;
  target_runtime_seconds: number;
  audience_age: string;
  tone: string;
  aspect_ratio: string;
  visual_style: string;
  safety_rules: string[];
  created_at: string;
  updated_at: string;
  current_planned_runtime: number;
  shot_count: number;
  progress: number;
};

export type ProjectInput = Omit<
  Project,
  "id" | "created_at" | "updated_at" | "current_planned_runtime" | "shot_count" | "progress"
>;

export type StoryInterview = {
  id?: number;
  project_id?: number;
  title_answer: string;
  magical_discovery: string;
  main_kid_characters: string;
  adventure_beginning: string;
  main_adventure_location: string;
  small_problem: string;
  teamwork_solution: string;
  ending_feel: string;
  visual_style: string;
  avoid: string;
};

export type StoryWorkspace = {
  id?: number;
  project_id?: number;
  logline: string;
  synopsis: string;
  three_act_structure: string;
  cinematic_screenplay: string;
  simple_dialogue_version: string;
  voiceover_draft: string;
  subtitle_draft: string;
};

export type Character = {
  id: number;
  project_id: number;
  name: string;
  role: string;
  age: string;
  appearance: string;
  outfit: string;
  personality: string;
  voice_style: string;
  continuity_prompt: string;
  negative_prompt: string;
  notes: string;
};

export type CharacterInput = Omit<Character, "id" | "project_id">;

export type Location = {
  id: number;
  project_id: number;
  name: string;
  description: string;
  mood: string;
  lighting: string;
  color_palette: string;
  continuity_prompt: string;
  negative_prompt: string;
  safety_notes: string;
  notes: string;
};

export type LocationInput = Omit<Location, "id" | "project_id">;

export type Shot = {
  id: number;
  project_id: number;
  shot_number: number;
  scene_number: number;
  duration_seconds: number;
  purpose: string;
  camera_framing: string;
  camera_movement: string;
  characters_present: string;
  location_name: string;
  action: string;
  emotion: string;
  image_prompt: string;
  start_frame_prompt: string;
  end_frame_prompt: string;
  video_prompt: string;
  negative_prompt: string;
  status: ShotStatus;
  notes: string;
};

export type ShotInput = Omit<Shot, "id" | "project_id" | "shot_number">;

export type Asset = {
  id: number;
  project_id: number;
  shot_id: number | null;
  asset_type: AssetType;
  filename_or_path: string;
  notes: string;
  created_at: string;
};

export type AssetInput = Omit<Asset, "id" | "project_id" | "created_at">;

export type AudioPlan = {
  id?: number;
  project_id?: number;
  music_prompt: string;
  sound_effects_list: string;
  voiceover_script: string;
  subtitle_script: string;
  audio_notes: string;
};

export type ChecklistItem = {
  id: number;
  project_id: number;
  label: string;
  checked: boolean;
  position: number;
};
