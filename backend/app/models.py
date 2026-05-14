from datetime import datetime, date
from typing import Optional
from sqlalchemy import String, Integer, Date, DateTime, ForeignKey, Float, Boolean, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .database import Base


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    project_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

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
    status: Mapped[str] = mapped_column(String(50), default="planned")
    progress: Mapped[float] = mapped_column(Float, default=0.0)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    is_milestone: Mapped[bool] = mapped_column(Boolean, default=False)
    color: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
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
    header_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    footer_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    primary_color: Mapped[str] = mapped_column(String(7), nullable=False, default="#1e40af")
    secondary_color: Mapped[str] = mapped_column(String(7), nullable=False, default="#64748b")
    default_font: Mapped[str] = mapped_column(String(50), nullable=False, default="Helvetica")
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


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
