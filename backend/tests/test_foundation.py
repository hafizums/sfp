from fastapi.testclient import TestClient


def create_project(client: TestClient, title: str = "Lantern Island") -> dict:
    response = client.post("/api/projects", json={"title": title})
    assert response.status_code == 201
    return response.json()


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
