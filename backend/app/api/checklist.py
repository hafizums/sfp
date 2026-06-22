from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import models, schemas, services
from ..database import get_db

router = APIRouter()


@router.get("/projects/{project_id}/checklist", response_model=list[schemas.ChecklistItemRead])
def get_checklist(project_id: int, db: Session = Depends(get_db)) -> list[models.ChecklistItem]:
    project = services.project_or_404(db, project_id)
    if not project.checklist_items:
        for position, label in enumerate(services.DEFAULT_CHECKLIST, start=1):
            db.add(models.ChecklistItem(project_id=project_id, label=label, position=position))
        db.commit()
        db.refresh(project)
    return project.checklist_items


@router.patch("/checklist/{item_id}", response_model=schemas.ChecklistItemRead)
def update_checklist_item(
    item_id: int, payload: schemas.ChecklistItemUpdate, db: Session = Depends(get_db)
) -> models.ChecklistItem:
    item = db.get(models.ChecklistItem, item_id)
    if item is None:
        raise services.not_found("Checklist item")
    item.checked = payload.checked
    db.commit()
    db.refresh(item)
    return item
