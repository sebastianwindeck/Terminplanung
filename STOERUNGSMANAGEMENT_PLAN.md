# Störungsmanagement Fassadenbau – Collaborative Implementation Plan

> Working document. Editierbar durch das gesamte Team. Stand: 2026-05-22
> Status: Phase 1 (MVP) Planung
> Rechtlicher Bezug: VOB/B § 6, § 2 Nr. 5, BGB § 642, § 650g

---

## 1. Executive Summary

Das Modul **Störungsmanagement** ergänzt die bestehende Terminplanung-App um eine rechtssichere Erfassung, Dokumentation und Nachweisführung von Bauablaufstörungen im Fassadenbau. Es liefert die Grundlage für **Behinderungsanzeigen nach VOB/B § 6**, für **Mehrkostenansprüche (§ 2 Nr. 5 VOB/B, § 642 BGB)** sowie für Beschleunigungs- und Entschädigungsansprüche. Ziel ist eine prüffeste, vollständige Störungsakte je Vorgang, die unmittelbar mit dem vorhandenen Terminplan (SchedulePosition) und E-Mail-Verkehr (EmailEvent) verknüpft ist.

---

## 2. MVP Scope & Phase Roadmap

### Phase 1 – MVP (Muss-Anforderungen)

Mappt 1:1 die Lastenheft-Anforderungen B-M-01 bis B-M-12 sowie Modul A, C (Teilumfang), D, E, I (Teilumfang Störungsakte) und einfache Kausalitätsmatrix (G basic).

**Lieferumfang Phase 1:**
- A: Projektstammdaten erweitern (Bauvorhaben, AG, gewerkespezifische Felder)
- B: Störungserfassung mit allen 12 Muss-Feldern (B-M-01 … B-M-12)
- C: Behinderungsanzeige & Abmeldung (Erstellung, Versionierung, Versandstatus)
- D: Bautagesbericht (Tagesdaten, Wetter, Personal, Geräte, Soll/Ist Leistung)
- E: Foto- und Dokumentenzuordnung (Upload, Verknüpfung mit Störung)
- F-Integration: Verknüpfung Störung ↔ SchedulePosition (Terminplanvorgang)
- G basic: Einfache Kausalitätsmatrix (Event → Wirkung → Folge)
- I-Teil: PDF-Export Störungsakte mit Anlagenverzeichnis
- Nachweisampel grün/gelb/rot
- Audit-Log (User, Zeit, Aktion) für alle schreibenden Operationen

**Akzeptanz:** Eine neue Störung kann in ≤ 5 Minuten vollständig dokumentiert werden (Lastenheft NF-Anforderung).

### Phase 2 – Core Experience (Soll-Anforderungen)
- Erweiterte Kausalitätsketten (Kausalitätsmodul G vollständig: mehrstufig)
- Mehrkosten-/Anspruchsmodul H (Mengen, Stundensätze, Materialkosten)
- Soll-Ist-Vergleich in Verbindung mit Störungen (welche Verschiebung wurde durch welche Störung verursacht)
- Mobile-optimierte Erfassungsmasken (Tablet/Smartphone, Foto direkt aus Kamera)
- E-Mail-Integration: Behinderungsanzeige direkt versenden + EmailEvent automatisch anlegen
- Berichtsgenerator I: Sammelreports (Monats-/Projektreport mit Störungsstatistik)

### Phase 3 – Polish & Optimization (Kann-Anforderungen)
- Eskalationsfristen-Watcher (automatische Erinnerung an offene Anzeigen)
- Volltext-Suche über alle Störungsakten eines Projekts
- Vorlagen-Bibliothek (Standardtexte Behinderungsanzeige je Störungsart)
- Wetterdaten-Integration (DWD-API für Witterungsnachweis)
- Export GAEB/XRechnung-konform für Mehrkostenforderungen

Jede Phase ist eigenständig deploybar.

---

## 3. Data Model

> Konvention: SQLAlchemy 2.0 Mapped[] syntax, snake_case Tabellen, IDs als Integer PK, alle Zeitstempel UTC.

### 3.1 Erweiterung Project (Modul A)

Erweiterung der bestehenden `projects`-Tabelle (Migration additiv):

