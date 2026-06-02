from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session
from .. import models, schemas
from ..database import get_db
from ..models import User
from ..services.auth_service import require_authenticated, require_company_admin
from ..schemas import ProjectMasterDataUpdate

router = APIRouter(prefix="/projects", tags=["projects"])


def _check_project_access(project: models.Project, current_user: User) -> None:
    if current_user.role == "main_admin":
        return
    if project.company_id != current_user.company_id:
        raise HTTPException(status_code=403, detail="Zugriff verweigert")


@router.get("/", response_model=list[schemas.ProjectResponse])
def list_projects(db: Session = Depends(get_db), current_user: User = Depends(require_authenticated)):
    query = db.query(models.Project)
    if current_user.role != "main_admin":
        query = query.filter(models.Project.company_id == current_user.company_id)
    projects = query.order_by(models.Project.created_at.desc()).all()
    result = []
    for p in projects:
        count = db.query(func.count(models.ScheduleVersion.id)).filter(models.ScheduleVersion.project_id == p.id).scalar()
        r = schemas.ProjectResponse.model_validate(p)
        r.version_count = count
        result.append(r)
    return result


@router.post("/", response_model=schemas.ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(data: schemas.ProjectCreate, db: Session = Depends(get_db), current_user: User = Depends(require_authenticated)):
    project = models.Project(**data.model_dump(), company_id=current_user.company_id)
    db.add(project)
    db.commit()
    db.refresh(project)
    r = schemas.ProjectResponse.model_validate(project)
    r.version_count = 0
    return r


@router.get("/{project_id}", response_model=schemas.ProjectResponse)
def get_project(project_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_authenticated)):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Projekt nicht gefunden")
    _check_project_access(project, current_user)
    count = db.query(func.count(models.ScheduleVersion.id)).filter(models.ScheduleVersion.project_id == project_id).scalar()
    r = schemas.ProjectResponse.model_validate(project)
    r.version_count = count
    return r


@router.put("/{project_id}", response_model=schemas.ProjectResponse)
def update_project(project_id: int, data: schemas.ProjectUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_authenticated)):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Projekt nicht gefunden")
    _check_project_access(project, current_user)
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(project, key, value)
    db.commit()
    db.refresh(project)
    count = db.query(func.count(models.ScheduleVersion.id)).filter(models.ScheduleVersion.project_id == project_id).scalar()
    r = schemas.ProjectResponse.model_validate(project)
    r.version_count = count
    return r


@router.patch("/{project_id}/master-data", response_model=schemas.ProjectResponse)
def update_master_data(project_id: int, data: ProjectMasterDataUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_authenticated)):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Projekt nicht gefunden")
    _check_project_access(project, current_user)
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(project, key, value)
    db.commit()
    db.refresh(project)
    count = db.query(func.count(models.ScheduleVersion.id)).filter(models.ScheduleVersion.project_id == project_id).scalar()
    r = schemas.ProjectResponse.model_validate(project)
    r.version_count = count
    return r


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(project_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_company_admin)):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Projekt nicht gefunden")
    _check_project_access(project, current_user)
    db.delete(project)
    db.commit()
