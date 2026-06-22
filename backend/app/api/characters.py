from fastapi import APIRouter, Depends, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import models, schemas, services
from ..database import get_db

router = APIRouter()


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