| Feld | Typ | Pflicht | Bemerkung |
|------|-----|---------|-----------|
| client_name | String(255) | nein | Auftraggeber |
| client_address | Text | nein | |
| construction_site_address | Text | nein | Baustellenadresse |
| contract_number | String(100) | nein | Vertragsnummer |
| contract_date | Date | nein | Vertragsdatum |
| trade | String(100) | nein | Default „Fassadenbau" |
| construction_lead | String(255) | nein | Bauleitung AG |
| site_manager | String(255) | nein | Eigene Bauleitung |
| vob_b_agreed | Boolean | nein | VOB/B vereinbart? |

### 3.2 Disruption – Tabelle `disruptions` (Modul B – Hauptobjekt)

Setzt die Muss-Anforderungen B-M-01 bis B-M-12 vollständig um.

| Feld | Typ | Pflicht | Lastenheft-Bezug |
|------|-----|---------|------------------|
| id | Integer PK | ja | – |
| project_id | FK → projects.id | ja | – |
| disruption_number | String(50) | ja | B-M-01 |
| title | String(500) | ja | B-M-01 |
| disruption_type | String(100) | ja | B-M-02 |
| disruption_subtype | String(100) | nein | B-M-02 |
| description | Text | ja | B-M-03 |
| date_start | DateTime | ja | B-M-02 |
| date_knowledge | DateTime | ja | B-M-03 |
| date_end | DateTime | nein | optional |
| responsibility_area | String(100) | ja | B-M-06 |
| perpetrator | String(255) | nein | B-M-06 |
| affected_area | String(500) | ja | B-M-07 |
| schedule_position_id | FK → schedule_positions.id | nein | B-M-07 |
| obstruction_effect | Text | ja | B-M-08 |
| effects | Text | nein | B-M-08 (JSON liste) |
| performance_readiness | String(20) | ja | B-M-09 |
| performance_readiness_note | Text | nein | B-M-09 |
| personnel_available | String(20) | nein | B-M-09 |
| material_available | String(20) | nein | B-M-09 |
| planning_available | String(20) | nein | B-M-09 |
| equipment_available | String(20) | nein | B-M-09 |
| alternative_possible | String(20) | nein | B-M-10 |
| alternative_note | Text | nein | B-M-10 |
| immediate_action | Text | ja | B-M-11 |
| ag_cooperation_needed | Text | nein | B-M-11 |
| follow_up_date | Date | nein | Wiedervorlage |
| criticality | String(20) | ja | niedrig/mittel/hoch/kritisch |
| status | String(50) | ja | B-M-01 (Statusmaschine) |
| evidence_status | String(10) | ja | B-M-12 (gruen/gelb/rot) |
| created_by | String(255) | ja | NF Audit |
| deleted_at | DateTime | nein | Soft-Delete |
| created_at | DateTime | ja | |
| updated_at | DateTime | ja | |

**Beziehungen:** `project`, `schedule_position`, `obstruction_notices` (1:n), `daily_reports` (m:n), `attachments` (1:n), `causality_links` (1:n), `audit_logs` (filtered)

**Indexe:** `(project_id, status)`, `(project_id, disruption_number UNIQUE)`, `(schedule_position_id)`

### 3.3 ObstructionNotice – Tabelle `obstruction_notices` (Modul C)

Behinderungsanzeige / Abmeldung. **Immutability**: nach Versand keine Mutation, sondern Versionierung.

| Feld | Typ | Pflicht | Bemerkung |
|------|-----|---------|-----------|
| id | Integer PK | ja | |
| disruption_id | FK → disruptions.id | ja | |
| notice_kind | String(20) | ja | „anzeige" / „zwischenmeldung" / „abmeldung" |
| version | Integer | ja | default 1 |
| status | String(20) | ja | „entwurf" / „versandt" |
| recipient_name | String(255) | ja | |
| recipient_email | String(255) | nein | |
| subject | String(500) | ja | |
| body_text | Text | ja | Anschreiben-Text |
| reference_clauses | String(255) | nein | z. B. „VOB/B § 6 Abs. 1" |
| sent_at | DateTime | nein | |
| sent_by | String(255) | nein | |
| pdf_stored_path | String(1000) | nein | Snapshot nach Versand |
| email_event_id | FK → email_events.id | nein | |
| created_at / updated_at | DateTime | ja | |

**Constraint:** Bei `status = "versandt"` sind alle Felder schreibgeschützt. Korrektur → neue `version`.

### 3.4 DailyReportEntry – Tabelle `daily_reports` (Modul D)

