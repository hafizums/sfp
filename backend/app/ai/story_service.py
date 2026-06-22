from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import models, services
from .openai_client import StoryPackageProvider
from .schemas import GeneratedStoryPackage, StoryPackageApplyRequest, StoryPackageApplyResponse

INTERVIEW_FIELDS = [
    "title_answer",
    "magical_discovery",
    "main_kid_characters",
    "adventure_beginning",
    "main_adventure_location",
    "small_problem",
    "teamwork_solution",
    "ending_feel",
    "visual_style",
    "avoid",
]

WORKSPACE_FIELDS = [
    "logline",
    "synopsis",
    "three_act_structure",
    "cinematic_screenplay",
    "simple_dialogue_version",
    "voiceover_draft",
    "subtitle_draft",
]


def preview_story_package(
    db: Session,
    project_id: int,
    provider: StoryPackageProvider,
) -> GeneratedStoryPackage:
    project = services.project_or_404(db, project_id)
    interview = _story_interview_or_400(project)
    prompt = build_story_package_prompt(project, interview)
    return provider.generate_story_package(prompt)


def apply_story_package(
    db: Session,
    project_id: int,
    payload: StoryPackageApplyRequest,
) -> StoryPackageApplyResponse:
    project = services.project_or_404(db, project_id)
    package = payload.package
    response = StoryPackageApplyResponse()

    if payload.apply_workspace:
        workspace = services.get_or_create_workspace(db, project_id)
        for field in WORKSPACE_FIELDS:
            existing = getattr(workspace, field)
            generated = getattr(package, field)
            if existing and not payload.overwrite:
                response.skipped.append(field)
                continue
            setattr(workspace, field, generated)
            response.applied.append(field)

    if payload.apply_audio:
        audio_plan = services.get_or_create_audio_plan(db, project_id)
        _apply_audio_field(audio_plan, "music_prompt", package.audio_plan.music_prompt, payload, response)
        _apply_audio_field(audio_plan, "sound_effects_list", package.audio_plan.sound_effects_list, payload, response)
        _apply_audio_field(
            audio_plan,
            "audio_notes",
            f"Final safety review notes:\n{package.safety_review.final_safety_review_notes}",
            payload,
            response,
        )

    if payload.apply_characters:
        existing_names = {
            name.lower()
            for name in db.scalars(
                select(models.Character.name).where(models.Character.project_id == project_id)
            ).all()
        }
        for suggestion in package.suggested_characters:
            if suggestion.name.lower() in existing_names:
                response.skipped.append(f"character:{suggestion.name}")
                continue
            db.add(models.Character(project_id=project_id, **suggestion.model_dump()))
            existing_names.add(suggestion.name.lower())
            response.created_characters += 1

    if payload.apply_locations:
        existing_names = {
            name.lower()
            for name in db.scalars(
                select(models.Location.name).where(models.Location.project_id == project_id)
            ).all()
        }
        for suggestion in package.suggested_locations:
            if suggestion.name.lower() in existing_names:
                response.skipped.append(f"location:{suggestion.name}")
                continue
            db.add(models.Location(project_id=project_id, **suggestion.model_dump()))
            existing_names.add(suggestion.name.lower())
            response.created_locations += 1

    if payload.apply_shots:
        existing_shots = db.scalars(
            select(models.Shot).where(models.Shot.project_id == project_id).order_by(models.Shot.shot_number)
        ).all()
        if existing_shots and not payload.overwrite:
            response.skipped.append("shots")
        else:
            if existing_shots and payload.overwrite:
                for shot in existing_shots:
                    db.delete(shot)
                db.flush()
            for index, suggestion in enumerate(package.shot_storyboard, start=1):
                db.add(
                    models.Shot(
                        project_id=project_id,
                        shot_number=index,
                        scene_number=suggestion.scene_number,
                        duration_seconds=suggestion.duration_seconds,
                        purpose=suggestion.purpose,
                        camera_framing=suggestion.camera_framing,
                        camera_movement=suggestion.camera_movement,
                        characters_present=suggestion.characters_present,
                        location_name=suggestion.location_name,
                        action=suggestion.action,
                        emotion=suggestion.emotion,
                        notes=suggestion.notes,
                    )
                )
                response.created_shots += 1

    db.commit()
    return response


def build_story_package_prompt(project: models.Project, interview: models.StoryInterview) -> str:
    answers = "\n".join(f"- {field}: {getattr(interview, field)}" for field in INTERVIEW_FIELDS)
    safety_rules = "\n".join(f"- {rule}" for rule in project.safety_rules)
    return f"""
Generate a structured kids adventure story package for a private 3-minute short film planner.

Project setup:
- title: {project.title}
- genre: {project.genre}
- target_runtime_seconds: {project.target_runtime_seconds}
- audience_age: {project.audience_age}
- tone: {project.tone}
- aspect_ratio: {project.aspect_ratio}
- visual_style: {project.visual_style}

Safety rules:
{safety_rules}
- No scary danger

Story interview answers:
{answers}

Requirements:
- Suitable for age 4+
- Fun, magical, safe, teamwork-focused kids adventure
- No violence, blood, weapons, horror, unsafe stunts, or scary danger
- 30 to 45 detailed storyboard shots totaling close to 180 seconds
- Include cinematic screenplay, simple dialogue, voiceover, subtitle draft, character suggestions, location suggestions, music prompt, sound effects list, and final safety review notes
- Do not create final image prompts, start frame prompts, end frame prompts, video prompts, or Wan 2.2 prompts yet
""".strip()


def _story_interview_or_400(project: models.Project) -> models.StoryInterview:
    interview = project.story_interview
    if interview is None:
        raise HTTPException(status_code=400, detail="Story interview must be saved before generating a story package.")
    if not any(str(getattr(interview, field)).strip() for field in INTERVIEW_FIELDS):
        raise HTTPException(status_code=400, detail="Story interview must include answers before generating a story package.")
    return interview


def _apply_audio_field(
    audio_plan: models.AudioPlan,
    field: str,
    value: str,
    payload: StoryPackageApplyRequest,
    response: StoryPackageApplyResponse,
) -> None:
    existing = getattr(audio_plan, field)
    if existing and not payload.overwrite:
        response.skipped.append(field)
        return
    setattr(audio_plan, field, value)
    response.applied.append(field)
