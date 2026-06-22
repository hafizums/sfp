from collections.abc import Sequence

from fastapi import HTTPException
from sqlalchemy import func, select
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

QUALITY_GATE_TEMPLATE = [
    "Character consistency checked",
    "Location continuity checked",
    "Visual style matches Production Bible",
    "Camera movement matches shot plan",
    "Safety rules passed",
    "No text/logos/watermarks",
    "No distorted faces/hands",
    "Shot asset attached if generated",
    "Prompt package ready",
    "Ready for review",
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
    data["production_bible_locked"] = bool(project.production_bible and project.production_bible.locked)
    data["quality_review_count"] = len(project.quality_reviews)
    data["shots_approved_for_final"] = sum(1 for review in project.quality_reviews if review.approved_for_final)
    takes = [take for shot in project.shots for take in shot.takes]
    approved_take_shot_ids = {take.shot_id for take in takes if take.approved_for_final}
    data["take_count"] = len(takes)
    data["shots_with_approved_take"] = len(approved_take_shot_ids)
    data["final_edit_readiness_percent"] = (
        round((len(approved_take_shot_ids) / len(project.shots)) * 100) if project.shots else 0
    )
    return schemas.ProjectRead(**data)


def create_default_children(db: Session, project: models.Project) -> None:
    db.add(models.StoryWorkspace(project=project))
    db.add(default_production_bible(project))
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


def default_production_bible(project: models.Project) -> models.ProductionBible:
    safety_rules = "\n".join(project.safety_rules or schemas.DEFAULT_SAFETY_RULES)
    return models.ProductionBible(
        project=project,
        visual_style=project.visual_style,
        camera_language="Gentle cinematic camera language with clear framing, readable action, and kid-safe motion.",
        character_consistency_rules="Keep character age, outfit, silhouette, personality, and facial features consistent across every shot.",
        location_consistency_rules="Keep geography, scale, palette, lighting direction, and recurring landmarks consistent.",
        prop_consistency_rules="Keep hero props recognizable and avoid unexplained shape, color, or scale changes.",
        safety_rules=safety_rules,
        negative_prompt_rules=(
            "no violence, no horror, no blood, no weapons, no unsafe stunts, no scary danger, "
            "no text, no logos, no subtitles, no UI, no captions, no watermarks, no distorted faces, "
            "no distorted hands, no extra fingers, no identity drift"
        ),
        music_style=f"{project.tone} music for a warm kids adventure",
        voiceover_style="Warm, simple, age 4+ friendly narration.",
        subtitle_style="Short, readable subtitles with simple vocabulary.",
        final_delivery_specs=f"{project.aspect_ratio}, target runtime {project.target_runtime_seconds} seconds, age {project.audience_age}, private local planning workflow.",
    )


def get_or_create_production_bible(db: Session, project_id: int) -> models.ProductionBible:
    project = project_or_404(db, project_id)
    if project.production_bible is None:
        bible = default_production_bible(project)
        db.add(bible)
        db.commit()
        db.refresh(bible)
        return bible
    return project.production_bible


def update_production_bible(
    db: Session,
    project_id: int,
    payload: schemas.ProductionBibleUpdate,
) -> models.ProductionBible:
    bible = get_or_create_production_bible(db, project_id)
    if bible.locked:
        raise HTTPException(status_code=409, detail="Production Bible is locked. Unlock it before editing.")
    apply_updates(bible, payload)
    db.commit()
    db.refresh(bible)
    return bible


def set_production_bible_locked(db: Session, project_id: int, locked: bool) -> models.ProductionBible:
    bible = get_or_create_production_bible(db, project_id)
    bible.locked = locked
    db.commit()
    db.refresh(bible)
    return bible


def get_or_create_quality_review(db: Session, shot_id: int) -> models.ShotQualityReview:
    shot = shot_or_404(db, shot_id)
    review = db.scalar(select(models.ShotQualityReview).where(models.ShotQualityReview.shot_id == shot_id))
    if review is None:
        review = models.ShotQualityReview(project_id=shot.project_id, shot_id=shot.id)
        db.add(review)
        db.commit()
        db.refresh(review)
    return review


def update_quality_review(
    db: Session,
    shot_id: int,
    payload: schemas.ShotQualityReviewUpdate,
) -> models.ShotQualityReview:
    review = get_or_create_quality_review(db, shot_id)
    apply_updates(review, payload)
    db.commit()
    db.refresh(review)
    return review


def shot_take_or_404(db: Session, take_id: int) -> models.ShotTake:
    take = db.get(models.ShotTake, take_id)
    if take is None:
        raise not_found("Shot take")
    return take


def list_shot_takes(db: Session, shot_id: int) -> list[models.ShotTake]:
    shot_or_404(db, shot_id)
    return db.scalars(
        select(models.ShotTake).where(models.ShotTake.shot_id == shot_id).order_by(models.ShotTake.created_at.desc())
    ).all()


def create_shot_take(db: Session, shot_id: int, payload: schemas.ShotTakeCreate) -> models.ShotTake:
    shot = shot_or_404(db, shot_id)
    _validate_take_assets(db, shot, payload)
    data = payload.model_dump()
    data["take_label"] = payload.take_label or next_take_label(db, shot_id)
    data["prompt_snapshot"] = payload.prompt_snapshot if payload.prompt_snapshot is not None else build_take_prompt_snapshot(shot)
    data["negative_prompt_snapshot"] = (
        payload.negative_prompt_snapshot if payload.negative_prompt_snapshot is not None else shot.negative_prompt
    )
    take = models.ShotTake(project_id=shot.project_id, shot_id=shot.id, **data)
    db.add(take)
    db.flush()
    if take.approved_for_final:
        _unapprove_other_takes(db, take)
        take.status = "Approved"
    db.commit()
    db.refresh(take)
    return take


def update_shot_take(db: Session, take_id: int, payload: schemas.ShotTakeUpdate) -> models.ShotTake:
    take = shot_take_or_404(db, take_id)
    shot = shot_or_404(db, take.shot_id)
    _validate_take_assets(db, shot, payload)
    apply_updates(take, payload)
    if take.approved_for_final:
        _unapprove_other_takes(db, take)
        take.status = "Approved"
    db.commit()
    db.refresh(take)
    return take


def approve_shot_take(db: Session, take_id: int) -> models.ShotTake:
    take = shot_take_or_404(db, take_id)
    _unapprove_other_takes(db, take)
    take.approved_for_final = True
    take.status = "Approved"
    db.commit()
    db.refresh(take)
    return take


def reject_shot_take(db: Session, take_id: int, rejected_reason: str = "") -> models.ShotTake:
    take = shot_take_or_404(db, take_id)
    take.approved_for_final = False
    take.status = "Rejected"
    take.rejected_reason = rejected_reason
    db.commit()
    db.refresh(take)
    return take


def delete_shot_take(db: Session, take_id: int) -> None:
    take = shot_take_or_404(db, take_id)
    db.delete(take)
    db.commit()


def next_take_label(db: Session, shot_id: int) -> str:
    count = db.scalar(select(func.count(models.ShotTake.id)).where(models.ShotTake.shot_id == shot_id))
    if count is None:
        count = 0
    index = count + 1
    letters = ""
    while index:
        index, remainder = divmod(index - 1, 26)
        letters = chr(65 + remainder) + letters
    return f"Take {letters}"


def build_take_prompt_snapshot(shot: models.Shot) -> str:
    return "\n\n".join(
        [
            f"Image prompt:\n{shot.image_prompt}",
            f"Start frame prompt:\n{shot.start_frame_prompt}",
            f"End frame prompt:\n{shot.end_frame_prompt}",
            f"Video prompt:\n{shot.video_prompt}",
        ]
    ).strip()


def _validate_take_assets(
    db: Session,
    shot: models.Shot,
    payload: schemas.ShotTakeCreate | schemas.ShotTakeUpdate,
) -> None:
    for field in [
        "start_frame_asset_id",
        "end_frame_asset_id",
        "video_asset_id",
        "audio_asset_id",
        "subtitle_asset_id",
    ]:
        if field not in payload.model_fields_set:
            continue
        asset_id = getattr(payload, field)
        if asset_id is None:
            continue
        asset = db.get(models.Asset, asset_id)
        if asset is None:
            raise not_found("Asset")
        if asset.project_id != shot.project_id:
            raise HTTPException(status_code=400, detail=f"{field} must belong to this project")
        if asset.shot_id is not None and asset.shot_id != shot.id:
            raise HTTPException(status_code=400, detail=f"{field} must be project-level or belong to this shot")


def _unapprove_other_takes(db: Session, take: models.ShotTake) -> None:
    other_takes = db.scalars(
        select(models.ShotTake).where(models.ShotTake.shot_id == take.shot_id, models.ShotTake.id != take.id)
    ).all()
    for other in other_takes:
        other.approved_for_final = False
        if other.status == "Approved":
            other.status = "Ready for review"


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
