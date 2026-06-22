from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..ai.openai_client import OpenAIStoryPackageClient, StoryPackageProvider
from ..ai.schemas import GeneratedStoryPackage, StoryPackageApplyRequest, StoryPackageApplyResponse
from ..ai.story_service import apply_story_package, preview_story_package
from ..database import get_db

router = APIRouter()


def get_story_package_provider() -> StoryPackageProvider:
    return OpenAIStoryPackageClient()


@router.post("/projects/{project_id}/ai/story-package/preview", response_model=GeneratedStoryPackage)
def preview_ai_story_package(
    project_id: int,
    db: Session = Depends(get_db),
    provider: StoryPackageProvider = Depends(get_story_package_provider),
) -> GeneratedStoryPackage:
    return preview_story_package(db, project_id, provider)


@router.post("/projects/{project_id}/ai/story-package/apply", response_model=StoryPackageApplyResponse)
def apply_ai_story_package(
    project_id: int,
    payload: StoryPackageApplyRequest,
    db: Session = Depends(get_db),
) -> StoryPackageApplyResponse:
    return apply_story_package(db, project_id, payload)
