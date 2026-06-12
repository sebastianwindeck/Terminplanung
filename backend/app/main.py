import os
import sqlite3
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .database import engine, Base
from .routers import projects, versions, positions
from .routers import emails, timeline, mspdi, reports, company_settings
from .routers import stoerungen, behinderungsanzeigen, bautagesberichte, kausalitaeten, stoerungsanlagen, stoerungs_reports
from .routers import auth, companies, users, dashboard, ai, inbound_email


def _apply_sqlite_migrations() -> None:
    """Add missing columns to existing SQLite databases."""
    db_path = settings.database_url.replace("sqlite:///", "").replace("sqlite:////", "/")
    if not Path(db_path).exists():
        return
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    def _has_column(table: str, col: str) -> bool:
        cur.execute(f"PRAGMA table_info({table})")
        return any(row[1] == col for row in cur.fetchall())

    migrations = [
        ("schedule_positions", "typ", "ALTER TABLE schedule_positions ADD COLUMN typ TEXT NOT NULL DEFAULT 'vorgang'"),
        ("schedule_positions", "behinderung_aktiv", "ALTER TABLE schedule_positions ADD COLUMN behinderung_aktiv BOOLEAN NOT NULL DEFAULT 0"),
        ("schedule_positions", "behinderung_beginn", "ALTER TABLE schedule_positions ADD COLUMN behinderung_beginn DATETIME"),
        ("schedule_positions", "behinderung_tage_gesamt", "ALTER TABLE schedule_positions ADD COLUMN behinderung_tage_gesamt INTEGER NOT NULL DEFAULT 0"),
        ("projects", "email_token", "UPDATE projects SET email_token = hex(randomblob(32)) WHERE email_token IS NULL OR email_token = ''"),
    ]

    # Ensure email_token column exists first
    if not _has_column("projects", "email_token"):
        cur.execute("ALTER TABLE projects ADD COLUMN email_token TEXT")
        cur.execute("UPDATE projects SET email_token = hex(randomblob(32))")

    for table, col, sql in migrations:
        if table == "projects" and col == "email_token":
            continue  # handled above
        if not _has_column(table, col):
            cur.execute(sql)

    conn.commit()
    conn.close()


# Bootstrap tables + apply migrations
Base.metadata.create_all(bind=engine)
if settings.database_url.startswith("sqlite"):
    _apply_sqlite_migrations()

app = FastAPI(title=settings.app_title, version=settings.app_version)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(projects.router, prefix="/api")
app.include_router(versions.router, prefix="/api")
app.include_router(positions.router, prefix="/api")
app.include_router(emails.router, prefix="/api")
app.include_router(timeline.router, prefix="/api")
app.include_router(mspdi.router, prefix="/api")
app.include_router(reports.router, prefix="/api")
app.include_router(company_settings.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(companies.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")

app.include_router(stoerungen.router, prefix="/api/v1")
app.include_router(behinderungsanzeigen.router, prefix="/api/v1")
app.include_router(bautagesberichte.router, prefix="/api/v1")
app.include_router(kausalitaeten.router, prefix="/api/v1")
app.include_router(stoerungsanlagen.router, prefix="/api/v1")
app.include_router(stoerungs_reports.router, prefix="/api/v1")
app.include_router(ai.router, prefix="/api/v1")
app.include_router(inbound_email.router, prefix="/api/v1")


@app.on_event("startup")
def create_storage_dirs() -> None:
    storage_root = Path(os.getenv("STORAGE_ROOT", "/app/storage"))
    for subdir in ["email_attachments", "company", "reports", "stoerungsanlagen"]:
        (storage_root / subdir).mkdir(parents=True, exist_ok=True)


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok", "version": settings.app_version}
