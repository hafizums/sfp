from fastapi import APIRouter, Depends, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import models, schemas, services
from ..asset_storage import delete_asset_file
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
    asset_paths = [asset.relative_path for asset in project.assets]
    db.delete(project)
    db.commit()
    for relative_path in asset_paths:
        delete_asset_file(relative_path)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
