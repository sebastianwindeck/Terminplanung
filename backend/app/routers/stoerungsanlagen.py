import mimetypes
import os
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Stoerung, Stoerungsanlage
from app.schemas_stoerung import StoerungsanlageResponse
from app.services.storage import delete_file, resolve_path, save_file

router = APIRouter(prefix="/stoerungsanlagen", tags=["stoerungsanlagen"])

SUBDIR = "stoerungsanlagen"


def _get(db: Session, anlage_id: int) -> Stoerungsanlage:
    obj = db.get(Stoerungsanlage, anlage_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Anlage nicht gefunden")
    return obj


@router.post("", response_model=StoerungsanlageResponse, status_code=status.HTTP_201_CREATED)
async def upload_anlage(
    stoerung_id: int = Form(...),
    anlage_typ: str = Form("sonstiges"),
    beschreibung: Optional[str] = Form(None),
    datum: Optional[str] = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
) -> StoerungsanlageResponse:
    stoerung = db.get(Stoerung, stoerung_id)
    if not stoerung:
        raise HTTPException(status_code=404, detail="Störung nicht gefunden")

    data = await file.read()
    rel_path, size = save_file(data, SUBDIR, file.filename or "upload")
    mime = file.content_type or mimetypes.guess_type(file.filename or "")[0] or "application/octet-stream"

    from datetime import date
    datum_parsed = None
    if datum:
        try:
            datum_parsed = date.fromisoformat(datum)
        except ValueError:
            pass

    obj = Stoerungsanlage(
        stoerung_id=stoerung_id,
        anlage_typ=anlage_typ,
        filename=file.filename,
        stored_path=rel_path,
        mime_type=mime,
        size_bytes=size,
        beschreibung=beschreibung,
        datum=datum_parsed,
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return StoerungsanlageResponse.model_validate(obj)


@router.get("/{anlage_id}/download")
def download_anlage(anlage_id: int, db: Session = Depends(get_db)) -> FileResponse:
    obj = _get(db, anlage_id)
    abs_path = resolve_path(obj.stored_path)
    if not os.path.exists(abs_path):
        raise HTTPException(status_code=404, detail="Datei nicht gefunden")
    return FileResponse(abs_path, media_type=obj.mime_type or "application/octet-stream", filename=obj.filename)


@router.delete("/{anlage_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_anlage(anlage_id: int, db: Session = Depends(get_db)) -> None:
    obj = _get(db, anlage_id)
    try:
        delete_file(obj.stored_path)
    except FileNotFoundError:
        pass
    db.delete(obj)
    db.commit()
