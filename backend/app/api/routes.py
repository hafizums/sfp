from fastapi import APIRouter

from . import assets, audio, characters, checklist, locations, projects, shots, story

router = APIRouter()
router.include_router(projects.router)
router.include_router(story.router)
router.include_router(characters.router)
router.include_router(locations.router)
router.include_router(shots.router)
router.include_router(assets.router)
router.include_router(audio.router)
router.include_router(checklist.router)
