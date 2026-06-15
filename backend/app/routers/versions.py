from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session
from .. import models, schemas
from ..database import get_db
from ..services.auth_service import require_authenticated

router = APIRouter(prefix="/versions", tags=["versions"], dependencies=[Depends(require_authenticated)])


def _version_response(v: models.ScheduleVersion, db: Session) -> schemas.VersionResponse:
    count = db.query(func.count(models.SchedulePosition.id)).filter(models.SchedulePosition.version_id == v.id).scalar()
    r = schemas.VersionResponse.model_validate(v)
    r.position_count = count
    return r


@router.get("/project/{project_id}", response_model=list[schemas.VersionResponse])
def list_versions(project_id: int, db: Session = Depends(get_db)):
    versions = (
        db.query(models.ScheduleVersion)
        .filter(models.ScheduleVersion.project_id == project_id)
        .order_by(models.ScheduleVersion.version_number.desc())
        .all()
    )
    return [_version_response(v, db) for v in versions]


@router.post("/", response_model=schemas.VersionResponse, status_code=status.HTTP_201_CREATED)
def create_version(data: schemas.VersionCreate, db: Session = Depends(get_db)):
    project = db.query(models.Project).filter(models.Project.id == data.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Projekt nicht gefunden")

    max_version = (
        db.query(func.max(models.ScheduleVersion.version_number))
        .filter(models.ScheduleVersion.project_id == data.project_id)
        .scalar()
        or 0
    )

    version = models.ScheduleVersion(
        project_id=data.project_id,
        name=data.name,
        description=data.description,
        is_baseline=data.is_baseline,
        version_number=max_version + 1,
    )
    db.add(version)
    db.flush()

    if data.clone_from_version_id:
        source = db.query(models.ScheduleVersion).filter(models.ScheduleVersion.id == data.clone_from_version_id).first()
        if not source:
            raise HTTPException(status_code=404, detail="Quellversion nicht gefunden")
        id_map: dict[int, int] = {}
        sorted_positions = sorted(source.positions, key=lambda p: (p.sort_order, p.id))
        for pos in sorted_positions:
            # Shift dates forward by accumulated behinderung days
            shift = timedelta(days=pos.behinderung_tage_gesamt) if pos.behinderung_tage_gesamt else timedelta(0)
            new_start = (pos.start_date + shift) if pos.start_date and shift.days > 0 else pos.start_date
            new_end = (pos.end_date + shift) if pos.end_date and shift.days > 0 else pos.end_date
            new_pos = models.SchedulePosition(
                version_id=version.id,
                pos_number=pos.pos_number,
                title=pos.title,
                description=pos.description,
                start_date=new_start,
                end_date=new_end,
                duration_days=pos.duration_days,
                responsible=pos.responsible,
                trade=pos.trade,
                typ=pos.typ,
                status="planned" if pos.status in ("delayed",) else pos.status,
                progress=pos.progress,
                sort_order=pos.sort_order,
                is_milestone=pos.is_milestone,
                color=pos.color,
                # Reset behinderung tracking in new version
                behinderung_aktiv=False,
                behinderung_beginn=None,
                behinderung_tage_gesamt=0,
            )
            db.add(new_pos)
            db.flush()
            id_map[pos.id] = new_pos.id

        for pos in sorted_positions:
            if pos.parent_id and pos.parent_id in id_map:
                new_id = id_map[pos.id]
                db.query(models.SchedulePosition).filter(models.SchedulePosition.id == new_id).update(
                    {"parent_id": id_map[pos.parent_id]}
                )

    db.commit()
    db.refresh(version)
    return _version_response(version, db)


@router.get("/{version_id}", response_model=schemas.VersionResponse)
def get_version(version_id: int, db: Session = Depends(get_db)):
    version = db.query(models.ScheduleVersion).filter(models.ScheduleVersion.id == version_id).first()
    if not version:
        raise HTTPException(status_code=404, detail="Version nicht gefunden")
    return _version_response(version, db)


@router.put("/{version_id}", response_model=schemas.VersionResponse)
def update_version(version_id: int, data: schemas.VersionUpdate, db: Session = Depends(get_db)):
    version = db.query(models.ScheduleVersion).filter(models.ScheduleVersion.id == version_id).first()
    if not version:
        raise HTTPException(status_code=404, detail="Version nicht gefunden")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(version, key, value)
    db.commit()
    db.refresh(version)
    return _version_response(version, db)


@router.delete("/{version_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_version(version_id: int, db: Session = Depends(get_db)):
    version = db.query(models.ScheduleVersion).filter(models.ScheduleVersion.id == version_id).first()
    if not version:
        raise HTTPException(status_code=404, detail="Version nicht gefunden")
    db.delete(version)
    db.commit()


@router.post("/{version_id}/save-as", response_model=schemas.VersionResponse, status_code=status.HTTP_201_CREATED)
def save_as_version(version_id: int, data: schemas.SaveAsVersionRequest, db: Session = Depends(get_db)):
    source = db.query(models.ScheduleVersion).filter(models.ScheduleVersion.id == version_id).first()
    if not source:
        raise HTTPException(status_code=404, detail="Version nicht gefunden")

    changes_map = {c.id: c for c in data.changes}

    max_ver = (
        db.query(func.max(models.ScheduleVersion.version_number))
        .filter(models.ScheduleVersion.project_id == source.project_id)
        .scalar()
        or 0
    )

    version = models.ScheduleVersion(
        project_id=source.project_id,
        name=data.name,
        description=data.description,
        is_baseline=data.is_baseline,
        shift_reason=data.shift_reason,
        shift_description=data.shift_description,
        version_number=max_ver + 1,
    )
    db.add(version)
    db.flush()

    id_map: dict[int, int] = {}
    sorted_positions = sorted(source.positions, key=lambda p: (p.sort_order, p.id))

    for pos in sorted_positions:
        ch = changes_map.get(pos.id)
        new_pos = models.SchedulePosition(
            version_id=version.id,
            pos_number=pos.pos_number,
            title=(ch.title if ch and ch.title is not None else pos.title),
            description=pos.description,
            start_date=(ch.start_date if ch and ch.start_date is not None else pos.start_date),
            end_date=(ch.end_date if ch and ch.end_date is not None else pos.end_date),
            duration_days=(ch.duration_days if ch and ch.duration_days is not None else pos.duration_days),
            responsible=(ch.responsible if ch and ch.responsible is not None else pos.responsible),
            trade=pos.trade,
            typ=pos.typ,
            status=(ch.status if ch and ch.status is not None else pos.status),
            progress=(ch.progress if ch and ch.progress is not None else pos.progress),
            sort_order=pos.sort_order,
            is_milestone=pos.is_milestone,
            color=pos.color,
        )
        db.add(new_pos)
        db.flush()
        id_map[pos.id] = new_pos.id

    for pos in sorted_positions:
        if pos.parent_id and pos.parent_id in id_map:
            db.query(models.SchedulePosition).filter(
                models.SchedulePosition.id == id_map[pos.id]
            ).update({"parent_id": id_map[pos.parent_id]})

    db.commit()
    db.refresh(version)
    return _version_response(version, db)


@router.get("/{version_a_id}/compare/{version_b_id}", response_model=schemas.VersionComparison)
def compare_versions(version_a_id: int, version_b_id: int, db: Session = Depends(get_db)):
    va = db.query(models.ScheduleVersion).filter(models.ScheduleVersion.id == version_a_id).first()
    vb = db.query(models.ScheduleVersion).filter(models.ScheduleVersion.id == version_b_id).first()
    if not va or not vb:
        raise HTTPException(status_code=404, detail="Version nicht gefunden")

    def pos_key(p: models.SchedulePosition) -> str:
        return p.pos_number or p.title

    a_dict = {pos_key(p): p for p in va.positions}
    b_dict = {pos_key(p): p for p in vb.positions}

    diffs: list[schemas.PositionDiff] = []
    compare_fields = ["title", "start_date", "end_date", "duration_days", "responsible", "trade", "status", "progress"]

    for key in set(a_dict) | set(b_dict):
        if key not in a_dict:
            p = b_dict[key]
            diffs.append(schemas.PositionDiff(pos_number=p.pos_number, title=p.title, field="*", old_value=None, new_value="neu", change_type="added"))
        elif key not in b_dict:
            p = a_dict[key]
            diffs.append(schemas.PositionDiff(pos_number=p.pos_number, title=p.title, field="*", old_value="vorhanden", new_value=None, change_type="removed"))
        else:
            pa, pb = a_dict[key], b_dict[key]
            for field in compare_fields:
                ov, nv = str(getattr(pa, field) or ""), str(getattr(pb, field) or "")
                if ov != nv:
                    diffs.append(schemas.PositionDiff(pos_number=pa.pos_number, title=pa.title, field=field, old_value=ov or None, new_value=nv or None, change_type="modified"))

    added = sum(1 for d in diffs if d.change_type == "added")
    removed = sum(1 for d in diffs if d.change_type == "removed")
    modified = len({(d.pos_number, d.title) for d in diffs if d.change_type == "modified"})

    return schemas.VersionComparison(
        version_a=_version_response(va, db),
        version_b=_version_response(vb, db),
        diffs=diffs,
        added_count=added,
        removed_count=removed,
        modified_count=modified,
    )
