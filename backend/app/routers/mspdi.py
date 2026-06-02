from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.responses import Response
from sqlalchemy import func
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..services.auth_service import require_authenticated
from ..services.mspdi import parse_mspdi, generate_mspdi

router = APIRouter(prefix="/mspdi", tags=["mspdi"], dependencies=[Depends(require_authenticated)])


@router.post("/import", response_model=schemas.MSPDIImportResult, status_code=status.HTTP_201_CREATED)
def import_mspdi(
    project_id: int = Form(...),
    version_name: str = Form("MS Project Import"),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
) -> schemas.MSPDIImportResult:
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Projekt nicht gefunden")

    xml_bytes = file.file.read()
    positions_data, warnings = parse_mspdi(xml_bytes)

    max_version = (
        db.query(func.max(models.ScheduleVersion.version_number))
        .filter(models.ScheduleVersion.project_id == project_id)
        .scalar()
        or 0
    )

    version = models.ScheduleVersion(
        project_id=project_id,
        name=version_name,
        version_number=max_version + 1,
    )
    db.add(version)
    db.flush()

    skipped = 0
    outline_to_id: dict[str, int] = {}

    for pos_data in positions_data:
        if not pos_data.get("title"):
            skipped += 1
            continue

        outline = pos_data.pop("_outline", None)
        parent_outline = pos_data.pop("_parent_outline", None)
        parent_id = outline_to_id.get(parent_outline) if parent_outline else None

        pos = models.SchedulePosition(
            version_id=version.id,
            parent_id=parent_id,
            **{k: v for k, v in pos_data.items() if k not in ("_outline", "_parent_outline")},
        )
        db.add(pos)
        db.flush()

        if outline:
            outline_to_id[outline] = pos.id

    db.commit()

    return schemas.MSPDIImportResult(
        version_id=version.id,
        positions_created=len(positions_data) - skipped,
        skipped=skipped,
        warnings=warnings,
    )


@router.get("/export/{version_id}")
def export_mspdi(version_id: int, db: Session = Depends(get_db)) -> Response:
    version = db.query(models.ScheduleVersion).filter(models.ScheduleVersion.id == version_id).first()
    if not version:
        raise HTTPException(status_code=404, detail="Version nicht gefunden")

    xml_bytes = generate_mspdi(version, version.positions)
    filename = f"Terminplan_V{version.version_number}.xml"
    return Response(
        content=xml_bytes,
        media_type="application/xml",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
