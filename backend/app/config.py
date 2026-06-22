import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    database_url: str = "sqlite:///./short_film_planner.db"
    openai_api_key: str = ""
    openai_model_story: str = "gpt-5-mini"


def get_settings() -> Settings:
    return Settings(
        database_url=os.getenv("DATABASE_URL", "sqlite:///./short_film_planner.db"),
        openai_api_key=os.getenv("OPENAI_API_KEY", ""),
        openai_model_story=os.getenv("OPENAI_MODEL_STORY", "gpt-5-mini"),
    )
