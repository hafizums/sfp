from fastapi.testclient import TestClient


def create_project(client: TestClient, title: str = "Lantern Island") -> dict:
    response = client.post("/api/projects", json={"title": title})
    assert response.status_code == 201
    return response.json()


def test_health_endpoint(client: TestClient) -> None:
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_project_crud_uses_defaults(client: TestClient) -> None:
    project = create_project(client)
    assert project["genre"] == "Kids Adventure"
    assert project["target_runtime_seconds"] == 180
    assert "No weapons" in project["safety_rules"]

    updated = client.put(
        f"/api/projects/{project['id']}",
        json={"title": "Lantern Island Rescue", "visual_style": "soft storybook 3D"},
    )
    assert updated.status_code == 200
    assert updated.json()["title"] == "Lantern Island Rescue"

    listed = client.get("/api/projects")
    assert listed.status_code == 200
    assert listed.json()[0]["shot_count"] == 0

    deleted = client.delete(f"/api/projects/{project['id']}")
    assert deleted.status_code == 204
    assert client.get(f"/api/projects/{project['id']}").status_code == 404


def test_project_update(client: TestClient) -> None:
    project = create_project(client)
    response = client.put(
        f"/api/projects/{project['id']}",
        json={
            "title": "Moon Map",
            "target_runtime_seconds": 175,
            "tone": "cozy, curious, safe",
        },
    )
    assert response.status_code == 200
    updated = response.json()
    assert updated["title"] == "Moon Map"
    assert updated["target_runtime_seconds"] == 175
    assert updated["tone"] == "cozy, curious, safe"


def test_story_interview_save_and_load(client: TestClient) -> None:
    project = create_project(client)
    payload = {
        "title_answer": "The Moon Map",
        "magical_discovery": "A glowing compass",
        "main_kid_characters": "Mia and Jo",
        "adventure_beginning": "A backyard treehouse",
        "main_adventure_location": "A floating garden",
        "small_problem": "The path home fades",
        "teamwork_solution": "They sing the map awake",
        "ending_feel": "Cozy and proud",
        "visual_style": "warm clay animation",
        "avoid": "scary shadows",
    }
    saved = client.put(f"/api/projects/{project['id']}/story-interview", json=payload)
    assert saved.status_code == 200
    loaded = client.get(f"/api/projects/{project['id']}/story-interview")
    assert loaded.status_code == 200
    assert loaded.json()["magical_discovery"] == "A glowing compass"


def test_shot_crud_reorder_runtime_and_progress(client: TestClient) -> None:
    project = create_project(client)
    first = client.post(
        f"/api/projects/{project['id']}/shots",
        json={"duration_seconds": 5, "purpose": "Opening wonder"},
    ).json()
    second = client.post(
        f"/api/projects/{project['id']}/shots",
        json={"duration_seconds": 7, "purpose": "Team solves clue", "status": "Approved"},
    ).json()
    third = client.post(
        f"/api/projects/{project['id']}/shots",
        json={"duration_seconds": 8, "purpose": "Final hug", "status": "Added to final edit"},
    ).json()

    assert [first["shot_number"], second["shot_number"], third["shot_number"]] == [1, 2, 3]

    reordered = client.post(
        f"/api/projects/{project['id']}/shots/reorder",
        json={"shot_ids": [third["id"], first["id"], second["id"]]},
    )
    assert reordered.status_code == 200
    assert [shot["id"] for shot in reordered.json()] == [third["id"], first["id"], second["id"]]
    assert [shot["shot_number"] for shot in reordered.json()] == [1, 2, 3]

    project_view = client.get(f"/api/projects/{project['id']}").json()
    assert project_view["current_planned_runtime"] == 20
    assert project_view["shot_count"] == 3
    assert project_view["progress"] == 67

    deleted = client.delete(f"/api/shots/{first['id']}")
    assert deleted.status_code == 204
    shots = client.get(f"/api/projects/{project['id']}/shots").json()
    assert [shot["shot_number"] for shot in shots] == [1, 2]


def test_checklist_defaults_and_updates(client: TestClient) -> None:
    project = create_project(client)
    checklist = client.get(f"/api/projects/{project['id']}/checklist")
    assert checklist.status_code == 200
    items = checklist.json()
    assert len(items) == 10
    assert items[0]["label"] == "All shots approved"
    assert items[0]["checked"] is False

    updated = client.patch(f"/api/checklist/{items[0]['id']}", json={"checked": True})
    assert updated.status_code == 200
    assert updated.json()["checked"] is True


