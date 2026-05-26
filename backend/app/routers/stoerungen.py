from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.constants.dropdowns import all_dropdowns
from app.database import get_db
from app.models import Project, Stoerung
from app.schemas_stoerung import (
    StatusTransition,
    StoerungCreate,
    StoerungListItem,
    StoerungResponse,
    StoerungUpdate,
)
from app.services.stoerung_compute import (
    assert_transition_allowed,
    compute_nachweis_ampel,
    next_stoerung_number,
)
from app.services.stoerung_immutable import assert_stoerung_editable

router = APIRouter(prefix="/stoerungen", tags=["stoerungen"])

LOAD_OPTS = [
    selectinload(Stoerung.anzeigen),
    selectinload(Stoerung.anlagen),
    selectinload(Stoerung.kausalitaeten),
    selectinload(Stoerung.betroffener_vorgang),
]


def _get_stoerung(db: Session, stoerung_id: int) -> Stoerung:
    stmt = select(Stoerung).options(*LOAD_OPTS).where(Stoerung.id == stoerung_id, Stoerung.deleted_at.is_(None))
    obj = db.scalar(stmt)
    if not obj:
        raise HTTPException(status_code=404, detail="Störung nicht gefunden")
    return obj


def _to_response(s: Stoerung) -> StoerungResponse:
    data = StoerungResponse.model_validate(s)
    data = data.model_copy(update={
        "nachweis_ampel": compute_nachweis_ampel(s),
        "anzeigen_count": len(s.anzeigen or []),
        "anlagen_count": len(s.anlagen or []),
    })
    return data


@router.get("/dropdowns")
def get_dropdowns() -> dict:
    return all_dropdowns()


@router.get("", response_model=list[StoerungListItem])
def list_stoerungen(
    project_id: int = Query(...),
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db),
) -> list[StoerungListItem]:
    stmt = (
        select(Stoerung)
        .options(*LOAD_OPTS)
        .where(Stoerung.project_id == project_id, Stoerung.deleted_at.is_(None))
        .order_by(Stoerung.stoerung_number)
    )
    if status_filter:
        stmt = stmt.where(Stoerung.status == status_filter)
    stoerungen = db.scalars(stmt).all()
    return [
        StoerungListItem(
            id=s.id,
            stoerung_number=s.stoerung_number,
            titel=s.titel,
            stoerungsart=s.stoerungsart,
            status=s.status,
            kritikalitaet=s.kritikalitaet,
            stoerungsbeginn=s.stoerungsbeginn,
            stoerungsende=s.stoerungsende,
            verantwortungsbereich=s.verantwortungsbereich,
            nachweis_ampel=compute_nachweis_ampel(s),
            anzeigen_count=len(s.anzeigen or []),
            anlagen_count=len(s.anlagen or []),
        )
        for s in stoerungen
    ]


@router.post("", response_model=StoerungResponse, status_code=status.HTTP_201_CREATED)
def create_stoerung(payload: StoerungCreate, db: Session = Depends(get_db)) -> StoerungResponse:
    project = db.get(Project, payload.project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Projekt nicht gefunden")

    number = next_stoerung_number(db, payload.project_id)
    data = payload.model_dump()
    data["stoerung_number"] = number
    s = Stoerung(**data)
    db.add(s)
    db.commit()
    db.refresh(s)
    # reload with relationships
    s = _get_stoerung(db, s.id)
    return _to_response(s)


@router.get("/{stoerung_id}", response_model=StoerungResponse)
def get_stoerung(stoerung_id: int, db: Session = Depends(get_db)) -> StoerungResponse:
    return _to_response(_get_stoerung(db, stoerung_id))


@router.patch("/{stoerung_id}", response_model=StoerungResponse)
def update_stoerung(stoerung_id: int, payload: StoerungUpdate, db: Session = Depends(get_db)) -> StoerungResponse:
    s = _get_stoerung(db, stoerung_id)
    assert_stoerung_editable(s.status)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(s, field, value)
    db.commit()
    s = _get_stoerung(db, stoerung_id)
    return _to_response(s)


@router.post("/{stoerung_id}/transition", response_model=StoerungResponse)
def transition_status(stoerung_id: int, payload: StatusTransition, db: Session = Depends(get_db)) -> StoerungResponse:
    s = _get_stoerung(db, stoerung_id)
    try:
        assert_transition_allowed(s.status, payload.to_status)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    s.status = payload.to_status
    db.commit()
    s = _get_stoerung(db, stoerung_id)
    return _to_response(s)


@router.delete("/{stoerung_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_stoerung(stoerung_id: int, db: Session = Depends(get_db)) -> None:
    s = _get_stoerung(db, stoerung_id)
    assert_stoerung_editable(s.status)
    s.deleted_at = datetime.now(timezone.utc)
    db.commit()
