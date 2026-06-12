"""Full initial schema

Revision ID: 0001
Revises:
Create Date: 2026-06-12

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "companies",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("slug", sa.String(100), unique=True, nullable=False),
        sa.Column("primary_color", sa.String(20), nullable=True),
        sa.Column("logo_path", sa.String(500), nullable=True),
        sa.Column("is_active", sa.Boolean, default=True),
        sa.Column("created_at", sa.DateTime, nullable=False),
    )

    op.create_table(
        "users",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("email", sa.String(255), unique=True, nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("full_name", sa.String(200), nullable=True),
        sa.Column("role", sa.String(50), nullable=False),
        sa.Column("company_id", sa.Integer, sa.ForeignKey("companies.id", ondelete="CASCADE"), nullable=True),
        sa.Column("is_active", sa.Boolean, default=True),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("last_login_at", sa.DateTime, nullable=True),
    )

    op.create_table(
        "projects",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("company_id", sa.Integer, sa.ForeignKey("companies.id", ondelete="CASCADE"), nullable=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("project_number", sa.String(100), nullable=True),
        sa.Column("client_name", sa.String(255), nullable=True),
        sa.Column("client_address", sa.Text, nullable=True),
        sa.Column("construction_site_address", sa.Text, nullable=True),
        sa.Column("contract_number", sa.String(100), nullable=True),
        sa.Column("contract_date", sa.Date, nullable=True),
        sa.Column("trade", sa.String(100), nullable=True),
        sa.Column("construction_lead", sa.String(255), nullable=True),
        sa.Column("site_manager", sa.String(255), nullable=True),
        sa.Column("vob_b_agreed", sa.Boolean, nullable=True),
        sa.Column("email_token", sa.String(64), unique=True, nullable=False),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("updated_at", sa.DateTime, nullable=False),
    )

    op.create_table(
        "schedule_versions",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("project_id", sa.Integer, sa.ForeignKey("projects.id"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("version_number", sa.Integer, nullable=False, default=1),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("is_baseline", sa.Boolean, default=False),
        sa.Column("is_current", sa.Boolean, default=True),
        sa.Column("shift_reason", sa.String(100), nullable=True),
        sa.Column("shift_description", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("updated_at", sa.DateTime, nullable=False),
    )

    op.create_table(
        "schedule_positions",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("version_id", sa.Integer, sa.ForeignKey("schedule_versions.id"), nullable=False),
        sa.Column("parent_id", sa.Integer, sa.ForeignKey("schedule_positions.id"), nullable=True),
        sa.Column("pos_number", sa.String(50), nullable=True),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("start_date", sa.Date, nullable=True),
        sa.Column("end_date", sa.Date, nullable=True),
        sa.Column("duration_days", sa.Integer, nullable=True),
        sa.Column("responsible", sa.String(255), nullable=True),
        sa.Column("trade", sa.String(255), nullable=True),
        sa.Column("typ", sa.String(30), nullable=False, server_default="vorgang"),
        sa.Column("status", sa.String(50), default="planned"),
        sa.Column("progress", sa.Float, default=0.0),
        sa.Column("sort_order", sa.Integer, default=0),
        sa.Column("is_milestone", sa.Boolean, default=False),
        sa.Column("color", sa.String(20), nullable=True),
        sa.Column("behinderung_aktiv", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("behinderung_beginn", sa.DateTime, nullable=True),
        sa.Column("behinderung_tage_gesamt", sa.Integer, nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("updated_at", sa.DateTime, nullable=False),
    )

    op.create_table(
        "email_events",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("project_id", sa.Integer, sa.ForeignKey("projects.id"), nullable=False),
        sa.Column("subject", sa.String(500), nullable=False),
        sa.Column("sender", sa.String(255), nullable=False),
        sa.Column("recipients", sa.Text, nullable=True),
        sa.Column("email_date", sa.DateTime, nullable=False),
        sa.Column("tag", sa.String(100), nullable=True),
        sa.Column("note", sa.Text, nullable=True),
        sa.Column("importance", sa.String(20), nullable=False, server_default="normal"),
        sa.Column("version_from_id", sa.Integer, sa.ForeignKey("schedule_versions.id", use_alter=True), nullable=True),
        sa.Column("version_to_id", sa.Integer, sa.ForeignKey("schedule_versions.id", use_alter=True), nullable=True),
        sa.Column("attachment_filename", sa.String(500), nullable=True),
        sa.Column("attachment_stored_path", sa.String(1000), nullable=True),
        sa.Column("attachment_mime_type", sa.String(100), nullable=True),
        sa.Column("attachment_size_bytes", sa.Integer, nullable=True),
        sa.Column("attachment_kind", sa.String(20), nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("updated_at", sa.DateTime, nullable=False),
    )

    op.create_table(
        "company_settings",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("company_name", sa.String(255), nullable=False, server_default=""),
        sa.Column("address", sa.Text, nullable=True),
        sa.Column("phone", sa.String(50), nullable=True),
        sa.Column("email", sa.String(255), nullable=True),
        sa.Column("website", sa.String(255), nullable=True),
        sa.Column("logo_filename", sa.String(500), nullable=True),
        sa.Column("logo_stored_path", sa.String(1000), nullable=True),
        sa.Column("logo_mime_type", sa.String(100), nullable=True),
        sa.Column("header_text", sa.Text, nullable=True),
        sa.Column("footer_text", sa.Text, nullable=True),
        sa.Column("primary_color", sa.String(7), nullable=False, server_default="#1e40af"),
        sa.Column("secondary_color", sa.String(7), nullable=False, server_default="#64748b"),
        sa.Column("default_font", sa.String(50), nullable=False, server_default="Helvetica"),
        sa.Column("updated_at", sa.DateTime, nullable=False),
    )

    op.create_table(
        "audit_logs",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("entity_type", sa.String(50), nullable=False),
        sa.Column("entity_id", sa.Integer, nullable=False),
        sa.Column("action", sa.String(20), nullable=False),
        sa.Column("field_changes", sa.Text, nullable=True),
        sa.Column("user_email", sa.String(255), nullable=True),
        sa.Column("timestamp", sa.DateTime, nullable=False),
    )

    op.create_table(
        "generated_reports",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("project_id", sa.Integer, sa.ForeignKey("projects.id"), nullable=False),
        sa.Column("report_type", sa.String(50), nullable=False),
        sa.Column("version_ids_json", sa.Text, nullable=False),
        sa.Column("filename", sa.String(500), nullable=False),
        sa.Column("stored_path", sa.String(1000), nullable=False),
        sa.Column("file_size_bytes", sa.Integer, nullable=False),
        sa.Column("generated_at", sa.DateTime, nullable=False),
    )

    op.create_table(
        "stoerungen",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("project_id", sa.Integer, sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("stoerung_number", sa.String(50), nullable=False),
        sa.Column("titel", sa.String(500), nullable=False),
        sa.Column("stoerungsart", sa.String(100), nullable=True),
        sa.Column("unterkategorie", sa.String(100), nullable=True),
        sa.Column("beschreibung", sa.Text, nullable=False),
        sa.Column("stoerungsbeginn", sa.DateTime, nullable=False),
        sa.Column("kenntniszeitpunkt", sa.DateTime, nullable=True),
        sa.Column("stoerungsende", sa.DateTime, nullable=True),
        sa.Column("verantwortungsbereich", sa.String(100), nullable=True),
        sa.Column("verursacher", sa.String(255), nullable=True),
        sa.Column("betroffener_bereich", sa.String(255), nullable=True),
        sa.Column("betroffener_vorgang_id", sa.Integer, sa.ForeignKey("schedule_positions.id", ondelete="SET NULL"), nullable=True),
        sa.Column("hindernde_wirkung", sa.Text, nullable=True),
        sa.Column("auswirkungen_json", sa.Text, nullable=True),
        sa.Column("leistungsbereitschaft", sa.String(20), nullable=True),
        sa.Column("ausweichleistung_moeglich", sa.String(20), nullable=True),
        sa.Column("sofortmassnahme", sa.Text, nullable=True),
        sa.Column("erforderliche_mitwirkung_ag", sa.Text, nullable=True),
        sa.Column("status", sa.String(40), nullable=False, server_default="entwurf"),
        sa.Column("kritikalitaet", sa.String(20), nullable=True),
        sa.Column("created_by", sa.String(255), nullable=True),
        sa.Column("deleted_at", sa.DateTime, nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("updated_at", sa.DateTime, nullable=False),
        sa.UniqueConstraint("project_id", "stoerung_number", name="uq_stoerung_number"),
    )

    op.create_table(
        "behinderungsanzeigen",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("stoerung_id", sa.Integer, sa.ForeignKey("stoerungen.id", ondelete="CASCADE"), nullable=False),
        sa.Column("typ", sa.String(30), nullable=False, server_default="erstanzeige"),
        sa.Column("adressat", sa.String(500), nullable=True),
        sa.Column("cc", sa.Text, nullable=True),
        sa.Column("text", sa.Text, nullable=True),
        sa.Column("versandart", sa.String(50), nullable=True),
        sa.Column("versanddatum", sa.DateTime, nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="entwurf"),
        sa.Column("pdf_filename", sa.String(500), nullable=True),
        sa.Column("pdf_stored_path", sa.String(1000), nullable=True),
        sa.Column("sent_at", sa.DateTime, nullable=True),
        sa.Column("sent_by", sa.String(255), nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("updated_at", sa.DateTime, nullable=False),
    )

    op.create_table(
        "bautagesberichte",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("project_id", sa.Integer, sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("datum", sa.Date, nullable=False),
        sa.Column("wetter", sa.String(50), nullable=True),
        sa.Column("temperatur_min", sa.Float, nullable=True),
        sa.Column("temperatur_max", sa.Float, nullable=True),
        sa.Column("wind", sa.String(100), nullable=True),
        sa.Column("niederschlag", sa.String(100), nullable=True),
        sa.Column("personalanzahl", sa.Integer, nullable=True),
        sa.Column("arbeitszeit_von", sa.String(5), nullable=True),
        sa.Column("arbeitszeit_bis", sa.String(5), nullable=True),
        sa.Column("geplanter_vorgang_id", sa.Integer, sa.ForeignKey("schedule_positions.id", ondelete="SET NULL"), nullable=True),
        sa.Column("ausgefuehrter_vorgang_id", sa.Integer, sa.ForeignKey("schedule_positions.id", ondelete="SET NULL"), nullable=True),
        sa.Column("soll_menge", sa.Float, nullable=True),
        sa.Column("soll_einheit", sa.String(20), nullable=True),
        sa.Column("ist_menge", sa.Float, nullable=True),
        sa.Column("ist_einheit", sa.String(20), nullable=True),
        sa.Column("abweichung_kommentar", sa.Text, nullable=True),
        sa.Column("stoerung_vorhanden", sa.Boolean, server_default="false"),
        sa.Column("stoerung_id", sa.Integer, sa.ForeignKey("stoerungen.id", ondelete="SET NULL"), nullable=True),
        sa.Column("anordnung_vorhanden", sa.Boolean, server_default="false"),
        sa.Column("anordnung_beschreibung", sa.Text, nullable=True),
        sa.Column("allgemeine_bemerkungen", sa.Text, nullable=True),
        sa.Column("freigabestatus", sa.String(20), server_default="erstellt", nullable=False),
        sa.Column("created_by", sa.String(255), nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("updated_at", sa.DateTime, nullable=False),
        sa.UniqueConstraint("project_id", "datum", name="uq_bautagesbericht_date"),
    )

    op.create_table(
        "kausalitaeten",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("stoerung_id", sa.Integer, sa.ForeignKey("stoerungen.id", ondelete="CASCADE"), nullable=False),
        sa.Column("ereignis", sa.Text, nullable=False),
        sa.Column("verantwortungsbereich", sa.String(100), nullable=True),
        sa.Column("behinderte_leistung_id", sa.Integer, sa.ForeignKey("schedule_positions.id", ondelete="SET NULL"), nullable=True),
        sa.Column("geplante_leistung", sa.Text, nullable=True),
        sa.Column("tatsaechliche_leistung", sa.Text, nullable=True),
        sa.Column("unmittelbare_auswirkung_json", sa.Text, nullable=True),
        sa.Column("mittelbare_auswirkung", sa.Text, nullable=True),
        sa.Column("eigenverschulden_geprueft", sa.Boolean, server_default="false"),
        sa.Column("ergebnis_eigenverschulden", sa.Text, nullable=True),
        sa.Column("bewertung", sa.String(10), nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("updated_at", sa.DateTime, nullable=False),
    )

    op.create_table(
        "stoerungsanlagen",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("stoerung_id", sa.Integer, sa.ForeignKey("stoerungen.id", ondelete="CASCADE"), nullable=False),
        sa.Column("anlage_typ", sa.String(30), nullable=False, server_default="sonstiges"),
        sa.Column("filename", sa.String(500), nullable=False),
        sa.Column("stored_path", sa.String(1000), nullable=False),
        sa.Column("mime_type", sa.String(100), nullable=True),
        sa.Column("size_bytes", sa.Integer, nullable=False),
        sa.Column("beschreibung", sa.Text, nullable=True),
        sa.Column("datum", sa.DateTime, nullable=True),
        sa.Column("uploaded_by", sa.String(255), nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False),
    )


def downgrade() -> None:
    for table in [
        "stoerungsanlagen", "kausalitaeten", "bautagesberichte",
        "behinderungsanzeigen", "stoerungen", "generated_reports",
        "audit_logs", "company_settings", "email_events",
        "schedule_positions", "schedule_versions",
        "projects", "users", "companies",
    ]:
        op.drop_table(table)
