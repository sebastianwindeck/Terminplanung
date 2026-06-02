from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.services.auth_service import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["auth"])


class SetupRequest(BaseModel):
    email: str
    password: str
    full_name: Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    full_name: Optional[str]
    company_id: Optional[int]


class MeResponse(BaseModel):
    id: int
    email: str
    full_name: Optional[str]
    role: str
    company_id: Optional[int]
    is_active: bool


@router.get("/check-setup")
def check_setup(db: Session = Depends(get_db)) -> dict:
    has_users = db.scalar(select(User).limit(1)) is not None
    return {"setup_required": not has_users}


@router.post("/setup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def first_run_setup(payload: SetupRequest, db: Session = Depends(get_db)) -> TokenResponse:
    has_users = db.scalar(select(User).limit(1)) is not None
    if has_users:
        raise HTTPException(status_code=403, detail="Setup bereits abgeschlossen")
    if len(payload.password) < 8:
        raise HTTPException(status_code=422, detail="Passwort muss mindestens 8 Zeichen haben")
    user = User(
        email=payload.email,
        password_hash=hash_password(payload.password),
        full_name=payload.full_name,
        role="main_admin",
        company_id=None,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token(user.id, user.role, user.company_id)
    return TokenResponse(access_token=token, role=user.role, full_name=user.full_name, company_id=None)


@router.post("/login", response_model=TokenResponse)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)) -> TokenResponse:
    user = db.scalar(select(User).where(User.email == form.username))
    if not user or not verify_password(form.password, user.password_hash):
        raise HTTPException(status_code=401, detail="E-Mail oder Passwort falsch")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Konto deaktiviert")
    user.last_login_at = datetime.now(timezone.utc)
    db.commit()
    token = create_access_token(user.id, user.role, user.company_id)
    return TokenResponse(access_token=token, role=user.role, full_name=user.full_name, company_id=user.company_id)


@router.get("/me", response_model=MeResponse)
def me(current_user: User = Depends(get_current_user)) -> MeResponse:
    return MeResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role,
        company_id=current_user.company_id,
        is_active=current_user.is_active,
    )
