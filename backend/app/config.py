import os
from dataclasses import dataclass
from pathlib import Path

try:
    from dotenv import load_dotenv
except ImportError:
    load_dotenv = None


def load_local_env() -> None:
    if load_dotenv is None:
        return
    repo_root = Path(__file__).resolve().parents[2]
    load_dotenv(repo_root / ".env", override=False)
    load_dotenv(repo_root / "backend" / ".env", override=False)


@dataclass(frozen=True)
class Settings:
    database_url: str = "sqlite:///./short_film_planner.db"
    asset_storage_dir: str = "uploads"
    max_asset_upload_bytes: int = 50 * 1024 * 1024
    openai_api_key: str = ""
    openai_model_story: str = "gpt-5-mini"
    openai_model_prompts: str = "gpt-5-mini"
    openai_story_timeout_seconds: float = 120.0
    openai_prompt_timeout_seconds: float = 120.0


def get_settings() -> Settings:
    load_local_env()
    return Settings(
        database_url=os.getenv("DATABASE_URL", "sqlite:///./short_film_planner.db"),
        asset_storage_dir=os.getenv("ASSET_STORAGE_DIR", "uploads"),
        max_asset_upload_bytes=int(os.getenv("MAX_ASSET_UPLOAD_BYTES", str(50 * 1024 * 1024))),
        openai_api_key=os.getenv("OPENAI_API_KEY", ""),
        openai_model_story=os.getenv("OPENAI_MODEL_STORY", "gpt-5-mini"),
        openai_model_prompts=os.getenv("OPENAI_MODEL_PROMPTS", "gpt-5-mini"),
        openai_story_timeout_seconds=float(os.getenv("OPENAI_STORY_TIMEOUT_SECONDS", "120")),
        openai_prompt_timeout_seconds=float(os.getenv("OPENAI_PROMPT_TIMEOUT_SECONDS", "120")),
    )
