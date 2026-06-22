from typing import Any

from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.ai.openai_client import OpenAIShotPromptClient
from app.ai.schemas import GeneratedShotPromptPreview
from app.api.ai import get_shot_prompt_provider
from app.config import Settings


def create_project(client: TestClient, title: str = "Lantern Island") -> dict:
    response = client.post("/api/projects", json={"title": title})
    assert response.status_code == 201
    return response.json()


def create_shot(client: TestClient, project_id: int, purpose: str = "Open the glowing door", **overrides: Any) -> dict:
    payload = {
        "duration_seconds": 6,
        "purpose": purpose,
        "camera_framing": "wide",
        "camera_movement": "slow push",
        "characters_present": "Mia",
        "location_name": "Treehouse",
        "action": "Mia opens a tiny glowing door",
        "emotion": "wonder",
        **overrides,
    }
    response = client.post(f"/api/projects/{project_id}/shots", json=payload)
    assert response.status_code == 201
    return response.json()


def save_workspace(client: TestClient, project_id: int, **overrides: Any) -> dict:
    payload = {
        "logline": "Two kids follow a gentle glowing map.",
        "synopsis": "A careful adventure through a bright garden.",
        "three_act_structure": "",
        "cinematic_screenplay": "",
        "simple_dialogue_version": "",
        "voiceover_draft": "",
        "subtitle_draft": "",
        **overrides,
    }
    response = client.put(f"/api/projects/{project_id}/workspace", json=payload)
    assert response.status_code == 200
    return response.json()


def create_character(client: TestClient, project_id: int, **overrides: Any) -> dict:
    payload = {
        "name": "Mia",
        "role": "curious inventor",
        "age": "7",
        "appearance": "round glasses and warm smile",
        "outfit": "yellow raincoat",
        "continuity_prompt": "Mia always wears her yellow raincoat.",
        **overrides,
    }
    response = client.post(f"/api/projects/{project_id}/characters", json=payload)
    assert response.status_code == 201
    return response.json()


def create_location(client: TestClient, project_id: int, **overrides: Any) -> dict:
    payload = {
        "name": "Treehouse",
        "description": "cozy backyard treehouse with a tiny glowing door",
        "mood": "safe wonder",
        "lighting": "golden afternoon",
        "color_palette": "leaf green and warm amber",
        "continuity_prompt": "The tiny glowing door stays on the north wall.",
        **overrides,
    }
    response = client.post(f"/api/projects/{project_id}/locations", json=payload)
    assert response.status_code == 201
    return response.json()


def create_asset(client: TestClient, project_id: int, **overrides: Any) -> dict:
    payload = {
        "asset_type": "character_reference",
        "filename_or_path": "reference.png",
        "notes": "approved anchor",
        **overrides,
    }
    response = client.post(f"/api/projects/{project_id}/assets", json=payload)
    assert response.status_code == 201
    return response.json()


def package_payload(shot: dict, suffix: str = "") -> dict:
    return {
        "shot_id": shot["id"],
        "shot_number": shot["shot_number"],
        "image_prompt": f"16:9 cinematic frame of Mia at a glowing treehouse door{suffix}",
        "start_frame_prompt": f"Mia reaches toward the tiny glowing door{suffix}",
        "end_frame_prompt": f"Warm lights float from the open doorway{suffix}",
        "video_prompt": f"Slow push-in as Mia gently opens the door and floating lights drift out{suffix}",
        "negative_prompt": "no violence, no horror, no blood, no weapons, no text, no logos, no watermarks",
        "notes": "Keep the mood gentle and magical.",
    }


class FakeShotPromptProvider:
    def __init__(self, packages: list[dict] | None = None) -> None:
        self.packages = packages or []
        self.prompt = ""

    def generate_shot_prompts(self, prompt: str) -> GeneratedShotPromptPreview:
        self.prompt = prompt
        assert "Wan 2.2" in prompt
        assert "No scary danger" in prompt
        return GeneratedShotPromptPreview.model_validate({"packages": self.packages})


class InvalidShotPromptProvider:
    def generate_shot_prompts(self, prompt: str) -> dict:
        return {"not": "the expected schema"}


def test_missing_openai_key_returns_clean_error() -> None:
    client = OpenAIShotPromptClient(Settings(openai_api_key=""))
    try:
        client.generate_shot_prompts("prompt")
    except HTTPException as exc:
        assert exc.status_code == 503
        assert "OPENAI_API_KEY" in exc.detail
    else:
        raise AssertionError("Expected missing OpenAI key to raise HTTPException")


