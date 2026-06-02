from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..services.auth_service import require_authenticated

router = APIRouter(tags=["timeline"], dependencies=[Depends(require_authenticated)])


@router.get("/projects/{project_id}/timeline", response_model=schemas.TimelineResponse)
def get_timeline(project_id: int, db: Session = Depends(get_db)) -> schemas.TimelineResponse:
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Projekt nicht gefunden")

    versions = (
        db.query(models.ScheduleVersion)
        .filter(models.ScheduleVersion.project_id == project_id)
        .all()
    )
    emails = (
        db.query(models.EmailEvent)
        .filter(models.EmailEvent.project_id == project_id)
        .all()
    )

    events: list[schemas.TimelineEvent] = []

    for v in versions:
        events.append(schemas.TimelineEvent(
            event_type="version",
            event_id=v.id,
            event_date=v.created_at,
            title=f"V{v.version_number}: {v.name}",
            subtitle=v.description,
            icon="gantt",
            version_number=v.version_number,
            is_baseline=v.is_baseline,
            is_current=v.is_current,
        ))

    for e in emails:
        events.append(schemas.TimelineEvent(
            event_type="email",
            event_id=e.id,
            event_date=e.email_date,
            title=e.subject,
            subtitle=e.sender,
            icon="mail",
            importance=e.importance,
            tag=e.tag,
            has_attachment=e.attachment_filename is not None,
        ))

    events.sort(key=lambda ev: ev.event_date)

    return schemas.TimelineResponse(project_id=project_id, events=events)
