from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import schemas, services
from ..database import get_db

router = APIRouter()


@router.get("/shots/{shot_id}/quality-review", response_model=schemas.ShotQualityReviewRead)
def get_shot_quality_review(shot_id: int, db: Session = Depends(get_db)) -> schemas.ShotQualityReviewRead:
    return services.get_or_create_quality_review(db, shot_id)


@router.put("/shots/{shot_id}/quality-review", response_model=schemas.ShotQualityReviewRead)
def update_shot_quality_review(
    shot_id: int,
    payload: schemas.ShotQualityReviewUpdate,
    db: Session = Depends(get_db),
) -> schemas.ShotQualityReviewRead:
    return services.update_quality_review(db, shot_id, payload)
