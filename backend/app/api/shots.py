from fastapi import APIRouter, Depends, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import models, schemas, services
from ..database import get_db

router = APIRouter()


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
