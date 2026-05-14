"""Tests for MSPDI import/export endpoints."""
import io

import pytest


SAMPLE_MSPDI = """<?xml version="1.0" encoding="UTF-8"?>
<Project xmlns="http://schemas.microsoft.com/project">
  <Tasks>
    <Task>
      <UID>1</UID>
      <Name>Baugrube ausheben</Name>
      <OutlineNumber>1</OutlineNumber>
      <OutlineLevel>1</OutlineLevel>
      <Start>2024-03-01T08:00:00</Start>
      <Finish>2024-03-15T17:00:00</Finish>
      <Duration>PT120H0M0S</Duration>
      <Milestone>0</Milestone>
      <PercentComplete>50</PercentComplete>
    </Task>
    <Task>
      <UID>2</UID>
      <Name>Fundament giessen</Name>
      <OutlineNumber>2</OutlineNumber>
      <OutlineLevel>1</OutlineLevel>
      <Start>2024-03-16T08:00:00</Start>
      <Finish>2024-03-31T17:00:00</Finish>
      <Duration>PT120H0M0S</Duration>
      <Milestone>0</Milestone>
      <PercentComplete>0</PercentComplete>
    </Task>
    <Task>
      <UID>3</UID>
      <Name>Meilenstein: Rohbau fertig</Name>
      <OutlineNumber>3</OutlineNumber>
      <OutlineLevel>1</OutlineLevel>
      <Start>2024-04-01T08:00:00</Start>
      <Finish>2024-04-01T08:00:00</Finish>
      <Duration>PT0H0M0S</Duration>
      <Milestone>1</Milestone>
      <PercentComplete>0</PercentComplete>
    </Task>
  </Tasks>
</Project>""".encode("utf-8")

INVALID_XML = b"<not valid xml <<<<"


def _import(client, project_id: int, xml: bytes = SAMPLE_MSPDI, version_name: str = "Test Import"):
    return client.post(
        "/api/mspdi/import",
        data={"project_id": str(project_id), "version_name": version_name},
        files={"file": ("plan.xml", io.BytesIO(xml), "application/xml")},
    )


# ---------------------------------------------------------------------------
# 1. POST /api/mspdi/import returns positions_created=3, skipped=0
# ---------------------------------------------------------------------------

def test_import_returns_201(client, project):
    r = _import(client, project["id"])
    assert r.status_code == 201


def test_import_positions_created_count(client, project):
    r = _import(client, project["id"])
    assert r.json()["positions_created"] == 3


def test_import_skipped_count_is_zero(client, project):
    r = _import(client, project["id"])
    assert r.json()["skipped"] == 0


def test_import_returns_version_id(client, project):
    r = _import(client, project["id"])
    assert "version_id" in r.json()
    assert r.json()["version_id"] > 0


# ---------------------------------------------------------------------------
# 2. After import, positions endpoint returns 3 positions for the new version
# ---------------------------------------------------------------------------

def test_import_creates_positions_in_db(client, project):
    result = _import(client, project["id"]).json()
    version_id = result["version_id"]
    r = client.get(f"/api/positions/version/{version_id}")
    assert r.status_code == 200
    assert len(r.json()) == 3


# ---------------------------------------------------------------------------
# 3. Milestone task has is_milestone=True
# ---------------------------------------------------------------------------

def test_import_milestone_flag(client, project):
    result = _import(client, project["id"]).json()
    version_id = result["version_id"]
    positions = client.get(f"/api/positions/version/{version_id}").json()
    milestone_positions = [p for p in positions if p["is_milestone"] is True]
    assert len(milestone_positions) == 1


def test_import_milestone_title(client, project):
    result = _import(client, project["id"]).json()
    version_id = result["version_id"]
    positions = client.get(f"/api/positions/version/{version_id}").json()
    milestone = next(p for p in positions if p["is_milestone"] is True)
    assert "Meilenstein" in milestone["title"]


# ---------------------------------------------------------------------------
# 4. PercentComplete=50 → progress=0.5
# ---------------------------------------------------------------------------

def test_import_progress_mapping(client, project):
    result = _import(client, project["id"]).json()
    version_id = result["version_id"]
    positions = client.get(f"/api/positions/version/{version_id}").json()
    baugrube = next(p for p in positions if "Baugrube" in p["title"])
    assert baugrube["progress"] == pytest.approx(0.5)


def test_import_zero_progress_remains_zero(client, project):
    result = _import(client, project["id"]).json()
    version_id = result["version_id"]
    positions = client.get(f"/api/positions/version/{version_id}").json()
    fundament = next(p for p in positions if "Fundament" in p["title"])
    assert fundament["progress"] == pytest.approx(0.0)


# ---------------------------------------------------------------------------
# 5. Export: GET /api/mspdi/export/{version_id} returns XML bytes
# ---------------------------------------------------------------------------

def test_export_returns_200(client, project):
    result = _import(client, project["id"]).json()
    r = client.get(f"/api/mspdi/export/{result['version_id']}")
    assert r.status_code == 200


def test_export_returns_xml_content_type(client, project):
    result = _import(client, project["id"]).json()
    r = client.get(f"/api/mspdi/export/{result['version_id']}")
    assert "xml" in r.headers["content-type"]


def test_export_content_starts_with_xml_declaration_or_project(client, project):
    result = _import(client, project["id"]).json()
    r = client.get(f"/api/mspdi/export/{result['version_id']}")
    content = r.content
    assert content.startswith(b"<?xml") or content.lstrip().startswith(b"<Project")


# ---------------------------------------------------------------------------
# 6. Export XML contains task names from original positions
# ---------------------------------------------------------------------------

def test_export_contains_task_names(client, project):
    result = _import(client, project["id"]).json()
    r = client.get(f"/api/mspdi/export/{result['version_id']}")
    assert b"Baugrube ausheben" in r.content


def test_export_contains_milestone_name(client, project):
    result = _import(client, project["id"]).json()
    r = client.get(f"/api/mspdi/export/{result['version_id']}")
    assert "Meilenstein" in r.content.decode("utf-8", errors="replace")


# ---------------------------------------------------------------------------
# 7. Invalid XML body → returns 400 or creates 0 positions
# ---------------------------------------------------------------------------

def test_import_invalid_xml_does_not_crash(client, project):
    r = _import(client, project["id"], xml=INVALID_XML)
    # Either a 400 error or a 201 with 0 positions created is acceptable
    if r.status_code == 201:
        assert r.json()["positions_created"] == 0
    else:
        assert r.status_code in (400, 422)


def test_import_nonexistent_project_returns_404(client):
    r = _import(client, project_id=99999)
    assert r.status_code == 404
