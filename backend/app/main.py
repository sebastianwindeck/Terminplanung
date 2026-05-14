import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .database import engine, Base
from .routers import projects, versions, positions
from .routers import emails, timeline, mspdi, reports, company_settings

Base.metadata.create_all(bind=engine)

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


@app.on_event("startup")
def create_storage_dirs() -> None:
    storage_root = Path(os.getenv("STORAGE_ROOT", "/app/storage"))
    for subdir in ["email_attachments", "company", "reports"]:
        (storage_root / subdir).mkdir(parents=True, exist_ok=True)


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok", "version": settings.app_version}
