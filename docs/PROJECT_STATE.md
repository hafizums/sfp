# Short Film Planner Studio Project State

Last reviewed against commit `2791d962880bf12653ef6ce0e1ca9827105bf87b`.

## Purpose

Short Film Planner Studio is a private local web app for planning a short kids adventure film. It supports project setup, story planning, character and location bibles, storyboard shots, copy-ready Wan 2.2 prompts, local asset tracking/upload, audio notes, and a final checklist.

The app is not a video generator. WaveSpeed is not integrated.

## Tech Stack

- Frontend: React, TypeScript, Vite, Vitest, Testing Library
- Backend: FastAPI, SQLAlchemy, Pydantic, Pytest
- Database: SQLite for local personal use
- AI provider: OpenAI via backend-only API key
- Asset storage: local filesystem under the configured backend storage directory

## Architecture

The frontend talks only to the FastAPI backend through `frontend/src/api/client.ts`. OpenAI credentials and provider calls stay in the backend. The backend stores structured planner data in SQLite and uploaded files on local disk. Runtime uploaded files and local SQLite databases are not intended for Git.

## Backend Modules

- `backend/app/main.py`: FastAPI app factory, CORS, lifespan startup.
- `backend/app/config.py`: environment-backed settings for database, asset storage, OpenAI models, and timeouts.
- `backend/app/database.py`: SQLAlchemy engine/session, `init_db()`, and small SQLite asset-column migration helper.
- `backend/app/models.py`: SQLAlchemy tables.
- `backend/app/schemas.py`: public API Pydantic schemas.
- `backend/app/services.py`: shared project, shot, runtime, checklist, and validation logic.
- `backend/app/asset_storage.py`: local upload validation, safe filename handling, file serving path resolution, and deletion.
- `backend/app/api/`: route modules for projects, story, characters, locations, shots, assets, audio, checklist, and AI.
- `backend/app/ai/`: OpenAI clients, structured AI schemas, story-package service, and shot-prompt service.

## Frontend Modules

- `frontend/src/App.tsx`: loads projects, selects active project, handles top-level backend errors.
- `frontend/src/api/client.ts`: typed API client.
- `frontend/src/components/Dashboard.tsx`: project creation, selection, edit, delete, metrics.
- `frontend/src/components/ProjectWorkspace.tsx`: tabbed project workspace and workflow rail.
- `frontend/src/components/AIStoryPanel.tsx`: backend-only OpenAI story package preview/apply UI.
- `frontend/src/components/AIShotPromptPanel.tsx`: backend-only OpenAI Wan 2.2 prompt package preview/apply UI.
- `frontend/src/components/ShotList.tsx`: timeline shot list, shot detail editing, prompt copy actions, attached asset previews.
- `frontend/src/components/AssetManager.tsx`: local asset upload, metadata tracking, preview cards, delete actions.
- `frontend/src/planner.ts`: runtime/progress helpers and Wan package text builder.
- `frontend/src/types.ts`: shared frontend TypeScript types.

## Database Models

- `Project`: title, genre, target runtime, audience, tone, aspect ratio, visual style, safety rules.
- `StoryInterview`: interview answers used as story-generation context.
- `StoryWorkspace`: logline, synopsis, structure, screenplay, simple dialogue, voiceover, subtitles.
- `Character`: character bible and continuity fields.
- `Location`: location bible, continuity, safety, and negative prompts.
- `Shot`: storyboard/timeline shot details plus image/start/end/video/negative prompt fields and status.
- `Asset`: project-level or shot-level asset metadata plus optional uploaded file metadata.
- `AudioPlan`: music, sound effects, voiceover, subtitles, and notes.
- `ChecklistItem`: final readiness checklist rows.

## API Endpoint Groups

