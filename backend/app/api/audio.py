from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import models, schemas, services
from ..database import get_db

router = APIRouter()


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
