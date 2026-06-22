from datetime import datetime, timezone

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now
    )


class Project(TimestampMixin, Base):
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(200), index=True)
    genre: Mapped[str] = mapped_column(String(100), default="Kids Adventure")
    target_runtime_seconds: Mapped[int] = mapped_column(Integer, default=180)
    audience_age: Mapped[str] = mapped_column(String(50), default="4+")
    tone: Mapped[str] = mapped_column(String(200), default="fun, magical, safe, teamwork")
    aspect_ratio: Mapped[str] = mapped_column(String(20), default="16:9")
    visual_style: Mapped[str] = mapped_column(String(300), default="")
    safety_rules: Mapped[list[str]] = mapped_column(JSON, default=list)

    story_interview: Mapped["StoryInterview | None"] = relationship(
        back_populates="project", cascade="all, delete-orphan", uselist=False
    )
    workspace: Mapped["StoryWorkspace | None"] = relationship(
        back_populates="project", cascade="all, delete-orphan", uselist=False
    )
    characters: Mapped[list["Character"]] = relationship(
        back_populates="project", cascade="all, delete-orphan"
    )
    locations: Mapped[list["Location"]] = relationship(
        back_populates="project", cascade="all, delete-orphan"
    )
    shots: Mapped[list["Shot"]] = relationship(
        back_populates="project", cascade="all, delete-orphan", order_by="Shot.shot_number"
    )
    assets: Mapped[list["Asset"]] = relationship(
        back_populates="project", cascade="all, delete-orphan"
    )
    production_bible: Mapped["ProductionBible | None"] = relationship(
        back_populates="project", cascade="all, delete-orphan", uselist=False
    )
    quality_reviews: Mapped[list["ShotQualityReview"]] = relationship(
        back_populates="project", cascade="all, delete-orphan"
    )
    audio_plan: Mapped["AudioPlan | None"] = relationship(
        back_populates="project", cascade="all, delete-orphan", uselist=False
    )
    checklist_items: Mapped[list["ChecklistItem"]] = relationship(
        back_populates="project", cascade="all, delete-orphan", order_by="ChecklistItem.position"
    )


class StoryInterview(TimestampMixin, Base):
    __tablename__ = "story_interviews"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), unique=True, index=True)
    title_answer: Mapped[str] = mapped_column(Text, default="")
    magical_discovery: Mapped[str] = mapped_column(Text, default="")
    main_kid_characters: Mapped[str] = mapped_column(Text, default="")
    adventure_beginning: Mapped[str] = mapped_column(Text, default="")
    main_adventure_location: Mapped[str] = mapped_column(Text, default="")
    small_problem: Mapped[str] = mapped_column(Text, default="")
    teamwork_solution: Mapped[str] = mapped_column(Text, default="")
    ending_feel: Mapped[str] = mapped_column(Text, default="")
    visual_style: Mapped[str] = mapped_column(Text, default="")
    avoid: Mapped[str] = mapped_column(Text, default="")

    project: Mapped[Project] = relationship(back_populates="story_interview")


class StoryWorkspace(TimestampMixin, Base):
    __tablename__ = "story_workspaces"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), unique=True, index=True)
    logline: Mapped[str] = mapped_column(Text, default="")
    synopsis: Mapped[str] = mapped_column(Text, default="")
    three_act_structure: Mapped[str] = mapped_column(Text, default="")
    cinematic_screenplay: Mapped[str] = mapped_column(Text, default="")
    simple_dialogue_version: Mapped[str] = mapped_column(Text, default="")
    voiceover_draft: Mapped[str] = mapped_column(Text, default="")
    subtitle_draft: Mapped[str] = mapped_column(Text, default="")

    project: Mapped[Project] = relationship(back_populates="workspace")


class Character(TimestampMixin, Base):
    __tablename__ = "characters"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), index=True)
    name: Mapped[str] = mapped_column(String(120))
    role: Mapped[str] = mapped_column(String(120), default="")
    age: Mapped[str] = mapped_column(String(50), default="")
    appearance: Mapped[str] = mapped_column(Text, default="")
    outfit: Mapped[str] = mapped_column(Text, default="")
    personality: Mapped[str] = mapped_column(Text, default="")
    voice_style: Mapped[str] = mapped_column(Text, default="")
    continuity_prompt: Mapped[str] = mapped_column(Text, default="")
    negative_prompt: Mapped[str] = mapped_column(Text, default="")
    notes: Mapped[str] = mapped_column(Text, default="")

    project: Mapped[Project] = relationship(back_populates="characters")


