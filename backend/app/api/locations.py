from fastapi import APIRouter, Depends, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import models, schemas, services
from ..database import get_db

router = APIRouter()


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
