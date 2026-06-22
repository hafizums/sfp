# Short Film Planner Studio Project State

Last reviewed against milestone `OPTIONAL_INTERVIEW_WORKFLOW_01`.

## Purpose

Short Film Planner Studio is a private local web app for planning a short kids adventure film. It supports project setup, optional guided interview, manual story/screenplay planning, a lockable Production Bible, character and location bibles, storyboard shots, copy-ready Wan 2.2 prompts, local asset tracking/upload, manual shot takes, shot quality gates, audio notes, and a final checklist.

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
- `backend/app/services.py`: shared project, shot, runtime, checklist, Production Bible, quality review, and validation logic.
- `backend/app/asset_storage.py`: local upload validation, safe filename handling, file serving path resolution, and deletion.
- `backend/app/api/`: route modules for projects, story, characters, locations, shots, assets, Production Bible, quality reviews, audio, checklist, and AI.
- `backend/app/ai/`: OpenAI clients, structured AI schemas, story-package service, and shot-prompt service.

## Frontend Modules

- `frontend/src/App.tsx`: loads projects, selects active project, handles top-level backend errors.
- `frontend/src/api/client.ts`: typed API client.
- `frontend/src/components/Dashboard.tsx`: project creation, selection, edit, delete, metrics.
- `frontend/src/components/ProjectWorkspace.tsx`: tabbed project workspace and workflow rail.
- `frontend/src/components/ProductionBiblePanel.tsx`: source-of-truth production controls, lock/unlock flow, copyable negative prompt rules, and quality gate template.
- `frontend/src/components/AIStoryPanel.tsx`: backend-only OpenAI story package preview/apply UI.
- `frontend/src/components/AIShotPromptPanel.tsx`: backend-only OpenAI Wan 2.2 prompt package preview/apply UI.
- `frontend/src/components/ShotList.tsx`: timeline shot list, shot detail editing, shot takes, shot quality gate review, prompt copy actions, attached asset previews.
- `frontend/src/components/AssetManager.tsx`: local asset upload, metadata tracking, preview cards, delete actions.
- `frontend/src/planner.ts`: runtime/progress helpers and Wan package text builder.
- `frontend/src/types.ts`: shared frontend TypeScript types.

## Database Models

- `Project`: title, genre, target runtime, audience, tone, aspect ratio, visual style, safety rules.
- `StoryInterview`: optional guided interview answers used as one possible story-generation context source.
- `StoryWorkspace`: logline, synopsis, structure, screenplay, simple dialogue, voiceover, subtitles.
- `Character`: character bible and continuity fields.
- `Location`: location bible, continuity, safety, and negative prompts.
- `Shot`: storyboard/timeline shot details plus image/start/end/video/negative prompt fields and status.
- `Asset`: project-level or shot-level asset metadata plus optional uploaded file metadata.
- `ShotTake`: shot attempt/version metadata, prompt snapshots, linked assets, scores, rejection reason, and final approval state.
- `ProductionBible`: project-level creative/technical source of truth with lock state.
- `ShotQualityReview`: shot-level quality gate scores, notes, and final readiness flag.
- `AudioPlan`: music, sound effects, voiceover, subtitles, and notes.
- `ChecklistItem`: final readiness checklist rows.

## API Endpoint Groups

- Health and projects: `/api/health`, `/api/projects`, `/api/projects/{project_id}`
- Story: `/api/projects/{project_id}/story-interview`, `/api/projects/{project_id}/workspace`
- Characters: `/api/projects/{project_id}/characters`, `/api/characters/{character_id}`
- Locations: `/api/projects/{project_id}/locations`, `/api/locations/{location_id}`
- Shots: `/api/projects/{project_id}/shots`, `/api/shots/{shot_id}`, `/api/projects/{project_id}/shots/reorder`
- Shot takes: `/api/shots/{shot_id}/takes`, `/api/shot-takes/{take_id}`, `/api/shot-takes/{take_id}/approve`, `/api/shot-takes/{take_id}/reject`
- Assets: `/api/projects/{project_id}/assets`, `/api/projects/{project_id}/assets/upload`, `/api/assets/{asset_id}`, `/api/assets/{asset_id}/file`
- Production Bible: `/api/projects/{project_id}/production-bible`, `/api/projects/{project_id}/production-bible/lock`, `/api/projects/{project_id}/production-bible/unlock`
- Quality reviews: `/api/shots/{shot_id}/quality-review`
- Audio: `/api/projects/{project_id}/audio-plan`
- Checklist: `/api/projects/{project_id}/checklist`, `/api/checklist/{item_id}`
- AI story: `/api/projects/{project_id}/ai/story-package/preview`, `/api/projects/{project_id}/ai/story-package/apply`
- AI shot prompts: `/api/projects/{project_id}/ai/shot-prompts/preview`, `/api/projects/{project_id}/ai/shot-prompts/apply`

