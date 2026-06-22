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
    _validate_story_context(project)
    prompt = build_story_package_prompt(project)
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


def build_story_package_prompt(project: models.Project) -> str:
    safety_rules = "\n".join(f"- {rule}" for rule in project.safety_rules)
    context_sections = "\n\n".join(build_story_context_sections(project))
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

Available story context, in priority order:
{context_sections}

Requirements:
- Suitable for age 4+
- Fun, magical, safe, teamwork-focused kids adventure
- No violence, blood, weapons, horror, unsafe stunts, or scary danger
- 30 to 45 detailed storyboard shots totaling close to 180 seconds
- Include cinematic screenplay, simple dialogue, voiceover, subtitle draft, character suggestions, location suggestions, music prompt, sound effects list, and final safety review notes
- Do not create final image prompts, start frame prompts, end frame prompts, video prompts, or Wan 2.2 prompts yet
- The guided interview may be empty; use all available project context
- Do not invent that the user answered interview questions if they did not
- If story workspace fields exist, treat them as stronger than empty interview fields
- If shots exist, preserve them as story intent and build around them
""".strip()


def production_bible_context(bible: models.ProductionBible | None) -> str:
    if bible is None:
        return "No Production Bible saved yet."
    return f"""
- locked: {bible.locked}
- visual_style: {bible.visual_style}
- color_palette: {bible.color_palette}
- lighting_style: {bible.lighting_style}
- camera_language: {bible.camera_language}
- character_consistency_rules: {bible.character_consistency_rules}
- location_consistency_rules: {bible.location_consistency_rules}
- prop_consistency_rules: {bible.prop_consistency_rules}
- safety_rules: {bible.safety_rules}
- negative_prompt_rules: {bible.negative_prompt_rules}
- music_style: {bible.music_style}
- voiceover_style: {bible.voiceover_style}
- subtitle_style: {bible.subtitle_style}
- final_delivery_specs: {bible.final_delivery_specs}
""".strip()


def build_story_context_sections(project: models.Project) -> list[str]:
    return [
        f"Production Bible:\n{production_bible_context(project.production_bible)}",
        f"Guided interview answers:\n{_interview_context(project.story_interview)}",
        f"Story workspace:\n{_workspace_context(project.workspace)}",
        f"Existing characters, locations, and shots:\n{_production_context(project)}",
        f"Project setup defaults:\n{_project_setup_context(project)}",
    ]


def _validate_story_context(project: models.Project) -> None:
    if (
        _has_interview_content(project.story_interview)
        or _has_workspace_content(project.workspace)
        or _has_production_bible_content(project)
        or project.characters
        or project.locations
        or project.shots
        or _has_meaningful_project_setup(project)
    ):
        return
    raise HTTPException(
        status_code=400,
        detail="Add story context first: fill the interview, write in the story workspace, add shots, or update the Production Bible.",
    )


def _interview_context(interview: models.StoryInterview | None) -> str:
    if not _has_interview_content(interview):
        return "No guided interview answers saved."
    return "\n".join(
        f"- {field}: {value}"
        for field in INTERVIEW_FIELDS
        if (value := str(getattr(interview, field, "")).strip())
    )


def _workspace_context(workspace: models.StoryWorkspace | None) -> str:
    if not _has_workspace_content(workspace):
        return "No manual story workspace text saved."
    return "\n".join(
        f"- {field}: {value}"
        for field in WORKSPACE_FIELDS
        if (value := str(getattr(workspace, field, "")).strip())
    )


def _production_context(project: models.Project) -> str:
    sections: list[str] = []
    if project.characters:
        sections.append(
            "Characters:\n"
            + "\n".join(
                f"- {character.name}: role={character.role}; age={character.age}; appearance={character.appearance}; outfit={character.outfit}; personality={character.personality}; notes={character.notes}"
                for character in project.characters
            )
        )
    if project.locations:
        sections.append(
            "Locations:\n"
            + "\n".join(
                f"- {location.name}: description={location.description}; mood={location.mood}; lighting={location.lighting}; palette={location.color_palette}; safety={location.safety_notes}; notes={location.notes}"
                for location in project.locations
            )
        )
    if project.shots:
        sections.append(
            "Shots:\n"
            + "\n".join(
                f"- shot {shot.shot_number}: scene={shot.scene_number}; duration={shot.duration_seconds}s; purpose={shot.purpose}; characters={shot.characters_present}; location={shot.location_name}; action={shot.action}; emotion={shot.emotion}; notes={shot.notes}"
                for shot in project.shots
            )
        )
    return "\n\n".join(sections) if sections else "No characters, locations, or shots created yet."


def _project_setup_context(project: models.Project) -> str:
    return f"""
- title: {project.title}
- genre: {project.genre}
- target runtime: {project.target_runtime_seconds} seconds
- audience: {project.audience_age}
- tone: {project.tone}
- aspect ratio: {project.aspect_ratio}
- visual style: {project.visual_style}
""".strip()


def _has_interview_content(interview: models.StoryInterview | None) -> bool:
    return bool(interview) and any(str(getattr(interview, field, "")).strip() for field in INTERVIEW_FIELDS)


def _has_workspace_content(workspace: models.StoryWorkspace | None) -> bool:
    return bool(workspace) and any(str(getattr(workspace, field, "")).strip() for field in WORKSPACE_FIELDS)


def _has_production_bible_content(project: models.Project) -> bool:
    bible = project.production_bible
    if bible is None:
        return False
    default_values = _default_production_bible_values(project)
    return any(
        str(getattr(bible, field) or "").strip() != default_value
        for field, default_value in default_values.items()
    )


def _has_meaningful_project_setup(project: models.Project) -> bool:
    if project.title.strip().lower() in {"", "untitled", "untitled project", "new project"}:
        return False
    return any(
        [
            project.title.strip(),
            project.genre.strip() != "Kids Adventure",
            project.audience_age.strip() != "4+",
            project.tone.strip() != "fun, magical, safe, teamwork",
            project.visual_style.strip(),
        ]
    )


def _default_production_bible_values(project: models.Project) -> dict[str, str]:
    safety_rules = "\n".join(project.safety_rules or [])
    return {
        "visual_style": project.visual_style.strip(),
        "color_palette": "",
        "lighting_style": "",
        "camera_language": "Gentle cinematic camera language with clear framing, readable action, and kid-safe motion.",
        "character_consistency_rules": "Keep character age, outfit, silhouette, personality, and facial features consistent across every shot.",
        "location_consistency_rules": "Keep geography, scale, palette, lighting direction, and recurring landmarks consistent.",
        "prop_consistency_rules": "Keep hero props recognizable and avoid unexplained shape, color, or scale changes.",
        "safety_rules": safety_rules.strip(),
        "negative_prompt_rules": (
            "no violence, no horror, no blood, no weapons, no unsafe stunts, no scary danger, "
            "no text, no logos, no subtitles, no UI, no captions, no watermarks, no distorted faces, "
            "no distorted hands, no extra fingers, no identity drift"
        ),
        "music_style": f"{project.tone} music for a warm kids adventure",
        "voiceover_style": "Warm, simple, age 4+ friendly narration.",
        "subtitle_style": "Short, readable subtitles with simple vocabulary.",
        "final_delivery_specs": f"{project.aspect_ratio}, target runtime {project.target_runtime_seconds} seconds, age {project.audience_age}, private local planning workflow.",
    }


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
