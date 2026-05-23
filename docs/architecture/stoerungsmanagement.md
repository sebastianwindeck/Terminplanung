# Architecture: Störungsmanagement Module

**Status:** Draft v1.0 — 2026-05-22
**Audience:** Backend / Frontend engineers, Product owner

---

## 1. Module Overview

The Störungsmanagement (construction disruption management) module is a **new bounded context** layered on top of the existing Terminplanung application. It reuses the existing `Project` and `SchedulePosition` aggregates as **read-only references** (no schema changes to those tables) and introduces five new aggregates plus their dedicated routers, services, and PDF templates.

### Integration Diagram (ASCII)

```
                  +---------------------------------------------------+
                  |                    Frontend (React)               |
                  |  /projects/:id/stoerungen        (new routes)     |
                  |  /projects/:id/bautagesberichte  (new routes)     |
                  |  Tanstack Query hooks: useStoerungen, ...         |
                  +-------------------------+-------------------------+
                                            | HTTP JSON / multipart
                                            v
+-----------------------------------------------------------------------------+
|                            FastAPI app (backend)                            |
|                                                                             |
|  Existing routers             NEW routers (prefix /api/v1)                 |
|  ----------------             -----------------------------------           |
|  projects, versions,          stoerungen    (events)                       |
|  positions, emails,           behinderungs- (notification documents)       |
|  timeline, mspdi,             anzeigen                                     |
|  reports, company             bautages-     (daily reports)                |
|                               berichte                                     |
|                               kausalitaeten (causality, MVP-light)         |
|                               stoerungsanlagen (attachments)               |
|                               stoerungs-reports (Störungsakte PDF)         |
|                                                                             |
|  services/                                                                  |
|  ---------                                                                  |
|  storage.py            (existing — reused)                                  |
|  pdf_report.py         (existing — minor extensions)                        |
|  stoerung_compute.py   (NEW — Nachweis-Ampel, status transitions)           |
|  stoerung_immutable.py (NEW — Behinderungsanzeige lock policy)              |
+-----------------------------------------------------------------------------+
     |                              |                              |
     v                              v                              v
+----------------+      +----------------------+      +-----------------------+
|  SQLite        |      |  STORAGE_ROOT/       |      |  WeasyPrint           |
|  terminplanung |      |    stoerungs_anlagen |      |  reports/templates/   |
|  .db           |      |    behinderungs_     |      |    stoerungsakte.html  |
|                |      |    anzeigen/...      |      |    bautagesbericht.h  |
|  (existing +   |      |    bautagesberichte/ |      |    behinderungsanz.h  |
|   new tables)  |      |                      |      |                       |
+----------------+      +----------------------+      +-----------------------+
```

### Relation to existing aggregates

- `Project` → 1:N `Stoerung` (new FK `stoerungen.project_id`)
- `SchedulePosition` → referenced by FK from `Stoerung`, `Bautagesbericht`, `Kausalitaet`
- `EmailEvent` — not structurally coupled; a sent Behinderungsanzeige creates an EmailEvent as a side effect

---

## 2. Database Schema

All new tables in `backend/app/models.py`. SQLAlchemy 2.0 `Mapped[]` style. **No alterations** to existing tables (additive-only migration).

### 2.1 `stoerungen` — Störungsereignis

