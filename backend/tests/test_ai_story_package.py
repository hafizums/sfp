from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.ai.openai_client import OpenAIStoryPackageClient
from app.ai.schemas import GeneratedStoryPackage
from app.api.ai import get_story_package_provider
from app.config import Settings


def create_project(client: TestClient, title: str = "Lantern Island") -> dict:
    response = client.post("/api/projects", json={"title": title})
    assert response.status_code == 201
    return response.json()


def save_interview(client: TestClient, project_id: int) -> None:
    response = client.put(
        f"/api/projects/{project_id}/story-interview",
        json={
            "title_answer": "Lantern Island",
            "magical_discovery": "A compass that glows with moonlight",
            "main_kid_characters": "Mia and Jo",
            "adventure_beginning": "Their backyard treehouse",
            "main_adventure_location": "A floating garden island",
            "small_problem": "The garden lights are mixed up",
            "teamwork_solution": "They match colors and sing together",
            "ending_feel": "Warm, proud, and safe",
            "visual_style": "soft storybook 3D",
            "avoid": "anything scary",
        },
    )
    assert response.status_code == 200


def story_package_payload() -> dict:
    shots = [
        {
            "shot_number": index,
            "scene_number": 1 if index <= 10 else 2 if index <= 20 else 3,
            "duration_seconds": 6,
            "purpose": f"Story beat {index}",
            "camera_framing": "wide",
            "camera_movement": "gentle push",
            "characters_present": "Mia and Jo",
            "location_name": "Floating Garden",
            "action": "The kids solve a gentle magical clue",
            "emotion": "wonder",
            "notes": "Keep it safe and bright",
        }
        for index in range(1, 31)
    ]
    return {
        "logline": "Two friends find a glowing compass and help a floating garden shine again.",
        "synopsis": "Mia and Jo discover a moonlit compass in their treehouse and follow it to a gentle garden adventure.",
        "three_act_structure": "Act 1: discovery. Act 2: teamwork clues. Act 3: cozy return.",
        "cinematic_screenplay": "EXT. TREEHOUSE - DAY\nMia and Jo discover a glowing compass.",
        "simple_dialogue_version": "MIA: We can solve this together!\nJO: One gentle clue at a time.",
        "voiceover_draft": "Mia and Jo learned that teamwork can light the way home.",
        "subtitle_draft": "A glowing compass points toward a floating garden.",
        "suggested_characters": [
            {
                "name": "Mia",
                "role": "curious kid inventor",
                "age": "7",
                "appearance": "bright eyes and a warm smile",
                "outfit": "yellow raincoat and sneakers",
                "personality": "kind and curious",
                "voice_style": "bright and gentle",
                "continuity_prompt": "Mia, age 7, yellow raincoat, curious and kind",
                "negative_prompt": "no scary expression",
                "notes": "Main kid character",
            }
        ],
        "suggested_locations": [
            {
                "name": "Floating Garden",
                "description": "A safe floating island full of soft glowing flowers",
                "mood": "wonder",
                "lighting": "golden moonlight",
                "color_palette": "mint, gold, sky blue",
                "continuity_prompt": "floating garden with soft glowing flowers",
                "negative_prompt": "no dark horror mood",
                "safety_notes": "gentle paths and no danger",
                "notes": "Main adventure location",
            }
        ],
        "shot_storyboard": shots,
        "audio_plan": {
            "music_prompt": "gentle magical marimba and soft strings",
            "sound_effects_list": "sparkles, soft wind, flower chimes",
        },
        "safety_review": {
            "final_safety_review_notes": "All story beats are age 4+ safe with no scary danger.",
        },
    }


class FakeProvider:
    def __init__(self) -> None:
        self.prompt = ""

    def generate_story_package(self, prompt: str) -> GeneratedStoryPackage:
        self.prompt = prompt
        assert "No violence" in prompt
        return GeneratedStoryPackage.model_validate(story_package_payload())


class InvalidProvider:
    def generate_story_package(self, prompt: str) -> GeneratedStoryPackage:
        raise HTTPException(status_code=502, detail="OpenAI returned an invalid story package.")


