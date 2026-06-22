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
    production_bible = production_bible_context(project.production_bible)
    story_context = ""
    if workspace:
        story_context = f"""
Logline: {workspace.logline}
Synopsis: {workspace.synopsis}
Three-act structure: {workspace.three_act_structure}
Screenplay: {workspace.cinematic_screenplay}
""".strip()

    character_context = "\n".join(_character_context(character) for character in characters) or "- No character bible entries yet; rely only on shot details."

    location_context = "\n".join(_location_context(location) for location in locations) or "- No location bible entries yet; rely only on shot details."

    shot_context = "\n".join(
        f"""- shot_id={shot.id}; shot_number={shot.shot_number}; scene_number={shot.scene_number}; duration_seconds={shot.duration_seconds}; purpose={shot.purpose}; camera_framing={shot.camera_framing}; camera_movement={shot.camera_movement}; characters_present={shot.characters_present}; location_name={shot.location_name}; action={shot.action}; emotion={shot.emotion}; notes={shot.notes}"""
        for shot in shots
    )

    return f"""
Generate copy-ready Wan 2.2 prompt fields for the selected storyboard shots using strict Wan mode by default.

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

Production Bible:
{production_bible}

Story workspace:
{story_context or "No story workspace text saved yet."}

Guided interview:
- Not required for Wan prompt generation. Use storyboard shots, Production Bible, story workspace, character bible, and location bible as the source context.

Character continuity:
{character_context}

Location continuity:
{location_context}

Selected shots:
{shot_context}

Output requirements:
- Return one package per selected shot using the original shot_id and shot_number
- Generate image_prompt, start_frame_prompt, end_frame_prompt, video_prompt, negative_prompt, and optional notes
- Prompts must be clear, structured, production-grade, kid-safe age 4+, and suited to image-to-video / start-end-frame video workflows
- Strict Wan mode means stable and obedient: no vague cinematic-only wording, no overloaded action, no random emotional twist, no surprise new action, no unwanted kissing, hugging, violent, or scary behavior
- image_prompt: GPT image storyboard/reference still. Create a polished 16:9 cinematic still frame showing the intended shot composition for visual design, character consistency, location, lighting, and camera framing. It does not need to be the exact first frame.
- start_frame_prompt: GPT image exact first frame. Create the exact opening image for image-to-video with stable, specific visible details and no motion language that belongs only in video_prompt.
- end_frame_prompt: GPT image exact final frame. Create the exact final image for start/end image-to-video using the same scene and same characters as the start frame.
- video_prompt: 80-140 words where possible, with cast/count, setting/time of day, locked camera/framing, a simple continuous action timeline, motion boundaries, Production Bible style/mood, and positive constraints
- negative_prompt: concise but complete GPT image and Wan video safety/artifact list; include no text, no logo, no watermark, no subtitles, no UI, no extra fingers, no distorted hands, no distorted faces, no identity drift, no extra characters, no duplicate characters, no sudden scene change, no jump cuts, no unsafe content, no horror, no weapons, and no blood

Strict GPT image prompt framework:
- image_prompt purpose: storyboard/reference still for judging visual design, character consistency, location identity, lighting, and camera framing. It should be a polished 16:9 still image showing the intended shot composition, not necessarily the exact first frame.
- image_prompt must include exact visible character count, named characters, character appearance and outfit from the character bible, locked location from the location bible, shot purpose/action as a frozen still moment, camera framing and angle, composition, lighting, color palette, Production Bible style, age 4+ safe mood, and no text/logos/watermarks/UI/subtitles.
- start_frame_prompt purpose: exact first frame for image-to-video. It must include the same named characters, exact starting position, exact pose, expression, what hands or props are doing, camera/framing, lighting, location, no new elements, no extra people, and no motion language that belongs only in video_prompt.
- end_frame_prompt purpose: exact final frame for start/end image-to-video. It must include the same named characters, same location, same camera/framing unless the shot explicitly requires a change, one small deliberate visual change from the start frame, final pose/expression, stable composition, no extra characters, no new location, and no surprise prop changes.
- Image prompt style rules: use concrete visible details; avoid vague cinematic-only wording; avoid too many simultaneous actions; avoid motion verbs in still prompts unless describing a frozen moment; prefer "standing with one hand on the chest rim" over "opens the chest dramatically"; prefer "soft smile, eyes focused on the map" over vague "emotional"; keep style tags after the core composition; add "16:9 cinematic still frame" or aspect ratio where useful; add "no text, no logo, no watermark, no subtitles, no UI."
- Continuity rules: image prompts must preserve face shape, age, hairstyle, outfit, key props, location geography, color palette, lighting direction, and camera language from the Production Bible.

Strict Wan prompt framework:
- Cast and count: state exactly how many characters are visible. Use character names from the shot or character bible when available. If only named characters should appear, write "Only these named characters are visible. No extra people enter the frame." If background people are allowed, describe them as fixed background only.
- Setting and time: lock the location, time of day, lighting, and visual continuity. Prevent location drift.
- Camera and framing: specify shot type such as wide shot, medium shot, close-medium, close-up, over-the-shoulder, static camera, slow dolly in, or gentle pan. If the shot does not need camera motion, prefer "Static camera, no pan, no zoom, no cut." If camera movement exists, keep it simple and continuous.
- Action timeline: every video_prompt must include beginning pose/action, middle motion, and end pose/action. Keep actions simple, continuous, and directly based on the shot.
- Motion boundaries: put positive constraints inside the video_prompt, not only in negative_prompt. Examples: remains seated, stays in frame, no one enters or exits, only small hand movement, expression changes gently, no sudden action, no jump cuts, no extra characters, no identity drift.
- Positive constraints: important behavior controls must appear positively in image_prompt, start_frame_prompt, end_frame_prompt, and especially video_prompt. Do not rely only on the negative prompt for obedience.
- Visual style and mood: use Production Bible visual style, color palette, lighting, safety rules, and camera language.
- Start/end frame consistency: start_frame_prompt describes exactly the opening frame; end_frame_prompt describes the same scene and same characters with only one small clear change suitable for start/end image-to-video.
- LoRA caution: if notes mention LoRAs, warn that LoRAs can change motion, behavior, identity, or style and should be tested with short clips first.
- No extra characters: unless a shot explicitly allows background people, do not introduce any extra characters.
- No identity drift and no sudden scene change must be controlled in the video_prompt and repeated in negative_prompt.
- Locked anchors: when character or location anchors are locked, treat their filenames and notes as source-of-truth visual continuity context. Do not claim image files were sent; only anchor metadata and notes are available.
- Do not call WaveSpeed or create images/videos
""".strip()


