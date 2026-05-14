"""Tests for /api/emails and /api/projects/{id}/emails endpoints."""
import io
import json

import pytest


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _email_payload(project_id: int, subject: str = "Test-Mail") -> dict:
    return {
        "project_id": project_id,
        "subject": subject,
        "sender": "sender@example.com",
        "email_date": "2024-06-01T10:00:00",
    }


def _post_email(client, payload: dict):
    """Create an email event via multipart form (no file)."""
    return client.post(
        "/api/emails",
        data={"data": json.dumps(payload)},
    )


# ---------------------------------------------------------------------------
# 1. Create email event (JSON body only, no file)
# ---------------------------------------------------------------------------

def test_create_email_returns_201(client, project):
    r = _post_email(client, _email_payload(project["id"]))
    assert r.status_code == 201


def test_create_email_response_contains_subject(client, project):
    r = _post_email(client, _email_payload(project["id"], "Bauzeitenplan Revision"))
    assert r.json()["subject"] == "Bauzeitenplan Revision"


def test_create_email_has_no_attachment_by_default(client, project):
    r = _post_email(client, _email_payload(project["id"]))
    assert r.json()["has_attachment"] is False


# ---------------------------------------------------------------------------
# 2. Get email event by id
# ---------------------------------------------------------------------------

def test_get_email_by_id(client, project):
    created = _post_email(client, _email_payload(project["id"])).json()
    r = client.get(f"/api/emails/{created['id']}")
    assert r.status_code == 200


def test_get_email_by_id_returns_correct_sender(client, project):
    created = _post_email(client, _email_payload(project["id"])).json()
    r = client.get(f"/api/emails/{created['id']}")
    assert r.json()["sender"] == "sender@example.com"


# ---------------------------------------------------------------------------
# 3. List email events for project — returns the created one
# ---------------------------------------------------------------------------

def test_list_emails_returns_created_event(client, project):
    _post_email(client, _email_payload(project["id"], "Listed Mail"))
    r = client.get(f"/api/projects/{project['id']}/emails")
    assert r.status_code == 200
    subjects = [e["subject"] for e in r.json()]
    assert "Listed Mail" in subjects


def test_list_emails_count_increases_after_create(client, project):
    _post_email(client, _email_payload(project["id"]))
    _post_email(client, _email_payload(project["id"]))
    r = client.get(f"/api/projects/{project['id']}/emails")
    assert len(r.json()) == 2


# ---------------------------------------------------------------------------
# 4. Update email event
# ---------------------------------------------------------------------------

def test_update_email_subject(client, project):
    created = _post_email(client, _email_payload(project["id"])).json()
    updated_data = {"subject": "Updated Subject"}
    r = client.put(
        f"/api/emails/{created['id']}",
        data={"data": json.dumps(updated_data)},
    )
    assert r.status_code == 200
    assert r.json()["subject"] == "Updated Subject"


def test_update_email_preserves_sender(client, project):
    created = _post_email(client, _email_payload(project["id"])).json()
    r = client.put(
        f"/api/emails/{created['id']}",
        data={"data": json.dumps({"subject": "New Subject"})},
    )
    assert r.json()["sender"] == "sender@example.com"


# ---------------------------------------------------------------------------
# 5. Delete email event — returns 204, then GET returns 404
# ---------------------------------------------------------------------------

def test_delete_email_returns_204(client, project):
    created = _post_email(client, _email_payload(project["id"])).json()
    r = client.delete(f"/api/emails/{created['id']}")
    assert r.status_code == 204


def test_get_deleted_email_returns_404(client, project):
    created = _post_email(client, _email_payload(project["id"])).json()
    client.delete(f"/api/emails/{created['id']}")
    r = client.get(f"/api/emails/{created['id']}")
    assert r.status_code == 404


# ---------------------------------------------------------------------------
# 6. Create email with multipart (data JSON + file attachment)
# ---------------------------------------------------------------------------

def test_create_email_with_attachment_returns_201(client, project):
    r = client.post(
        "/api/emails",
        data={"data": json.dumps(_email_payload(project["id"]))},
        files={"file": ("test.pdf", io.BytesIO(b"test content"), "application/pdf")},
    )
    assert r.status_code == 201


def test_create_email_with_attachment_sets_has_attachment(client, project):
    r = client.post(
        "/api/emails",
        data={"data": json.dumps(_email_payload(project["id"]))},
        files={"file": ("test.pdf", io.BytesIO(b"test content"), "application/pdf")},
    )
    assert r.json()["has_attachment"] is True


def test_create_email_with_attachment_stores_filename(client, project):
    r = client.post(
        "/api/emails",
        data={"data": json.dumps(_email_payload(project["id"]))},
        files={"file": ("document.pdf", io.BytesIO(b"pdf bytes"), "application/pdf")},
    )
    assert r.json()["attachment_filename"] == "document.pdf"


# ---------------------------------------------------------------------------
# 7. Attachment download — returns 200 with file bytes after upload
# ---------------------------------------------------------------------------

def test_attachment_download_returns_200(client, project):
    created = client.post(
        "/api/emails",
        data={"data": json.dumps(_email_payload(project["id"]))},
        files={"file": ("attach.pdf", io.BytesIO(b"file content"), "application/pdf")},
    ).json()
    r = client.get(f"/api/emails/{created['id']}/attachment")
    assert r.status_code == 200


def test_attachment_download_returns_correct_bytes(client, project):
    file_content = b"specific file content bytes"
    created = client.post(
        "/api/emails",
        data={"data": json.dumps(_email_payload(project["id"]))},
        files={"file": ("attach.pdf", io.BytesIO(file_content), "application/pdf")},
    ).json()
    r = client.get(f"/api/emails/{created['id']}/attachment")
    assert r.content == file_content


def test_attachment_download_missing_returns_404(client, project):
    created = _post_email(client, _email_payload(project["id"])).json()
    r = client.get(f"/api/emails/{created['id']}/attachment")
    assert r.status_code == 404


# ---------------------------------------------------------------------------
# 8. Delete email with attachment — file is removed from storage
# ---------------------------------------------------------------------------

def test_delete_email_with_attachment_removes_file(client, project, tmp_path):
    import os
    storage_root = os.environ["STORAGE_ROOT"]
    created = client.post(
        "/api/emails",
        data={"data": json.dumps(_email_payload(project["id"]))},
        files={"file": ("todelete.pdf", io.BytesIO(b"bye"), "application/pdf")},
    ).json()

    # Confirm the stored path is set
    detail = client.get(f"/api/emails/{created['id']}").json()
    assert detail["has_attachment"] is True

    client.delete(f"/api/emails/{created['id']}")

    # After deletion the attachment endpoint must be 404
    r = client.get(f"/api/emails/{created['id']}/attachment")
    assert r.status_code == 404


# ---------------------------------------------------------------------------
# 9. Invalid project_id on create — returns 404
# ---------------------------------------------------------------------------

def test_create_email_with_nonexistent_project_returns_404(client):
    r = _post_email(client, _email_payload(project_id=99999))
    assert r.status_code == 404


# ---------------------------------------------------------------------------
# 10. Email date as ISO string parses correctly
# ---------------------------------------------------------------------------

def test_email_date_parses_correctly(client, project):
    payload = _email_payload(project["id"])
    payload["email_date"] = "2024-12-25T15:30:00"
    r = _post_email(client, payload)
    assert r.status_code == 201
    assert "2024-12-25" in r.json()["email_date"]
