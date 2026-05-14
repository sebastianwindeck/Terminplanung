import json
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..services import storage
from ..services.pdf_report import generate_sequential_comparison_pdf

router = APIRouter(tags=["reports"])

_COMPARE_FIELDS = ["title", "start_date", "end_date", "duration_days", "responsible", "trade", "status", "progress"]


class SequentialComparisonRequest(BaseModel):
    version_ids: list[int]
    include_email_events: bool = True


def _pos_key(p: models.SchedulePosition) -> str:
    return p.pos_number or p.title


def _build_step(
    va: models.ScheduleVersion,
    vb: models.ScheduleVersion,
    email_events: list[models.EmailEvent],
) -> schemas.StepComparison:
    a_dict = {_pos_key(p): p for p in va.positions}
    b_dict = {_pos_key(p): p for p in vb.positions}

    added: list[schemas.ChangeEntry] = []
    removed: list[schemas.ChangeEntry] = []
    modified_map: dict[str, schemas.ChangeEntry] = {}

    for key in set(a_dict) | set(b_dict):
        if key not in a_dict:
            p = b_dict[key]
            added.append(schemas.ChangeEntry(pos_number=p.pos_number, title=p.title, change_type="added"))
        elif key not in b_dict:
            p = a_dict[key]
            removed.append(schemas.ChangeEntry(pos_number=p.pos_number, title=p.title, change_type="removed"))
        else:
            pa, pb = a_dict[key], b_dict[key]
            field_changes: dict[str, schemas.FieldChange] = {}
            for field in _COMPARE_FIELDS:
                ov = str(getattr(pa, field) or "")
                nv = str(getattr(pb, field) or "")
                if ov != nv:
                    field_changes[field] = schemas.FieldChange(old=ov or None, new=nv or None)
            if field_changes:
                modified_map[key] = schemas.ChangeEntry(
                    pos_number=pa.pos_number,
                    title=pa.title,
                    change_type="modified",
                    field_changes=field_changes,
                )

    email_responses = [_email_to_response(e) for e in email_events]

    return schemas.StepComparison(
        from_version_id=va.id,
        to_version_id=vb.id,
        from_version_name=va.name,
        to_version_name=vb.name,
        from_version_number=va.version_number,
        to_version_number=vb.version_number,
        added=added,
        removed=removed,
        modified=list(modified_map.values()),
        email_events_between=email_responses,
    )


def _email_to_response(e: models.EmailEvent) -> schemas.EmailEventResponse:
    r = schemas.EmailEventResponse.model_validate(e)
    r.has_attachment = e.attachment_filename is not None
    return r


def _get_emails_between(
    project_id: int,
    va: models.ScheduleVersion,
    vb: models.ScheduleVersion,
    db: Session,
) -> list[models.EmailEvent]:
    from sqlalchemy import or_, and_

    date_filter = and_(
        models.EmailEvent.email_date >= va.created_at,
        models.EmailEvent.email_date <= vb.created_at,
    )
    link_filter = and_(
        models.EmailEvent.version_from_id == va.id,
        models.EmailEvent.version_to_id == vb.id,
    )
    return (
        db.query(models.EmailEvent)
        .filter(
            models.EmailEvent.project_id == project_id,
            or_(date_filter, link_filter),
        )
        .order_by(models.EmailEvent.email_date)
        .all()
    )