| Feld | Typ | Pflicht |
|------|-----|---------|
| id | Integer PK | ja |
| project_id | FK → projects.id | ja |
| report_date | Date | ja |
| weather_condition | String(100) | nein |
| weather_temp_min_c | Float | nein |
| weather_temp_max_c | Float | nein |
| wind_speed_kmh | Float | nein |
| precipitation_mm | Float | nein |
| personnel_count | Integer | nein |
| subcontractor_count | Integer | nein |
| equipment_notes | Text | nein |
| planned_work | Text | nein |
| actual_work | Text | nein |
| general_notes | Text | nein |
| approval_status | String(20) | ja | erstellt/geprüft/freigegeben |
| created_by | String(255) | ja | |
| created_at / updated_at | DateTime | ja | |

**Unique:** `(project_id, report_date)`

### 3.5 DailyReportDisruptionLink – Linktabelle

m:n zwischen `daily_reports` und `disruptions`.

| Feld | Typ |
|------|-----|
| daily_report_id | FK PK |
| disruption_id | FK PK |
| impact_hours | Float (nullable) |
| note | Text (nullable) |

### 3.6 DisruptionAttachment – Tabelle `disruption_attachments` (Modul E)

| Feld | Typ | Pflicht |
|------|-----|---------|
| id | Integer PK | ja |
| disruption_id | FK → disruptions.id | ja |
| filename | String(500) | ja |
| stored_path | String(1000) | ja |
| mime_type | String(100) | nein |
| size_bytes | Integer | ja |
| kind | String(20) | ja | foto/dokument/skizze/sonstiges |
| caption | String(500) | nein |
| taken_at | DateTime | nein |
| uploaded_by | String(255) | ja |
| created_at | DateTime | ja | |

**Speicherort:** `STORAGE_ROOT/disruptions/{project_id}/{disruption_id}/`

### 3.7 CausalityLink – Tabelle `causality_links` (Modul G basic)

| Feld | Typ | Pflicht |
|------|-----|---------|
| id | Integer PK | ja |
| disruption_id | FK → disruptions.id | ja |
| affected_position_id | FK → schedule_positions.id | nein |
| effect_type | String(50) | ja | verzug/stillstand/minderleistung/mehraufwand |
| delay_days | Float | nein |
| description | Text | nein |
| created_at | DateTime | ja |

### 3.8 AuditLog – Tabelle `audit_logs` (NF-Anforderung)

| Feld | Typ |
|------|-----|
| id | Integer PK |
| entity_type | String(50) |
| entity_id | Integer |
| action | String(20) |
| field_changes | Text (JSON) |
| user_id | String(255) |
| timestamp | DateTime |

Implementierung via SQLAlchemy Event Listener (`after_update`, `after_insert`) in `backend/app/audit.py`.

### 3.9 Statusmaschine `Disruption.status`

```
entwurf → offen → angezeigt → in_beobachtung → teilweise_behoben → behoben → abgemeldet → in_anspruchspruefung → abgeschlossen
                                                                                                              ↘ verworfen
```

Erlaubte Übergänge in `backend/app/services/disruption_status.py` als Dict-Map. Verstoß → HTTP 400.

### 3.10 Nachweisampel-Berechnung

Reine Funktion `compute_evidence_status(disruption)` in `backend/app/services/evidence.py`:

- **gruen**: Behinderungsanzeige mit `status="versandt"` UND `schedule_position_id IS NOT NULL` UND `performance_readiness != null` UND ≥ 1 Anhang
- **gelb**: einzelne Bedingungen erfüllt, andere fehlen
- **rot**: keine Anzeige ODER keine schedule_position_id ODER keine obstruction_effect

Persisted als denormalisierte Spalte für Filter-Performance. Nach jedem Update recomputed.

---

## 4. Standard-Dropdowns

Implementierung als Python-Konstanten in `backend/app/constants/dropdowns.py` + Endpoint `GET /api/disruptions/dropdowns`. Frontend cached via React Query (staleTime 1h).

**Störungsarten (20):** fehlende_planung, verspaetete_planfreigabe, planaenderung, fehlende_entscheidung, fehlende_vorleistung, mangelhafte_vorleistung, fehlender_zugang, fehlendes_geruest, baustellenlogistik_gestoert, kran_nicht_verfuegbar, andere_gewerke_behindern, anordnung_auftraggeber, zusaetzliche_leistung, geaenderte_leistung, mengenänderung, witterung, behoerdliche_auflage, materialbeistellung_fehlt, eigenbereich, unklar