## Current Workflow

1. Create project.
2. Add story context through the optional interview, manual Story workspace, Production Bible, characters/locations, or shots.
3. Generate story package preview when useful.
4. Apply selected story sections.
5. Fill and lock the Production Bible.
6. Review/edit characters, locations, and shots.
7. Generate Wan 2.2 prompt package preview using the Production Bible and shot context.
8. Apply prompt packages to shot fields.
9. Copy prompts manually for external tools.
10. Upload generated assets locally.
11. Create shot takes for generated attempts and approve one final take per shot.
12. Preview assets, complete shot quality gates, and track shot status.
13. Complete final checklist.

## AI Features

- Story package generation uses OpenAI from the backend only. The guided interview is optional; preview uses the best available context from the Production Bible, any filled interview answers, manual Story workspace fields, existing characters/locations/shots, and meaningful project setup defaults. It creates a structured preview containing story workspace content, character suggestions, location suggestions, storyboard shots, audio plan, and safety review. Applying is user-controlled and overwrite-safe.
- Wan 2.2 shot prompt generation uses OpenAI from the backend only. It does not require interview answers. It includes Production Bible context for visual style, camera language, continuity, negative prompt rules, safety, and final delivery specs, plus existing shot context. It creates structured prompt packages for existing shots. It does not call WaveSpeed and does not generate files or videos.
- Missing API keys, provider errors, timeouts, invalid responses, missing-story-context states, no-shot states, and cross-project shot IDs have test coverage.

## Production Bible and Quality Gates

- Production Bible records are created per project from project setup defaults where possible.
- Bible fields cover visual direction, continuity rules, safety rules, negative prompt rules, audio direction, and final delivery specs.
- Lock/unlock is explicit. Locked bibles are readable but cannot be updated until unlocked.
- Project metrics report whether the bible is locked, how many shots have quality reviews, and how many shots are approved for final.
- Each shot can lazily create a quality review with 0-5 scores for character consistency, location continuity, visual style, motion/camera quality, safety, prompt readiness, and asset readiness.
- Quality review approval is a review layer only. It does not automatically change shot status.

## Shot Takes

- Shot takes represent generated attempts such as `Take A`, `Take B`, and `Take C`.
- Takes snapshot current shot prompt fields by default and can link start frame, end frame, generated video, audio, and subtitle assets.
- Linked assets must belong to the same project, and shot-level assets must be project-level or attached to the same shot.
- Only one take per shot can be approved for final. Approving a take automatically clears final approval from sibling takes.
- Rejecting a take stores a rejected reason. Deleting a take leaves linked assets untouched.
- Provider job fields exist for future integrations, but WaveSpeed and automatic provider polling are not implemented.
- Project metrics include take count, shots with approved takes, and final edit readiness percentage.

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
- optional interview story preview paths using interview, manual workspace, shots, Production Bible, and project setup context
- AI shot prompt preview/apply paths using fake providers
- Production Bible default creation, update, lock/unlock, and locked-update failure
- AI prompt context including Production Bible content
- shot quality review default creation, update, and invalid-shot errors
- shot take creation, auto-labeling, prompt snapshots, linked-asset validation, approval handoff, rejection, delete safety, and invalid IDs

Frontend unit tests cover:

- dashboard create/edit/delete confirmation
- story AI panel render/loading/preview/apply/error/warnings
- Wan prompt panel render/loading/preview/apply/error/no-shot state
- shot runtime, reorder, status update, copy feedback, attached asset display
- Production Bible render, lock/unlock behavior, locked fields, save, and negative-rule copy
- shot quality gate render and update call
- shot takes empty state, create call, list rendering, approve/reject/delete calls, approved badge, and prompt snapshot copy
- asset upload form, selectors, preview media, API response rendering, delete confirmation

E2E tests cover:

- basic project planning flow
- prompt copy flow
- asset upload/preview/delete flow
- AI panel safe-state flow without calling OpenAI
- manual story start without filling the interview
- production bible lock and shot quality gate persistence flow
- shot take creation, prompt snapshot, approval handoff, and manual asset linking flow

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
2. Add a preflight/settings screen that clearly reports backend URL, OpenAI key presence, asset storage path, upload limits, and Production Bible lock status.
3. Add a manual WaveSpeed readiness checklist before implementing any API calls.
4. Add WaveSpeed integration behind backend-only configuration and fake-provider tests.
5. Add generated-video job tracking only after WaveSpeed API behavior is safely wrapped and tested.
