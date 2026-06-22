from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import models, services
from .openai_client import ShotPromptProvider
from .schemas import (
    GeneratedShotPromptPackage,
    GeneratedShotPromptPreview,
    ShotPromptApplyRequest,
    ShotPromptApplyResponse,
    ShotPromptPreviewRequest,
)

PROMPT_FIELDS = [
    "image_prompt",
    "start_frame_prompt",
    "end_frame_prompt",
    "video_prompt",
    "negative_prompt",
]


def preview_shot_prompts(
    db: Session,
    project_id: int,
    payload: ShotPromptPreviewRequest,
    provider: ShotPromptProvider,
) -> list[GeneratedShotPromptPackage]:
    project = services.project_or_404(db, project_id)
    shots = _selected_shots_or_400(db, project, payload.shot_ids)
    prompt = build_shot_prompt_generation_prompt(project, shots)
    preview = provider.generate_shot_prompts(prompt)
    if not isinstance(preview, GeneratedShotPromptPreview):
        raise HTTPException(status_code=502, detail="OpenAI returned invalid shot prompt packages.")
    _validate_provider_shot_ids(preview, shots)
    return preview.packages


def apply_shot_prompts(
    db: Session,
    project_id: int,
    payload: ShotPromptApplyRequest,
) -> ShotPromptApplyResponse:
    project = services.project_or_404(db, project_id)
    shot_ids = [package.shot_id for package in payload.packages]
    shots = _selected_shots_or_400(db, project, shot_ids)
    shot_by_id = {shot.id: shot for shot in shots}
    response = ShotPromptApplyResponse()
    touched_shot_ids: set[int] = set()

    for package in payload.packages:
        shot = shot_by_id[package.shot_id]
        for field in PROMPT_FIELDS:
            existing = getattr(shot, field)
            generated = getattr(package, field)
            label = f"shot {shot.shot_number} {field}"
            if existing and not payload.overwrite:
                response.skipped.append(label)
                continue
            setattr(shot, field, generated)
            response.applied.append(label)
            touched_shot_ids.add(shot.id)
        if shot.status == "Draft" and shot.id in touched_shot_ids:
            shot.status = "Prompt ready"

    response.updated_shots = len(touched_shot_ids)
    db.commit()
    return response


def build_shot_prompt_generation_prompt(project: models.Project, shots: list[models.Shot]) -> str:
    workspace = project.workspace
    characters = project.characters
    locations = project.locations
    safety_rules = "\n".join(f"- {rule}" for rule in project.safety_rules)
    story_context = ""
    if workspace:
        story_context = f"""
Logline: {workspace.logline}
Synopsis: {workspace.synopsis}
Three-act structure: {workspace.three_act_structure}
Screenplay: {workspace.cinematic_screenplay}
""".strip()

    character_context = "\n".join(
        f"- {character.name}: role={character.role}; age={character.age}; appearance={character.appearance}; outfit={character.outfit}; personality={character.personality}; continuity={character.continuity_prompt}; avoid={character.negative_prompt}"
        for character in characters
    ) or "- No character bible entries yet; rely only on shot details."

    location_context = "\n".join(
        f"- {location.name}: description={location.description}; mood={location.mood}; lighting={location.lighting}; palette={location.color_palette}; continuity={location.continuity_prompt}; safety={location.safety_notes}; avoid={location.negative_prompt}"
        for location in locations
    ) or "- No location bible entries yet; rely only on shot details."

    shot_context = "\n".join(
        f"""- shot_id={shot.id}; shot_number={shot.shot_number}; scene_number={shot.scene_number}; duration_seconds={shot.duration_seconds}; purpose={shot.purpose}; camera_framing={shot.camera_framing}; camera_movement={shot.camera_movement}; characters_present={shot.characters_present}; location_name={shot.location_name}; action={shot.action}; emotion={shot.emotion}; notes={shot.notes}"""
        for shot in shots
    )

    return f"""
Generate copy-ready Wan 2.2 / WaveSpeed manual prompt fields for the selected storyboard shots.

Project:
- title: {project.title}
- genre: {project.genre}
- target runtime: {project.target_runtime_seconds} seconds
- audience: {project.audience_age}
- tone: {project.tone}
- aspect ratio: {project.aspect_ratio}
- visual style: {project.visual_style}

Safety rules:
{safety_rules}
- No scary danger
- No text, logos, subtitles, UI, captions, or watermarks inside generated visuals
- Avoid face morphing, extra fingers, distorted hands, random extra characters, inconsistent outfits, and identity drift

Story workspace:
{story_context or "No story workspace text saved yet."}

Character continuity:
{character_context}

Location continuity:
{location_context}

Selected shots:
{shot_context}

Output requirements:
- Return one package per selected shot using the original shot_id and shot_number
- Generate image_prompt, start_frame_prompt, end_frame_prompt, video_prompt, negative_prompt, and optional notes
- Prompts must be suitable for age 4+, kids adventure, fun, magical, safe, teamwork
- Image prompt should establish the shot as a polished 16:9 cinematic frame
- Start frame prompt should describe a clear opening visual state
- End frame prompt should describe a clear ending visual state
- Video prompt should include camera movement and subject movement for image-to-video / start-end-frame workflow
- Negative prompt should include safety and quality exclusions
- Do not call WaveSpeed or create images/videos
""".strip()


def _selected_shots_or_400(
    db: Session,
    project: models.Project,
    shot_ids: list[int] | None,
) -> list[models.Shot]:
    query = select(models.Shot).where(models.Shot.project_id == project.id).order_by(models.Shot.shot_number)
    if shot_ids:
        query = query.where(models.Shot.id.in_(shot_ids))
    shots = db.scalars(query).all()
    if shot_ids:
        found_ids = {shot.id for shot in shots}
        missing_ids = set(shot_ids) - found_ids
        if missing_ids:
            raise HTTPException(status_code=400, detail="shot_ids must belong to this project.")
    if not shots:
        raise HTTPException(status_code=400, detail="Project must have shots before generating Wan 2.2 prompts.")
    return shots


def _validate_provider_shot_ids(preview: GeneratedShotPromptPreview, shots: list[models.Shot]) -> None:
    expected_ids = {shot.id for shot in shots}
    returned_ids = {package.shot_id for package in preview.packages}
    if returned_ids != expected_ids:
        raise HTTPException(status_code=502, detail="OpenAI returned shot prompt packages for the wrong shots.")
