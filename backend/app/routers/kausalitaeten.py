from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Kausalitaet, Stoerung
from app.schemas_stoerung import KausalitaetCreate, KausalitaetResponse, KausalitaetUpdate

router = APIRouter(prefix="/kausalitaeten", tags=["kausalitaeten"])


def _get(db: Session, kausalitaet_id: int) -> Kausalitaet:
    obj = db.get(Kausalitaet, kausalitaet_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Kausalität nicht gefunden")
    return obj


@router.get("", response_model=list[KausalitaetResponse])
def list_kausalitaeten(stoerung_id: int = Query(...), db: Session = Depends(get_db)) -> list[KausalitaetResponse]:
    stmt = select(Kausalitaet).where(Kausalitaet.stoerung_id == stoerung_id)
    return [KausalitaetResponse.model_validate(k) for k in db.scalars(stmt).all()]


@router.post("", response_model=KausalitaetResponse, status_code=status.HTTP_201_CREATED)
def create_kausalitaet(payload: KausalitaetCreate, db: Session = Depends(get_db)) -> KausalitaetResponse:
    stoerung = db.get(Stoerung, payload.stoerung_id)
    if not stoerung:
        raise HTTPException(status_code=404, detail="Störung nicht gefunden")
    obj = Kausalitaet(**payload.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return KausalitaetResponse.model_validate(obj)


@router.get("/{kausalitaet_id}", response_model=KausalitaetResponse)
def get_kausalitaet(kausalitaet_id: int, db: Session = Depends(get_db)) -> KausalitaetResponse:
    return KausalitaetResponse.model_validate(_get(db, kausalitaet_id))


@router.patch("/{kausalitaet_id}", response_model=KausalitaetResponse)
def update_kausalitaet(kausalitaet_id: int, payload: KausalitaetUpdate, db: Session = Depends(get_db)) -> KausalitaetResponse:
    obj = _get(db, kausalitaet_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)
    db.commit()
    db.refresh(obj)
    return KausalitaetResponse.model_validate(obj)


@router.delete("/{kausalitaet_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_kausalitaet(kausalitaet_id: int, db: Session = Depends(get_db)) -> None:
    db.delete(_get(db, kausalitaet_id))
    db.commit()
