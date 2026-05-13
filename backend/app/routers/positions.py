import io
from datetime import date, datetime
from typing import Optional
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/positions", tags=["positions"])

STATUS_VALUES = {"planned", "in_progress", "completed", "delayed", "cancelled"}


def _parse_date(val) -> Optional[date]:
    if val is None or (isinstance(val, float) and pd.isna(val)):
        return None
    if isinstance(val, (date, datetime)):
        return val.date() if isinstance(val, datetime) else val
    s = str(val).strip()
    for fmt in ("%d.%m.%Y", "%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y"):
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            continue
    return None


@router.get("/version/{version_id}", response_model=list[schemas.PositionResponse])
def list_positions(version_id: int, db: Session = Depends(get_db)):
    version = db.query(models.ScheduleVersion).filter(models.ScheduleVersion.id == version_id).first()
    if not version:
        raise HTTPException(status_code=404, detail="Version nicht gefunden")
    return db.query(models.SchedulePosition).filter(
        models.SchedulePosition.version_id == version_id
    ).order_by(models.SchedulePosition.sort_order).all()


@router.post("/", response_model=schemas.PositionResponse, status_code=status.HTTP_201_CREATED)
def create_position(data: schemas.PositionCreate, db: Session = Depends(get_db)):
    version = db.query(models.ScheduleVersion).filter(models.ScheduleVersion.id == data.version_id).first()
    if not version:
        raise HTTPException(status_code=404, detail="Version nicht gefunden")
    pos = models.SchedulePosition(**data.model_dump())
    db.add(pos)
    db.commit()
    db.refresh(pos)
    return pos


@router.put("/{position_id}", response_model=schemas.PositionResponse)
def update_position(position_id: int, data: schemas.PositionUpdate, db: Session = Depends(get_db)):
    pos = db.query(models.SchedulePosition).filter(models.SchedulePosition.id == position_id).first()
    if not pos:
        raise HTTPException(status_code=404, detail="Position nicht gefunden")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(pos, key, value)
    db.commit()
    db.refresh(pos)
    return pos


