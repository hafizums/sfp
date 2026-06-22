# Short Film Planner Studio

Short Film Planner Studio is a private local web app for planning a 3-minute kids adventure AI short film from the first story idea through shot prompts, assets, audio notes, and a final readiness checklist.

Most planning tools are manual, with one optional backend-only OpenAI story package generator. The app does not include WaveSpeed, authentication, export, public sharing, payments, collaboration, or a full video editor.

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

Frontend configuration reads `VITE_API_BASE_URL` and defaults to:

```text
http://127.0.0.1:8010/api
```

The AI story package generator is backend-only. Set `OPENAI_API_KEY` in the backend environment before using it. `OPENAI_MODEL_STORY` defaults to `gpt-5-mini`, and `OPENAI_STORY_TIMEOUT_SECONDS` defaults to `120`.

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

WaveSpeed video generation and final Wan 2.2 prompt generation are not enabled yet.