def test_preview_validates_project_has_shots(client: TestClient) -> None:
    project = create_project(client)
    client.app.dependency_overrides[get_shot_prompt_provider] = lambda: FakeShotPromptProvider()

    response = client.post(f"/api/projects/{project['id']}/ai/shot-prompts/preview", json={})

    assert response.status_code == 400
    assert "must have shots" in response.json()["detail"]


def test_preview_returns_structured_generated_prompt_packages(client: TestClient) -> None:
    project = create_project(client)
    client.put(
        f"/api/projects/{project['id']}/production-bible",
        json={
            "visual_style": "locked watercolor miniature",
            "negative_prompt_rules": "no text, no logos, no uncanny faces",
        },
    )
    shot = create_shot(client, project["id"])
    provider = FakeShotPromptProvider([package_payload(shot)])
    client.app.dependency_overrides[get_shot_prompt_provider] = lambda: provider

    response = client.post(
        f"/api/projects/{project['id']}/ai/shot-prompts/preview",
        json={"shot_ids": [shot["id"]]},
    )

    assert response.status_code == 200
    data = response.json()
    assert data[0]["shot_id"] == shot["id"]
    assert data[0]["image_prompt"].startswith("16:9 cinematic")
    assert "shot_id=" in provider.prompt
    assert "locked watercolor miniature" in provider.prompt
    assert "no uncanny faces" in provider.prompt


def test_prompt_generation_instructions_use_strict_wan_framework(client: TestClient) -> None:
    project = create_project(client)
    shot = create_shot(client, project["id"])
    provider = FakeShotPromptProvider([package_payload(shot)])
    client.app.dependency_overrides[get_shot_prompt_provider] = lambda: provider

    response = client.post(f"/api/projects/{project['id']}/ai/shot-prompts/preview", json={})

    assert response.status_code == 200
    prompt = provider.prompt
    assert "strict Wan mode by default" in prompt
    assert "state exactly how many characters are visible" in prompt
    assert "locked camera/framing" in prompt
    assert "beginning pose/action, middle motion, and end pose/action" in prompt
    assert "Motion boundaries" in prompt
    assert "positive constraints" in prompt
    assert "Start/end frame consistency" in prompt
    assert "Do not rely only on the negative prompt" in prompt
    assert "No extra people enter the frame" in prompt
    assert "no identity drift" in prompt
    assert "no sudden scene change" in prompt
    assert "Production Bible" in prompt
    assert "Not required for Wan prompt generation" in prompt
    assert "WaveSpeed manual prompt fields" not in prompt


def test_prompt_generation_instructions_use_gpt_image_framework(client: TestClient) -> None:
    project = create_project(client)
    client.put(
        f"/api/projects/{project['id']}/production-bible",
        json={
            "visual_style": "soft paper diorama",
            "color_palette": "mint, gold, sky blue",
            "lighting_style": "warm miniature lighting from frame left",
        },
    )
    create_character(
        client,
        project["id"],
        name="Mia",
        appearance="round face, bright eyes, short curls",
        outfit="yellow raincoat and red boots",
    )
    create_location(
        client,
        project["id"],
        name="Treehouse",
        description="cozy backyard treehouse with a tiny glowing door",
        lighting="golden afternoon from frame left",
        color_palette="leaf green and warm amber",
    )
    shot = create_shot(client, project["id"])
    provider = FakeShotPromptProvider([package_payload(shot)])
    client.app.dependency_overrides[get_shot_prompt_provider] = lambda: provider

    response = client.post(f"/api/projects/{project['id']}/ai/shot-prompts/preview", json={})

    assert response.status_code == 200
    prompt = provider.prompt
    assert "image_prompt: GPT image storyboard/reference still" in prompt
    assert "start_frame_prompt: GPT image exact first frame" in prompt
    assert "end_frame_prompt: GPT image exact final frame" in prompt
    assert "exact visible character count" in prompt
    assert "named characters" in prompt
    assert "character appearance and outfit" in prompt
    assert "yellow raincoat and red boots" in prompt
    assert "locked location from the location bible" in prompt
    assert "camera framing and angle" in prompt
    assert "composition" in prompt
    assert "lighting" in prompt
    assert "color palette" in prompt
    assert "Production Bible style" in prompt
    assert "no text/logos/watermarks" in prompt
    assert "no extra characters" in prompt
    assert "no identity drift" in prompt
    assert "avoid motion verbs in still prompts" in prompt
    assert "video_prompt: 80-140 words where possible" in prompt
    assert "Strict Wan prompt framework" in prompt