**Auswirkungen (16):** vollstaendiger_stillstand, teilweiser_stillstand, wartezeit, umsetzen_kolonne, ausweichleistung, minderleistung, unterbrechung, verschiebung_montagebeginn, verlaengerung_montagezeit, verschiebung_jahreszeit, beschleunigung, mehrarbeit, nachunternehmer_mehrkosten, verlaengerte_vorhaltung, zusaetzliche_baustelleneinrichtung, terminrisiko

**Verantwortungsbereich (12):** auftraggeber, objektplanung_architekt, fachplanung, bauleitung_ag, vorunternehmer_ag, behoerde, versorger, witterung, nachunternehmer_an, eigenes_unternehmen, lieferant, unklar

---

## 5. API Endpoints

> Konvention: RESTful, JSON, Pydantic v2 Schemas. Neue Schemas in `backend/app/schemas/` (aufgeteilt).

### 5.1 Projektstammdaten (Erweiterung `projects.py`)
- `PATCH /api/projects/{id}/master-data`

### 5.2 Disruptions Router (`routers/disruptions.py`)
- `GET    /api/projects/{project_id}/disruptions` — Liste mit Filter (status, evidence_status, criticality, position_id)
- `POST   /api/projects/{project_id}/disruptions` — neu anlegen (auto-Nummer, status=entwurf)
- `GET    /api/disruptions/{id}` — vollständig mit Beziehungen
- `PUT    /api/disruptions/{id}` — Update (Status-abhängig)
- `DELETE /api/disruptions/{id}` — nur in Status entwurf/verworfen
- `POST   /api/disruptions/{id}/transition` — `{ new_status, note }`
- `GET    /api/disruptions/dropdowns` — alle Dropdown-Werte
- `GET    /api/disruptions/{id}/evidence-status` — Live-Recompute
- `GET    /api/disruptions/{id}/audit-log`

### 5.3 ObstructionNotices Router (`routers/obstruction_notices.py`)
- `GET    /api/disruptions/{disruption_id}/notices`
- `POST   /api/disruptions/{disruption_id}/notices` — Entwurf
- `PUT    /api/notices/{id}` — nur Status entwurf
- `POST   /api/notices/{id}/send` — PDF erzeugen + EmailEvent + einfrieren
- `POST   /api/notices/{id}/new-version` — Korrektur nach Versand
- `GET    /api/notices/{id}/pdf` — Snapshot-Download

### 5.4 DailyReports Router (`routers/daily_reports.py`)
- `GET    /api/projects/{project_id}/daily-reports?from=&to=`
- `POST   /api/projects/{project_id}/daily-reports`
- `GET    /api/daily-reports/{id}`
- `PUT    /api/daily-reports/{id}`
- `DELETE /api/daily-reports/{id}`
- `POST   /api/daily-reports/{id}/link-disruption`
- `DELETE /api/daily-reports/{id}/link-disruption/{disruption_id}`

### 5.5 Attachments Router (`routers/disruption_attachments.py`)
- `POST   /api/disruptions/{id}/attachments` — multipart upload
- `GET    /api/disruptions/{id}/attachments`
- `GET    /api/attachments/{id}/file` — Download
- `PATCH  /api/attachments/{id}` — Caption ändern
- `DELETE /api/attachments/{id}`

### 5.6 Causality Router (`routers/causality.py`)
- `GET    /api/disruptions/{id}/causality`
- `POST   /api/disruptions/{id}/causality`
- `PUT    /api/causality/{id}`
- `DELETE /api/causality/{id}`

### 5.7 Reports (Erweiterung `reports.py`)
- `POST   /api/disruptions/{id}/report/pdf` — Störungsakte PDF
- `POST   /api/projects/{id}/disruption-summary/pdf` — (Phase 2)

---

## 6. Frontend Pages & Components

### 6.1 Neue Routes

```
/projects/:projectId/disruptions              → DisruptionList
/projects/:projectId/disruptions/new          → DisruptionEditor (create)
/projects/:projectId/disruptions/:id          → DisruptionDetail (tabs)
/projects/:projectId/disruptions/:id/edit     → DisruptionEditor (edit)
/projects/:projectId/daily-reports            → DailyReportList
/projects/:projectId/daily-reports/:date      → DailyReportEditor
/projects/:projectId/master-data              → ProjectMasterData
```

