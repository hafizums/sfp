from fastapi.testclient import TestClient


def create_project(client: TestClient, title: str = "Take Project") -> dict:
    response = client.post("/api/projects", json={"title": title})
    assert response.status_code == 201
    return response.json()


def create_shot(client: TestClient, project_id: int, purpose: str = "Opening shot") -> dict:
    response = client.post(
        f"/api/projects/{project_id}/shots",
        json={
            "purpose": purpose,
            "duration_seconds": 5,
            "image_prompt": "wide storybook frame",
            "start_frame_prompt": "Mia starts beside a door",
            "end_frame_prompt": "The door glows open",
            "video_prompt": "slow push toward the glowing door",
            "negative_prompt": "no text, no logos, no scary danger",
        },
    )
    assert response.status_code == 201
    return response.json()


def create_asset(
    client: TestClient,
    project_id: int,
    shot_id: int | None = None,
    asset_type: str = "generated_video",
    filename: str = "take.mp4",
) -> dict:
    response = client.post(
        f"/api/projects/{project_id}/assets",
        json={
            "shot_id": shot_id,
            "asset_type": asset_type,
            "filename_or_path": filename,
            "notes": "metadata only test asset",
        },
    )
    assert response.status_code == 201
    return response.json()


def test_create_take_auto_labels_and_snapshots_prompt_fields(client: TestClient) -> None:
    project = create_project(client)
    shot = create_shot(client, project["id"])

    first = client.post(f"/api/shots/{shot['id']}/takes", json={})
    second = client.post(f"/api/shots/{shot['id']}/takes", json={})

    assert first.status_code == 201
    assert second.status_code == 201
    assert first.json()["take_label"] == "Take A"
    assert second.json()["take_label"] == "Take B"
    assert "slow push toward the glowing door" in first.json()["prompt_snapshot"]
    assert first.json()["negative_prompt_snapshot"] == "no text, no logos, no scary danger"


def test_linked_assets_must_belong_to_project_and_matching_shot(client: TestClient) -> None:
    first_project = create_project(client, "First")
    second_project = create_project(client, "Second")
    first_shot = create_shot(client, first_project["id"])
    other_shot = create_shot(client, first_project["id"], "Other shot")
    foreign_asset = create_asset(client, second_project["id"])
    other_shot_asset = create_asset(client, first_project["id"], other_shot["id"])

    foreign_response = client.post(
        f"/api/shots/{first_shot['id']}/takes",
        json={"video_asset_id": foreign_asset["id"]},
    )
    wrong_shot_response = client.post(
        f"/api/shots/{first_shot['id']}/takes",
        json={"video_asset_id": other_shot_asset["id"]},
    )

    assert foreign_response.status_code == 400
    assert "belong to this project" in foreign_response.json()["detail"]
    assert wrong_shot_response.status_code == 400
    assert "belong to this shot" in wrong_shot_response.json()["detail"]


def test_project_level_or_same_shot_asset_can_link_to_take(client: TestClient) -> None:
    project = create_project(client)
    shot = create_shot(client, project["id"])
    project_asset = create_asset(client, project["id"], None, "generated_video", "project.mp4")
    shot_asset = create_asset(client, project["id"], shot["id"], "start_frame", "start.png")

    response = client.post(
        f"/api/shots/{shot['id']}/takes",
        json={"video_asset_id": project_asset["id"], "start_frame_asset_id": shot_asset["id"]},
    )

    assert response.status_code == 201
    assert response.json()["video_asset_id"] == project_asset["id"]
    assert response.json()["start_frame_asset_id"] == shot_asset["id"]


def test_approve_take_unapproves_other_takes_for_same_shot(client: TestClient) -> None:
    project = create_project(client)
    shot = create_shot(client, project["id"])
    first = client.post(f"/api/shots/{shot['id']}/takes", json={}).json()
    second = client.post(f"/api/shots/{shot['id']}/takes", json={}).json()

    approve_first = client.post(f"/api/shot-takes/{first['id']}/approve")
    approve_second = client.post(f"/api/shot-takes/{second['id']}/approve")
    first_after = client.get(f"/api/shot-takes/{first['id']}")

    assert approve_first.status_code == 200
    assert approve_second.status_code == 200
    assert approve_second.json()["approved_for_final"] is True
    assert approve_second.json()["status"] == "Approved"
    assert first_after.json()["approved_for_final"] is False
    assert first_after.json()["status"] == "Ready for review"


def test_reject_take_stores_reason(client: TestClient) -> None:
    project = create_project(client)
    shot = create_shot(client, project["id"])
    take = client.post(f"/api/shots/{shot['id']}/takes", json={"approved_for_final": True}).json()

    response = client.post(
        f"/api/shot-takes/{take['id']}/reject",
        json={"rejected_reason": "Motion drifted away from the shot plan."},
    )

    assert response.status_code == 200
    assert response.json()["status"] == "Rejected"
    assert response.json()["approved_for_final"] is False
    assert response.json()["rejected_reason"] == "Motion drifted away from the shot plan."


def test_delete_take_does_not_delete_linked_asset(client: TestClient) -> None:
    project = create_project(client)
    shot = create_shot(client, project["id"])
    asset = create_asset(client, project["id"], shot["id"])
    take = client.post(f"/api/shots/{shot['id']}/takes", json={"video_asset_id": asset["id"]}).json()

    delete_response = client.delete(f"/api/shot-takes/{take['id']}")
    asset_response = client.get(f"/api/projects/{project['id']}/assets")

    assert delete_response.status_code == 204
    assert any(item["id"] == asset["id"] for item in asset_response.json())


def test_invalid_shot_or_take_returns_clean_error(client: TestClient) -> None:
    takes_response = client.get("/api/shots/9999/takes")
    take_response = client.get("/api/shot-takes/9999")

    assert takes_response.status_code == 404
    assert takes_response.json()["detail"] == "Shot not found"
    assert take_response.status_code == 404
    assert take_response.json()["detail"] == "Shot take not found"