```python
class Stoerung(Base):
    __tablename__ = "stoerungen"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    project_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)

    # Identification (B-M-01)
    stoerung_number: Mapped[str] = mapped_column(String(50), nullable=False)
    # Format: STR-{project_id}-{YYYY}-{NNNN}; unique per project

    titel: Mapped[str] = mapped_column(String(500), nullable=False)
    stoerungsart: Mapped[str] = mapped_column(String(100), nullable=False)
    unterkategorie: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    beschreibung: Mapped[str] = mapped_column(Text, nullable=False)

    stoerungsbeginn: Mapped[datetime] = mapped_column(DateTime, nullable=False, index=True)
    kenntniszeitpunkt: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    stoerungsende: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    verantwortungsbereich: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    verursacher: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    betroffener_bereich: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Terminplanbezug (drives Nachweis-Ampel — B-M-07)
    betroffener_vorgang_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("schedule_positions.id", ondelete="RESTRICT"),
        nullable=False, index=True)
    betroffene_lv_position_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("schedule_positions.id", ondelete="SET NULL"), nullable=True)

    hindernde_wirkung: Mapped[str] = mapped_column(Text, nullable=False)  # B-M-08
    leistungsbereitschaft: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    # 'ja' | 'nein' | 'teilweise'
    ausweichleistung_moeglich: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    sofortmassnahme: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    erforderliche_mitwirkung_ag: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    status: Mapped[str] = mapped_column(String(40), nullable=False, default="entwurf", index=True)
    kritikalitaet: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    # 'niedrig' | 'mittel' | 'hoch' | 'kritisch'

    created_by: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow,
                                                 onupdate=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("project_id", "stoerung_number"),
        Index("ix_stoerungen_project_status", "project_id", "status"),
    )

    # Relationships (uni-directional — no back_populates on existing models)
    project: Mapped["Project"] = relationship("Project")
    betroffener_vorgang: Mapped["SchedulePosition"] = relationship(
        "SchedulePosition", foreign_keys=[betroffener_vorgang_id])
    anzeigen: Mapped[list["Behinderungsanzeige"]] = relationship(
        "Behinderungsanzeige", back_populates="stoerung", cascade="all, delete-orphan")
    anlagen: Mapped[list["Stoerungsanlage"]] = relationship(
        "Stoerungsanlage", back_populates="stoerung", cascade="all, delete-orphan")
    kausalitaeten: Mapped[list["Kausalitaet"]] = relationship(
        "Kausalitaet", back_populates="stoerung", cascade="all, delete-orphan")
```

### 2.2 `behinderungsanzeigen` — Notification document (IMMUTABLE after send)

```python
class Behinderungsanzeige(Base):
    __tablename__ = "behinderungsanzeigen"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    stoerung_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("stoerungen.id", ondelete="CASCADE"), nullable=False, index=True)
    typ: Mapped[str] = mapped_column(String(30), nullable=False)
    # 'erstanzeige' | 'zwischenmeldung' | 'abmeldung'

    adressat: Mapped[str] = mapped_column(String(500), nullable=False)
    cc: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    # Editable until status='versendet'. After: immutable.

    versandart: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    versanddatum: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="entwurf")
    # 'entwurf' | 'freigegeben' | 'versendet'

    # Frozen snapshot (populated on send, never updated after)
    pdf_filename: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    pdf_stored_path: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    pdf_sha256: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow,
                                                 onupdate=datetime.utcnow)

    stoerung: Mapped["Stoerung"] = relationship("Stoerung", back_populates="anzeigen")
    anlage_links: Mapped[list["BehinderungsanzeigeAnlage"]] = relationship(
        "BehinderungsanzeigeAnlage", back_populates="anzeige", cascade="all, delete-orphan")
```

### 2.3 `behinderungsanzeige_anlagen` — M2M link

```python
class BehinderungsanzeigeAnlage(Base):
    __tablename__ = "behinderungsanzeige_anlagen"

    anzeige_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("behinderungsanzeigen.id", ondelete="CASCADE"), primary_key=True)
    anlage_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("stoerungsanlagen.id", ondelete="CASCADE"), primary_key=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
```

### 2.4 `bautagesberichte` — Daily construction report

```python
class Bautagesbericht(Base):
    __tablename__ = "bautagesberichte"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    project_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    datum: Mapped[date] = mapped_column(Date, nullable=False, index=True)

    wetter: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    temperatur_min: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    temperatur_max: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    wind: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    niederschlag: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    personalanzahl: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    arbeitszeit_von: Mapped[Optional[str]] = mapped_column(String(5), nullable=True)
    arbeitszeit_bis: Mapped[Optional[str]] = mapped_column(String(5), nullable=True)

    geplanter_vorgang_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("schedule_positions.id", ondelete="SET NULL"), nullable=True)
    ausgefuehrter_vorgang_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("schedule_positions.id", ondelete="SET NULL"), nullable=True)

    soll_menge: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    soll_einheit: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    ist_menge: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    ist_einheit: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    abweichung_kommentar: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    stoerung_vorhanden: Mapped[bool] = mapped_column(Boolean, default=False)
    stoerung_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("stoerungen.id", ondelete="SET NULL"), nullable=True)

    anordnung_vorhanden: Mapped[bool] = mapped_column(Boolean, default=False)
    anordnung_beschreibung: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    freigabestatus: Mapped[str] = mapped_column(String(20), default="erstellt", nullable=False)
    # 'erstellt' | 'geprueft' | 'freigegeben'

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow,
                                                 onupdate=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("project_id", "datum", name="uq_bautagesbericht_project_date"),
    )
```

