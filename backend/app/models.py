import uuid
from datetime import datetime, date
from typing import Optional
from sqlalchemy import String, Integer, Date, DateTime, ForeignKey, Float, Boolean, Text, UniqueConstraint, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .database import Base


class Company(Base):
    __tablename__ = "companies"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    primary_color: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    logo_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    users: Mapped[list["User"]] = relationship("User", back_populates="company", cascade="all, delete-orphan")
    projects: Mapped[list["Project"]] = relationship("Project", back_populates="company", cascade="all, delete-orphan")


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    role: Mapped[str] = mapped_column(String(50), nullable=False)  # main_admin | company_admin | company_user
    company_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    last_login_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    company: Mapped[Optional["Company"]] = relationship("Company", back_populates="users")


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    company_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    project_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    # Modul A – Projektstammdaten
    client_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    client_address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    construction_site_address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    contract_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    contract_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    trade: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, default="Fassadenbau")
    construction_lead: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    site_manager: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    vob_b_agreed: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    email_token: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, default=lambda: uuid.uuid4().hex)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    company: Mapped[Optional["Company"]] = relationship("Company", back_populates="projects")
    versions: Mapped[list["ScheduleVersion"]] = relationship("ScheduleVersion", back_populates="project", cascade="all, delete-orphan")
    email_events: Mapped[list["EmailEvent"]] = relationship("EmailEvent", back_populates="project", cascade="all, delete-orphan")


class ScheduleVersion(Base):
    __tablename__ = "schedule_versions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    project_id: Mapped[int] = mapped_column(Integer, ForeignKey("projects.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    version_number: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_baseline: Mapped[bool] = mapped_column(Boolean, default=False)
    is_current: Mapped[bool] = mapped_column(Boolean, default=True)
    shift_reason: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    shift_description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    project: Mapped["Project"] = relationship("Project", back_populates="versions")
    positions: Mapped[list["SchedulePosition"]] = relationship(
        "SchedulePosition",
        back_populates="version",
        cascade="all, delete-orphan",
        order_by="SchedulePosition.sort_order",
    )


class SchedulePosition(Base):
    __tablename__ = "schedule_positions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    version_id: Mapped[int] = mapped_column(Integer, ForeignKey("schedule_versions.id"), nullable=False)
    parent_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("schedule_positions.id"), nullable=True)
    pos_number: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    start_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    end_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    duration_days: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    responsible: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    trade: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    typ: Mapped[str] = mapped_column(String(30), nullable=False, default="vorgang")  # vorgang | meilenstein | sammelvorgang
    status: Mapped[str] = mapped_column(String(50), default="planned")
    progress: Mapped[float] = mapped_column(Float, default=0.0)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    is_milestone: Mapped[bool] = mapped_column(Boolean, default=False)
    color: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    # Behinderungsmanagement
    behinderung_aktiv: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    behinderung_beginn: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    behinderung_tage_gesamt: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    version: Mapped["ScheduleVersion"] = relationship("ScheduleVersion", back_populates="positions")
    parent: Mapped[Optional["SchedulePosition"]] = relationship("SchedulePosition", remote_side=[id], back_populates="children")
    children: Mapped[list["SchedulePosition"]] = relationship("SchedulePosition", back_populates="parent")


class EmailEvent(Base):
    __tablename__ = "email_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    project_id: Mapped[int] = mapped_column(Integer, ForeignKey("projects.id"), nullable=False, index=True)
    subject: Mapped[str] = mapped_column(String(500), nullable=False)
    sender: Mapped[str] = mapped_column(String(255), nullable=False)
    recipients: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    email_date: Mapped[datetime] = mapped_column(DateTime, nullable=False, index=True)
    tag: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    importance: Mapped[str] = mapped_column(String(20), nullable=False, default="normal")
    version_from_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("schedule_versions.id", use_alter=True), nullable=True)
    version_to_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("schedule_versions.id", use_alter=True), nullable=True)
    attachment_filename: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    attachment_stored_path: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    attachment_mime_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    attachment_size_bytes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    attachment_kind: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    project: Mapped["Project"] = relationship("Project", back_populates="email_events")
    version_from: Mapped[Optional["ScheduleVersion"]] = relationship("ScheduleVersion", foreign_keys=[version_from_id])
    version_to: Mapped[Optional["ScheduleVersion"]] = relationship("ScheduleVersion", foreign_keys=[version_to_id])