class Location(TimestampMixin, Base):
    __tablename__ = "locations"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), index=True)
    name: Mapped[str] = mapped_column(String(120))
    description: Mapped[str] = mapped_column(Text, default="")
    mood: Mapped[str] = mapped_column(Text, default="")
    lighting: Mapped[str] = mapped_column(Text, default="")
    color_palette: Mapped[str] = mapped_column(Text, default="")
    continuity_prompt: Mapped[str] = mapped_column(Text, default="")
    negative_prompt: Mapped[str] = mapped_column(Text, default="")
    safety_notes: Mapped[str] = mapped_column(Text, default="")
    notes: Mapped[str] = mapped_column(Text, default="")

    project: Mapped[Project] = relationship(back_populates="locations")


class Shot(TimestampMixin, Base):
    __tablename__ = "shots"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), index=True)
    shot_number: Mapped[int] = mapped_column(Integer, index=True)
    scene_number: Mapped[int] = mapped_column(Integer, default=1)
    duration_seconds: Mapped[int] = mapped_column(Integer, default=4)
    purpose: Mapped[str] = mapped_column(String(240), default="")
    camera_framing: Mapped[str] = mapped_column(String(160), default="")
    camera_movement: Mapped[str] = mapped_column(String(160), default="")
    characters_present: Mapped[str] = mapped_column(Text, default="")
    location_name: Mapped[str] = mapped_column(String(160), default="")
    action: Mapped[str] = mapped_column(Text, default="")
    emotion: Mapped[str] = mapped_column(Text, default="")
    image_prompt: Mapped[str] = mapped_column(Text, default="")
    start_frame_prompt: Mapped[str] = mapped_column(Text, default="")
    end_frame_prompt: Mapped[str] = mapped_column(Text, default="")
    video_prompt: Mapped[str] = mapped_column(Text, default="")
    negative_prompt: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(80), default="Draft")
    notes: Mapped[str] = mapped_column(Text, default="")

    project: Mapped[Project] = relationship(back_populates="shots")
    assets: Mapped[list["Asset"]] = relationship(back_populates="shot", cascade="all, delete-orphan")
    takes: Mapped[list["ShotTake"]] = relationship(
        back_populates="shot", cascade="all, delete-orphan", order_by="ShotTake.created_at.desc()"
    )


class Asset(TimestampMixin, Base):
    __tablename__ = "assets"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), index=True)
    shot_id: Mapped[int | None] = mapped_column(ForeignKey("shots.id"), nullable=True, index=True)
    asset_type: Mapped[str] = mapped_column(String(80))
    filename_or_path: Mapped[str] = mapped_column(String(500))
    original_filename: Mapped[str] = mapped_column(String(500), default="")
    stored_filename: Mapped[str] = mapped_column(String(500), default="")
    relative_path: Mapped[str] = mapped_column(String(700), default="")
    mime_type: Mapped[str] = mapped_column(String(160), default="")
    size_bytes: Mapped[int] = mapped_column(Integer, default=0)
    notes: Mapped[str] = mapped_column(Text, default="")

    project: Mapped[Project] = relationship(back_populates="assets")
    shot: Mapped[Shot | None] = relationship(back_populates="assets")


class ProductionBible(TimestampMixin, Base):
    __tablename__ = "production_bibles"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), unique=True, index=True)
    visual_style: Mapped[str] = mapped_column(Text, default="")
    color_palette: Mapped[str] = mapped_column(Text, default="")
    lighting_style: Mapped[str] = mapped_column(Text, default="")
    camera_language: Mapped[str] = mapped_column(Text, default="")
    character_consistency_rules: Mapped[str] = mapped_column(Text, default="")
    location_consistency_rules: Mapped[str] = mapped_column(Text, default="")
    prop_consistency_rules: Mapped[str] = mapped_column(Text, default="")
    safety_rules: Mapped[str] = mapped_column(Text, default="")
    negative_prompt_rules: Mapped[str] = mapped_column(Text, default="")
    music_style: Mapped[str] = mapped_column(Text, default="")
    voiceover_style: Mapped[str] = mapped_column(Text, default="")
    subtitle_style: Mapped[str] = mapped_column(Text, default="")
    final_delivery_specs: Mapped[str] = mapped_column(Text, default="")
    locked: Mapped[bool] = mapped_column(Boolean, default=False)

    project: Mapped[Project] = relationship(back_populates="production_bible")