### 2.5 `kausalitaeten` — Causality (MVP-light)

```python
class Kausalitaet(Base):
    __tablename__ = "kausalitaeten"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    stoerung_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("stoerungen.id", ondelete="CASCADE"), nullable=False, index=True)
    ereignis: Mapped[str] = mapped_column(Text, nullable=False)
    verantwortungsbereich: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    behinderte_leistung_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("schedule_positions.id", ondelete="SET NULL"), nullable=True)
    geplante_leistung: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    tatsaechliche_leistung: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    unmittelbare_auswirkung_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    # JSON list[str]
    mittelbare_auswirkung: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    eigenverschulden_geprueft: Mapped[bool] = mapped_column(Boolean, default=False)
    ergebnis_eigenverschulden: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    bewertung: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    # 'gruen' | 'gelb' | 'rot'

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow,
                                                 onupdate=datetime.utcnow)

    stoerung: Mapped["Stoerung"] = relationship("Stoerung", back_populates="kausalitaeten")
```

### 2.6 `stoerungsanlagen` — File attachments

```python
class Stoerungsanlage(Base):
    __tablename__ = "stoerungsanlagen"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    stoerung_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("stoerungen.id", ondelete="CASCADE"), nullable=False, index=True)
    anlage_typ: Mapped[str] = mapped_column(String(30), nullable=False)
    # 'foto' | 'email' | 'protokoll' | 'plan' | 'tagesbericht' | 'sonstiges'
    filename: Mapped[str] = mapped_column(String(500), nullable=False)
    stored_path: Mapped[str] = mapped_column(String(1000), nullable=False)
    mime_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    beschreibung: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    # Required when anlage_typ='foto' — enforced at Pydantic level
    datum: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    stoerung: Mapped["Stoerung"] = relationship("Stoerung", back_populates="anlagen")
    anzeige_links: Mapped[list["BehinderungsanzeigeAnlage"]] = relationship(
        "BehinderungsanzeigeAnlage", back_populates="anlage", cascade="all, delete-orphan")
```

### 2.7 Relationship Map (ERD)

```
projects (existing) ──────┐
                          │ 1:N
                          ├─→ stoerungen ──┬─→ behinderungsanzeigen ──M:N──┐
                          │                ├─→ stoerungsanlagen ────────────┘
                          │                ├─→ kausalitaeten
                          │                └─(opt) bautagesberichte.stoerung_id
                          │
                          └─→ bautagesberichte

schedule_positions (existing) — referenced by FK from:
   stoerungen.betroffener_vorgang_id  (NOT NULL)
   stoerungen.betroffene_lv_position_id
   kausalitaeten.behinderte_leistung_id
   bautagesberichte.geplanter_vorgang_id
   bautagesberichte.ausgefuehrter_vorgang_id
```

---

## 3. API Design

New routes under `/api/v1/` (existing routes stay at `/api/` — see ADR-005).

### 3.1 Stoerungen (`/api/v1/`)

| Method | Path | Notes |
|---|---|---|
| GET | `/api/v1/projects/{project_id}/stoerungen` | Filter: `?status=&kritikalitaet=&ampel=&from=&to=` |
| POST | `/api/v1/projects/{project_id}/stoerungen` | Auto-assigns `stoerung_number` |
| GET | `/api/v1/stoerungen/{id}` | Full detail with computed fields |
| PATCH | `/api/v1/stoerungen/{id}` | Guarded by status |
| POST | `/api/v1/stoerungen/{id}/transition` | `{ "to_status", "comment" }` |
| DELETE | `/api/v1/stoerungen/{id}` | Only `status='entwurf'` |

### 3.2 Behinderungsanzeigen

