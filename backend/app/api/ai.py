from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..ai.openai_client import (
    OpenAIShotPromptClient,
    OpenAIStoryPackageClient,
    ShotPromptProvider,
    StoryPackageProvider,
)
from ..ai.schemas import (
    GeneratedShotPromptPackage,
    GeneratedStoryPackage,
    ShotPromptApplyRequest,
    ShotPromptApplyResponse,
    ShotPromptPreviewRequest,
    StoryPackageApplyRequest,
    StoryPackageApplyResponse,
)
from ..ai.shot_prompt_service import apply_shot_prompts, preview_shot_prompts
from ..ai.story_service import apply_story_package, preview_story_package
from ..database import get_db

router = APIRouter()


def get_story_package_provider() -> StoryPackageProvider:
    return OpenAIStoryPackageClient()


def get_shot_prompt_provider() -> ShotPromptProvider:
    return OpenAIShotPromptClient()


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


@router.post("/projects/{project_id}/ai/shot-prompts/preview", response_model=list[GeneratedShotPromptPackage])
def preview_ai_shot_prompts(
    project_id: int,
    payload: ShotPromptPreviewRequest,
    db: Session = Depends(get_db),
    provider: ShotPromptProvider = Depends(get_shot_prompt_provider),
) -> list[GeneratedShotPromptPackage]:
    return preview_shot_prompts(db, project_id, payload, provider)


@router.post("/projects/{project_id}/ai/shot-prompts/apply", response_model=ShotPromptApplyResponse)
def apply_ai_shot_prompts(
    project_id: int,
    payload: ShotPromptApplyRequest,
    db: Session = Depends(get_db),
) -> ShotPromptApplyResponse:
    return apply_shot_prompts(db, project_id, payload)