def _character_context(character: models.Character) -> str:
    anchor = character.anchor_asset
    return (
        f"- {character.name}: role={character.role}; age={character.age}; appearance={character.appearance}; outfit={character.outfit}; "
        f"personality={character.personality}; continuity={character.continuity_prompt}; avoid={character.negative_prompt}; "
        f"anchor_locked={'yes' if character.anchor_locked else 'no'}; anchor_asset={_asset_label(anchor)}; "
        f"face_identity_notes={character.face_identity_notes}; outfit_lock_notes={character.outfit_lock_notes}; "
        f"color_palette_notes={character.color_palette_notes}; prop_notes={character.prop_notes}; "
        f"anchor_review_notes={character.anchor_review_notes}"
    )


def _location_context(location: models.Location) -> str:
    anchor = location.anchor_asset
    return (
        f"- {location.name}: description={location.description}; mood={location.mood}; lighting={location.lighting}; "
        f"palette={location.color_palette}; continuity={location.continuity_prompt}; safety={location.safety_notes}; "
        f"avoid={location.negative_prompt}; anchor_locked={'yes' if location.anchor_locked else 'no'}; "
        f"anchor_asset={_asset_label(anchor)}; layout_notes={location.layout_notes}; "
        f"lighting_lock_notes={location.lighting_lock_notes}; color_palette_notes={location.color_palette_notes}; "
        f"geography_notes={location.geography_notes}; anchor_review_notes={location.anchor_review_notes}"
    )


def _asset_label(asset: models.Asset | None) -> str:
    if asset is None:
        return "none"
    return asset.original_filename or asset.filename_or_path or asset.stored_filename or f"asset-{asset.id}"


def production_bible_context(bible: models.ProductionBible | None) -> str:
    if bible is None:
        return "No Production Bible saved yet; use project setup, character bible, location bible, and shot details."
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
