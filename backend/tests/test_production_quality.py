from fastapi.testclient import TestClient

from app import models


def create_project(client: TestClient, title: str = "Lantern Island", **overrides: object) -> dict:
    response = client.post("/api/projects", json={"title": title, **overrides})
    assert response.status_code == 201
    return response.json()


def create_shot(client: TestClient, project_id: int, purpose: str = "Opening wonder") -> dict:
    response = client.post(
        f"/api/projects/{project_id}/shots",
        json={"purpose": purpose, "duration_seconds": 5},
    )
    assert response.status_code == 201
    return response.json()


def test_production_bible_default_creation(client: TestClient) -> None:
    project = create_project(
        client,
        visual_style="soft miniature storybook",
        aspect_ratio="2.39:1",
        safety_rules=["No danger", "No scary shadows"],
    )

    response = client.get(f"/api/projects/{project['id']}/production-bible")

    assert response.status_code == 200
    bible = response.json()
    assert bible["visual_style"] == "soft miniature storybook"
    assert "No danger" in bible["safety_rules"]
    assert "2.39:1" in bible["final_delivery_specs"]
    assert bible["locked"] is False


def test_production_bible_lazy_creation_for_existing_project(client: TestClient) -> None:
    project = create_project(client, visual_style="storybook clay")
    bible = client.get(f"/api/projects/{project['id']}/production-bible").json()
    response = client.put(
        f"/api/projects/{project['id']}/production-bible",
        json={"visual_style": "changed once"},
    )
    assert response.status_code == 200

    db = client.app.state.testing_session_local()
    try:
        db.delete(db.get(models.ProductionBible, bible["id"]))
        db.commit()
    finally:
        db.close()

    healed = client.get(f"/api/projects/{project['id']}/production-bible")

    assert healed.status_code == 200
    assert healed.json()["visual_style"] == "storybook clay"


def test_production_bible_update_lock_and_unlock(client: TestClient) -> None:
    project = create_project(client)

    update = client.put(
        f"/api/projects/{project['id']}/production-bible",
        json={"negative_prompt_rules": "no text, no logos, no watermarks"},
    )
    assert update.status_code == 200
    assert update.json()["negative_prompt_rules"] == "no text, no logos, no watermarks"

    locked = client.post(f"/api/projects/{project['id']}/production-bible/lock")
    assert locked.status_code == 200
    assert locked.json()["locked"] is True

    blocked = client.put(
        f"/api/projects/{project['id']}/production-bible",
        json={"visual_style": "changed while locked"},
    )
    assert blocked.status_code == 409
    assert "locked" in blocked.json()["detail"]

    unlocked = client.post(f"/api/projects/{project['id']}/production-bible/unlock")
    assert unlocked.status_code == 200
    assert unlocked.json()["locked"] is False

    allowed = client.put(
        f"/api/projects/{project['id']}/production-bible",
        json={"visual_style": "bright clay storybook"},
    )
    assert allowed.status_code == 200
    assert allowed.json()["visual_style"] == "bright clay storybook"


def test_project_metrics_include_bible_and_quality_reviews(client: TestClient) -> None:
    project = create_project(client)
    shot = create_shot(client, project["id"])
    client.post(f"/api/projects/{project['id']}/production-bible/lock")
    client.put(
        f"/api/shots/{shot['id']}/quality-review",
        json={"approved_for_final": True, "safety_score": 5},
    )

    response = client.get(f"/api/projects/{project['id']}")

    assert response.status_code == 200
    data = response.json()
    assert data["production_bible_locked"] is True
    assert data["quality_review_count"] == 1
    assert data["shots_approved_for_final"] == 1


def test_shot_quality_review_default_creation_and_update(client: TestClient) -> None:
    project = create_project(client)
    shot = create_shot(client, project["id"])

    default = client.get(f"/api/shots/{shot['id']}/quality-review")
    assert default.status_code == 200
    assert default.json()["shot_id"] == shot["id"]
    assert default.json()["visual_style_score"] == 0

    update = client.put(
        f"/api/shots/{shot['id']}/quality-review",
        json={
            "character_consistency_score": 4,
            "location_continuity_score": 5,
            "visual_style_score": 4,
            "motion_quality_score": 3,
            "safety_score": 5,
            "prompt_readiness_score": 5,
            "asset_readiness_score": 2,
            "review_notes": "Start frame still needs replacement.",
            "approved_for_final": False,
        },
    )

    assert update.status_code == 200
    data = update.json()
    assert data["character_consistency_score"] == 4
    assert data["review_notes"] == "Start frame still needs replacement."


def test_quality_review_invalid_shot_returns_clean_error(client: TestClient) -> None:
    response = client.get("/api/shots/9999/quality-review")

    assert response.status_code == 404
    assert response.json()["detail"] == "Shot not found"
