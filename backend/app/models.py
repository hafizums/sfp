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