### 6.2 Neue Pages
- `pages/disruption/DisruptionList.tsx` — Liste, Filter (Ampel, Status, Kritikalität)
- `pages/disruption/DisruptionDetail.tsx` — Tabs: Übersicht | Anzeigen | Anhänge | Kausalität | Audit
- `pages/disruption/DisruptionEditor.tsx` — Single-Page-Form, mobile-first, < 5 Min. Erfassung
- `pages/dailyreport/DailyReportList.tsx`
- `pages/dailyreport/DailyReportEditor.tsx`
- `pages/master/ProjectMasterDataPage.tsx`

### 6.3 Neue Components (`components/disruption/`)
- `DisruptionForm.tsx` — wiederverwendbares Formular
- `DisruptionStatusBadge.tsx`
- `EvidenceTrafficLight.tsx` — grün/gelb/rot mit Tooltip
- `DropdownSelect.tsx` — wrapper für Standard-Dropdowns
- `SchedulePositionPicker.tsx` — Combobox mit Suche
- `ObstructionNoticeEditor.tsx` — Entwurf, Versand, Versionierung
- `ObstructionNoticeList.tsx`
- `AttachmentUploader.tsx` — Drag&Drop + Kamera-Capture (`<input capture="environment">`)
- `AttachmentGallery.tsx` — Bildergalerie mit Lightbox
- `CausalityMatrix.tsx`
- `AuditLogTimeline.tsx`
- `DailyReportForm.tsx`
- `DisruptionLinkSelector.tsx` — Tagesbericht ↔ Störungen

### 6.4 Validierung
Zod-Schemas in `frontend/src/schemas/disruption.ts` — symmetrisch zu Pydantic.

### 6.5 Navigation
- `Layout.tsx`: Tab „Störungen" im Projektkontext
- `ProjectDetail.tsx`: neuer Tab „Störungen" mit Counter + Ampel-Aggregat

---

## 7. Integration Points

### 7.1 Verknüpfung mit SchedulePosition
- FK `disruptions.schedule_position_id`
- In `ScheduleView.tsx`: Badge an Positionen mit aktiven Störungen

### 7.2 Verknüpfung mit EmailEvent
- `ObstructionNotice.email_event_id` FK
- Beim Versand: automatisch `EmailEvent` mit `tag="behinderungsanzeige"` anlegen

### 7.3 PDF-System (WeasyPrint)
Neue Templates in `backend/app/reports/templates/`:
- `disruption_file.html` — Störungsakte
- `obstruction_notice.html` — Behinderungsanzeige (Briefkopf, VOB/B § 6, Sachverhalt, Anlagen)
- `obstruction_deregistration.html` — Abmeldung

Anlagenverzeichnis als Jinja-Macro mit laufender Nummerierung. Reuse `CompanySettings` (Logo, Farben).

### 7.4 Speicher-Layout
```
STORAGE_ROOT/
├── email_attachments/{project_id}/       (bestehend)
├── company/                               (bestehend)
├── reports/                               (bestehend)
├── disruptions/{project_id}/{disruption_id}/   (neu)
└── obstruction_notices/{project_id}/{notice_id}/ (neu)
```

### 7.5 Audit Log
SQLAlchemy Event Listeners zentral in `backend/app/audit.py`.
User-Identifikation: Phase 1 via `X-User-Email` Header (Platzhalter).

---

## 8. Open Questions / Decisions

| # | Frage | Vorschlag | Entscheidung |
|---|-------|-----------|--------------|
| Q1 | Authentifizierung? | Phase 1: `X-User-Email` Header; Phase 2: OAuth | TBD |
| Q2 | Mandantenfähigkeit? | Phase 1 single-tenant | TBD |
| Q3 | Wer darf „abgeschlossen" auslösen? | Phase 1: jeder; Phase 2: Rollenmodell | TBD |
| Q4 | E-Mail-Versand-Pfad? | MVP: PDF-Download + manuell + EmailEvent; Phase 2: SMTP | TBD |
| Q5 | Foto-Komprimierung? | > 5 MB clientseitig resizen, EXIF behalten | TBD |
| Q6 | Wetterdaten? | MVP manuell; Phase 3 DWD-API | TBD |
| Q7 | Soft-Lock für versandte Anzeigen? | Repository-Guard + Event-Listener (kein DB-Trigger) | TBD |
| Q8 | Werktage-Berechnung? | Mo–Fr ohne Feiertage; Library `holidays` (DE) | TBD |
| Q9 | Soft-Delete oder Hard-Delete? | Soft-Delete via `deleted_at` | empfohlen |
| Q10 | Migration-Tool? | **Alembic einführen** ab diesem Modul | empfohlen |
| Q11 | Schemas getrennt oder weiter in schemas.py? | Aufteilen: `schemas/disruption.py` etc. | empfohlen |
| Q12 | Authentifizierungs-System Phase 2? | FastAPI-Users oder Keycloak | TBD |

