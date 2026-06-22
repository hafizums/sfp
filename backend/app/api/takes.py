from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from .. import models, schemas, services
from ..database import get_db

router = APIRouter()


@router.get("/shots/{shot_id}/takes", response_model=list[schemas.ShotTakeRead])
def list_shot_takes(shot_id: int, db: Session = Depends(get_db)) -> list[models.ShotTake]:
    return services.list_shot_takes(db, shot_id)


@router.post("/shots/{shot_id}/takes", response_model=schemas.ShotTakeRead, status_code=status.HTTP_201_CREATED)
def create_shot_take(
    shot_id: int,
    payload: schemas.ShotTakeCreate,
    db: Session = Depends(get_db),
) -> models.ShotTake:
    return services.create_shot_take(db, shot_id, payload)


@router.get("/shot-takes/{take_id}", response_model=schemas.ShotTakeRead)
def get_shot_take(take_id: int, db: Session = Depends(get_db)) -> models.ShotTake:
    return services.shot_take_or_404(db, take_id)


@router.put("/shot-takes/{take_id}", response_model=schemas.ShotTakeRead)
def update_shot_take(
    take_id: int,
    payload: schemas.ShotTakeUpdate,
    db: Session = Depends(get_db),
) -> models.ShotTake:
    return services.update_shot_take(db, take_id, payload)


@router.delete("/shot-takes/{take_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_shot_take(take_id: int, db: Session = Depends(get_db)) -> Response:
    services.delete_shot_take(db, take_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/shot-takes/{take_id}/approve", response_model=schemas.ShotTakeRead)
def approve_shot_take(take_id: int, db: Session = Depends(get_db)) -> models.ShotTake:
    return services.approve_shot_take(db, take_id)


@router.post("/shot-takes/{take_id}/reject", response_model=schemas.ShotTakeRead)
def reject_shot_take(
    take_id: int,
    payload: schemas.ShotTakeRejectRequest,
    db: Session = Depends(get_db),
) -> models.ShotTake:
    return services.reject_shot_take(db, take_id, payload.rejected_reason)
