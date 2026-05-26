from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Bautagesbericht, Project
from app.schemas_stoerung import (
    BautagesberichtCreate,
    BautagesberichtResponse,
    BautagesberichtUpdate,
)

router = APIRouter(prefix="/bautagesberichte", tags=["bautagesberichte"])


def _get_bericht(db: Session, bericht_id: int) -> Bautagesbericht:
    obj = db.get(Bautagesbericht, bericht_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Bautagesbericht nicht gefunden")
    return obj


@router.get("", response_model=list[BautagesberichtResponse])
def list_berichte(
    project_id: int = Query(...),
    db: Session = Depends(get_db),
) -> list[BautagesberichtResponse]:
    stmt = (
        select(Bautagesbericht)
        .where(Bautagesbericht.project_id == project_id)
        .order_by(Bautagesbericht.datum.desc())
    )
    return [BautagesberichtResponse.model_validate(b) for b in db.scalars(stmt).all()]


@router.post("", response_model=BautagesberichtResponse, status_code=status.HTTP_201_CREATED)
def create_bericht(payload: BautagesberichtCreate, db: Session = Depends(get_db)) -> BautagesberichtResponse:
    project = db.get(Project, payload.project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Projekt nicht gefunden")
    obj = Bautagesbericht(**payload.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return BautagesberichtResponse.model_validate(obj)


@router.get("/{bericht_id}", response_model=BautagesberichtResponse)
def get_bericht(bericht_id: int, db: Session = Depends(get_db)) -> BautagesberichtResponse:
    return BautagesberichtResponse.model_validate(_get_bericht(db, bericht_id))


@router.patch("/{bericht_id}", response_model=BautagesberichtResponse)
def update_bericht(bericht_id: int, payload: BautagesberichtUpdate, db: Session = Depends(get_db)) -> BautagesberichtResponse:
    obj = _get_bericht(db, bericht_id)
    if obj.freigabestatus == "freigegeben":
        raise HTTPException(status_code=409, detail="Freigegebene Berichte können nicht geändert werden")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)
    db.commit()
    db.refresh(obj)
    return BautagesberichtResponse.model_validate(obj)


@router.post("/{bericht_id}/freigeben", response_model=BautagesberichtResponse)
def freigeben(bericht_id: int, db: Session = Depends(get_db)) -> BautagesberichtResponse:
    obj = _get_bericht(db, bericht_id)
    if obj.freigabestatus == "freigegeben":
        raise HTTPException(status_code=409, detail="Bericht ist bereits freigegeben")
    obj.freigabestatus = "freigegeben"
    db.commit()
    db.refresh(obj)
    return BautagesberichtResponse.model_validate(obj)


@router.delete("/{bericht_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_bericht(bericht_id: int, db: Session = Depends(get_db)) -> None:
    obj = _get_bericht(db, bericht_id)
    if obj.freigabestatus == "freigegeben":
        raise HTTPException(status_code=409, detail="Freigegebene Berichte können nicht gelöscht werden")
    db.delete(obj)
    db.commit()
