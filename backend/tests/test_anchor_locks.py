from fastapi.testclient import TestClient


def create_project(client: TestClient, title: str = "Lantern Island") -> dict:
    response = client.post("/api/projects", json={"title": title})
    assert response.status_code == 201
    return response.json()


def create_asset(client: TestClient, project_id: int, filename: str, asset_type: str, shot_id: int | None = None) -> dict:
    payload = {"asset_type": asset_type, "filename_or_path": filename, "notes": "approved anchor"}
    if shot_id is not None:
        payload["shot_id"] = shot_id
    response = client.post(f"/api/projects/{project_id}/assets", json=payload)
    assert response.status_code == 201
    return response.json()


def create_shot(client: TestClient, project_id: int) -> dict:
    response = client.post(f"/api/projects/{project_id}/shots", json={"duration_seconds": 5, "purpose": "Anchor shot"})
    assert response.status_code == 201
    return response.json()


def test_character_anchor_can_be_set_to_same_project_asset(client: TestClient) -> None:
    project = create_project(client)
    asset = create_asset(client, project["id"], "mia-reference.png", "character_reference")

    response = client.post(
        f"/api/projects/{project['id']}/characters",
        json={
            "name": "Mia",
            "anchor_asset_id": asset["id"],
            "face_identity_notes": "round face and short curls",
        },
    )

    assert response.status_code == 201
    data = response.json()
    assert data["anchor_asset_id"] == asset["id"]
    assert data["face_identity_notes"] == "round face and short curls"


def test_character_anchor_rejects_foreign_project_asset(client: TestClient) -> None:
    first = create_project(client, "First")
    second = create_project(client, "Second")
    foreign_asset = create_asset(client, second["id"], "foreign.png", "character_reference")

    response = client.post(
        f"/api/projects/{first['id']}/characters",
        json={"name": "Mia", "anchor_asset_id": foreign_asset["id"]},
    )

    assert response.status_code == 400
    assert "must belong to this project" in response.json()["detail"]


def test_locked_character_anchor_cannot_be_changed_until_unlocked(client: TestClient) -> None:
    project = create_project(client)
    first_asset = create_asset(client, project["id"], "mia-a.png", "character_reference")
    second_asset = create_asset(client, project["id"], "mia-b.png", "character_reference")
    character = client.post(
        f"/api/projects/{project['id']}/characters",
        json={"name": "Mia", "anchor_asset_id": first_asset["id"], "anchor_locked": True},
    ).json()

    blocked = client.put(f"/api/characters/{character['id']}", json={"anchor_asset_id": second_asset["id"]})
    unlocked = client.put(f"/api/characters/{character['id']}", json={"anchor_locked": False})
    changed = client.put(f"/api/characters/{character['id']}", json={"anchor_asset_id": second_asset["id"]})

    assert blocked.status_code == 409
    assert "Character anchor is locked" in blocked.json()["detail"]
    assert unlocked.status_code == 200
    assert changed.status_code == 200
    assert changed.json()["anchor_asset_id"] == second_asset["id"]


def test_location_anchor_can_be_set_to_same_project_asset(client: TestClient) -> None:
    project = create_project(client)
    asset = create_asset(client, project["id"], "garden-reference.png", "location_reference")

    response = client.post(
        f"/api/projects/{project['id']}/locations",
        json={
            "name": "Floating Garden",
            "anchor_asset_id": asset["id"],
            "layout_notes": "bridge stays on frame right",
        },
    )

    assert response.status_code == 201
    data = response.json()
    assert data["anchor_asset_id"] == asset["id"]
    assert data["layout_notes"] == "bridge stays on frame right"


def test_location_anchor_rejects_foreign_project_asset(client: TestClient) -> None:
    first = create_project(client, "First")
    second = create_project(client, "Second")
    foreign_asset = create_asset(client, second["id"], "foreign-garden.png", "location_reference")

    response = client.post(
        f"/api/projects/{first['id']}/locations",
        json={"name": "Floating Garden", "anchor_asset_id": foreign_asset["id"]},
    )

    assert response.status_code == 400
    assert "must belong to this project" in response.json()["detail"]


def test_locked_location_anchor_cannot_be_changed_until_unlocked(client: TestClient) -> None:
    project = create_project(client)
    first_asset = create_asset(client, project["id"], "garden-a.png", "location_reference")
    second_asset = create_asset(client, project["id"], "garden-b.png", "location_reference")
    location = client.post(
        f"/api/projects/{project['id']}/locations",
        json={"name": "Floating Garden", "anchor_asset_id": first_asset["id"], "anchor_locked": True},
    ).json()

    blocked = client.put(f"/api/locations/{location['id']}", json={"anchor_asset_id": second_asset["id"]})
    unlocked = client.put(f"/api/locations/{location['id']}", json={"anchor_locked": False})
    changed = client.put(f"/api/locations/{location['id']}", json={"anchor_asset_id": second_asset["id"]})

    assert blocked.status_code == 409
    assert "Location anchor is locked" in blocked.json()["detail"]
    assert unlocked.status_code == 200
    assert changed.status_code == 200
    assert changed.json()["anchor_asset_id"] == second_asset["id"]


def test_deleting_asset_used_as_anchor_returns_clean_conflict(client: TestClient) -> None:
    project = create_project(client)
    asset = create_asset(client, project["id"], "mia-reference.png", "character_reference")
    client.post(
        f"/api/projects/{project['id']}/characters",
        json={"name": "Mia", "anchor_asset_id": asset["id"]},
    )

    response = client.delete(f"/api/assets/{asset['id']}")

    assert response.status_code == 409
    assert "used as the anchor" in response.json()["detail"]