def test_wan_prompt_preview_does_not_require_interview(client: TestClient) -> None:
    project = create_project(client)
    shot = create_shot(client, project["id"], "Manual shot list starts the project")
    provider = FakeShotPromptProvider([package_payload(shot)])
    client.app.dependency_overrides[get_shot_prompt_provider] = lambda: provider

    response = client.post(f"/api/projects/{project['id']}/ai/shot-prompts/preview", json={})

    assert response.status_code == 200
    assert "Manual shot list starts the project" in provider.prompt
    assert "Story workspace" in provider.prompt
    assert "Not required for Wan prompt generation" in provider.prompt


def test_preview_works_with_production_bible_only_plus_shots(client: TestClient) -> None:
    project = create_project(client)
    client.put(
        f"/api/projects/{project['id']}/production-bible",
        json={
            "visual_style": "paper lantern miniatures",
            "camera_language": "mostly static camera with gentle push-ins",
            "safety_rules": "kid-safe, no scary danger",
        },
    )
    shot = create_shot(client, project["id"], "Bible guided shot")
    provider = FakeShotPromptProvider([package_payload(shot)])
    client.app.dependency_overrides[get_shot_prompt_provider] = lambda: provider

    response = client.post(f"/api/projects/{project['id']}/ai/shot-prompts/preview", json={})

    assert response.status_code == 200
    assert "paper lantern miniatures" in provider.prompt
    assert "mostly static camera" in provider.prompt
    assert "Bible guided shot" in provider.prompt


def test_preview_works_with_story_workspace_plus_shots(client: TestClient) -> None:
    project = create_project(client)
    save_workspace(client, project["id"], logline="Mia follows a careful glowing kite.")
    shot = create_shot(client, project["id"], "Workspace guided shot")
    provider = FakeShotPromptProvider([package_payload(shot)])
    client.app.dependency_overrides[get_shot_prompt_provider] = lambda: provider

    response = client.post(f"/api/projects/{project['id']}/ai/shot-prompts/preview", json={})

    assert response.status_code == 200
    assert "Mia follows a careful glowing kite." in provider.prompt
    assert "Workspace guided shot" in provider.prompt


def test_preview_works_with_character_and_location_context(client: TestClient) -> None:
    project = create_project(client)
    create_character(client, project["id"], name="Jo", continuity_prompt="Jo keeps a blue explorer vest.")
    create_location(client, project["id"], name="Floating Garden", lighting="soft morning glow")
    shot = create_shot(
        client,
        project["id"],
        "Character and location shot",
        characters_present="Jo",
        location_name="Floating Garden",
    )
    provider = FakeShotPromptProvider([package_payload(shot)])
    client.app.dependency_overrides[get_shot_prompt_provider] = lambda: provider

    response = client.post(f"/api/projects/{project['id']}/ai/shot-prompts/preview", json={})

    assert response.status_code == 200
    assert "Jo keeps a blue explorer vest" in provider.prompt
    assert "Floating Garden" in provider.prompt
    assert "soft morning glow" in provider.prompt


def test_preview_context_includes_locked_character_and_location_anchor_notes(client: TestClient) -> None:
    project = create_project(client)
    character_anchor = create_asset(
        client,
        project["id"],
        asset_type="character_reference",
        filename_or_path="mia-approved-anchor.png",
    )
    location_anchor = create_asset(
        client,
        project["id"],
        asset_type="location_reference",
        filename_or_path="garden-approved-anchor.png",
    )
    create_character(
        client,
        project["id"],
        name="Mia",
        anchor_asset_id=character_anchor["id"],
        anchor_locked=True,
        face_identity_notes="round face, short curls, bright eyes",
        outfit_lock_notes="yellow raincoat must stay unchanged",
        color_palette_notes="warm yellow and leaf green",
        prop_notes="small brass compass",
    )
    create_location(
        client,
        project["id"],
        name="Floating Garden",
        anchor_asset_id=location_anchor["id"],
        anchor_locked=True,
        layout_notes="arched bridge stays frame right",
        lighting_lock_notes="golden light from frame left",
        geography_notes="pond remains behind the bridge",
    )
    shot = create_shot(client, project["id"], characters_present="Mia", location_name="Floating Garden")
    provider = FakeShotPromptProvider([package_payload(shot)])
    client.app.dependency_overrides[get_shot_prompt_provider] = lambda: provider

    response = client.post(f"/api/projects/{project['id']}/ai/shot-prompts/preview", json={})

    assert response.status_code == 200
    prompt = provider.prompt
    assert "anchor_locked=yes" in prompt
    assert "anchor_asset=mia-approved-anchor.png" in prompt
    assert "round face, short curls, bright eyes" in prompt
    assert "yellow raincoat must stay unchanged" in prompt
    assert "small brass compass" in prompt
    assert "anchor_asset=garden-approved-anchor.png" in prompt
    assert "arched bridge stays frame right" in prompt
    assert "golden light from frame left" in prompt
    assert "pond remains behind the bridge" in prompt
    assert "only anchor metadata and notes are available" in prompt