- Health and projects: `/api/health`, `/api/projects`, `/api/projects/{project_id}`
- Story: `/api/projects/{project_id}/story-interview`, `/api/projects/{project_id}/workspace`
- Characters: `/api/projects/{project_id}/characters`, `/api/characters/{character_id}`
- Locations: `/api/projects/{project_id}/locations`, `/api/locations/{location_id}`
- Shots: `/api/projects/{project_id}/shots`, `/api/shots/{shot_id}`, `/api/projects/{project_id}/shots/reorder`
- Assets: `/api/projects/{project_id}/assets`, `/api/projects/{project_id}/assets/upload`, `/api/assets/{asset_id}`, `/api/assets/{asset_id}/file`
- Audio: `/api/projects/{project_id}/audio-plan`
- Checklist: `/api/projects/{project_id}/checklist`, `/api/checklist/{item_id}`
- AI story: `/api/projects/{project_id}/ai/story-package/preview`, `/api/projects/{project_id}/ai/story-package/apply`
- AI shot prompts: `/api/projects/{project_id}/ai/shot-prompts/preview`, `/api/projects/{project_id}/ai/shot-prompts/apply`

## Current Workflow

1. Create project.
2. Fill story interview.
3. Generate story package preview.
4. Apply selected story sections.
5. Review/edit characters, locations, and shots.
6. Generate Wan 2.2 prompt package preview.
7. Apply prompt packages to shot fields.
8. Copy prompts manually for external tools.
9. Upload generated assets locally.
10. Preview assets and track shot status.
11. Complete final checklist.

## AI Features

- Story package generation uses OpenAI from the backend only. It creates a structured preview containing story workspace content, character suggestions, location suggestions, storyboard shots, audio plan, and safety review. Applying is user-controlled and overwrite-safe.
- Wan 2.2 shot prompt generation uses OpenAI from the backend only. It creates structured prompt packages for existing shots. It does not call WaveSpeed and does not generate files or videos.
- Missing API keys, provider errors, timeouts, invalid responses, no-interview states, no-shot states, and cross-project shot IDs have test coverage.

## Asset Upload Behavior

- Uploads support png, jpg, jpeg, webp, mp4, webm, mov, mp3, wav, m4a, txt, srt, and vtt.
- Uploaded files are stored under `ASSET_STORAGE_DIR`, defaulting to `backend/uploads`.
- The backend generates server filenames and keeps original filenames in metadata.
- Asset records can be project-level or shot-level.
- Files are served only through `/api/assets/{asset_id}/file`.
- Asset delete removes metadata and uploaded file when present.
- Project delete removes associated uploaded asset files.
- Metadata-only assets remain supported through `filename_or_path`.

## Test Coverage

Backend tests cover:

- health and project CRUD
- story interview/workspace persistence
- shot CRUD, reorder, runtime, progress
- character/location CRUD
- asset metadata behavior, upload behavior, file serving, delete cleanup
- audio plan and checklist
- invalid project/shot access and cross-project asset shot validation
- AI story package preview/apply paths using fake providers
- AI shot prompt preview/apply paths using fake providers

Frontend unit tests cover:

- dashboard create/edit/delete confirmation
- story AI panel render/loading/preview/apply/error/warnings
- Wan prompt panel render/loading/preview/apply/error/no-shot state
- shot runtime, reorder, status update, copy feedback, attached asset display
- asset upload form, selectors, preview media, API response rendering, delete confirmation

E2E tests cover:

- basic project planning flow
- prompt copy flow
- asset upload/preview/delete flow
- AI panel safe-state flow without calling OpenAI

## Current Limitations

- No WaveSpeed API integration.
- No real video generation.
- No auth or multi-user model.
- No export.
- No public sharing.
- No billing.
- No cloud storage.
- No full timeline/video editor.
- Local SQLite and local filesystem storage are intended for private personal use.

## Recommended Next Milestones

1. Stabilize E2E coverage in CI or a local pre-release script.
2. Add a preflight/settings screen that clearly reports backend URL, OpenAI key presence, asset storage path, and upload limits.
3. Add a manual WaveSpeed readiness checklist before implementing any API calls.
4. Add WaveSpeed integration behind backend-only configuration and fake-provider tests.
5. Add generated-video job tracking only after WaveSpeed API behavior is safely wrapped and tested.