class CompanySettings(Base):
    __tablename__ = "company_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    company_name: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    website: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    logo_filename: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    logo_stored_path: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    logo_mime_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    template_filename: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    template_stored_path: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    template_mime_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    header_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    footer_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    primary_color: Mapped[str] = mapped_column(String(7), nullable=False, default="#1e40af")
    secondary_color: Mapped[str] = mapped_column(String(7), nullable=False, default="#64748b")
    default_font: Mapped[str] = mapped_column(String(50), nullable=False, default="Helvetica")
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    entity_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    action: Mapped[str] = mapped_column(String(20), nullable=False)  # create | update | delete | transition
    field_changes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON
    user_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)

    __table_args__ = (
        Index("ix_audit_entity", "entity_type", "entity_id"),
    )


class GeneratedReport(Base):
    __tablename__ = "generated_reports"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    project_id: Mapped[int] = mapped_column(Integer, ForeignKey("projects.id"), nullable=False, index=True)
    report_type: Mapped[str] = mapped_column(String(50), nullable=False)
    version_ids_json: Mapped[str] = mapped_column(Text, nullable=False)
    filename: Mapped[str] = mapped_column(String(500), nullable=False)
    stored_path: Mapped[str] = mapped_column(String(1000), nullable=False)
    file_size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    generated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    project: Mapped["Project"] = relationship("Project")


class Stoerung(Base):
    __tablename__ = "stoerungen"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    project_id: Mapped[int] = mapped_column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    stoerung_number: Mapped[str] = mapped_column(String(50), nullable=False)
    titel: Mapped[str] = mapped_column(String(500), nullable=False)
    stoerungsart: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    unterkategorie: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    beschreibung: Mapped[str] = mapped_column(Text, nullable=False)
    stoerungsbeginn: Mapped[datetime] = mapped_column(DateTime, nullable=False, index=True)
    kenntniszeitpunkt: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    stoerungsende: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    verantwortungsbereich: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    verursacher: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    betroffener_bereich: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    betroffener_vorgang_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("schedule_positions.id", ondelete="SET NULL"), nullable=True, index=True)
    hindernde_wirkung: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    auswirkungen_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    leistungsbereitschaft: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    ausweichleistung_moeglich: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    sofortmassnahme: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    erforderliche_mitwirkung_ag: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(40), nullable=False, default="entwurf", index=True)
    kritikalitaet: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    created_by: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("project_id", "stoerung_number", name="uq_stoerung_number"),
        Index("ix_stoerungen_project_status", "project_id", "status"),
    )

    project: Mapped["Project"] = relationship("Project")
    betroffener_vorgang: Mapped[Optional["SchedulePosition"]] = relationship(
        "SchedulePosition", foreign_keys=[betroffener_vorgang_id])
    anzeigen: Mapped[list["Behinderungsanzeige"]] = relationship(
        "Behinderungsanzeige", back_populates="stoerung", cascade="all, delete-orphan")
    anlagen: Mapped[list["Stoerungsanlage"]] = relationship(
        "Stoerungsanlage", back_populates="stoerung", cascade="all, delete-orphan")
    kausalitaeten: Mapped[list["Kausalitaet"]] = relationship(
        "Kausalitaet", back_populates="stoerung", cascade="all, delete-orphan")


class Behinderungsanzeige(Base):
    __tablename__ = "behinderungsanzeigen"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    stoerung_id: Mapped[int] = mapped_column(Integer, ForeignKey("stoerungen.id", ondelete="CASCADE"), nullable=False, index=True)
    typ: Mapped[str] = mapped_column(String(30), nullable=False, default="erstanzeige")
    adressat: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    cc: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    versandart: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    versanddatum: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="entwurf", index=True)
    pdf_filename: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    pdf_stored_path: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    sent_by: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    stoerung: Mapped["Stoerung"] = relationship("Stoerung", back_populates="anzeigen")