@router.delete("/{position_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_position(position_id: int, db: Session = Depends(get_db)):
    pos = db.query(models.SchedulePosition).filter(models.SchedulePosition.id == position_id).first()
    if not pos:
        raise HTTPException(status_code=404, detail="Position nicht gefunden")
    db.delete(pos)
    db.commit()


@router.post("/version/{version_id}/reorder", status_code=status.HTTP_204_NO_CONTENT)
def reorder_positions(version_id: int, order: list[int], db: Session = Depends(get_db)):
    for idx, pos_id in enumerate(order):
        db.query(models.SchedulePosition).filter(
            models.SchedulePosition.id == pos_id,
            models.SchedulePosition.version_id == version_id,
        ).update({"sort_order": idx})
    db.commit()


@router.post("/version/{version_id}/import", response_model=schemas.ImportResult)
async def import_positions(
    version_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    version = db.query(models.ScheduleVersion).filter(models.ScheduleVersion.id == version_id).first()
    if not version:
        raise HTTPException(status_code=404, detail="Version nicht gefunden")

    content = await file.read()
    filename = (file.filename or "").lower()
    errors: list[str] = []
    imported = 0
    skipped = 0

    try:
        if filename.endswith((".xlsx", ".xls")):
            df = pd.read_excel(io.BytesIO(content), dtype=str)
        elif filename.endswith(".csv"):
            for enc in ("utf-8", "utf-8-sig", "latin-1", "cp1252"):
                try:
                    df = pd.read_csv(io.BytesIO(content), dtype=str, encoding=enc, sep=None, engine="python")
                    break
                except Exception:
                    continue
            else:
                raise ValueError("CSV konnte nicht gelesen werden")
        else:
            raise ValueError("Nur .xlsx, .xls und .csv werden unterstützt")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    df.columns = [str(c).strip().lower().replace(" ", "_").replace("-", "_") for c in df.columns]

    col_map = {
        "pos_number": ["pos", "pos.", "pos_nr", "pos_number", "position", "nummer", "nr", "nr."],
        "title": ["title", "bezeichnung", "beschreibung", "name", "vorgang", "aufgabe", "task"],
        "start_date": ["start", "start_date", "startdatum", "beginn", "von", "anfang"],
        "end_date": ["end", "end_date", "enddatum", "ende", "bis", "fertig"],
        "duration_days": ["duration", "dauer", "duration_days", "dauer_tage", "tage"],
        "responsible": ["responsible", "verantwortlich", "zuständig", "leiter", "person"],
        "trade": ["trade", "gewerk", "fachbereich", "bereich"],
        "status": ["status"],
        "progress": ["progress", "fortschritt", "fertigstellung", "%"],
    }

    def find_col(target: str) -> Optional[str]:
        candidates = col_map.get(target, [target])
        for c in candidates:
            if c in df.columns:
                return c
        return None

    max_order = db.query(models.SchedulePosition).filter(
        models.SchedulePosition.version_id == version_id
    ).count()

    for idx, row in df.iterrows():
        row_num = int(idx) + 2
        try:
            title_col = find_col("title")
            if not title_col or pd.isna(row.get(title_col, None)) or str(row.get(title_col, "")).strip() == "":
                skipped += 1
                continue

            def get(col_name: str) -> Optional[str]:
                c = find_col(col_name)
                if c is None:
                    return None
                v = row.get(c)
                if v is None or (isinstance(v, float) and pd.isna(v)):
                    return None
                return str(v).strip() or None

            raw_status = get("status")
            status_val = raw_status.lower().replace(" ", "_") if raw_status else "planned"
            if status_val not in STATUS_VALUES:
                status_val = "planned"

            raw_progress = get("progress")
            progress_val = 0.0
            if raw_progress:
                try:
                    progress_val = float(raw_progress.replace("%", "").replace(",", "."))
                    if progress_val > 1:
                        progress_val = progress_val / 100
                except ValueError:
                    progress_val = 0.0

            raw_dur = get("duration_days")
            dur_val = None
            if raw_dur:
                try:
                    dur_val = int(float(raw_dur.replace(",", ".")))
                except ValueError:
                    dur_val = None

            pos = models.SchedulePosition(
                version_id=version_id,
                pos_number=get("pos_number"),
                title=str(row[title_col]).strip(),
                start_date=_parse_date(row.get(find_col("start_date") or "")),
                end_date=_parse_date(row.get(find_col("end_date") or "")),
                duration_days=dur_val,
                responsible=get("responsible"),
                trade=get("trade"),
                status=status_val,
                progress=progress_val,
                sort_order=max_order + idx,
            )
            db.add(pos)
            imported += 1
        except Exception as e:
            errors.append(f"Zeile {row_num}: {e}")

    db.commit()
    return schemas.ImportResult(imported=imported, skipped=skipped, errors=errors)


@router.get("/version/{version_id}/export")
def export_positions(version_id: int, db: Session = Depends(get_db)):
    from fastapi.responses import StreamingResponse
    version = db.query(models.ScheduleVersion).filter(models.ScheduleVersion.id == version_id).first()
    if not version:
        raise HTTPException(status_code=404, detail="Version nicht gefunden")

    positions = db.query(models.SchedulePosition).filter(
        models.SchedulePosition.version_id == version_id
    ).order_by(models.SchedulePosition.sort_order).all()

    rows = []
    for p in positions:
        rows.append({
            "Pos.-Nr.": p.pos_number,
            "Bezeichnung": p.title,
            "Beginn": p.start_date.strftime("%d.%m.%Y") if p.start_date else "",
            "Ende": p.end_date.strftime("%d.%m.%Y") if p.end_date else "",
            "Dauer (Tage)": p.duration_days,
            "Verantwortlich": p.responsible,
            "Gewerk": p.trade,
            "Status": p.status,
            "Fortschritt (%)": int(p.progress * 100) if p.progress else 0,
            "Meilenstein": "Ja" if p.is_milestone else "Nein",
        })

    df = pd.DataFrame(rows)
    buf = io.BytesIO()
    with pd.ExcelWriter(buf, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="Terminplan")
    buf.seek(0)

    safe_name = "".join(c for c in version.name if c.isalnum() or c in " -_").strip()
    filename = f"Terminplan_V{version.version_number}_{safe_name}.xlsx"

    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