def test_character_crud(client: TestClient) -> None:
    project = create_project(client)
    created = client.post(
        f"/api/projects/{project['id']}/characters",
        json={"name": "Mia", "role": "inventor", "age": "7"},
    )
    assert created.status_code == 201
    character = created.json()
    assert character["name"] == "Mia"

    listed = client.get(f"/api/projects/{project['id']}/characters")
    assert listed.status_code == 200
    assert listed.json()[0]["role"] == "inventor"

    updated = client.put(f"/api/characters/{character['id']}", json={"personality": "brave and kind"})
    assert updated.status_code == 200
    assert updated.json()["personality"] == "brave and kind"

    deleted = client.delete(f"/api/characters/{character['id']}")
    assert deleted.status_code == 204
    assert client.put(f"/api/characters/{character['id']}", json={"name": "Nope"}).status_code == 404


def test_location_crud(client: TestClient) -> None:
    project = create_project(client)
    created = client.post(
        f"/api/projects/{project['id']}/locations",
        json={"name": "Floating Garden", "mood": "wonder"},
    )
    assert created.status_code == 201
    location = created.json()
    assert location["name"] == "Floating Garden"

    listed = client.get(f"/api/projects/{project['id']}/locations")
    assert listed.status_code == 200
    assert listed.json()[0]["mood"] == "wonder"

    updated = client.put(f"/api/locations/{location['id']}", json={"lighting": "golden afternoon"})
    assert updated.status_code == 200
    assert updated.json()["lighting"] == "golden afternoon"

    deleted = client.delete(f"/api/locations/{location['id']}")
    assert deleted.status_code == 204
    assert client.put(f"/api/locations/{location['id']}", json={"name": "Nope"}).status_code == 404


def test_asset_metadata_create_update_delete(client: TestClient) -> None:
    project = create_project(client)
    shot = client.post(
        f"/api/projects/{project['id']}/shots",
        json={"duration_seconds": 5, "purpose": "Opening"},
    ).json()

    created = client.post(
        f"/api/projects/{project['id']}/assets",
        json={
            "shot_id": shot["id"],
            "asset_type": "start_frame",
            "filename_or_path": "assets/start-001.png",
            "notes": "first pass",
        },
    )
    assert created.status_code == 201
    asset = created.json()
    assert asset["filename_or_path"] == "assets/start-001.png"

    updated = client.put(
        f"/api/assets/{asset['id']}",
        json={"asset_type": "end_frame", "filename_or_path": "assets/end-001.png"},
    )
    assert updated.status_code == 200
    assert updated.json()["asset_type"] == "end_frame"

    deleted = client.delete(f"/api/assets/{asset['id']}")
    assert deleted.status_code == 204
    assert client.delete(f"/api/assets/{asset['id']}").status_code == 404


def test_audio_plan_save_and_load(client: TestClient) -> None:
    project = create_project(client)
    payload = {
        "music_prompt": "gentle magical marimba",
        "sound_effects_list": "sparkles, soft wind",
        "voiceover_script": "A warm narrator introduces Mia.",
        "subtitle_script": "Mia finds the moon map.",
        "audio_notes": "keep it age 4+",
    }
    saved = client.put(f"/api/projects/{project['id']}/audio-plan", json=payload)
    assert saved.status_code == 200
    loaded = client.get(f"/api/projects/{project['id']}/audio-plan")
    assert loaded.status_code == 200
    assert loaded.json()["music_prompt"] == "gentle magical marimba"


def test_invalid_project_and_shot_access_returns_404(client: TestClient) -> None:
    assert client.get("/api/projects/999").status_code == 404
    assert client.get("/api/projects/999/shots").status_code == 404
    assert client.put("/api/shots/999", json={"purpose": "Missing"}).status_code == 404
    assert client.delete("/api/shots/999").status_code == 404


def test_asset_shot_must_belong_to_same_project(client: TestClient) -> None:
    first_project = create_project(client, "First")
    second_project = create_project(client, "Second")
    foreign_shot = client.post(
        f"/api/projects/{second_project['id']}/shots",
        json={"duration_seconds": 5, "purpose": "Other project shot"},
    ).json()

    create_response = client.post(
        f"/api/projects/{first_project['id']}/assets",
        json={
            "shot_id": foreign_shot["id"],
            "asset_type": "start_frame",
            "filename_or_path": "bad-link.png",
        },
    )
    assert create_response.status_code == 400

    own_shot = client.post(
        f"/api/projects/{first_project['id']}/shots",
        json={"duration_seconds": 5, "purpose": "Own shot"},
    ).json()
    asset = client.post(
        f"/api/projects/{first_project['id']}/assets",
        json={
            "shot_id": own_shot["id"],
            "asset_type": "start_frame",
            "filename_or_path": "good-link.png",
        },
    ).json()
    update_response = client.put(f"/api/assets/{asset['id']}", json={"shot_id": foreign_shot["id"]})
    assert update_response.status_code == 400
