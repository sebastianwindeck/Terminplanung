import json
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..services.auth_service import require_authenticated
from ..services import storage

router = APIRouter(tags=["emails"], dependencies=[Depends(require_authenticated)])

_ATTACHMENT_KIND_MAP = {".eml": "eml", ".msg": "msg", ".pdf": "pdf"}


def _attachment_kind(filename: str) -> str:
    suffix = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    return _ATTACHMENT_KIND_MAP.get(suffix, "other")


def _to_response(email: models.EmailEvent) -> schemas.EmailEventResponse:
    r = schemas.EmailEventResponse.model_validate(email)
    r.has_attachment = email.attachment_filename is not None
    return r


def _get_email_or_404(email_id: int, db: Session) -> models.EmailEvent:
    email = db.query(models.EmailEvent).filter(models.EmailEvent.id == email_id).first()
    if not email:
        raise HTTPException(status_code=404, detail="E-Mail nicht gefunden")
    return email


@router.get("/projects/{project_id}/emails", response_model=list[schemas.EmailEventResponse])
def list_emails(project_id: int, db: Session = Depends(get_db)) -> list[schemas.EmailEventResponse]:
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Projekt nicht gefunden")
    emails = (
        db.query(models.EmailEvent)
        .filter(models.EmailEvent.project_id == project_id)
        .order_by(models.EmailEvent.email_date)
        .all()
    )
    return [_to_response(e) for e in emails]


@router.get("/emails/{email_id}", response_model=schemas.EmailEventResponse)
def get_email(email_id: int, db: Session = Depends(get_db)) -> schemas.EmailEventResponse:
    return _to_response(_get_email_or_404(email_id, db))


@router.post("/emails", response_model=schemas.EmailEventResponse, status_code=status.HTTP_201_CREATED)
def create_email(
    data: str = Form(...),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
) -> schemas.EmailEventResponse:
    try:
        payload = schemas.EmailEventCreate(**json.loads(data))
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Ungültige Daten: {exc}")

    project = db.query(models.Project).filter(models.Project.id == payload.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Projekt nicht gefunden")

    email = models.EmailEvent(**payload.model_dump())

    if file and file.filename:
        file_bytes = file.file.read()
        subdir = f"email_attachments/{payload.project_id}"
        rel_path, size = storage.save_file(file_bytes, subdir, file.filename)
        email.attachment_filename = file.filename
        email.attachment_stored_path = rel_path
        email.attachment_mime_type = file.content_type
        email.attachment_size_bytes = size
        email.attachment_kind = _attachment_kind(file.filename)

    db.add(email)
    db.commit()
    db.refresh(email)
    return _to_response(email)


@router.put("/emails/{email_id}", response_model=schemas.EmailEventResponse)
def update_email(
    email_id: int,
    data: str = Form(...),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
) -> schemas.EmailEventResponse:
    email = _get_email_or_404(email_id, db)

    try:
        payload = schemas.EmailEventUpdate(**json.loads(data))
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Ungültige Daten: {exc}")

    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(email, key, value)

    if file and file.filename:
        if email.attachment_stored_path:
            storage.delete_file(email.attachment_stored_path)
        file_bytes = file.file.read()
        subdir = f"email_attachments/{email.project_id}"
        rel_path, size = storage.save_file(file_bytes, subdir, file.filename)
        email.attachment_filename = file.filename
        email.attachment_stored_path = rel_path
        email.attachment_mime_type = file.content_type
        email.attachment_size_bytes = size
        email.attachment_kind = _attachment_kind(file.filename)

    db.commit()
    db.refresh(email)
    return _to_response(email)


@router.delete("/emails/{email_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_email(email_id: int, db: Session = Depends(get_db)) -> None:
    email = _get_email_or_404(email_id, db)
    if email.attachment_stored_path:
        storage.delete_file(email.attachment_stored_path)
    db.delete(email)
    db.commit()


@router.get("/emails/{email_id}/attachment")
def get_attachment(email_id: int, db: Session = Depends(get_db)) -> FileResponse:
    email = _get_email_or_404(email_id, db)
    if not email.attachment_stored_path or not email.attachment_filename:
        raise HTTPException(status_code=404, detail="Kein Anhang vorhanden")
    full_path = storage.resolve_path(email.attachment_stored_path)
    if not full_path.exists():
        raise HTTPException(status_code=404, detail="Anhang-Datei nicht gefunden")
    return FileResponse(
        path=str(full_path),
        media_type=email.attachment_mime_type or "application/octet-stream",
        filename=email.attachment_filename,
    )