def test_invalid_provider_response_fails_safely(client: TestClient) -> None:
    project = create_project(client)
    create_shot(client, project["id"])
    client.app.dependency_overrides[get_shot_prompt_provider] = lambda: InvalidShotPromptProvider()

    response = client.post(f"/api/projects/{project['id']}/ai/shot-prompts/preview", json={})

    assert response.status_code == 502
    assert "invalid shot prompt packages" in response.json()["detail"]


def test_apply_saves_prompt_fields(client: TestClient) -> None:
    project = create_project(client)
    shot = create_shot(client, project["id"])

    response = client.post(
        f"/api/projects/{project['id']}/ai/shot-prompts/apply",
        json={"packages": [package_payload(shot)]},
    )

    assert response.status_code == 200
    result = response.json()
    assert result["updated_shots"] == 1
    updated = client.get(f"/api/projects/{project['id']}/shots").json()[0]
    assert updated["image_prompt"].startswith("16:9 cinematic")
    assert updated["status"] == "Prompt ready"


def test_apply_does_not_overwrite_existing_prompt_fields_unless_requested(client: TestClient) -> None:
    project = create_project(client)
    shot = create_shot(client, project["id"], image_prompt="manual image prompt")

    response = client.post(
        f"/api/projects/{project['id']}/ai/shot-prompts/apply",
        json={"packages": [package_payload(shot)]},
    )

    assert response.status_code == 200
    assert "shot 1 image_prompt" in response.json()["skipped"]
    updated = client.get(f"/api/projects/{project['id']}/shots").json()[0]
    assert updated["image_prompt"] == "manual image prompt"
    assert updated["video_prompt"].startswith("Slow push-in")

    overwrite = client.post(
        f"/api/projects/{project['id']}/ai/shot-prompts/apply",
        json={"packages": [package_payload(shot, " updated")], "overwrite": True},
    )

    assert overwrite.status_code == 200
    updated = client.get(f"/api/projects/{project['id']}/shots").json()[0]
    assert updated["image_prompt"].endswith("updated")


def test_shot_ids_must_belong_to_project(client: TestClient) -> None:
    first_project = create_project(client, "First")
    second_project = create_project(client, "Second")
    foreign_shot = create_shot(client, second_project["id"], "Other project shot")
    client.app.dependency_overrides[get_shot_prompt_provider] = lambda: FakeShotPromptProvider()

    preview_response = client.post(
        f"/api/projects/{first_project['id']}/ai/shot-prompts/preview",
        json={"shot_ids": [foreign_shot["id"]]},
    )
    apply_response = client.post(
        f"/api/projects/{first_project['id']}/ai/shot-prompts/apply",
        json={"packages": [package_payload(foreign_shot)]},
    )

    assert preview_response.status_code == 400
    assert apply_response.status_code == 400
    assert "shot_ids must belong" in preview_response.json()["detail"]


def test_omitted_shot_ids_generates_for_all_project_shots(client: TestClient) -> None:
    project = create_project(client)
    first = create_shot(client, project["id"], "Opening")
    second = create_shot(client, project["id"], "Garden reveal")
    provider = FakeShotPromptProvider([package_payload(first), package_payload(second)])
    client.app.dependency_overrides[get_shot_prompt_provider] = lambda: provider

    response = client.post(f"/api/projects/{project['id']}/ai/shot-prompts/preview", json={})

    assert response.status_code == 200
    data = response.json()
    assert [item["shot_id"] for item in data] == [first["id"], second["id"]]
    assert f"shot_id={first['id']}" in provider.prompt
    assert f"shot_id={second['id']}" in provider.prompt
