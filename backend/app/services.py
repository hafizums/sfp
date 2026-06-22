from collections.abc import Sequence

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from . import models, schemas

DEFAULT_CHECKLIST = [
    "All shots approved",
    "All videos generated",
    "Character consistency checked",
    "Location consistency checked",
    "Music selected",
    "Sound effects prepared",
    "Voiceover ready",
    "Subtitles ready",
    "Runtime close to 3 minutes",
    "Ready for final edit",
]


def not_found(name: str) -> HTTPException:
    return HTTPException(status_code=404, detail=f"{name} not found")


def project_or_404(db: Session, project_id: int) -> models.Project:
    project = db.get(models.Project, project_id)
    if project is None:
        raise not_found("Project")
    return project


def shot_or_404(db: Session, shot_id: int) -> models.Shot:
    shot = db.get(models.Shot, shot_id)
    if shot is None:
        raise not_found("Shot")
    return shot


def calculate_runtime(shots: Sequence[models.Shot]) -> int:
    return sum(shot.duration_seconds for shot in shots)


def calculate_progress(shots: Sequence[models.Shot]) -> int:
    if not shots:
        return 0
    finished = sum(1 for shot in shots if shot.status in {"Approved", "Added to final edit"})
    return round((finished / len(shots)) * 100)


def enrich_project(project: models.Project) -> schemas.ProjectRead:
    data = schemas.ProjectRead.model_validate(project).model_dump()
    data["current_planned_runtime"] = calculate_runtime(project.shots)
    data["shot_count"] = len(project.shots)
    data["progress"] = calculate_progress(project.shots)
    return schemas.ProjectRead(**data)


def create_default_children(db: Session, project: models.Project) -> None:
    db.add(models.StoryWorkspace(project=project))
    db.add(models.AudioPlan(project=project))
    for position, label in enumerate(DEFAULT_CHECKLIST, start=1):
        db.add(models.ChecklistItem(project=project, label=label, position=position))


def create_project(db: Session, payload: schemas.ProjectCreate) -> models.Project:
    project = models.Project(**payload.model_dump())
    db.add(project)
    db.flush()
    create_default_children(db, project)
    db.commit()
    db.refresh(project)
    return project


def apply_updates(instance: object, payload: object) -> object:
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(instance, key, value)
    return instance


def get_or_create_story_interview(db: Session, project_id: int) -> models.StoryInterview:
    project = project_or_404(db, project_id)
    if project.story_interview is None:
        project.story_interview = models.StoryInterview()
        db.commit()
        db.refresh(project.story_interview)
    return project.story_interview


def get_or_create_workspace(db: Session, project_id: int) -> models.StoryWorkspace:
    project = project_or_404(db, project_id)
    if project.workspace is None:
        project.workspace = models.StoryWorkspace()
        db.commit()
        db.refresh(project.workspace)
    return project.workspace


def get_or_create_audio_plan(db: Session, project_id: int) -> models.AudioPlan:
    project = project_or_404(db, project_id)
    if project.audio_plan is None:
        project.audio_plan = models.AudioPlan()
        db.commit()
        db.refresh(project.audio_plan)
    return project.audio_plan


def next_shot_number(db: Session, project_id: int) -> int:
    shots = db.scalars(
        select(models.Shot).where(models.Shot.project_id == project_id).order_by(models.Shot.shot_number)
    ).all()
    return len(shots) + 1


def renumber_shots(db: Session, project_id: int) -> list[models.Shot]:
    shots = db.scalars(
        select(models.Shot).where(models.Shot.project_id == project_id).order_by(models.Shot.shot_number, models.Shot.id)
    ).all()
    for index, shot in enumerate(shots, start=1):
        shot.shot_number = index
    db.commit()
    return shots


def reorder_shots(db: Session, project_id: int, shot_ids: list[int]) -> list[models.Shot]:
    project = project_or_404(db, project_id)
    current_ids = [shot.id for shot in project.shots]
    if set(shot_ids) != set(current_ids) or len(shot_ids) != len(current_ids):
        raise HTTPException(
            status_code=400,
            detail="shot_ids must include every shot in this project exactly once",
        )
    positions = {shot_id: index for index, shot_id in enumerate(shot_ids, start=1)}
    for shot in project.shots:
        shot.shot_number = positions[shot.id]
    db.commit()
    return db.scalars(
        select(models.Shot).where(models.Shot.project_id == project_id).order_by(models.Shot.shot_number)
    ).all()


def ensure_asset_shot_matches_project(db: Session, project_id: int, shot_id: int | None) -> None:
    if shot_id is None:
        return
    shot = shot_or_404(db, shot_id)
    if shot.project_id != project_id:
        raise HTTPException(status_code=400, detail="shot_id does not belong to this project")
