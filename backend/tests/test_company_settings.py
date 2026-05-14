"""Tests for /api/company-settings endpoints."""
import io


# ---------------------------------------------------------------------------
# 1. GET on fresh DB — returns default settings (id=1, empty company_name)
# ---------------------------------------------------------------------------

def test_get_settings_returns_200(client):
    r = client.get("/api/company-settings")
    assert r.status_code == 200


def test_get_settings_default_id_is_1(client):
    r = client.get("/api/company-settings")
    assert r.json()["id"] == 1


def test_get_settings_default_company_name_is_empty(client):
    r = client.get("/api/company-settings")
    assert r.json()["company_name"] == ""


def test_get_settings_default_has_no_logo(client):
    r = client.get("/api/company-settings")
    assert r.json()["has_logo"] is False


# ---------------------------------------------------------------------------
# 2. PUT /api/company-settings → returns updated values
# ---------------------------------------------------------------------------

def test_put_settings_returns_200(client):
    r = client.put("/api/company-settings", json={"company_name": "Bauhaus GmbH"})
    assert r.status_code == 200


def test_put_settings_updates_company_name(client):
    client.put("/api/company-settings", json={"company_name": "Bauhaus GmbH"})
    r = client.get("/api/company-settings")
    assert r.json()["company_name"] == "Bauhaus GmbH"


def test_put_settings_updates_phone(client):
    client.put("/api/company-settings", json={"phone": "+49 30 12345678"})
    r = client.get("/api/company-settings")
    assert r.json()["phone"] == "+49 30 12345678"


# ---------------------------------------------------------------------------
# 3. PUT twice — no duplicate rows (still id=1)
# ---------------------------------------------------------------------------

def test_put_settings_twice_still_id_1(client):
    client.put("/api/company-settings", json={"company_name": "First"})
    client.put("/api/company-settings", json={"company_name": "Second"})
    r = client.get("/api/company-settings")
    assert r.json()["id"] == 1


def test_put_settings_twice_last_value_wins(client):
    client.put("/api/company-settings", json={"company_name": "First"})
    client.put("/api/company-settings", json={"company_name": "Second"})
    r = client.get("/api/company-settings")
    assert r.json()["company_name"] == "Second"


# ---------------------------------------------------------------------------
# 4. POST /api/company-settings/logo with PNG → returns has_logo=True
# ---------------------------------------------------------------------------

_MINIMAL_PNG = (
    b"\x89PNG\r\n\x1a\n"
    b"\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02"
    b"\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00"
    b"\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82"
)


def test_upload_logo_returns_200(client):
    r = client.post(
        "/api/company-settings/logo",
        files={"file": ("logo.png", io.BytesIO(_MINIMAL_PNG), "image/png")},
    )
    assert r.status_code == 200


def test_upload_logo_sets_has_logo_true(client):
    client.post(
        "/api/company-settings/logo",
        files={"file": ("logo.png", io.BytesIO(_MINIMAL_PNG), "image/png")},
    )
    r = client.get("/api/company-settings")
    assert r.json()["has_logo"] is True


def test_upload_logo_stores_filename(client):
    client.post(
        "/api/company-settings/logo",
        files={"file": ("mylogo.png", io.BytesIO(_MINIMAL_PNG), "image/png")},
    )
    r = client.get("/api/company-settings")
    assert r.json()["logo_filename"] == "mylogo.png"


def test_upload_invalid_extension_returns_400(client):
    r = client.post(
        "/api/company-settings/logo",
        files={"file": ("script.exe", io.BytesIO(b"not an image"), "application/octet-stream")},
    )
    assert r.status_code == 400


# ---------------------------------------------------------------------------
# 5. GET /api/company-settings/logo after upload → 200 with image bytes
# ---------------------------------------------------------------------------

def test_get_logo_after_upload_returns_200(client):
    client.post(
        "/api/company-settings/logo",
        files={"file": ("logo.png", io.BytesIO(_MINIMAL_PNG), "image/png")},
    )
    r = client.get("/api/company-settings/logo")
    assert r.status_code == 200


def test_get_logo_returns_correct_bytes(client):
    client.post(
        "/api/company-settings/logo",
        files={"file": ("logo.png", io.BytesIO(_MINIMAL_PNG), "image/png")},
    )
    r = client.get("/api/company-settings/logo")
    assert r.content == _MINIMAL_PNG


# ---------------------------------------------------------------------------
# 6. DELETE /api/company-settings/logo → has_logo=False
# ---------------------------------------------------------------------------

def test_delete_logo_returns_204(client):
    client.post(
        "/api/company-settings/logo",
        files={"file": ("logo.png", io.BytesIO(_MINIMAL_PNG), "image/png")},
    )
    r = client.delete("/api/company-settings/logo")
    assert r.status_code == 204


def test_delete_logo_sets_has_logo_false(client):
    client.post(
        "/api/company-settings/logo",
        files={"file": ("logo.png", io.BytesIO(_MINIMAL_PNG), "image/png")},
    )
    client.delete("/api/company-settings/logo")
    r = client.get("/api/company-settings")
    assert r.json()["has_logo"] is False


# ---------------------------------------------------------------------------
# 7. GET /api/company-settings/logo after delete → 404
# ---------------------------------------------------------------------------

def test_get_logo_after_delete_returns_404(client):
    client.post(
        "/api/company-settings/logo",
        files={"file": ("logo.png", io.BytesIO(_MINIMAL_PNG), "image/png")},
    )
    client.delete("/api/company-settings/logo")
    r = client.get("/api/company-settings/logo")
    assert r.status_code == 404


def test_get_logo_on_fresh_db_returns_404(client):
    r = client.get("/api/company-settings/logo")
    assert r.status_code == 404