class ShotQualityReview(TimestampMixin, Base):
    __tablename__ = "shot_quality_reviews"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), index=True)
    shot_id: Mapped[int] = mapped_column(ForeignKey("shots.id"), unique=True, index=True)
    character_consistency_score: Mapped[int] = mapped_column(Integer, default=0)
    location_continuity_score: Mapped[int] = mapped_column(Integer, default=0)
    visual_style_score: Mapped[int] = mapped_column(Integer, default=0)
    motion_quality_score: Mapped[int] = mapped_column(Integer, default=0)
    safety_score: Mapped[int] = mapped_column(Integer, default=0)
    prompt_readiness_score: Mapped[int] = mapped_column(Integer, default=0)
    asset_readiness_score: Mapped[int] = mapped_column(Integer, default=0)
    review_notes: Mapped[str] = mapped_column(Text, default="")
    approved_for_final: Mapped[bool] = mapped_column(Boolean, default=False)

    project: Mapped[Project] = relationship(back_populates="quality_reviews")
    shot: Mapped[Shot] = relationship()


class ShotTake(TimestampMixin, Base):
    __tablename__ = "shot_takes"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), index=True)
    shot_id: Mapped[int] = mapped_column(ForeignKey("shots.id"), index=True)
    take_label: Mapped[str] = mapped_column(String(80), default="")
    status: Mapped[str] = mapped_column(String(80), default="Draft")
    source_type: Mapped[str] = mapped_column(String(80), default="manual_upload")
    prompt_snapshot: Mapped[str] = mapped_column(Text, default="")
    negative_prompt_snapshot: Mapped[str] = mapped_column(Text, default="")
    start_frame_asset_id: Mapped[int | None] = mapped_column(ForeignKey("assets.id"), nullable=True)
    end_frame_asset_id: Mapped[int | None] = mapped_column(ForeignKey("assets.id"), nullable=True)
    video_asset_id: Mapped[int | None] = mapped_column(ForeignKey("assets.id"), nullable=True)
    audio_asset_id: Mapped[int | None] = mapped_column(ForeignKey("assets.id"), nullable=True)
    subtitle_asset_id: Mapped[int | None] = mapped_column(ForeignKey("assets.id"), nullable=True)
    provider_job_id: Mapped[str | None] = mapped_column(String(200), nullable=True)
    review_notes: Mapped[str] = mapped_column(Text, default="")
    visual_quality_score: Mapped[int] = mapped_column(Integer, default=0)
    motion_quality_score: Mapped[int] = mapped_column(Integer, default=0)
    character_consistency_score: Mapped[int] = mapped_column(Integer, default=0)
    location_continuity_score: Mapped[int] = mapped_column(Integer, default=0)
    safety_score: Mapped[int] = mapped_column(Integer, default=0)
    approved_for_final: Mapped[bool] = mapped_column(Boolean, default=False)
    rejected_reason: Mapped[str] = mapped_column(Text, default="")

    project: Mapped[Project] = relationship()
    shot: Mapped[Shot] = relationship(back_populates="takes")
    start_frame_asset: Mapped[Asset | None] = relationship(foreign_keys=[start_frame_asset_id])
    end_frame_asset: Mapped[Asset | None] = relationship(foreign_keys=[end_frame_asset_id])
    video_asset: Mapped[Asset | None] = relationship(foreign_keys=[video_asset_id])
    audio_asset: Mapped[Asset | None] = relationship(foreign_keys=[audio_asset_id])
    subtitle_asset: Mapped[Asset | None] = relationship(foreign_keys=[subtitle_asset_id])


class AudioPlan(TimestampMixin, Base):
    __tablename__ = "audio_plans"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), unique=True, index=True)
    music_prompt: Mapped[str] = mapped_column(Text, default="")
    sound_effects_list: Mapped[str] = mapped_column(Text, default="")
    voiceover_script: Mapped[str] = mapped_column(Text, default="")
    subtitle_script: Mapped[str] = mapped_column(Text, default="")
    audio_notes: Mapped[str] = mapped_column(Text, default="")

    project: Mapped[Project] = relationship(back_populates="audio_plan")


class ChecklistItem(TimestampMixin, Base):
    __tablename__ = "checklist_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), index=True)
    label: Mapped[str] = mapped_column(String(200))
    checked: Mapped[bool] = mapped_column(Boolean, default=False)
    position: Mapped[int] = mapped_column(Integer, default=0)

    project: Mapped[Project] = relationship(back_populates="checklist_items")
