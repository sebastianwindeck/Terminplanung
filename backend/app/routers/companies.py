import re
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Company, User
from app.services.auth_service import hash_password, require_main_admin

router = APIRouter(prefix="/companies", tags=["companies"])


class CompanyCreate(BaseModel):
    name: str
    slug: Optional[str] = None
    primary_color: Optional[str] = None
    admin_email: str
    admin_password: str
    admin_full_name: Optional[str] = None


class CompanyUpdate(BaseModel):
    name: Optional[str] = None
    primary_color: Optional[str] = None
    is_active: Optional[bool] = None


class CompanyResponse(BaseModel):
    id: int
    name: str
    slug: str
    primary_color: Optional[str]
    logo_path: Optional[str]
    is_active: bool
    user_count: int = 0

    class Config:
        from_attributes = True


def _slugify(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


def _to_response(company: Company, db: Session) -> CompanyResponse:
    from sqlalchemy import func
    count = db.scalar(
        select(func.count()).select_from(User).where(User.company_id == company.id)
    ) or 0
    return CompanyResponse(
        id=company.id,
        name=company.name,
        slug=company.slug,
        primary_color=company.primary_color,
        logo_path=company.logo_path,
        is_active=company.is_active,
        user_count=count,
    )


@router.get("", response_model=list[CompanyResponse])
def list_companies(db: Session = Depends(get_db), _: User = Depends(require_main_admin)) -> list[CompanyResponse]:
    companies = db.scalars(select(Company).order_by(Company.name)).all()
    return [_to_response(c, db) for c in companies]


@router.post("", response_model=CompanyResponse, status_code=status.HTTP_201_CREATED)
def create_company(payload: CompanyCreate, db: Session = Depends(get_db), _: User = Depends(require_main_admin)) -> CompanyResponse:
    if len(payload.admin_password) < 8:
        raise HTTPException(status_code=422, detail="Admin-Passwort muss mindestens 8 Zeichen haben")
    if db.scalar(select(User).where(User.email == payload.admin_email)):
        raise HTTPException(status_code=409, detail="E-Mail bereits vergeben")

    slug = payload.slug or _slugify(payload.name)
    if db.scalar(select(Company).where(Company.slug == slug)):
        slug = f"{slug}-{int(__import__('time').time())}"

    company = Company(name=payload.name, slug=slug, primary_color=payload.primary_color)
    db.add(company)
    db.flush()

    admin = User(
        email=payload.admin_email,
        password_hash=hash_password(payload.admin_password),
        full_name=payload.admin_full_name,
        role="company_admin",
        company_id=company.id,
    )
    db.add(admin)
    db.commit()
    db.refresh(company)
    return _to_response(company, db)


@router.get("/{company_id}", response_model=CompanyResponse)
def get_company(company_id: int, db: Session = Depends(get_db), _: User = Depends(require_main_admin)) -> CompanyResponse:
    company = db.get(Company, company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Unternehmen nicht gefunden")
    return _to_response(company, db)


@router.patch("/{company_id}", response_model=CompanyResponse)
def update_company(company_id: int, payload: CompanyUpdate, db: Session = Depends(get_db), _: User = Depends(require_main_admin)) -> CompanyResponse:
    company = db.get(Company, company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Unternehmen nicht gefunden")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(company, field, value)
    db.commit()
    db.refresh(company)
    return _to_response(company, db)


@router.delete("/{company_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_company(company_id: int, db: Session = Depends(get_db), _: User = Depends(require_main_admin)) -> None:
    company = db.get(Company, company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Unternehmen nicht gefunden")
    db.delete(company)
    db.commit()
