from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.services.auth_service import hash_password, require_company_admin, get_current_user

router = APIRouter(prefix="/users", tags=["users"])


class UserCreate(BaseModel):
    email: str
    password: str
    full_name: Optional[str] = None
    role: str = "company_user"  # company_admin | company_user


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    is_active: Optional[bool] = None
    role: Optional[str] = None


class ResetPasswordRequest(BaseModel):
    new_password: str


class UserResponse(BaseModel):
    id: int
    email: str
    full_name: Optional[str]
    role: str
    company_id: Optional[int]
    is_active: bool

    class Config:
        from_attributes = True


def _get_user(db: Session, user_id: int, current_user: User) -> User:
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Benutzer nicht gefunden")
    if current_user.role != "main_admin" and user.company_id != current_user.company_id:
        raise HTTPException(status_code=403, detail="Zugriff verweigert")
    return user


@router.get("", response_model=list[UserResponse])
def list_users(db: Session = Depends(get_db), current_user: User = Depends(require_company_admin)) -> list[UserResponse]:
    if current_user.role == "main_admin":
        users = db.scalars(select(User).order_by(User.email)).all()
    else:
        users = db.scalars(
            select(User).where(User.company_id == current_user.company_id).order_by(User.email)
        ).all()
    return [UserResponse.model_validate(u) for u in users]


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(payload: UserCreate, db: Session = Depends(get_db), current_user: User = Depends(require_company_admin)) -> UserResponse:
    if len(payload.password) < 8:
        raise HTTPException(status_code=422, detail="Passwort muss mindestens 8 Zeichen haben")
    if db.scalar(select(User).where(User.email == payload.email)):
        raise HTTPException(status_code=409, detail="E-Mail bereits vergeben")
    if current_user.role == "company_admin" and payload.role == "main_admin":
        raise HTTPException(status_code=403, detail="Hauptadministratoren können nicht erstellt werden")

    company_id = current_user.company_id
    user = User(
        email=payload.email,
        password_hash=hash_password(payload.password),
        full_name=payload.full_name,
        role=payload.role,
        company_id=company_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return UserResponse.model_validate(user)


@router.get("/{user_id}", response_model=UserResponse)
def get_user(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_company_admin)) -> UserResponse:
    return UserResponse.model_validate(_get_user(db, user_id, current_user))


@router.patch("/{user_id}", response_model=UserResponse)
def update_user(user_id: int, payload: UserUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_company_admin)) -> UserResponse:
    user = _get_user(db, user_id, current_user)
    if payload.role == "main_admin" and current_user.role != "main_admin":
        raise HTTPException(status_code=403, detail="Rolle main_admin nicht erlaubt")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return UserResponse.model_validate(user)


@router.post("/{user_id}/reset-password", status_code=status.HTTP_204_NO_CONTENT)
def reset_password(user_id: int, payload: ResetPasswordRequest, db: Session = Depends(get_db), current_user: User = Depends(require_company_admin)) -> None:
    if len(payload.new_password) < 8:
        raise HTTPException(status_code=422, detail="Passwort muss mindestens 8 Zeichen haben")
    user = _get_user(db, user_id, current_user)
    user.password_hash = hash_password(payload.new_password)
    db.commit()


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_company_admin)) -> None:
    user = _get_user(db, user_id, current_user)
    if user.id == current_user.id:
        raise HTTPException(status_code=409, detail="Eigenen Account kann man nicht löschen")
    db.delete(user)
    db.commit()
