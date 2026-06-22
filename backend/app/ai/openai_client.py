import json
from typing import Any, Protocol

from fastapi import HTTPException
from pydantic import ValidationError

from ..config import Settings, get_settings
from .schemas import GeneratedStoryPackage


class StoryPackageProvider(Protocol):
    def generate_story_package(self, prompt: str) -> GeneratedStoryPackage:
        pass


class OpenAIStoryPackageClient:
    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()

    def generate_story_package(self, prompt: str) -> GeneratedStoryPackage:
        if not self.settings.openai_api_key:
            raise HTTPException(
                status_code=503,
                detail="OpenAI API key is not configured. Set OPENAI_API_KEY on the backend.",
            )

        try:
            from openai import APIConnectionError, APIStatusError, APITimeoutError, OpenAI
        except ImportError as exc:
            raise HTTPException(
                status_code=503,
                detail="OpenAI SDK is not installed on the backend.",
            ) from exc

        client = OpenAI(api_key=self.settings.openai_api_key, timeout=60.0)
        schema = GeneratedStoryPackage.model_json_schema()

        try:
            response = client.responses.create(
                model=self.settings.openai_model_story,
                input=[
                    {
                        "role": "system",
                        "content": "You generate safe, structured kids adventure short-film planning packages.",
                    },
                    {"role": "user", "content": prompt},
                ],
                text={
                    "format": {
                        "type": "json_schema",
                        "name": "generated_story_package",
                        "schema": schema,
                        "strict": False,
                    }
                },
            )
        except APITimeoutError as exc:
            raise HTTPException(status_code=504, detail="OpenAI request timed out.") from exc
        except APIConnectionError as exc:
            raise HTTPException(status_code=502, detail="Could not connect to OpenAI.") from exc
        except APIStatusError as exc:
            raise HTTPException(status_code=502, detail=f"OpenAI returned an error: {exc.status_code}") from exc
        except Exception as exc:
            raise HTTPException(status_code=502, detail="OpenAI provider error while generating story package.") from exc

        raw_text = _extract_response_text(response)
        try:
            return GeneratedStoryPackage.model_validate_json(raw_text)
        except ValidationError as exc:
            raise HTTPException(status_code=502, detail="OpenAI returned an invalid story package.") from exc


def _extract_response_text(response: Any) -> str:
    output_text = getattr(response, "output_text", None)
    if isinstance(output_text, str) and output_text.strip():
        return output_text

    if isinstance(response, dict):
        candidate = response.get("output_text")
        if isinstance(candidate, str):
            return candidate
        return json.dumps(response)

    model_dump = getattr(response, "model_dump", None)
    if callable(model_dump):
        dumped = model_dump()
        candidate = dumped.get("output_text")
        if isinstance(candidate, str):
            return candidate
        return json.dumps(dumped)

    raise HTTPException(status_code=502, detail="OpenAI response did not include text output.")
