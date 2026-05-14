"""Tests for sequential comparison and PDF report endpoints."""
import json

import pytest


def _create_version(client, project_id: int, name: str = "Version"):
    r = client.post("/api/versions/", json={"project_id": project_id, "name": name})
    assert r.status_code == 201
    return r.json()


def _create_position(client, version_id: int, title: str, pos_number: str = None, **kwargs):
    payload = {"version_id": version_id, "title": title}
    if pos_number:
        payload["pos_number"] = pos_number
    payload.update(kwargs)
    r = client.post("/api/positions/", json=payload)
    assert r.status_code == 201
    return r.json()


def _create_email(client, project_id: int, date: str = "2024-06-15T12:00:00"):
    payload = {
        "project_id": project_id,
        "subject": "Baumail",
        "sender": "test@test.de",
        "email_date": date,
    }
    r = client.post("/api/emails", data={"data": json.dumps(payload)})
    assert r.status_code == 201
    return r.json()


def _compare(client, project_id: int, version_ids: list):
    return client.post(
        f"/api/projects/{project_id}/sequential-comparison",
        json={"version_ids": version_ids},
    )


# ---------------------------------------------------------------------------
# 1. POST sequential-comparison with two version IDs — returns steps list
# ---------------------------------------------------------------------------

def test_sequential_comparison_returns_200(client, project):
    v1 = _create_version(client, project["id"], "V1")
    v2 = _create_version(client, project["id"], "V2")
    r = _compare(client, project["id"], [v1["id"], v2["id"]])
    assert r.status_code == 200


def test_sequential_comparison_has_steps(client, project):
    v1 = _create_version(client, project["id"], "V1")
    v2 = _create_version(client, project["id"], "V2")
    r = _compare(client, project["id"], [v1["id"], v2["id"]])
    assert "steps" in r.json()


def test_sequential_comparison_returns_one_step_for_two_versions(client, project):
    v1 = _create_version(client, project["id"], "V1")
    v2 = _create_version(client, project["id"], "V2")
    r = _compare(client, project["id"], [v1["id"], v2["id"]])
    assert len(r.json()["steps"]) == 1


# ---------------------------------------------------------------------------
# 2. Step has correct from_version_id and to_version_id
# ---------------------------------------------------------------------------

def test_step_from_version_id(client, project):
    v1 = _create_version(client, project["id"], "V1")
    v2 = _create_version(client, project["id"], "V2")
    r = _compare(client, project["id"], [v1["id"], v2["id"]])
    step = r.json()["steps"][0]
    assert step["from_version_id"] == v1["id"]


def test_step_to_version_id(client, project):
    v1 = _create_version(client, project["id"], "V1")
    v2 = _create_version(client, project["id"], "V2")
    r = _compare(client, project["id"], [v1["id"], v2["id"]])
    step = r.json()["steps"][0]
    assert step["to_version_id"] == v2["id"]


# ---------------------------------------------------------------------------
# 3. Position added in V2 not in V1 → step has "added" entry
# ---------------------------------------------------------------------------

def test_added_position_appears_in_step(client, project):
    v1 = _create_version(client, project["id"], "V1")
    v2 = _create_version(client, project["id"], "V2")
    _create_position(client, v2["id"], "Neue Aufgabe", pos_number="1.1")
    r = _compare(client, project["id"], [v1["id"], v2["id"]])
    step = r.json()["steps"][0]
    added_titles = [e["title"] for e in step["added"]]
    assert "Neue Aufgabe" in added_titles


def test_removed_position_appears_in_step(client, project):
    v1 = _create_version(client, project["id"], "V1")
    v2 = _create_version(client, project["id"], "V2")
    _create_position(client, v1["id"], "Alte Aufgabe", pos_number="2.1")
    r = _compare(client, project["id"], [v1["id"], v2["id"]])
    step = r.json()["steps"][0]
    removed_titles = [e["title"] for e in step["removed"]]
    assert "Alte Aufgabe" in removed_titles


def test_added_entry_has_correct_change_type(client, project):
    v1 = _create_version(client, project["id"], "V1")
    v2 = _create_version(client, project["id"], "V2")
    _create_position(client, v2["id"], "Neuer Posten")
    r = _compare(client, project["id"], [v1["id"], v2["id"]])
    step = r.json()["steps"][0]
    assert all(e["change_type"] == "added" for e in step["added"])


# ---------------------------------------------------------------------------
# 4. Email event between V1 and V2 dates → appears in email_events_between
# ---------------------------------------------------------------------------

def test_email_between_versions_appears_in_step(client, project):
    v1 = _create_version(client, project["id"], "V1")
    v2 = _create_version(client, project["id"], "V2")

    # Get actual version creation timestamps from DB
    v1_data = client.get(f"/api/versions/{v1['id']}").json()

    # Create email linked explicitly to the version range via version_from/to foreign keys.
    # The reports router picks up emails where (email_date between va.created_at and vb.created_at)
    # OR (version_from_id == va.id AND version_to_id == vb.id).
    payload = {
        "project_id": project["id"],
        "subject": "Zwischenmail",
        "sender": "test@test.de",
        "email_date": v1_data["created_at"],
        "version_from_id": v1["id"],
        "version_to_id": v2["id"],
    }
    client.post("/api/emails", data={"data": json.dumps(payload)})

    r = _compare(client, project["id"], [v1["id"], v2["id"]])
    step = r.json()["steps"][0]
    email_subjects = [e["subject"] for e in step["email_events_between"]]
    assert "Zwischenmail" in email_subjects


# ---------------------------------------------------------------------------
# 5. version_ids with only 1 ID → returns 400
# ---------------------------------------------------------------------------

def test_comparison_with_single_version_returns_400(client, project):
    v1 = _create_version(client, project["id"], "V1")
    r = _compare(client, project["id"], [v1["id"]])
    assert r.status_code == 400


def test_comparison_with_empty_version_ids_returns_400_or_422(client, project):
    r = _compare(client, project["id"], [])
    assert r.status_code in (400, 422)


# ---------------------------------------------------------------------------
# PDF report endpoint — generate report then download → Content-Type application/pdf
# ---------------------------------------------------------------------------

def test_pdf_report_create_returns_201(client, project):
    pytest.importorskip("weasyprint")

    v1 = _create_version(client, project["id"], "V1")
    v2 = _create_version(client, project["id"], "V2")
    r = client.post(
        f"/api/projects/{project['id']}/reports/sequential-comparison",
        json={"version_ids": [v1["id"], v2["id"]]},
    )
    assert r.status_code == 201


def test_pdf_report_download_has_pdf_content_type(client, project):
    pytest.importorskip("weasyprint")

    v1 = _create_version(client, project["id"], "V1")
    v2 = _create_version(client, project["id"], "V2")
    report = client.post(
        f"/api/projects/{project['id']}/reports/sequential-comparison",
        json={"version_ids": [v1["id"], v2["id"]]},
    ).json()
    r = client.get(f"/api/reports/{report['id']}/download")
    assert r.status_code == 200
    assert "application/pdf" in r.headers.get("content-type", "")
