from fastapi import APIRouter, Depends, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import models, schemas, services
from ..database import get_db

router = APIRouter()


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
