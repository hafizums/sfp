# Short Film Planner Studio

Short Film Planner Studio is a private local web app for planning a 3-minute kids adventure AI short film from the first story idea through shot prompts, assets, audio notes, and a final readiness checklist.

Most planning tools are manual, with optional backend-only OpenAI generators for story packages and Wan 2.2 prompt packages. Local asset upload and preview is available for images, videos, audio, subtitles, and conservative text assets. The app does not include WaveSpeed, authentication, export, public sharing, payments, collaboration, or a full video editor.

## Tech Stack

- Frontend: React, Vite, TypeScript, Vitest, Testing Library
- Backend: Python, FastAPI, SQLAlchemy, Pydantic, Pytest
- Database: SQLite for local personal use

## Folder Structure

```text
backend/
  app/
    api/          FastAPI route modules by domain
    config.py     Environment-backed settings
    database.py   SQLAlchemy engine/session and init_db()
    main.py       FastAPI app factory
    models.py     SQLAlchemy models
    schemas.py    Pydantic request/response schemas
    services.py   Shared business logic
  tests/          Backend tests
frontend/
  src/
    api/          Frontend API client
    components/   React UI components and tests
    planner.ts    Frontend planner helpers
```

## Environment

Copy `.env.example` when you want a local reference for configuration values. No real API keys are needed or expected in this milestone.

```bash
cp .env.example .env
```

Backend configuration reads `DATABASE_URL` from the environment and defaults to local SQLite:

```text
sqlite:///./short_film_planner.db
```

Asset uploads are stored locally. `ASSET_STORAGE_DIR` defaults to `uploads` inside the backend folder, and `MAX_ASSET_UPLOAD_BYTES` defaults to `52428800` bytes. Uploaded files are generated with server filenames and are ignored by Git.

Frontend configuration reads `VITE_API_BASE_URL` and defaults to:

```text
http://127.0.0.1:8010/api
```

The AI generators are backend-only. Set `OPENAI_API_KEY` in the backend environment before using them. `OPENAI_MODEL_STORY` and `OPENAI_MODEL_PROMPTS` default to `gpt-5-mini`; `OPENAI_STORY_TIMEOUT_SECONDS` and `OPENAI_PROMPT_TIMEOUT_SECONDS` default to `120`.

## Backend Setup

```bash
cd backend
python -m pip install -r requirements.txt
```

## Frontend Setup

```bash
cd frontend
npm install
```

## Run Backend

Port `8010` is the default documented local API port for this project.

```bash
cd backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8010
```

Backend health check:

```text
http://127.0.0.1:8010/api/health
```

## Run Frontend

```bash
cd frontend
npm run dev -- --host 127.0.0.1
```

Frontend URL:

```text
http://127.0.0.1:5173
```

## Backend Tests

```bash
cd backend
python -m pytest
```

## Frontend Tests

```bash
cd frontend
npm test
```

## Build Frontend

```bash
cd frontend
npm run build
```

## Default Local URLs

- Frontend: `http://127.0.0.1:5173`
- Backend API: `http://127.0.0.1:8010/api`
- Backend health: `http://127.0.0.1:8010/api/health`

## Manual Testing Checklist

1. Start the backend and frontend.
2. Open `http://127.0.0.1:5173`.
3. Create a new project.
4. Edit the project setup and save it.
5. Fill and save the story interview.
6. Add a character and edit it.
7. Add a location and edit it.
8. Add 3 shots.
9. Reorder shots with the arrow buttons.
10. Confirm planned runtime and remaining seconds update.
11. Copy an image prompt and the Wan 2.2 package.
12. Change a shot status to `Approved` and save.
13. Add an asset metadata entry linked to a shot.
14. Fill and save the audio plan.
15. Check a final checklist item.
16. Delete a project only after confirming the browser prompt.

## Manual AI Story Package Test

1. Set `OPENAI_API_KEY` in the backend shell.
2. Start the backend and frontend.
3. Create a project and fill the story interview.
4. Open the `Story` tab.
5. Click `Generate Story Package`.
6. Review the generated preview sections.
7. Choose which sections to apply.
8. Leave `Allow overwrite` unchecked to protect existing manual content.
9. Apply selected sections.
10. Confirm the story workspace, characters, locations, optional shots, and audio plan updated as expected.

## Manual Wan 2.2 Prompt Package Test

1. Set `OPENAI_API_KEY` in the backend shell.
2. Start the backend and frontend.
3. Create a project.
4. Fill the story interview.
5. Generate and apply a story package, or manually create storyboard shots.
6. Open the `Shots` tab.
7. Select one shot or choose `All shots`.
8. Click `Generate Wan 2.2 Prompts`.
9. Review the image, start frame, end frame, video, and negative prompts.
10. Leave `Allow overwrite` unchecked to protect manual prompt fields.
11. Apply selected prompt packages.
12. Confirm the shot prompt fields are populated.
13. Use the individual prompt copy buttons and `Copy Wan 2.2 package`.
14. Confirm no WaveSpeed API call happens; this prepares prompts only.

## Manual Asset Upload Test

1. Start the backend and frontend.
2. Create a project.
3. Create 2 shots.
4. Open the `Assets` tab.
5. Upload a `character_reference` image as a project-level asset.
6. Upload a `start_frame` image for shot 1.
7. Upload an `end_frame` image for shot 1.
8. Upload a `generated_video` file for shot 1.
9. Upload an `audio` or `subtitle` file if available.
10. Confirm images, video, audio, and subtitle/text previews render where supported.
11. Open the `Shots` tab and select shot 1.
12. Confirm shot-level start/end/video/audio/subtitle assets appear in the shot detail area.
13. Delete one uploaded asset and confirm the card disappears.
14. Confirm the deleted file URL no longer loads.
15. Run `git status --short` and confirm uploaded files under `backend/uploads/` are not tracked.

## Troubleshooting

- Port `8010` already in use: stop the old backend process or run uvicorn on another port and update `VITE_API_BASE_URL`.
- OpenAI key missing: set `OPENAI_API_KEY` in `.env`, `backend/.env`, or the backend shell before starting the backend.
- AI request timed out: increase `OPENAI_STORY_TIMEOUT_SECONDS` or `OPENAI_PROMPT_TIMEOUT_SECONDS`, then restart the backend.
- Uploaded asset does not preview: confirm the backend is running and the asset URL starts with the configured backend API origin.
- Reset local data: stop the backend, delete `backend/short_film_planner.db`, and delete `backend/uploads/`, then restart the backend.
- WaveSpeed is not integrated yet: videos are uploaded and tracked manually; the app does not generate videos.

WaveSpeed video generation is not enabled yet.
