from fastapi import APIRouter, Depends, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import models, schemas, services
from ..database import get_db

router = APIRouter()


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/projects", response_model=list[schemas.ProjectRead])
def list_projects(db: Session = Depends(get_db)) -> list[schemas.ProjectRead]:
    projects = db.scalars(select(models.Project).order_by(models.Project.updated_at.desc())).all()
    return [services.enrich_project(project) for project in projects]


@router.post("/projects", response_model=schemas.ProjectRead, status_code=status.HTTP_201_CREATED)
def create_project(payload: schemas.ProjectCreate, db: Session = Depends(get_db)) -> schemas.ProjectRead:
    project = services.create_project(db, payload)
    return services.enrich_project(project)


@router.get("/projects/{project_id}", response_model=schemas.ProjectRead)
def get_project(project_id: int, db: Session = Depends(get_db)) -> schemas.ProjectRead:
    return services.enrich_project(services.project_or_404(db, project_id))


@router.put("/projects/{project_id}", response_model=schemas.ProjectRead)
def update_project(
    project_id: int, payload: schemas.ProjectUpdate, db: Session = Depends(get_db)
) -> schemas.ProjectRead:
    project = services.project_or_404(db, project_id)
    services.apply_updates(project, payload)
    db.commit()
    db.refresh(project)
    return services.enrich_project(project)


