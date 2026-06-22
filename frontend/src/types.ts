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
  production_bible_locked: boolean;
  quality_review_count: number;
  shots_approved_for_final: number;
};

export type ProjectInput = Omit<
  Project,
  | "id"
  | "created_at"
  | "updated_at"
  | "current_planned_runtime"
  | "shot_count"
  | "progress"
  | "production_bible_locked"
  | "quality_review_count"
  | "shots_approved_for_final"
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
  original_filename: string;
  stored_filename: string;
  relative_path: string;
  mime_type: string;
  size_bytes: number;
  preview_url: string;
  download_url: string;
  notes: string;
  created_at: string;
};

export type AssetInput = {
  shot_id: number | null;
  asset_type: AssetType;
  filename_or_path: string;
  notes: string;
};

export type AssetUploadInput = {
  asset_type: AssetType;
  shot_id: number | null;
  notes: string;
  file: File;
};

export type ProductionBible = {
  id: number;
  project_id: number;
  visual_style: string;
  color_palette: string;
  lighting_style: string;
  camera_language: string;
  character_consistency_rules: string;
  location_consistency_rules: string;
  prop_consistency_rules: string;
  safety_rules: string;
  negative_prompt_rules: string;
  music_style: string;
  voiceover_style: string;
  subtitle_style: string;
  final_delivery_specs: string;
  locked: boolean;
  created_at: string;
  updated_at: string;
};

export type ProductionBibleInput = Omit<ProductionBible, "id" | "project_id" | "locked" | "created_at" | "updated_at">;

export type ShotQualityReview = {
  id: number;
  project_id: number;
  shot_id: number;
  character_consistency_score: number;
  location_continuity_score: number;
  visual_style_score: number;
  motion_quality_score: number;
  safety_score: number;
  prompt_readiness_score: number;
  asset_readiness_score: number;
  review_notes: string;
  approved_for_final: boolean;
  created_at: string;
  updated_at: string;
};

export type ShotQualityReviewInput = Omit<ShotQualityReview, "id" | "project_id" | "shot_id" | "created_at" | "updated_at">;

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

export type GeneratedCharacterSuggestion = CharacterInput;

export type GeneratedLocationSuggestion = LocationInput;

export type GeneratedShotSuggestion = {
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
  notes: string;
};

export type GeneratedStoryPackage = {
  logline: string;
  synopsis: string;
  three_act_structure: string;
  cinematic_screenplay: string;
  simple_dialogue_version: string;
  voiceover_draft: string;
  subtitle_draft: string;
  suggested_characters: GeneratedCharacterSuggestion[];
  suggested_locations: GeneratedLocationSuggestion[];
  shot_storyboard: GeneratedShotSuggestion[];
  audio_plan: {
    music_prompt: string;
    sound_effects_list: string;
  };
  safety_review: {
    final_safety_review_notes: string;
  };
};

export type StoryPackageApplyRequest = {
  package: GeneratedStoryPackage;
  overwrite: boolean;
  apply_workspace: boolean;
  apply_characters: boolean;
  apply_locations: boolean;
  apply_shots: boolean;
  apply_audio: boolean;
};

export type StoryPackageApplyResponse = {
  applied: string[];
  skipped: string[];
  created_characters: number;
  created_locations: number;
  created_shots: number;
};

export type GeneratedShotPromptPackage = {
  shot_id: number;
  shot_number: number;
  image_prompt: string;
  start_frame_prompt: string;
  end_frame_prompt: string;
  video_prompt: string;
  negative_prompt: string;
  notes: string;
};

export type ShotPromptPreviewRequest = {
  shot_ids?: number[] | null;
  overwrite?: boolean;
};

export type ShotPromptApplyRequest = {
  packages: GeneratedShotPromptPackage[];
  overwrite: boolean;
};

export type ShotPromptApplyResponse = {
  applied: string[];
  skipped: string[];
  updated_shots: number;
};