| Method | Path | Notes |
|---|---|---|
| GET | `/api/v1/stoerungen/{id}/anzeigen` | |
| POST | `/api/v1/stoerungen/{id}/anzeigen` | Auto-fills text from template |
| PATCH | `/api/v1/anzeigen/{id}` | **409** if `status='versendet'` |
| POST | `/api/v1/anzeigen/{id}/approve` | Sets freigabe_* fields |
| POST | `/api/v1/anzeigen/{id}/send` | Terminal: snapshot PDF + lock |
| GET | `/api/v1/anzeigen/{id}/pdf` | Returns frozen snapshot if sent |
| DELETE | `/api/v1/anzeigen/{id}` | Only `status='entwurf'` |

### 3.3 Bautagesberichte

| Method | Path | Notes |
|---|---|---|
| GET | `/api/v1/projects/{project_id}/bautagesberichte` | `?from=&to=` |
| POST | `/api/v1/projects/{project_id}/bautagesberichte` | Unique `(project_id, datum)` |
| GET | `/api/v1/bautagesberichte/{id}` | |
| PATCH | `/api/v1/bautagesberichte/{id}` | Locked if `freigabestatus='freigegeben'` |
| DELETE | `/api/v1/bautagesberichte/{id}` | Only `freigabestatus='erstellt'` |

### 3.4 Stoerungsanlagen (attachments)

| Method | Path | Notes |
|---|---|---|
| GET | `/api/v1/stoerungen/{id}/anlagen` | |
| POST | `/api/v1/stoerungen/{id}/anlagen` | multipart; mime allowlist per typ |
| GET | `/api/v1/anlagen/{id}/download` | FileResponse, path-safe |
| PATCH | `/api/v1/anlagen/{id}` | Metadata only |
| DELETE | `/api/v1/anlagen/{id}` | **409** if linked to `versendet` Anzeige |

### 3.5 Kausalitäten & Reports

| Method | Path |
|---|---|
| GET/POST/PATCH/DELETE | `/api/v1/stoerungen/{id}/kausalitaeten` etc. |
| POST | `/api/v1/stoerungen/{id}/reports/stoerungsakte` |
| GET | `/api/v1/projects/{project_id}/reports/stoerungsuebersicht` |

### 3.6 Pydantic Schemas

New file `backend/app/schemas_stoerung.py` (to keep `schemas.py` under 800 lines per coding rules).

Key types: `StoerungCreate`, `StoerungUpdate`, `StoerungResponse` (includes computed `nachweis_ampel`, `has_anzeige_versendet`, `anlagen_count`), `AnzeigeCreate`, `AnzeigeSendRequest`, `BautagesberichtCreate`, `KausalitaetCreate`, `AnlageCreate`.

---

## 4. Storage Design

Reuse `services/storage.py` (path-traversal-safe). Add startup dirs to `main.py`.

```
STORAGE_ROOT/
├── email_attachments/{project_id}/         (existing)
├── company/                                 (existing)
├── reports/{project_id}/                   (existing + new Störungsakte PDFs)
│
├── stoerungs_anlagen/{project_id}/{stoerung_id}/
│       {uuid8}_{sanitized_filename}        (photos, plans, protocols)
│
├── behinderungsanzeigen/{project_id}/{stoerung_id}/
│       {anzeige_id}_{uuid8}.pdf            (frozen PDF snapshots after send)
│       versandnachweise/{anzeige_id}_*     (proof of delivery uploads)
│
└── bautagesberichte/{project_id}/
        {YYYY-MM-DD}_{uuid8}.pdf            (daily-report PDFs, on export)
```

**File limits:** Photos 20 MB, documents 50 MB, plans 100 MB.
**Mime validation:** allowlist per `anlage_typ` (e.g., `foto` → `image/jpeg|png|webp|heic`).
**Orphan cleanup:** SQLAlchemy event listener on `Stoerungsanlage` delete removes file from disk. Anlagen linked to `versendet` Anzeige are protected (409).

---

## 5. PDF Report Architecture

### 5.1 Template structure

```
backend/app/reports/templates/
├── _base.html                     (NEW — shared @page, header, footer, CSS vars)
├── _macros.html                   (NEW — ampel_badge, status_badge, kv_row macros)
├── sequential_comparison.html     (existing)
├── stoerungsakte.html             (NEW)
├── stoerungsakte_section_*.html   (NEW — section partials)
├── behinderungsanzeige.html       (NEW — legal document, A4)
├── bautagesbericht.html           (NEW)
└── stoerungsuebersicht.html       (NEW — project overview)
```

