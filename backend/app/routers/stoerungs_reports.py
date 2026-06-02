from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.services.auth_service import require_authenticated
from app.models import Stoerung
from app.services.pdf_stoerung import render_stoerungsakte_pdf

router = APIRouter(prefix="/stoerungen", tags=["stoerungen-reports"], dependencies=[Depends(require_authenticated)])

LOAD_OPTS = [
    selectinload(Stoerung.anzeigen),
    selectinload(Stoerung.anlagen),
    selectinload(Stoerung.kausalitaeten),
    selectinload(Stoerung.project),
]


@router.get("/{stoerung_id}/pdf")
def download_stoerungsakte_pdf(stoerung_id: int, db: Session = Depends(get_db)) -> Response:
    stmt = select(Stoerung).options(*LOAD_OPTS).where(Stoerung.id == stoerung_id, Stoerung.deleted_at.is_(None))
    stoerung = db.scalar(stmt)
    if not stoerung:
        raise HTTPException(status_code=404, detail="Störung nicht gefunden")

    pdf_bytes = render_stoerungsakte_pdf(stoerung)
    filename = f"stoerungsakte_{stoerung.stoerung_number}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