---

## 9. Implementation Order (MVP – granular)

> Jeder Schritt = 1 PR (≤ 400 LoC bevorzugt). TDD: Tests-first. Reihenfolge minimiert Merge-Konflikte.

### Block 0 – Vorbereitung
1. **Alembic-Setup**: `alembic init`, erste Migration aus aktuellem Schema (Baseline)
2. **Konstanten-Modul**: `backend/app/constants/dropdowns.py` + Endpoint `GET /api/disruptions/dropdowns`
3. **Audit-Infrastruktur**: `backend/app/audit.py` + `AuditLog`-Model + Migration

### Block 1 – Modul A (Projektstammdaten)
4. Migration: erweiterte Felder an `projects`
5. Schemas + Endpoint `PATCH /api/projects/{id}/master-data`
6. Frontend `ProjectMasterDataPage.tsx`

### Block 2 – Modul B Backend (Störung Kern)
7. Migration `disruptions` + Indexe
8. Pydantic-Schemas `schemas/disruption.py`
9. `disruption_number`-Generator (`services/disruption_numbering.py`): Format `STÖ-{YYYY}-{NNN}`
10. Statusmaschine (`services/disruption_status.py`) – reine Funktion, Tests pro Übergang
11. Evidence-Compute (`services/evidence.py`) – reine Funktion, Tests für jede Ampel-Kombi
12. Router `routers/disruptions.py`: CRUD + Transition + Evidence + List/Filter

### Block 3 – Modul C (Behinderungsanzeige)
13. Migration `obstruction_notices`
14. Schemas + Router + Versionierungs-Service
15. PDF-Template `obstruction_notice.html` + `services/notice_pdf.py`
16. `POST /notices/{id}/send`: PDF → storage → EmailEvent → einfrieren

### Block 4 – Modul E (Attachments)
17. Migration `disruption_attachments` + Storage-Layout
18. Router `disruption_attachments.py`: upload/download/delete
19. EXIF-Parser `services/exif.py`

### Block 5 – Modul D (Bautagesbericht)
20. Migrationen `daily_reports` + `daily_report_disruption_links`
21. Router + Schemas. Unique-Constraint `(project_id, report_date)`
22. Link-Endpoints

### Block 6 – Modul G basic (Kausalität)
23. Migration `causality_links`
24. Router + Schemas + Re-Compute Evidence bei Änderung

### Block 7 – PDF Störungsakte (Modul I-Teil)
25. Template `disruption_file.html` + Macro `attachment_index`
26. Service `services/disruption_pdf.py` + Endpoint
27. Snapshot in `generated_reports` (bestehend, `report_type="stoerungsakte"`)

### Block 8 – Frontend
28. API-Client `frontend/src/api/disruptions.ts`
29. Zod-Schemas `frontend/src/schemas/disruption.ts`
30. `DropdownSelect.tsx`
31. `DisruptionList.tsx` + Filter
32. `DisruptionEditor.tsx` (Create + Edit)
33. `DisruptionDetail.tsx` mit Tabs
34. `EvidenceTrafficLight.tsx` + `DisruptionStatusBadge.tsx`
35. `ObstructionNoticeEditor.tsx` + `ObstructionNoticeList.tsx`
36. `AttachmentUploader.tsx` + `AttachmentGallery.tsx` (Kamera-Capture)
37. `CausalityMatrix.tsx`
38. `SchedulePositionPicker.tsx`
39. `DailyReportList.tsx` + `DailyReportEditor.tsx`
40. `AuditLogTimeline.tsx`
41. Routes + Navigation in `App.tsx` + `Layout.tsx` + `ProjectDetail.tsx`
42. `ProjectDetail.tsx`: neuer Tab „Störungen" mit Ampel-Aggregat

### Block 9 – Integration & Tests
43. Playwright E2E: „Neue Störung in < 5 Min anlegen"
44. Playwright E2E: „Behinderungsanzeige erstellen, versenden, Versionierung"
45. Playwright E2E: „Tagesbericht mit Störungslink"
46. Backend Coverage ≥ 80% (pytest --cov)
47. Frontend Lint + tsc strict

