from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.services.auth_service import require_authenticated
from app.models import Behinderungsanzeige, CompanySettings, Stoerung
from app.schemas_stoerung import (
    BehinderungsanzeigeCreate,
    BehinderungsanzeigeResponse,
    BehinderungsanzeigeUpdate,
)
from app.services.stoerung_immutable import assert_anzeige_not_locked
from app.services.pdf_behinderungsanzeige import render_behinderungsanzeige_pdf

router = APIRouter(prefix="/behinderungsanzeigen", tags=["behinderungsanzeigen"], dependencies=[Depends(require_authenticated)])


def _get_anzeige(db: Session, anzeige_id: int) -> Behinderungsanzeige:
    obj = db.get(Behinderungsanzeige, anzeige_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Behinderungsanzeige nicht gefunden")
    return obj


@router.get("", response_model=list[BehinderungsanzeigeResponse])
def list_anzeigen(
    stoerung_id: int = Query(...),
    db: Session = Depends(get_db),
) -> list[BehinderungsanzeigeResponse]:
    stmt = select(Behinderungsanzeige).where(Behinderungsanzeige.stoerung_id == stoerung_id)
    return [BehinderungsanzeigeResponse.model_validate(a) for a in db.scalars(stmt).all()]


@router.post("", response_model=BehinderungsanzeigeResponse, status_code=status.HTTP_201_CREATED)
def create_anzeige(payload: BehinderungsanzeigeCreate, db: Session = Depends(get_db)) -> BehinderungsanzeigeResponse:
    stoerung = db.get(Stoerung, payload.stoerung_id)
    if not stoerung:
        raise HTTPException(status_code=404, detail="Störung nicht gefunden")
    obj = Behinderungsanzeige(**payload.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return BehinderungsanzeigeResponse.model_validate(obj)


@router.get("/{anzeige_id}", response_model=BehinderungsanzeigeResponse)
def get_anzeige(anzeige_id: int, db: Session = Depends(get_db)) -> BehinderungsanzeigeResponse:
    return BehinderungsanzeigeResponse.model_validate(_get_anzeige(db, anzeige_id))


@router.patch("/{anzeige_id}", response_model=BehinderungsanzeigeResponse)
def update_anzeige(anzeige_id: int, payload: BehinderungsanzeigeUpdate, db: Session = Depends(get_db)) -> BehinderungsanzeigeResponse:
    obj = _get_anzeige(db, anzeige_id)
    assert_anzeige_not_locked(obj)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)
    db.commit()
    db.refresh(obj)
    return BehinderungsanzeigeResponse.model_validate(obj)


@router.post("/{anzeige_id}/versenden", response_model=BehinderungsanzeigeResponse)
def versenden(anzeige_id: int, db: Session = Depends(get_db)) -> BehinderungsanzeigeResponse:
    from datetime import datetime, timezone
    obj = _get_anzeige(db, anzeige_id)
    assert_anzeige_not_locked(obj)
    obj.status = "versendet"
    obj.sent_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(obj)
    return BehinderungsanzeigeResponse.model_validate(obj)


@router.delete("/{anzeige_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_anzeige(anzeige_id: int, db: Session = Depends(get_db)) -> None:
    obj = _get_anzeige(db, anzeige_id)
    assert_anzeige_not_locked(obj)
    db.delete(obj)
    db.commit()


@router.get("/{anzeige_id}/pdf")
def download_anzeige_pdf(anzeige_id: int, db: Session = Depends(get_db)) -> Response:
    obj = (
        db.query(Behinderungsanzeige)
        .options(
            selectinload(Behinderungsanzeige.stoerung)
            .selectinload(Stoerung.project),
            selectinload(Behinderungsanzeige.stoerung)
            .selectinload(Stoerung.betroffener_vorgang),
        )
        .filter(Behinderungsanzeige.id == anzeige_id)
        .first()
    )
    if not obj:
        raise HTTPException(status_code=404, detail="Behinderungsanzeige nicht gefunden")

    settings = db.query(CompanySettings).filter(CompanySettings.id == 1).first()
    pdf_bytes = render_behinderungsanzeige_pdf(obj, settings)

    stoerung_nr = obj.stoerung.stoerung_number if obj.stoerung else "unbekannt"
    filename = f"Behinderungsanzeige_{stoerung_nr}_{obj.typ}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
