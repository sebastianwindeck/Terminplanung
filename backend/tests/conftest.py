import os

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.database import Base, get_db
from app import models


@pytest.fixture(scope="function")
def db_engine(tmp_path):
    db_path = tmp_path / "test.db"
    engine = create_engine(
        f"sqlite:///{db_path}",
        connect_args={"check_same_thread": False},
    )
    Base.metadata.create_all(bind=engine)
    yield engine
    engine.dispose()


@pytest.fixture(scope="function")
def db_session(db_engine):
    SessionLocal = sessionmaker(bind=db_engine)
    session = SessionLocal()
    yield session
    session.close()


@pytest.fixture(scope="function")
def client(db_engine, tmp_path):
    SessionLocal = sessionmaker(bind=db_engine)
    storage_root = tmp_path / "storage"
    storage_root.mkdir()
    for d in ["email_attachments", "company", "reports"]:
        (storage_root / d).mkdir()
    os.environ["STORAGE_ROOT"] = str(storage_root)

    def override_get_db():
        session = SessionLocal()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def project(client):
    r = client.post("/api/projects/", json={"name": "Testprojekt", "project_number": "TP-001"})
    assert r.status_code == 201
    return r.json()


@pytest.fixture
def version(client, project):
    r = client.post("/api/versions/", json={"project_id": project["id"], "name": "V1"})
    assert r.status_code == 201
    return r.json()
