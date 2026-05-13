from datetime import datetime, date
from typing import Optional
from pydantic import BaseModel, ConfigDict


# ── Project ──────────────────────────────────────────────────────────────────

class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None
    project_number: Optional[str] = None


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    project_number: Optional[str] = None


class ProjectResponse(ProjectBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime
    version_count: int = 0


# ── ScheduleVersion ───────────────────────────────────────────────────────────

class VersionBase(BaseModel):
    name: str
    description: Optional[str] = None
    is_baseline: bool = False


class VersionCreate(VersionBase):
    project_id: int
    clone_from_version_id: Optional[int] = None


class VersionUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_baseline: Optional[bool] = None
    is_current: Optional[bool] = None


class VersionResponse(VersionBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    version_number: int
    is_current: bool
    created_at: datetime
    updated_at: datetime
    position_count: int = 0


# ── SchedulePosition ──────────────────────────────────────────────────────────

class PositionBase(BaseModel):
    pos_number: Optional[str] = None
    title: str
    description: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    duration_days: Optional[int] = None
    responsible: Optional[str] = None
    trade: Optional[str] = None
    status: str = "planned"
    progress: float = 0.0
    sort_order: int = 0
    is_milestone: bool = False
    color: Optional[str] = None
    parent_id: Optional[int] = None


class PositionCreate(PositionBase):
    version_id: int


class PositionUpdate(BaseModel):
    pos_number: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    duration_days: Optional[int] = None
    responsible: Optional[str] = None
    trade: Optional[str] = None
    status: Optional[str] = None
    progress: Optional[float] = None
    sort_order: Optional[int] = None
    is_milestone: Optional[bool] = None
    color: Optional[str] = None
    parent_id: Optional[int] = None


class PositionResponse(PositionBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    version_id: int
    created_at: datetime
    updated_at: datetime


class PositionBulkUpdate(BaseModel):
    positions: list[PositionUpdate]
    ids: list[int]


# ── Import ────────────────────────────────────────────────────────────────────

class ImportResult(BaseModel):
    imported: int
    skipped: int
    errors: list[str]


# ── Version Comparison ────────────────────────────────────────────────────────

class PositionDiff(BaseModel):
    pos_number: Optional[str]
    title: str
    field: str
    old_value: Optional[str]
    new_value: Optional[str]
    change_type: str  # "added" | "removed" | "modified"


class VersionComparison(BaseModel):
    version_a: VersionResponse
    version_b: VersionResponse
    diffs: list[PositionDiff]
    added_count: int
    removed_count: int
    modified_count: int
