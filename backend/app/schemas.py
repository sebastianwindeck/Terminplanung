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
    shift_reason: Optional[str] = None
    shift_description: Optional[str] = None


class VersionCreate(VersionBase):
    project_id: int
    clone_from_version_id: Optional[int] = None


class VersionUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_baseline: Optional[bool] = None
    is_current: Optional[bool] = None
    shift_reason: Optional[str] = None
    shift_description: Optional[str] = None


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


# ── Email ─────────────────────────────────────────────────────────────────────

class EmailEventBase(BaseModel):
    subject: str
    sender: str
    recipients: Optional[str] = None
    email_date: datetime
    tag: Optional[str] = None
    note: Optional[str] = None
    importance: str = "normal"
    version_from_id: Optional[int] = None
    version_to_id: Optional[int] = None


class EmailEventCreate(EmailEventBase):
    project_id: int


class EmailEventUpdate(BaseModel):
    subject: Optional[str] = None
    sender: Optional[str] = None
    recipients: Optional[str] = None
    email_date: Optional[datetime] = None
    tag: Optional[str] = None
    note: Optional[str] = None
    importance: Optional[str] = None
    version_from_id: Optional[int] = None
    version_to_id: Optional[int] = None


class EmailEventResponse(EmailEventBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    attachment_filename: Optional[str] = None
    attachment_mime_type: Optional[str] = None
    attachment_size_bytes: Optional[int] = None
    attachment_kind: Optional[str] = None
    has_attachment: bool = False
    created_at: datetime
    updated_at: datetime


# ── Timeline ──────────────────────────────────────────────────────────────────

class TimelineEvent(BaseModel):
    event_type: str  # "version" | "email"
    event_id: int
    event_date: datetime
    title: str
    subtitle: Optional[str] = None
    icon: str  # "gantt" | "mail"
    importance: Optional[str] = None
    color: Optional[str] = None
    version_number: Optional[int] = None
    is_baseline: Optional[bool] = None
    is_current: Optional[bool] = None
    tag: Optional[str] = None
    has_attachment: Optional[bool] = None


class TimelineResponse(BaseModel):
    project_id: int
    events: list[TimelineEvent]


# ── Company Settings ──────────────────────────────────────────────────────────

class CompanySettingsBase(BaseModel):
    company_name: str = ""
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    header_text: Optional[str] = None
    footer_text: Optional[str] = None
    primary_color: str = "#1e40af"
    secondary_color: str = "#64748b"
    default_font: str = "Helvetica"


class CompanySettingsUpdate(CompanySettingsBase):
    pass


class CompanySettingsResponse(CompanySettingsBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    logo_filename: Optional[str] = None
    logo_mime_type: Optional[str] = None
    has_logo: bool = False
    updated_at: datetime


# ── MS Project Import ─────────────────────────────────────────────────────────

class MSPDIImportResult(BaseModel):
    version_id: int
    positions_created: int
    skipped: int
    warnings: list[str]


# ── Sequential Comparison ─────────────────────────────────────────────────────

class FieldChange(BaseModel):
    old: Optional[str]
    new: Optional[str]


class ChangeEntry(BaseModel):
    pos_number: Optional[str]
    title: str
    change_type: str  # "added" | "removed" | "modified"
    field_changes: dict[str, FieldChange] = {}


class StepComparison(BaseModel):
    from_version_id: int
    to_version_id: int
    from_version_name: str
    to_version_name: str
    from_version_number: int
    to_version_number: int
    added: list[ChangeEntry]
    removed: list[ChangeEntry]
    modified: list[ChangeEntry]
    email_events_between: list[EmailEventResponse]


class SequentialComparisonResponse(BaseModel):
    project_id: int
    project_name: str
    steps: list[StepComparison]
    generated_at: datetime


# ── Reports ───────────────────────────────────────────────────────────────────

class ReportResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    report_type: str
    filename: str
    file_size_bytes: int
    generated_at: datetime