def _build_comparison(
    project: models.Project,
    version_ids: list[int],
    include_email_events: bool,
    db: Session,
) -> schemas.SequentialComparisonResponse:
    if len(version_ids) < 2:
        raise HTTPException(status_code=400, detail="Mindestens zwei Versionen erforderlich")

    versions: dict[int, models.ScheduleVersion] = {}
    for vid in version_ids:
        v = db.query(models.ScheduleVersion).filter(models.ScheduleVersion.id == vid).first()
        if not v:
            raise HTTPException(status_code=404, detail=f"Version {vid} nicht gefunden")
        if v.project_id != project.id:
            raise HTTPException(status_code=400, detail=f"Version {vid} gehört nicht zu diesem Projekt")
        versions[vid] = v

    steps: list[schemas.StepComparison] = []
    for i in range(len(version_ids) - 1):
        va = versions[version_ids[i]]
        vb = versions[version_ids[i + 1]]
        emails = _get_emails_between(project.id, va, vb, db) if include_email_events else []
        steps.append(_build_step(va, vb, emails))

    return schemas.SequentialComparisonResponse(
        project_id=project.id,
        project_name=project.name,
        steps=steps,
        generated_at=datetime.utcnow(),
    )


@router.post("/projects/{project_id}/sequential-comparison", response_model=schemas.SequentialComparisonResponse)
def sequential_comparison(
    project_id: int,
    body: SequentialComparisonRequest,
    db: Session = Depends(get_db),
) -> schemas.SequentialComparisonResponse:
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Projekt nicht gefunden")
    return _build_comparison(project, body.version_ids, body.include_email_events, db)


@router.post("/projects/{project_id}/reports/sequential-comparison", response_model=schemas.ReportResponse, status_code=status.HTTP_201_CREATED)
def generate_report(
    project_id: int,
    body: SequentialComparisonRequest,
    db: Session = Depends(get_db),
) -> schemas.ReportResponse:
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Projekt nicht gefunden")

    comparison = _build_comparison(project, body.version_ids, body.include_email_events, db)

    settings = db.query(models.CompanySettings).filter(models.CompanySettings.id == 1).first()
    if not settings:
        settings = models.CompanySettings(id=1)

    logo_bytes: Optional[bytes] = None
    if settings.logo_stored_path:
        try:
            logo_bytes = storage.read_file(settings.logo_stored_path)
        except Exception:
            logo_bytes = None

    pdf_bytes = generate_sequential_comparison_pdf(project.name, comparison, settings, logo_bytes)

    version_ids_str = "_".join(str(v) for v in body.version_ids)
    filename = f"Vergleich_Projekt{project_id}_V{version_ids_str}_{comparison.generated_at.strftime('%Y%m%d_%H%M%S')}.pdf"
    subdir = f"reports/{project_id}"
    rel_path, size = storage.save_file(pdf_bytes, subdir, filename)

    report = models.GeneratedReport(
        project_id=project_id,
        report_type="sequential_comparison",
        version_ids_json=json.dumps(body.version_ids),
        filename=filename,
        stored_path=rel_path,
        file_size_bytes=size,
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return schemas.ReportResponse.model_validate(report)


@router.get("/projects/{project_id}/reports", response_model=list[schemas.ReportResponse])
def list_reports(project_id: int, db: Session = Depends(get_db)) -> list[schemas.ReportResponse]:
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Projekt nicht gefunden")
    reports = (
        db.query(models.GeneratedReport)
        .filter(models.GeneratedReport.project_id == project_id)
        .order_by(models.GeneratedReport.generated_at.desc())
        .all()
    )
    return [schemas.ReportResponse.model_validate(r) for r in reports]


@router.get("/reports/{report_id}/download")
def download_report(report_id: int, db: Session = Depends(get_db)) -> FileResponse:
    report = db.query(models.GeneratedReport).filter(models.GeneratedReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Bericht nicht gefunden")
    full_path = storage.resolve_path(report.stored_path)
    if not full_path.exists():
        raise HTTPException(status_code=404, detail="Berichtsdatei nicht gefunden")
    return FileResponse(path=str(full_path), media_type="application/pdf", filename=report.filename)


@router.delete("/reports/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_report(report_id: int, db: Session = Depends(get_db)) -> None:
    report = db.query(models.GeneratedReport).filter(models.GeneratedReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Bericht nicht gefunden")
    storage.delete_file(report.stored_path)
    db.delete(report)
    db.commit()