@router.delete("/projects/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(project_id: int, db: Session = Depends(get_db)) -> Response:
    project = services.project_or_404(db, project_id)
    db.delete(project)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/projects/{project_id}/story-interview", response_model=schemas.StoryInterviewRead)
def get_story_interview(project_id: int, db: Session = Depends(get_db)) -> models.StoryInterview:
    return services.get_or_create_story_interview(db, project_id)


@router.put("/projects/{project_id}/story-interview", response_model=schemas.StoryInterviewRead)
def save_story_interview(
    project_id: int, payload: schemas.StoryInterviewBase, db: Session = Depends(get_db)
) -> models.StoryInterview:
    interview = services.get_or_create_story_interview(db, project_id)
    services.apply_updates(interview, payload)
    db.commit()
    db.refresh(interview)
    return interview


@router.get("/projects/{project_id}/workspace", response_model=schemas.StoryWorkspaceRead)
def get_workspace(project_id: int, db: Session = Depends(get_db)) -> models.StoryWorkspace:
    return services.get_or_create_workspace(db, project_id)


@router.put("/projects/{project_id}/workspace", response_model=schemas.StoryWorkspaceRead)
def save_workspace(
    project_id: int, payload: schemas.StoryWorkspaceBase, db: Session = Depends(get_db)
) -> models.StoryWorkspace:
    workspace = services.get_or_create_workspace(db, project_id)
    services.apply_updates(workspace, payload)
    db.commit()
    db.refresh(workspace)
    return workspace


@router.get("/projects/{project_id}/characters", response_model=list[schemas.CharacterRead])
def list_characters(project_id: int, db: Session = Depends(get_db)) -> list[models.Character]:
    services.project_or_404(db, project_id)
    return db.scalars(
        select(models.Character).where(models.Character.project_id == project_id).order_by(models.Character.name)
    ).all()


@router.post("/projects/{project_id}/characters", response_model=schemas.CharacterRead, status_code=201)
def create_character(
    project_id: int, payload: schemas.CharacterBase, db: Session = Depends(get_db)
) -> models.Character:
    services.project_or_404(db, project_id)
    character = models.Character(project_id=project_id, **payload.model_dump())
    db.add(character)
    db.commit()
    db.refresh(character)
    return character


@router.put("/characters/{character_id}", response_model=schemas.CharacterRead)
def update_character(
    character_id: int, payload: schemas.CharacterUpdate, db: Session = Depends(get_db)
) -> models.Character:
    character = db.get(models.Character, character_id)
    if character is None:
        raise services.not_found("Character")
    services.apply_updates(character, payload)
    db.commit()
    db.refresh(character)
    return character


@router.delete("/characters/{character_id}", status_code=204)
def delete_character(character_id: int, db: Session = Depends(get_db)) -> Response:
    character = db.get(models.Character, character_id)
    if character is None:
        raise services.not_found("Character")
    db.delete(character)
    db.commit()
    return Response(status_code=204)


@router.get("/projects/{project_id}/locations", response_model=list[schemas.LocationRead])
def list_locations(project_id: int, db: Session = Depends(get_db)) -> list[models.Location]:
    services.project_or_404(db, project_id)
    return db.scalars(
        select(models.Location).where(models.Location.project_id == project_id).order_by(models.Location.name)
    ).all()


@router.post("/projects/{project_id}/locations", response_model=schemas.LocationRead, status_code=201)
def create_location(
    project_id: int, payload: schemas.LocationBase, db: Session = Depends(get_db)
) -> models.Location:
    services.project_or_404(db, project_id)
    location = models.Location(project_id=project_id, **payload.model_dump())
    db.add(location)
    db.commit()
    db.refresh(location)
    return location


@router.put("/locations/{location_id}", response_model=schemas.LocationRead)
def update_location(
    location_id: int, payload: schemas.LocationUpdate, db: Session = Depends(get_db)
) -> models.Location:
    location = db.get(models.Location, location_id)
    if location is None:
        raise services.not_found("Location")
    services.apply_updates(location, payload)
    db.commit()
    db.refresh(location)
    return location


@router.delete("/locations/{location_id}", status_code=204)
def delete_location(location_id: int, db: Session = Depends(get_db)) -> Response:
    location = db.get(models.Location, location_id)
    if location is None:
        raise services.not_found("Location")
    db.delete(location)
    db.commit()
    return Response(status_code=204)


@router.get("/projects/{project_id}/shots", response_model=list[schemas.ShotRead])
def list_shots(project_id: int, db: Session = Depends(get_db)) -> list[models.Shot]:
    services.project_or_404(db, project_id)
    return db.scalars(
        select(models.Shot).where(models.Shot.project_id == project_id).order_by(models.Shot.shot_number)
    ).all()


@router.post("/projects/{project_id}/shots", response_model=schemas.ShotRead, status_code=201)
def create_shot(project_id: int, payload: schemas.ShotCreate, db: Session = Depends(get_db)) -> models.Shot:
    services.project_or_404(db, project_id)
    shot = models.Shot(
        project_id=project_id,
        shot_number=services.next_shot_number(db, project_id),
        **payload.model_dump(),
    )
    db.add(shot)
    db.commit()
    db.refresh(shot)
    return shot


@router.put("/shots/{shot_id}", response_model=schemas.ShotRead)
def update_shot(shot_id: int, payload: schemas.ShotUpdate, db: Session = Depends(get_db)) -> models.Shot:
    shot = services.shot_or_404(db, shot_id)
    services.apply_updates(shot, payload)
    db.commit()
    db.refresh(shot)
    return shot


@router.delete("/shots/{shot_id}", status_code=204)
def delete_shot(shot_id: int, db: Session = Depends(get_db)) -> Response:
    shot = services.shot_or_404(db, shot_id)
    project_id = shot.project_id
    db.delete(shot)
    db.commit()
    services.renumber_shots(db, project_id)
    return Response(status_code=204)


@router.post("/projects/{project_id}/shots/reorder", response_model=list[schemas.ShotRead])
def reorder_shots(
    project_id: int, payload: schemas.ShotReorder, db: Session = Depends(get_db)
) -> list[models.Shot]:
    return services.reorder_shots(db, project_id, payload.shot_ids)


@router.get("/projects/{project_id}/assets", response_model=list[schemas.AssetRead])
def list_assets(project_id: int, db: Session = Depends(get_db)) -> list[models.Asset]:
    services.project_or_404(db, project_id)
    return db.scalars(
        select(models.Asset).where(models.Asset.project_id == project_id).order_by(models.Asset.created_at.desc())
    ).all()


@router.post("/projects/{project_id}/assets", response_model=schemas.AssetRead, status_code=201)
def create_asset(project_id: int, payload: schemas.AssetBase, db: Session = Depends(get_db)) -> models.Asset:
    services.project_or_404(db, project_id)
    services.ensure_asset_shot_matches_project(db, project_id, payload.shot_id)
    asset = models.Asset(project_id=project_id, **payload.model_dump())
    db.add(asset)
    db.commit()
    db.refresh(asset)
    return asset


@router.put("/assets/{asset_id}", response_model=schemas.AssetRead)
def update_asset(asset_id: int, payload: schemas.AssetUpdate, db: Session = Depends(get_db)) -> models.Asset:
    asset = db.get(models.Asset, asset_id)
    if asset is None:
        raise services.not_found("Asset")
    services.ensure_asset_shot_matches_project(db, asset.project_id, payload.shot_id)
    services.apply_updates(asset, payload)
    db.commit()
    db.refresh(asset)
    return asset


@router.delete("/assets/{asset_id}", status_code=204)
def delete_asset(asset_id: int, db: Session = Depends(get_db)) -> Response:
    asset = db.get(models.Asset, asset_id)
    if asset is None:
        raise services.not_found("Asset")
    db.delete(asset)
    db.commit()
    return Response(status_code=204)


@router.get("/projects/{project_id}/audio-plan", response_model=schemas.AudioPlanRead)
def get_audio_plan(project_id: int, db: Session = Depends(get_db)) -> models.AudioPlan:
    return services.get_or_create_audio_plan(db, project_id)


@router.put("/projects/{project_id}/audio-plan", response_model=schemas.AudioPlanRead)
def save_audio_plan(
    project_id: int, payload: schemas.AudioPlanBase, db: Session = Depends(get_db)
) -> models.AudioPlan:
    audio_plan = services.get_or_create_audio_plan(db, project_id)
    services.apply_updates(audio_plan, payload)
    db.commit()
    db.refresh(audio_plan)
    return audio_plan


@router.get("/projects/{project_id}/checklist", response_model=list[schemas.ChecklistItemRead])
def get_checklist(project_id: int, db: Session = Depends(get_db)) -> list[models.ChecklistItem]:
    project = services.project_or_404(db, project_id)
    if not project.checklist_items:
        for position, label in enumerate(services.DEFAULT_CHECKLIST, start=1):
            db.add(models.ChecklistItem(project_id=project_id, label=label, position=position))
        db.commit()
        db.refresh(project)
    return project.checklist_items


@router.patch("/checklist/{item_id}", response_model=schemas.ChecklistItemRead)
def update_checklist_item(
    item_id: int, payload: schemas.ChecklistItemUpdate, db: Session = Depends(get_db)
) -> models.ChecklistItem:
    item = db.get(models.ChecklistItem, item_id)
    if item is None:
        raise services.not_found("Checklist item")
    item.checked = payload.checked
    db.commit()
    db.refresh(item)
    return item
