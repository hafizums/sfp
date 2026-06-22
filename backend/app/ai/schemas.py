from pydantic import BaseModel, Field, field_validator, model_validator


class GeneratedCharacterSuggestion(BaseModel):
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


class GeneratedLocationSuggestion(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    description: str = ""
    mood: str = ""
    lighting: str = ""
    color_palette: str = ""
    continuity_prompt: str = ""
    negative_prompt: str = ""
    safety_notes: str = ""
    notes: str = ""


class GeneratedShotSuggestion(BaseModel):
    shot_number: int = Field(..., ge=1)
    scene_number: int = Field(..., ge=1)
    duration_seconds: int = Field(..., ge=1, le=180)
    purpose: str = ""
    camera_framing: str = ""
    camera_movement: str = ""
    characters_present: str = ""
    location_name: str = ""
    action: str = ""
    emotion: str = ""
    notes: str = ""


class GeneratedAudioPlan(BaseModel):
    music_prompt: str = ""
    sound_effects_list: str = ""


class GeneratedSafetyReview(BaseModel):
    final_safety_review_notes: str = ""


class GeneratedStoryPackage(BaseModel):
    logline: str = Field(..., min_length=1)
    synopsis: str = Field(..., min_length=1)
    three_act_structure: str = Field(..., min_length=1)
    cinematic_screenplay: str = Field(..., min_length=1)
    simple_dialogue_version: str = Field(..., min_length=1)
    voiceover_draft: str = Field(..., min_length=1)
    subtitle_draft: str = Field(..., min_length=1)
    suggested_characters: list[GeneratedCharacterSuggestion] = Field(default_factory=list)
    suggested_locations: list[GeneratedLocationSuggestion] = Field(default_factory=list)
    shot_storyboard: list[GeneratedShotSuggestion] = Field(default_factory=list)
    audio_plan: GeneratedAudioPlan = Field(default_factory=GeneratedAudioPlan)
    safety_review: GeneratedSafetyReview = Field(default_factory=GeneratedSafetyReview)

    @field_validator("shot_storyboard")
    @classmethod
    def validate_shot_count(cls, value: list[GeneratedShotSuggestion]) -> list[GeneratedShotSuggestion]:
        if not 30 <= len(value) <= 45:
            raise ValueError("shot_storyboard must include 30 to 45 shots")
        return value

    @model_validator(mode="after")
    def validate_runtime(self) -> "GeneratedStoryPackage":
        total = sum(shot.duration_seconds for shot in self.shot_storyboard)
        if total < 150 or total > 210:
            raise ValueError("shot_storyboard runtime should stay close to 180 seconds")
        return self


class StoryPackageApplyRequest(BaseModel):
    package: GeneratedStoryPackage
    overwrite: bool = False
    apply_workspace: bool = True
    apply_characters: bool = True
    apply_locations: bool = True
    apply_shots: bool = False
    apply_audio: bool = True


class StoryPackageApplyResponse(BaseModel):
    applied: list[str] = Field(default_factory=list)
    skipped: list[str] = Field(default_factory=list)
    created_characters: int = 0
    created_locations: int = 0
    created_shots: int = 0