### Block 10 – Doku & Release
48. `CHANGELOG.md` Eintrag
49. README-Update
50. Tag `v2.0.0-stoerungsmgmt-mvp`

---

## 10. Definition of Done (MVP)

### Funktional
- [ ] Alle 12 Muss-Anforderungen B-M-01 … B-M-12 erfüllt und durch Tests abgedeckt
- [ ] Projektstammdaten (Modul A) erweiterbar und editierbar
- [ ] Störung anlegen, bearbeiten, Status durchschalten gemäß Statusmaschine
- [ ] Behinderungsanzeige als Entwurf, Versand mit PDF-Snapshot, Versionierung; Immutability nach Versand
- [ ] Bautagesbericht erfassbar und mit Störungen verknüpfbar (m:n)
- [ ] Fotos/Dokumente uploadbar, Kamera-Capture auf Mobile funktioniert
- [ ] Kausalitätsmatrix (einfach) mit Verbindung zu SchedulePosition
- [ ] PDF Störungsakte downloadbar mit Anlagenverzeichnis
- [ ] Nachweisampel grün/gelb/rot korrekt berechnet
- [ ] Audit-Log für alle schreibenden Aktionen vorhanden und sichtbar
- [ ] Integration mit Project, SchedulePosition, EmailEvent, CompanySettings funktioniert

### Nicht-funktional
- [ ] Neue Störung in ≤ 5 Min vollständig erfassbar (UX-Test)
- [ ] Mobile-Layout auf Tablet und Smartphone ohne horizontales Scrollen
- [ ] Backend Testabdeckung ≥ 80% (pytest --cov)
- [ ] Zod (Frontend) + Pydantic (Backend) validieren symmetrische Felder
- [ ] Kein `print()` im Backend, kein `console.log` im Frontend
- [ ] `mypy`/`ruff` ohne Fehler; `tsc --noEmit` ohne Fehler
- [ ] Playwright E2E-Suite grün

### Rechtssicherheit
- [ ] Behinderungsanzeige enthält Pflicht-Bezug VOB/B § 6
- [ ] Versandte Anzeigen sind unveränderlich (kein Überschreiben)
- [ ] Audit-Log unveränderlich (kein DELETE-Endpoint)
- [ ] PDF-Export enthält Anlagenverzeichnis mit laufender Nummerierung

---

## 11. Risiken & Mitigationen

| Risiko | Wahrsch. | Auswirkung | Mitigation |
|--------|----------|------------|------------|
| Statusmaschine → Bugs bei Übergängen | mittel | hoch | Reine Funktion + erschöpfende Tests |
| Versandte Anzeigen versehentlich mutiert | niedrig | sehr hoch (juristisch) | Repository-Guard + Event-Listener als 2. Schicht |
| Foto-Upload sprengt Storage | mittel | mittel | Größenlimit 25 MB |
| WeasyPrint Performance bei vielen Anhängen | mittel | mittel | Async-PDF-Generierung (Phase 2) |
| `Base.metadata.create_all` → Drift | hoch | hoch | **Alembic ab Block 0** |
| Mobile-Erfassung fühlt sich zu langsam an | mittel | hoch | UX-Test früh (Block 8) |
| User-Identifikation ohne Auth ist spoofbar | hoch | mittel | Als Provisorium markieren, Phase 2: echte Auth |

---

## 12. Coding Standards

**Backend (Python):** PEP 8, Type Hints auf allen öffentlichen Funktionen, black/isort/ruff, pytest mit Markern `unit`/`integration`, kein `print` (logging stattdessen), Bandit clean.

**Frontend (TypeScript):** Strict Mode, Zod an API-Grenzen, kein `any`, kein `console.log`, Komponenten ≤ 200 Zeilen, Immutable Updates (Spread).

**Git:** Conventional Commits (feat, fix, refactor, docs, test, chore, perf, ci).

---

## 13. Design-Dokumente

- Architektur: [`docs/architecture/stoerungsmanagement.md`](docs/architecture/stoerungsmanagement.md)
- UX-Flows: [`docs/ux/stoerungsmanagement_flows.md`](docs/ux/stoerungsmanagement_flows.md)

---

_Ende des Plans. Feedback und Anpassungen direkt im Dokument willkommen._
