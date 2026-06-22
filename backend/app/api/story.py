from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import models, schemas, services
from ..database import get_db

router = APIRouter()


@router.get("/projects/{project_id}/story-interview", response_model=schemas.StoryInterviewRead)
def get_story_interview(project_id: int, db: Session = Depends(get_db)) -> models.StoryInterview:
    return services.get_or_create_story_interview(db, project_id)


@router.put("/projects/{project_id}/story-interview", response_model=schemas.StoryInterviewRead)
def save_story_interview(
    project_id: int, payload: schemas.StoryInterviewBase, db: Session = Depends(get_db)
) -> models.StoryInterview:
    interview = services.get_or_create_story_interview(db, project_id)
    services.apply_updates(interview, payload)
    db.commit()
    db.refresh(interview)
    return interview


@router.get("/projects/{project_id}/workspace", response_model=schemas.StoryWorkspaceRead)
def get_workspace(project_id: int, db: Session = Depends(get_db)) -> models.StoryWorkspace:
    return services.get_or_create_workspace(db, project_id)


@router.put("/projects/{project_id}/workspace", response_model=schemas.StoryWorkspaceRead)
def save_workspace(
    project_id: int, payload: schemas.StoryWorkspaceBase, db: Session = Depends(get_db)
) -> models.StoryWorkspace:
    workspace = services.get_or_create_workspace(db, project_id)
    services.apply_updates(workspace, payload)
    db.commit()
    db.refresh(workspace)
    return workspace