def test_missing_openai_key_returns_clean_error() -> None:
    client = OpenAIStoryPackageClient(Settings(openai_api_key=""))
    try:
        client.generate_story_package("prompt")
    except HTTPException as exc:
        assert exc.status_code == 503
        assert "OPENAI_API_KEY" in exc.detail
    else:
        raise AssertionError("Expected missing OpenAI key to raise HTTPException")


def test_preview_endpoint_validates_interview_exists(client: TestClient) -> None:
    project = create_project(client)
    client.app.dependency_overrides[get_story_package_provider] = lambda: FakeProvider()
    response = client.post(f"/api/projects/{project['id']}/ai/story-package/preview")
    assert response.status_code == 400
    assert "Story interview" in response.json()["detail"]


def test_provider_response_is_returned_as_structured_schema(client: TestClient) -> None:
    project = create_project(client)
    client.put(
        f"/api/projects/{project['id']}/production-bible",
        json={
            "visual_style": "pastel stop-motion look",
            "negative_prompt_rules": "no logos, no watermarks, no scary shadows",
        },
    )
    save_interview(client, project["id"])
    provider = FakeProvider()
    client.app.dependency_overrides[get_story_package_provider] = lambda: provider

    response = client.post(f"/api/projects/{project['id']}/ai/story-package/preview")

    assert response.status_code == 200
    data = response.json()
    assert data["logline"].startswith("Two friends")
    assert len(data["shot_storyboard"]) == 30
    assert "pastel stop-motion look" in provider.prompt
    assert "no scary shadows" in provider.prompt


def test_invalid_provider_response_fails_safely(client: TestClient) -> None:
    project = create_project(client)
    save_interview(client, project["id"])
    client.app.dependency_overrides[get_story_package_provider] = lambda: InvalidProvider()

    response = client.post(f"/api/projects/{project['id']}/ai/story-package/preview")

    assert response.status_code == 502
    assert "invalid story package" in response.json()["detail"]


def test_apply_endpoint_saves_workspace_fields(client: TestClient) -> None:
    project = create_project(client)
    response = client.post(
        f"/api/projects/{project['id']}/ai/story-package/apply",
        json={"package": story_package_payload(), "apply_characters": False, "apply_locations": False},
    )

    assert response.status_code == 200
    workspace = client.get(f"/api/projects/{project['id']}/workspace").json()
    assert workspace["logline"].startswith("Two friends")
    assert workspace["voiceover_draft"].startswith("Mia and Jo learned")


def test_apply_endpoint_can_create_characters_locations_and_shots(client: TestClient) -> None:
    project = create_project(client)
    response = client.post(
        f"/api/projects/{project['id']}/ai/story-package/apply",
        json={"package": story_package_payload(), "apply_shots": True},
    )

    assert response.status_code == 200
    result = response.json()
    assert result["created_characters"] == 1
    assert result["created_locations"] == 1
    assert result["created_shots"] == 30
    assert len(client.get(f"/api/projects/{project['id']}/shots").json()) == 30


def test_apply_endpoint_does_not_overwrite_existing_content_without_request(client: TestClient) -> None:
    project = create_project(client)
    client.put(f"/api/projects/{project['id']}/workspace", json={"logline": "Manual logline"})

    response = client.post(
        f"/api/projects/{project['id']}/ai/story-package/apply",
        json={"package": story_package_payload(), "apply_characters": False, "apply_locations": False},
    )

    assert response.status_code == 200
    assert "logline" in response.json()["skipped"]
    workspace = client.get(f"/api/projects/{project['id']}/workspace").json()
    assert workspace["logline"] == "Manual logline"

    overwrite = client.post(
        f"/api/projects/{project['id']}/ai/story-package/apply",
        json={
            "package": story_package_payload(),
            "overwrite": True,
            "apply_characters": False,
            "apply_locations": False,
        },
    )
    assert overwrite.status_code == 200
    workspace = client.get(f"/api/projects/{project['id']}/workspace").json()
    assert workspace["logline"].startswith("Two friends")