### 5.2 Störungsakte PDF generator (`services/pdf_stoerung.py`)

- Renders `stoerungsakte.html` via Jinja2 + WeasyPrint (same pattern as `pdf_report.py`)
- Photos embedded as base64 data URIs (avoids WeasyPrint URL-fetcher filesystem access)
- Page-break hints: `page-break-inside: avoid` on sections
- Reuses `CompanySettings` (logo, primary/secondary colors, header/footer)

### 5.3 Behinderungsanzeige PDF snapshot (frozen on send)

On `POST /api/v1/anzeigen/{id}/send`:
1. Render template with current values
2. Compute SHA-256 of resulting bytes
3. `storage.save_file(pdf_bytes, f"behinderungsanzeigen/{project_id}/{stoerung_id}", filename)`
4. Persist `pdf_filename`, `pdf_stored_path`, `pdf_sha256`, `sent_at` in one transaction
5. Set `status='versendet'` — **never re-render** afterward

SHA-256 verified on every download for tamper-detection.

### 5.4 Report persistence

Störungsakten persist as rows in existing `generated_reports` table (`report_type='stoerungsakte'`). `version_ids_json` repurposed as context field: `json.dumps({"stoerung_id": id, "options": {...}})`. The existing `/api/reports/{id}/download` endpoint serves without changes.

---

## 6. Computed Fields

### 6.1 Nachweis-Ampel — server-side, computed on read

```python
# backend/app/services/stoerung_compute.py
def compute_nachweis_ampel(stoerung: models.Stoerung) -> Literal["gruen","gelb","rot"]:
    has_anzeige_sent = any(a.status == "versendet" for a in stoerung.anzeigen)
    has_terminplanbezug = stoerung.betroftener_vorgang_id is not None
    has_hindernde_wirkung = bool(stoerung.hindernde_wirkung and stoerung.hindernde_wirkung.strip())
    has_leistungsbereitschaft = stoerung.leistungsbereitschaft is not None
    has_nachweis = any(a.anlage_typ in {"foto","protokoll","plan","email"} for a in stoerung.anlagen)

    if not has_anzeige_sent or not has_terminplanbezug or not has_hindernde_wirkung:
        return "rot"
    if has_leistungsbereitschaft and has_nachweis:
        return "gruen"
    return "gelb"
```

**Why server-side, not stored:**

| Option | Decision |
|---|---|
| Server-side computed on read | ✅ Single truth, trivial tests, ≤5 bool checks per Störung |
| Client-side TypeScript | ❌ Two implementations risk drift; can't filter in SQL |
| Persisted + triggers | ❌ Fragile in SQLite; easy to miss on related-table updates |

For `?ampel=` query filter: post-filter in Python (acceptable ≤10k Störungen/project). Add materialised column if performance degrades (defer to scale milestone).

### 6.2 Status machine

```python
ALLOWED_TRANSITIONS = {
    "entwurf":          {"offen", "verworfen"},
    "offen":            {"angezeigt", "verworfen"},
    "angezeigt":        {"in_beobachtung", "teilweise_behoben", "behoben"},
    "in_beobachtung":   {"teilweise_behoben", "behoben", "abgemeldet"},
    "teilweise_behoben":{"behoben", "abgemeldet"},
    "behoben":          {"abgemeldet", "in_anspruchspruefung"},
    "abgemeldet":       {"in_anspruchspruefung", "abgeschlossen"},
    "in_anspruchspruefung": {"abgeschlossen"},
    "abgeschlossen":    set(),  # terminal
    "verworfen":        set(),  # terminal
}
```

Additional guard: `offen → angezeigt` requires at least one `Behinderungsanzeige` with `typ='erstanzeige'` and `status='versendet'`.

---

## 7. Immutability Strategy

Layered defense (legal evidentiary requirement):

### Layer 1 — Application service guard (primary)

```python
# backend/app/services/stoerung_immutable.py
def assert_not_versendet(anzeige: Behinderungsanzeige) -> None:
    if anzeige.status == "versendet":
        raise HTTPException(409, "Behinderungsanzeige ist versendet und unveränderlich")
```

