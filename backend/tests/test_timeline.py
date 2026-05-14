"""Tests for GET /api/projects/{project_id}/timeline."""
import json


def _create_email(client, project_id: int, subject: str = "Mail", date: str = "2024-06-15T10:00:00"):
    payload = {
        "project_id": project_id,
        "subject": subject,
        "sender": "test@example.com",
        "email_date": date,
    }
    return client.post("/api/emails", data={"data": json.dumps(payload)})


# ---------------------------------------------------------------------------
# 1. Empty project — returns an events list (empty, no versions yet)
# ---------------------------------------------------------------------------

def test_timeline_empty_project_returns_empty_list(client, project):
    r = client.get(f"/api/projects/{project['id']}/timeline")
    assert r.status_code == 200
    assert r.json()["events"] == []


def test_timeline_with_version_returns_one_event(client, project, version):
    r = client.get(f"/api/projects/{project['id']}/timeline")
    assert len(r.json()["events"]) == 1


# ---------------------------------------------------------------------------
# 2. Version + email → both appear, sorted by date
# ---------------------------------------------------------------------------

def test_timeline_returns_both_version_and_email(client, project, version):
    _create_email(client, project["id"])
    r = client.get(f"/api/projects/{project['id']}/timeline")
    event_types = {e["event_type"] for e in r.json()["events"]}
    assert "version" in event_types
    assert "email" in event_types


def test_timeline_events_sorted_by_date(client, project, version):
    # Email in the future relative to the version creation
    _create_email(client, project["id"], date="2099-01-01T00:00:00")
    events = client.get(f"/api/projects/{project['id']}/timeline").json()["events"]
    dates = [e["event_date"] for e in events]
    assert dates == sorted(dates)


def test_timeline_event_count_matches_created_items(client, project, version):
    _create_email(client, project["id"])
    _create_email(client, project["id"])
    r = client.get(f"/api/projects/{project['id']}/timeline")
    # 1 version + 2 emails
    assert len(r.json()["events"]) == 3


# ---------------------------------------------------------------------------
# 3. Version event has event_type="version" and icon="gantt"
# ---------------------------------------------------------------------------

def test_version_event_type(client, project, version):
    events = client.get(f"/api/projects/{project['id']}/timeline").json()["events"]
    version_events = [e for e in events if e["event_type"] == "version"]
    assert len(version_events) == 1


def test_version_event_icon_is_gantt(client, project, version):
    events = client.get(f"/api/projects/{project['id']}/timeline").json()["events"]
    version_event = next(e for e in events if e["event_type"] == "version")
    assert version_event["icon"] == "gantt"


# ---------------------------------------------------------------------------
# 4. Email event has event_type="email" and icon="mail"
# ---------------------------------------------------------------------------

def test_email_event_type(client, project, version):
    _create_email(client, project["id"])
    events = client.get(f"/api/projects/{project['id']}/timeline").json()["events"]
    email_events = [e for e in events if e["event_type"] == "email"]
    assert len(email_events) == 1


def test_email_event_icon_is_mail(client, project, version):
    _create_email(client, project["id"])
    events = client.get(f"/api/projects/{project['id']}/timeline").json()["events"]
    email_event = next(e for e in events if e["event_type"] == "email")
    assert email_event["icon"] == "mail"


def test_email_event_title_matches_subject(client, project):
    _create_email(client, project["id"], subject="Bauzeitenplanübergabe")
    events = client.get(f"/api/projects/{project['id']}/timeline").json()["events"]
    email_event = next(e for e in events if e["event_type"] == "email")
    assert email_event["title"] == "Bauzeitenplanübergabe"


# ---------------------------------------------------------------------------
# 5. Non-existent project — returns 404
# ---------------------------------------------------------------------------

def test_timeline_nonexistent_project_returns_404(client):
    r = client.get("/api/projects/99999/timeline")
    assert r.status_code == 404
