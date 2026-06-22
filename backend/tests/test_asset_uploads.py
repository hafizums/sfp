from pathlib import Path

from fastapi.testclient import TestClient


def create_project(client: TestClient, title: str = "Lantern Island") -> dict:
    response = client.post("/api/projects", json={"title": title})
    assert response.status_code == 201
    return response.json()


def create_shot(client: TestClient, project_id: int, purpose: str = "Opening") -> dict:
    response = client.post(f"/api/projects/{project_id}/shots", json={"duration_seconds": 5, "purpose": purpose})
    assert response.status_code == 201
    return response.json()


def upload_asset(
    client: TestClient,
    project_id: int,
    filename: str,
    content: bytes,
    mime_type: str,
    asset_type: str = "other",
    shot_id: int | None = None,
) -> dict:
    data = {"asset_type": asset_type, "notes": "test upload"}
    if shot_id is not None:
        data["shot_id"] = str(shot_id)
    response = client.post(
        f"/api/projects/{project_id}/assets/upload",
        data=data,
        files={"file": (filename, content, mime_type)},
    )
    assert response.status_code == 201
    return response.json()


def test_upload_image_asset(client: TestClient, tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setenv("ASSET_STORAGE_DIR", str(tmp_path))
    project = create_project(client)

    asset = upload_asset(
        client,
        project["id"],
        "reference.png",
        b"\x89PNG\r\n\x1a\nsmall",
        "image/png",
        "character_reference",
    )

    assert asset["original_filename"] == "reference.png"
    assert asset["filename_or_path"] == "reference.png"
    assert asset["mime_type"] == "image/png"
    assert asset["size_bytes"] > 0
    assert asset["preview_url"] == f"/api/assets/{asset['id']}/file"
    assert asset["download_url"] == f"/api/assets/{asset['id']}/file"
    assert (tmp_path / asset["relative_path"]).is_file()


def test_upload_video_audio_and_text_assets(client: TestClient, tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setenv("ASSET_STORAGE_DIR", str(tmp_path))
    project = create_project(client)

    video = upload_asset(client, project["id"], "clip.mp4", b"tiny video", "video/mp4", "generated_video")
    audio = upload_asset(client, project["id"], "music.mp3", b"tiny audio", "audio/mpeg", "audio")
    subtitle = upload_asset(client, project["id"], "captions.vtt", b"WEBVTT\n\n00:00.000 --> 00:01.000\nHi", "text/vtt", "subtitle")

    assert video["mime_type"] == "video/mp4"
    assert audio["mime_type"] == "audio/mpeg"
    assert subtitle["mime_type"] == "text/vtt"


def test_reject_unsupported_extension(client: TestClient, tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setenv("ASSET_STORAGE_DIR", str(tmp_path))
    project = create_project(client)

    response = client.post(
        f"/api/projects/{project['id']}/assets/upload",
        data={"asset_type": "other"},
        files={"file": ("unsafe.exe", b"nope", "application/octet-stream")},
    )

    assert response.status_code == 400
    assert "Unsupported file type" in response.json()["detail"]


def test_reject_cross_project_shot_id(client: TestClient, tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setenv("ASSET_STORAGE_DIR", str(tmp_path))
    first_project = create_project(client, "First")
    second_project = create_project(client, "Second")
    foreign_shot = create_shot(client, second_project["id"])

    response = client.post(
        f"/api/projects/{first_project['id']}/assets/upload",
        data={"asset_type": "start_frame", "shot_id": str(foreign_shot["id"])},
        files={"file": ("start.png", b"\x89PNG\r\n\x1a\nsmall", "image/png")},
    )

    assert response.status_code == 400
    assert "shot_id does not belong" in response.json()["detail"]


def test_file_endpoint_returns_uploaded_file(client: TestClient, tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setenv("ASSET_STORAGE_DIR", str(tmp_path))
    project = create_project(client)
    content = b"\x89PNG\r\n\x1a\nsmall"
    asset = upload_asset(client, project["id"], "preview.png", content, "image/png", "start_frame")

    response = client.get(f"/api/assets/{asset['id']}/file")

    assert response.status_code == 200
    assert response.content == content
    assert response.headers["content-type"].startswith("image/png")


def test_delete_asset_removes_metadata_and_file(client: TestClient, tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setenv("ASSET_STORAGE_DIR", str(tmp_path))
    project = create_project(client)
    asset = upload_asset(client, project["id"], "delete-me.png", b"\x89PNG\r\n\x1a\nsmall", "image/png", "end_frame")
    stored_path = tmp_path / asset["relative_path"]
    assert stored_path.is_file()

    deleted = client.delete(f"/api/assets/{asset['id']}")

    assert deleted.status_code == 204
    assert not stored_path.exists()
    assert client.get(f"/api/assets/{asset['id']}/file").status_code == 404


def test_delete_project_removes_uploaded_asset_files(client: TestClient, tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setenv("ASSET_STORAGE_DIR", str(tmp_path))
    project = create_project(client)
    asset = upload_asset(client, project["id"], "project-delete.png", b"\x89PNG\r\n\x1a\nsmall", "image/png", "start_frame")
    stored_path = tmp_path / asset["relative_path"]
    assert stored_path.is_file()

    deleted = client.delete(f"/api/projects/{project['id']}")

    assert deleted.status_code == 204
    assert not stored_path.exists()


def test_missing_uploaded_file_returns_clean_error(client: TestClient, tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setenv("ASSET_STORAGE_DIR", str(tmp_path))
    project = create_project(client)
    asset = upload_asset(client, project["id"], "missing.png", b"\x89PNG\r\n\x1a\nsmall", "image/png", "start_frame")
    (tmp_path / asset["relative_path"]).unlink()

    response = client.get(f"/api/assets/{asset['id']}/file")

    assert response.status_code == 404
    assert "Asset file not found" in response.json()["detail"]


def test_path_traversal_filename_is_sanitized(client: TestClient, tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setenv("ASSET_STORAGE_DIR", str(tmp_path))
    project = create_project(client)

    asset = upload_asset(client, project["id"], "../evil.png", b"\x89PNG\r\n\x1a\nsmall", "image/png", "other")

    assert asset["original_filename"] == "evil.png"
    assert ".." not in asset["relative_path"]
    assert (tmp_path / asset["relative_path"]).resolve().is_relative_to(tmp_path.resolve())


def test_metadata_only_asset_behavior_still_works(client: TestClient) -> None:
    project = create_project(client)
    shot = create_shot(client, project["id"])
    created = client.post(
        f"/api/projects/{project['id']}/assets",
        json={
            "shot_id": shot["id"],
            "asset_type": "start_frame",
            "filename_or_path": "assets/start-001.png",
            "notes": "manual metadata",
        },
    )

    assert created.status_code == 201
    asset = created.json()
    assert asset["filename_or_path"] == "assets/start-001.png"
    assert asset["relative_path"] == ""
    assert asset["preview_url"] == ""

    assert client.delete(f"/api/assets/{asset['id']}").status_code == 204
