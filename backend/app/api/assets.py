from fastapi import APIRouter, Depends, File, Form, Response, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import models, schemas, services
from ..asset_storage import delete_asset_file, resolve_asset_file, save_upload_file
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


@router.post("/projects/{project_id}/assets/upload", response_model=schemas.AssetRead, status_code=201)
async def upload_asset(
    project_id: int,
    asset_type: schemas.AssetType = Form(...),
    shot_id: int | None = Form(None),
    notes: str = Form(""),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
) -> models.Asset:
    services.project_or_404(db, project_id)
    services.ensure_asset_shot_matches_project(db, project_id, shot_id)
    stored = await save_upload_file(project_id, file)
    asset = models.Asset(
        project_id=project_id,
        shot_id=shot_id,
        asset_type=asset_type,
        filename_or_path=stored["original_filename"],
        original_filename=stored["original_filename"],
        stored_filename=stored["stored_filename"],
        relative_path=stored["relative_path"],
        mime_type=stored["mime_type"],
        size_bytes=stored["size_bytes"],
        notes=notes,
    )
    db.add(asset)
    db.commit()
    db.refresh(asset)
    return asset


@router.get("/assets/{asset_id}/file")
def get_asset_file(asset_id: int, db: Session = Depends(get_db)) -> FileResponse:
    asset = db.get(models.Asset, asset_id)
    if asset is None:
        raise services.not_found("Asset")
    path = resolve_asset_file(asset.relative_path)
    filename = asset.original_filename or asset.filename_or_path or path.name
    return FileResponse(path, media_type=asset.mime_type or None, filename=filename)


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
    services.ensure_asset_not_used_as_anchor(db, asset_id)
    relative_path = asset.relative_path
    db.delete(asset)
    db.commit()
    delete_asset_file(relative_path)
    return Response(status_code=204)
