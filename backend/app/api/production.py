from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import schemas, services
from ..database import get_db

router = APIRouter()


@router.get("/projects/{project_id}/production-bible", response_model=schemas.ProductionBibleRead)
def get_production_bible(project_id: int, db: Session = Depends(get_db)) -> schemas.ProductionBibleRead:
    return services.get_or_create_production_bible(db, project_id)


@router.put("/projects/{project_id}/production-bible", response_model=schemas.ProductionBibleRead)
def update_production_bible(
    project_id: int,
    payload: schemas.ProductionBibleUpdate,
    db: Session = Depends(get_db),
) -> schemas.ProductionBibleRead:
    return services.update_production_bible(db, project_id, payload)


@router.post("/projects/{project_id}/production-bible/lock", response_model=schemas.ProductionBibleRead)
def lock_production_bible(project_id: int, db: Session = Depends(get_db)) -> schemas.ProductionBibleRead:
    return services.set_production_bible_locked(db, project_id, True)


@router.post("/projects/{project_id}/production-bible/unlock", response_model=schemas.ProductionBibleRead)
def unlock_production_bible(project_id: int, db: Session = Depends(get_db)) -> schemas.ProductionBibleRead:
    return services.set_production_bible_locked(db, project_id, False)
