from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

DEFAULT_SAFETY_RULES = [
    "No violence",
    "No horror",
    "No blood",
    "No weapons",
    "No unsafe stunts",
    "Suitable for age 4+",
]

SHOT_STATUSES = [
    "Draft",
    "Prompt ready",
    "Image generated",
    "Start frame approved",
    "End frame approved",
    "Video generated",
    "Needs redo",
    "Approved",
    "Added to final edit",
]

AssetType = Literal[
    "character_reference",
    "location_reference",
    "start_frame",
    "end_frame",
    "generated_video",
    "audio",
    "subtitle",
    "other",
]


class OrmModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class ProjectBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    genre: str = "Kids Adventure"
    target_runtime_seconds: int = Field(180, gt=0, le=3600)
    audience_age: str = "4+"
    tone: str = "fun, magical, safe, teamwork"
    aspect_ratio: str = "16:9"
    visual_style: str = ""
    safety_rules: list[str] = Field(default_factory=lambda: DEFAULT_SAFETY_RULES.copy())


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=200)
    genre: str | None = None
    target_runtime_seconds: int | None = Field(None, gt=0, le=3600)
    audience_age: str | None = None
    tone: str | None = None
    aspect_ratio: str | None = None
    visual_style: str | None = None
    safety_rules: list[str] | None = None


class ProjectRead(ProjectBase, OrmModel):
    id: int
    created_at: datetime
    updated_at: datetime
    current_planned_runtime: int = 0
    shot_count: int = 0
    progress: int = 0


class StoryInterviewBase(BaseModel):
    title_answer: str = ""
    magical_discovery: str = ""
    main_kid_characters: str = ""
    adventure_beginning: str = ""
    main_adventure_location: str = ""
    small_problem: str = ""
    teamwork_solution: str = ""
    ending_feel: str = ""
    visual_style: str = ""
    avoid: str = ""


class StoryInterviewRead(StoryInterviewBase, OrmModel):
    id: int
    project_id: int
    created_at: datetime
    updated_at: datetime


class StoryWorkspaceBase(BaseModel):
    logline: str = ""
    synopsis: str = ""
    three_act_structure: str = ""
    cinematic_screenplay: str = ""
    simple_dialogue_version: str = ""
    voiceover_draft: str = ""
    subtitle_draft: str = ""


class StoryWorkspaceRead(StoryWorkspaceBase, OrmModel):
    id: int
    project_id: int
    created_at: datetime
    updated_at: datetime


class CharacterBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    role: str = ""
    age: str = ""
    appearance: str = ""
    outfit: str = ""
    personality: str = ""
    voice_style: str = ""
    continuity_prompt: str = ""
    negative_prompt: str = ""
    notes: str = ""


class CharacterUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=120)
    role: str | None = None
    age: str | None = None
    appearance: str | None = None
    outfit: str | None = None
    personality: str | None = None
    voice_style: str | None = None
    continuity_prompt: str | None = None
    negative_prompt: str | None = None
    notes: str | None = None


class CharacterRead(CharacterBase, OrmModel):
    id: int
    project_id: int
    created_at: datetime
    updated_at: datetime


class LocationBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    description: str = ""
    mood: str = ""
    lighting: str = ""
    color_palette: str = ""
    continuity_prompt: str = ""
    negative_prompt: str = ""
    safety_notes: str = ""
    notes: str = ""


class LocationUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=120)
    description: str | None = None
    mood: str | None = None
    lighting: str | None = None
    color_palette: str | None = None
    continuity_prompt: str | None = None
    negative_prompt: str | None = None
    safety_notes: str | None = None
    notes: str | None = None


class LocationRead(LocationBase, OrmModel):
    id: int
    project_id: int
    created_at: datetime
    updated_at: datetime


class ShotBase(BaseModel):
    scene_number: int = Field(1, ge=1)
    duration_seconds: int = Field(4, ge=1, le=180)
    purpose: str = ""
    camera_framing: str = ""
    camera_movement: str = ""
    characters_present: str = ""
    location_name: str = ""
    action: str = ""
    emotion: str = ""
    image_prompt: str = ""
    start_frame_prompt: str = ""
    end_frame_prompt: str = ""
    video_prompt: str = ""
    negative_prompt: str = ""
    status: str = "Draft"
    notes: str = ""

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str) -> str:
        if value not in SHOT_STATUSES:
            raise ValueError(f"status must be one of: {', '.join(SHOT_STATUSES)}")
        return value


class ShotCreate(ShotBase):
    pass


class ShotUpdate(BaseModel):
    scene_number: int | None = Field(None, ge=1)
    duration_seconds: int | None = Field(None, ge=1, le=180)
    purpose: str | None = None
    camera_framing: str | None = None
    camera_movement: str | None = None
    characters_present: str | None = None
    location_name: str | None = None
    action: str | None = None
    emotion: str | None = None
    image_prompt: str | None = None
    start_frame_prompt: str | None = None
    end_frame_prompt: str | None = None
    video_prompt: str | None = None
    negative_prompt: str | None = None
    status: str | None = None
    notes: str | None = None

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str | None) -> str | None:
        if value is not None and value not in SHOT_STATUSES:
            raise ValueError(f"status must be one of: {', '.join(SHOT_STATUSES)}")
        return value


class ShotRead(ShotBase, OrmModel):
    id: int
    project_id: int
    shot_number: int
    created_at: datetime
    updated_at: datetime


class ShotReorder(BaseModel):
    shot_ids: list[int] = Field(..., min_length=1)


class AssetBase(BaseModel):
    shot_id: int | None = None
    asset_type: AssetType = "other"
    filename_or_path: str = Field(..., min_length=1, max_length=500)
    notes: str = ""


class AssetUpdate(BaseModel):
    shot_id: int | None = None
    asset_type: AssetType | None = None
    filename_or_path: str | None = Field(None, min_length=1, max_length=500)
    notes: str | None = None


class AssetRead(AssetBase, OrmModel):
    id: int
    project_id: int
    created_at: datetime
    updated_at: datetime


class AudioPlanBase(BaseModel):
    music_prompt: str = ""
    sound_effects_list: str = ""
    voiceover_script: str = ""
    subtitle_script: str = ""
    audio_notes: str = ""


class AudioPlanRead(AudioPlanBase, OrmModel):
    id: int
    project_id: int
    created_at: datetime
    updated_at: datetime


class ChecklistItemRead(OrmModel):
    id: int
    project_id: int
    label: str
    checked: bool
    position: int
    created_at: datetime
    updated_at: datetime


class ChecklistItemUpdate(BaseModel):
    checked: bool
