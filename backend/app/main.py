from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .database import engine, Base
from .routers import projects, versions, positions

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


@app.get("/api/health")
def health():
    return {"status": "ok", "version": settings.app_version}