Called at start of every mutating endpoint for Anzeigen.

### Layer 2 — SQLAlchemy ORM event listener

```python
@event.listens_for(Behinderungsanzeige, "before_update")
def _block_versendet_mutation(mapper, connection, target):
    if target.status == "versendet":
        changed = {a.key for a in inspect(target).attrs if a.history.has_changes()}
        if changed - {"updated_at"}:
            raise IntegrityError("Cannot mutate versendet Behinderungsanzeige", None, None)
```

Catches direct ORM updates that bypass routers.

### Layer 3 — SQLite trigger

```sql
CREATE TRIGGER trg_anzeige_lock_versendet
BEFORE UPDATE ON behinderungsanzeigen
FOR EACH ROW
WHEN OLD.status = 'versendet' AND (NEW.text IS NOT OLD.text OR NEW.adressat IS NOT OLD.adressat)
BEGIN
    SELECT RAISE(ABORT, 'Behinderungsanzeige versendet: immutable');
END;
```

---

## 8. Migration Strategy

### Phase 0 — Introduce Alembic (preparatory PR)

1. Add `alembic==1.13.*` to `backend/requirements.txt`
2. `alembic init backend/alembic`
3. Configure `env.py` to use `Base.metadata` from `database.py`
4. Generate baseline migration from current schema; `alembic stamp head` on existing databases
5. Replace `Base.metadata.create_all` with `alembic upgrade head` in startup

### Phase 1 — Additive migration (`0002_add_stoerungsmanagement.py`)

Creates all new tables (§2.1–2.6), indexes, unique constraints, SQLite triggers. **No alterations to existing tables. Fully reversible (`downgrade()` drops new tables).**

### Risk: FK to `schedule_positions` from `stoerungen.betroftener_vorgang_id`

When deleting a ScheduleVersion (which cascades to positions), any Störungen referencing those positions would fail with FK violation. Mitigation: `versions.py` router adds a pre-delete check: if any non-deleted Störung references a position in this version → return 409 with clear message.

---

## 9. Key Design Decisions (ADRs)

### ADR-001: Keep SQLite for v1

**Decision.** Keep SQLite. Max ~15k rows across new tables per project — within SQLite's capacity. Write all code so a Postgres migration is mechanical.

### ADR-002: Reuse `generated_reports` table for Störungsakten

**Decision.** Reuse with `report_type='stoerungsakte'`. Repurpose `version_ids_json` as context field; add `context_json` column in Phase 1 migration.

### ADR-003: Uni-directional FKs — no back_populates on existing models

**Decision.** New models reference `Project` and `SchedulePosition` by FK only. Zero regression risk on existing functionality.

### ADR-004: Server-computed Nachweis-Ampel, not stored

**Decision.** Compute on read. Re-evaluate at scale milestone (>10k Störungen per project).

### ADR-005: `/api/v1/` prefix for new routes

**Decision.** New routes at `/api/v1/`, existing at `/api/`. Backwards-compatible. Unified migration to `/api/v1/` for legacy routes in Phase 2.

### ADR-006: `schemas_stoerung.py` separate from `schemas.py`

**Decision.** Split to keep files under 800 lines (coding rules).

---

## 10. New File Paths

```
backend/
├── app/
│   ├── schemas_stoerung.py
│   ├── routers/
│   │   ├── stoerungen.py
│   │   ├── behinderungsanzeigen.py
│   │   ├── bautagesberichte.py
│   │   ├── kausalitaeten.py
│   │   ├── stoerungsanlagen.py
│   │   └── stoerungs_reports.py
│   ├── services/
│   │   ├── stoerung_compute.py
│   │   ├── stoerung_immutable.py
│   │   ├── pdf_stoerung.py
│   │   ├── pdf_anzeige.py
│   │   └── pdf_bautagesbericht.py
│   └── reports/templates/
│       ├── _base.html
│       ├── _macros.html
│       ├── stoerungsakte.html
│       ├── behinderungsanzeige.html
│       └── bautagesbericht.html
└── alembic/
    └── versions/
        ├── 0001_baseline.py
        └── 0002_add_stoerungsmanagement.py
frontend/
└── src/features/stoerungen/
    ├── api.ts
    ├── hooks/
    └── components/
```

---

_End of document._
