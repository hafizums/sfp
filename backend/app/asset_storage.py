import re
import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile

from .config import Settings, get_settings

ALLOWED_EXTENSIONS = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".mov": "video/quicktime",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".m4a": "audio/mp4",
    ".txt": "text/plain",
    ".srt": "application/x-subrip",
    ".vtt": "text/vtt",
}

MIME_ALIASES = {
    ".jpg": {"image/jpg", "image/jpeg"},
    ".jpeg": {"image/jpg", "image/jpeg"},
    ".srt": {"application/x-subrip", "text/plain", "application/octet-stream"},
    ".vtt": {"text/vtt", "text/plain", "application/octet-stream"},
    ".txt": {"text/plain", "application/octet-stream"},
    ".mov": {"video/quicktime", "video/mp4", "application/octet-stream"},
    ".m4a": {"audio/mp4", "audio/x-m4a", "application/octet-stream"},
    ".wav": {"audio/wav", "audio/x-wav", "application/octet-stream"},
}


def storage_root(settings: Settings | None = None) -> Path:
    settings = settings or get_settings()
    root = Path(settings.asset_storage_dir)
    if not root.is_absolute():
        root = Path(__file__).resolve().parents[1] / root
    root.mkdir(parents=True, exist_ok=True)
    return root.resolve()


def safe_original_filename(filename: str | None) -> str:
    name = Path(filename or "asset").name
    cleaned = re.sub(r"[^A-Za-z0-9._ -]", "_", name).strip(" .")
    return cleaned or "asset"


async def save_upload_file(project_id: int, upload: UploadFile, settings: Settings | None = None) -> dict:
    settings = settings or get_settings()
    original_filename = safe_original_filename(upload.filename)
    extension = Path(original_filename).suffix.lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Unsupported file type for asset upload.")

    content_type = upload.content_type or ALLOWED_EXTENSIONS[extension]
    allowed_mimes = {ALLOWED_EXTENSIONS[extension], *MIME_ALIASES.get(extension, set())}
    if content_type not in allowed_mimes:
        raise HTTPException(status_code=400, detail="Uploaded file MIME type does not match its extension.")

    project_dir = storage_root(settings) / f"project_{project_id}"
    project_dir.mkdir(parents=True, exist_ok=True)
    stored_filename = f"{uuid.uuid4().hex}{extension}"
    destination = (project_dir / stored_filename).resolve()
    if storage_root(settings) not in destination.parents:
        raise HTTPException(status_code=400, detail="Unsafe asset storage path.")

    size_bytes = 0
    try:
        with destination.open("wb") as output:
            while chunk := await upload.read(1024 * 1024):
                size_bytes += len(chunk)
                if size_bytes > settings.max_asset_upload_bytes:
                    raise HTTPException(status_code=413, detail="Asset upload exceeds the maximum allowed size.")
                output.write(chunk)
    except Exception:
        destination.unlink(missing_ok=True)
        raise
    finally:
        await upload.close()

    relative_path = str(destination.relative_to(storage_root(settings))).replace("\\", "/")
    return {
        "original_filename": original_filename,
        "stored_filename": stored_filename,
        "relative_path": relative_path,
        "mime_type": content_type,
        "size_bytes": size_bytes,
        "absolute_path": destination,
    }


def resolve_asset_file(relative_path: str, settings: Settings | None = None) -> Path:
    if not relative_path:
        raise HTTPException(status_code=404, detail="Asset file not found.")
    root = storage_root(settings)
    path = (root / relative_path).resolve()
    if root != path and root not in path.parents:
        raise HTTPException(status_code=400, detail="Unsafe asset file path.")
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Asset file not found.")
    return path


def delete_asset_file(relative_path: str, settings: Settings | None = None) -> None:
    if not relative_path:
        return
    try:
        resolve_asset_file(relative_path, settings).unlink(missing_ok=True)
    except HTTPException:
        return
