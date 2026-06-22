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
