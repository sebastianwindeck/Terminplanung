from datetime import date, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Project, ScheduleVersion, SchedulePosition, Stoerung
from ..services.auth_service import get_current_user, require_authenticated
from ..schemas import PositionResponse

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("", dependencies=[Depends(require_authenticated)])
def get_dashboard(
    days: int = Query(default=14, ge=1, le=90),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    today = date.today()
    cutoff = today + timedelta(days=days)

    # Scope projects to user's company (main_admin sees all)
    project_query = select(Project)
    if current_user.role != "main_admin" and current_user.company_id:
        project_query = project_query.where(Project.company_id == current_user.company_id)
    projects = {p.id: p for p in db.scalars(project_query).all()}

    # Upcoming positions: from the most recent version of each project
    upcoming: list[dict] = []
    for project in projects.values():
        latest_version = (
            db.query(ScheduleVersion)
            .filter(ScheduleVersion.project_id == project.id)
            .order_by(ScheduleVersion.version_number.desc())
            .first()
        )
        if not latest_version:
            continue

        positions = (
            db.query(SchedulePosition)
            .filter(
                SchedulePosition.version_id == latest_version.id,
                SchedulePosition.start_date != None,
                SchedulePosition.start_date >= today,
                SchedulePosition.start_date <= cutoff,
                SchedulePosition.status.notin_(["completed", "cancelled"]),
            )
            .order_by(SchedulePosition.start_date)
            .all()
        )
        for pos in positions:
            upcoming.append({
                "project_id": project.id,
                "project_name": project.name,
                "project_number": project.project_number,
                "position_id": pos.id,
                "pos_number": pos.pos_number,
                "title": pos.title,
                "typ": pos.typ,
                "start_date": pos.start_date.isoformat() if pos.start_date else None,
                "end_date": pos.end_date.isoformat() if pos.end_date else None,
                "duration_days": pos.duration_days,
                "responsible": pos.responsible,
                "status": pos.status,
                "behinderung_aktiv": pos.behinderung_aktiv,
                "behinderung_tage_gesamt": pos.behinderung_tage_gesamt,
                "version_id": latest_version.id,
                "version_number": latest_version.version_number,
            })

    upcoming.sort(key=lambda x: x["start_date"] or "9999-99-99")

    # Open Störungen
    stoerung_query = (
        select(Stoerung)
        .where(
            Stoerung.project_id.in_(list(projects.keys())),
            Stoerung.status.notin_(["abgeschlossen", "zurueckgezogen"]),
            Stoerung.deleted_at == None,
        )
        .order_by(Stoerung.stoerungsbeginn.desc())
    )
    stoerungen = db.scalars(stoerung_query).all()

    open_stoerungen = [
        {
            "id": s.id,
            "project_id": s.project_id,
            "project_name": projects[s.project_id].name if s.project_id in projects else "",
            "stoerung_number": s.stoerung_number,
            "titel": s.titel,
            "stoerungsart": s.stoerungsart,
            "status": s.status,
            "stoerungsbeginn": s.stoerungsbeginn.isoformat(),
            "kritikalitaet": s.kritikalitaet,
        }
        for s in stoerungen
    ]

    return {
        "days": days,
        "today": today.isoformat(),
        "cutoff": cutoff.isoformat(),
        "upcoming_positions": upcoming,
        "open_stoerungen": open_stoerungen,
        "stats": {
            "project_count": len(projects),
            "upcoming_count": len(upcoming),
            "open_stoerungen_count": len(open_stoerungen),
            "active_behinderungen": sum(1 for p in upcoming if p["behinderung_aktiv"]),
        },
    }
