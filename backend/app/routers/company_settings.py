from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..services.auth_service import require_authenticated
from ..services import storage

router = APIRouter(prefix="/company-settings", tags=["company-settings"])

_ALLOWED_IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".svg"}
_ALLOWED_IMAGE_MIMES = {"image/png", "image/jpeg", "image/svg+xml"}
_MAX_LOGO_BYTES = 10 * 1024 * 1024  # 10 MB
_ALLOWED_TEMPLATE_EXTENSIONS = {".xlsx", ".xls"}
_MAX_TEMPLATE_BYTES = 20 * 1024 * 1024  # 20 MB


def _get_or_create_settings(db: Session) -> models.CompanySettings:
    settings = db.query(models.CompanySettings).filter(models.CompanySettings.id == 1).first()
    if not settings:
        settings = models.CompanySettings(id=1, updated_at=datetime.utcnow())
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


def _to_response(s: models.CompanySettings) -> schemas.CompanySettingsResponse:
    r = schemas.CompanySettingsResponse.model_validate(s)
    r.has_logo = s.logo_stored_path is not None
    r.has_template = s.template_stored_path is not None
    return r


@router.get("", response_model=schemas.CompanySettingsResponse, dependencies=[Depends(require_authenticated)])
def get_settings(db: Session = Depends(get_db)) -> schemas.CompanySettingsResponse:
    return _to_response(_get_or_create_settings(db))


@router.put("", response_model=schemas.CompanySettingsResponse, dependencies=[Depends(require_authenticated)])
def update_settings(
    data: schemas.CompanySettingsUpdate,
    db: Session = Depends(get_db),
) -> schemas.CompanySettingsResponse:
    settings = _get_or_create_settings(db)
    for key, value in data.model_dump().items():
        setattr(settings, key, value)
    settings.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(settings)
    return _to_response(settings)


@router.post("/logo", response_model=schemas.CompanySettingsResponse, dependencies=[Depends(require_authenticated)])
def upload_logo(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
) -> schemas.CompanySettingsResponse:
    filename = file.filename or ""
    suffix = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if suffix not in _ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Nur PNG, JPG, JPEG und SVG erlaubt")

    file_bytes = file.file.read()
    if len(file_bytes) > _MAX_LOGO_BYTES:
        raise HTTPException(status_code=400, detail="Datei zu groß (max. 2 MB)")

    settings = _get_or_create_settings(db)
    if settings.logo_stored_path:
        storage.delete_file(settings.logo_stored_path)

    rel_path, _ = storage.save_file(file_bytes, "company", filename)
    settings.logo_filename = filename
    settings.logo_stored_path = rel_path
    settings.logo_mime_type = file.content_type or f"image/{suffix.lstrip('.')}"
    settings.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(settings)
    return _to_response(settings)


@router.delete("/logo", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_authenticated)])
def delete_logo(db: Session = Depends(get_db)) -> None:
    settings = _get_or_create_settings(db)
    if settings.logo_stored_path:
        storage.delete_file(settings.logo_stored_path)
    settings.logo_filename = None
    settings.logo_stored_path = None
    settings.logo_mime_type = None
    settings.updated_at = datetime.utcnow()
    db.commit()


@router.get("/logo")
def get_logo(db: Session = Depends(get_db)) -> FileResponse:
    settings = _get_or_create_settings(db)
    if not settings.logo_stored_path or not settings.logo_filename:
        raise HTTPException(status_code=404, detail="Kein Logo vorhanden")
    full_path = storage.resolve_path(settings.logo_stored_path)
    if not full_path.exists():
        raise HTTPException(status_code=404, detail="Logo-Datei nicht gefunden")
    return FileResponse(
        path=str(full_path),
        media_type=settings.logo_mime_type or "image/png",
        filename=settings.logo_filename,
    )


@router.post("/template", response_model=schemas.CompanySettingsResponse, dependencies=[Depends(require_authenticated)])
def upload_template(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
) -> schemas.CompanySettingsResponse:
    filename = file.filename or ""
    suffix = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if suffix not in _ALLOWED_TEMPLATE_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Nur .xlsx und .xls erlaubt")

    file_bytes = file.file.read()
    if len(file_bytes) > _MAX_TEMPLATE_BYTES:
        raise HTTPException(status_code=400, detail="Datei zu groß (max. 20 MB)")

    settings = _get_or_create_settings(db)
    if settings.template_stored_path:
        storage.delete_file(settings.template_stored_path)

    rel_path, _ = storage.save_file(file_bytes, "templates", filename)
    settings.template_filename = filename
    settings.template_stored_path = rel_path
    settings.template_mime_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    settings.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(settings)
    return _to_response(settings)


@router.delete("/template", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_authenticated)])
def delete_template(db: Session = Depends(get_db)) -> None:
    settings = _get_or_create_settings(db)
    if settings.template_stored_path:
        storage.delete_file(settings.template_stored_path)
    settings.template_filename = None
    settings.template_stored_path = None
    settings.template_mime_type = None
    settings.updated_at = datetime.utcnow()
    db.commit()


@router.get("/template", dependencies=[Depends(require_authenticated)])
def get_company_template(db: Session = Depends(get_db)) -> FileResponse:
    settings = _get_or_create_settings(db)
    if not settings.template_stored_path or not settings.template_filename:
        raise HTTPException(status_code=404, detail="Kein Unternehmens-Template vorhanden")
    full_path = storage.resolve_path(settings.template_stored_path)
    if not full_path.exists():
        raise HTTPException(status_code=404, detail="Template-Datei nicht gefunden")
    return FileResponse(
        path=str(full_path),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename=settings.template_filename,
    )