class Bautagesbericht(Base):
    __tablename__ = "bautagesberichte"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    project_id: Mapped[int] = mapped_column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    datum: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    wetter: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    temperatur_min: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    temperatur_max: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    wind: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    niederschlag: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    personalanzahl: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    arbeitszeit_von: Mapped[Optional[str]] = mapped_column(String(5), nullable=True)
    arbeitszeit_bis: Mapped[Optional[str]] = mapped_column(String(5), nullable=True)
    geplanter_vorgang_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("schedule_positions.id", ondelete="SET NULL"), nullable=True)
    ausgefuehrter_vorgang_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("schedule_positions.id", ondelete="SET NULL"), nullable=True)
    soll_menge: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    soll_einheit: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    ist_menge: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    ist_einheit: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    abweichung_kommentar: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    stoerung_vorhanden: Mapped[bool] = mapped_column(Boolean, default=False)
    stoerung_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("stoerungen.id", ondelete="SET NULL"), nullable=True, index=True)
    anordnung_vorhanden: Mapped[bool] = mapped_column(Boolean, default=False)
    anordnung_beschreibung: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    allgemeine_bemerkungen: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    freigabestatus: Mapped[str] = mapped_column(String(20), default="erstellt", nullable=False)
    created_by: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("project_id", "datum", name="uq_bautagesbericht_date"),
        Index("ix_bautagesbericht_project_datum", "project_id", "datum"),
    )

    project: Mapped["Project"] = relationship("Project")
    geplanter_vorgang: Mapped[Optional["SchedulePosition"]] = relationship(
        "SchedulePosition", foreign_keys=[geplanter_vorgang_id])
    ausgefuehrter_vorgang: Mapped[Optional["SchedulePosition"]] = relationship(
        "SchedulePosition", foreign_keys=[ausgefuehrter_vorgang_id])
    stoerung: Mapped[Optional["Stoerung"]] = relationship("Stoerung")


class Kausalitaet(Base):
    __tablename__ = "kausalitaeten"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    stoerung_id: Mapped[int] = mapped_column(Integer, ForeignKey("stoerungen.id", ondelete="CASCADE"), nullable=False, index=True)
    ereignis: Mapped[str] = mapped_column(Text, nullable=False)
    verantwortungsbereich: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    behinderte_leistung_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("schedule_positions.id", ondelete="SET NULL"), nullable=True)
    geplante_leistung: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    tatsaechliche_leistung: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    unmittelbare_auswirkung_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    mittelbare_auswirkung: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    eigenverschulden_geprueft: Mapped[bool] = mapped_column(Boolean, default=False)
    ergebnis_eigenverschulden: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    bewertung: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    stoerung: Mapped["Stoerung"] = relationship("Stoerung", back_populates="kausalitaeten")
    behinderte_leistung: Mapped[Optional["SchedulePosition"]] = relationship(
        "SchedulePosition", foreign_keys=[behinderte_leistung_id])


class Stoerungsanlage(Base):
    __tablename__ = "stoerungsanlagen"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    stoerung_id: Mapped[int] = mapped_column(Integer, ForeignKey("stoerungen.id", ondelete="CASCADE"), nullable=False, index=True)
    anlage_typ: Mapped[str] = mapped_column(String(30), nullable=False, default="sonstiges")
    filename: Mapped[str] = mapped_column(String(500), nullable=False)
    stored_path: Mapped[str] = mapped_column(String(1000), nullable=False)
    mime_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    beschreibung: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    datum: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    uploaded_by: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    stoerung: Mapped["Stoerung"] = relationship("Stoerung", back_populates="anlagen")


class AiUsageLog(Base):
    __tablename__ = "ai_usage_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    function_type: Mapped[str] = mapped_column(String(100), nullable=False)
    model: Mapped[str] = mapped_column(String(100), nullable=False)
    input_tokens: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    output_tokens: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    stoerung_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
