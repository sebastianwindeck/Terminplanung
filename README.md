# Terminplanung

German construction schedule management app for legally compliant documentation. Designed for § 650g BGB and VOB/B compliance in German construction projects.

Manage schedule versions, email correspondence, and generate formal PDF reports for construction chronology (Terminplan-Vergleichsbericht).

## Features

**Project & Version Management**
- Create and manage construction projects with multiple schedule versions
- Clone versions for new planning iterations
- Mark baselines and current active version

**Schedule Positions**
- Import from Excel (`.xlsx`/`.xls`) or CSV with flexible column detection (German/English)
- Export to Excel directly
- Hierarchical positions with parent-child relationships
- Status tracking: planned, in_progress, completed, delayed, canceled
- Progress percentage per position
- Milestone marking

**Visualization & Analysis**
- Gantt chart with day/week/month views
- Two-version comparison (added/removed/changed positions)
- Sequential version comparison across chains (V1→V2→V3)
- Project chronology timeline (horizontal, events sorted by date)

**Microsoft Project Integration**
- Import MS Project XML (MSPDI format) preserving hierarchy
- Export versions back to MSPDI for round-trip editing in Microsoft Project

**Email & Correspondence**
- Tag project emails with attachments (EML, MSG, PDF, etc.)
- Link emails to version transitions
- Automatic file storage and retrieval
- Email metadata: sender, subject, date, importance, tag

**Reporting**
- PDF report generation with company branding
- Formal Terminplan-Vergleichsbericht (schedule comparison report)
- Configurable header/footer, logo, colors
- Sequential comparison PDF with all steps and linked emails

**Company Settings**
- Upload company logo (PNG, JPG, SVG)
- Configure colors for PDF exports
- Customize header and footer text

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Tailwind CSS |
| State / Data Fetching | TanStack Query |
| Backend | FastAPI, Python 3.12 |
| ORM | SQLAlchemy 2 (database-agnostic) |
| Database (Dev) | SQLite |
| Database (Production) | PostgreSQL / Azure SQL (via `DATABASE_URL`) |
| PDF Generation | WeasyPrint, Jinja2 |
| File Storage | Named Docker volume (`terminplanung_storage`) |
| Deployment | Docker Compose, Azure Container Instances (ACI) |

## Quick Start

### With Docker (Recommended)

```bash
docker compose up --build
```

- Frontend: http://localhost
- Backend API: http://localhost:8000
- API documentation: http://localhost:8000/docs
- File storage: Docker volume `terminplanung_storage`

### Development Setup

```bash
docker compose -f docker-compose.dev.yml up
```

### Manual Local Development

**Backend**

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
# API: http://localhost:8000
# Docs: http://localhost:8000/docs
```

**Frontend**

```bash
cd frontend
npm install
npm run dev
# App: http://localhost:5173
```

## API Overview

**Projects** — CRUD operations
- `GET /api/projects` — List projects
- `POST /api/projects` — Create project
- `GET /api/projects/{id}` — Get project
- `PUT /api/projects/{id}` — Update project
- `DELETE /api/projects/{id}` — Delete project

**Versions** — Schedule version management
- `GET /api/versions/{id}` — Get version with positions
- `POST /api/versions` — Create version
- `POST /api/versions/{id}/compare` — Compare two versions

**Schedule Positions** — Import/export
- `POST /api/positions/import` — Import from Excel/CSV
- `GET /api/positions/{version_id}/export` — Export to Excel
- Position CRUD via standard endpoints

**MS Project XML (MSPDI)** — Microsoft Project integration
- `POST /api/mspdi/import` — Import MSPDI file (creates new version)
- `GET /api/mspdi/export/{version_id}` — Export version to MSPDI XML

**Emails** — Correspondence tagging
- `GET /api/projects/{id}/emails` — List project emails
- `POST /api/emails` — Create email with optional attachment
- `PUT /api/emails/{id}` — Update email
- `DELETE /api/emails/{id}` — Delete email
- `GET /api/emails/{id}/attachment` — Download attachment

**Timeline** — Project chronology
- `GET /api/projects/{id}/timeline` — Horizontal timeline (versions + emails sorted by date)

**Reporting** — PDF generation
- `POST /api/projects/{id}/sequential-comparison` — Get JSON comparison (V1→V2→V3)
- `POST /api/projects/{id}/reports/sequential-comparison` — Generate PDF report
- `GET /api/projects/{id}/reports` — List generated reports
- `GET /api/reports/{id}/download` — Download report PDF
- `DELETE /api/reports/{id}` — Delete report

**Company Settings** — Branding configuration
- `GET /api/company-settings` — Get current settings
- `PUT /api/company-settings` — Update settings (name, colors, header/footer)
- `POST /api/company-settings/logo` — Upload company logo
- `DELETE /api/company-settings/logo` — Delete logo
- `GET /api/company-settings/logo` — Download logo

## Import Format

Excel and CSV import auto-detects columns in German and English. Minimum requirement: a column with position title/description.

**Example CSV:**
```csv
Pos.-Nr.;Bezeichnung;Beginn;Ende;Dauer;Verantwortlich;Gewerk;Status;Fortschritt
1.1;Rohbau Erdgeschoss;01.03.2025;31.05.2025;92;Max Muster;Rohbau;in_progress;30
1.1.1;Fundament;01.03.2025;20.03.2025;20;Max Muster;Rohbau;completed;100
```

**Supported columns (English/German):**
- Position number: `Pos.-Nr.`, `Pos.Nr`, `Position ID`, `ID`
- Title: `Bezeichnung`, `Title`, `Name`, `Description`
- Start date: `Beginn`, `Start`, `Start Date`
- End date: `Ende`, `End`, `End Date`
- Duration: `Dauer`, `Duration (Days)`
- Responsible: `Verantwortlich`, `Responsible`, `Owner`
- Trade: `Gewerk`, `Trade`, `Craft`
- Status: `Status` (planned, in_progress, completed, delayed, canceled)
- Progress: `Fortschritt`, `Progress (%)`

## File Storage

Email attachments, company logos, and generated PDF reports are stored in the named Docker volume `terminplanung_storage`. This volume persists across container restarts.

Directory structure:
```
terminplanung_storage/
├── email_attachments/{project_id}/  — Email attachments (EML, MSG, PDF)
├── company/                          — Company logo
└── reports/{project_id}/             — Generated PDF reports
```

## Database Configuration

Switch from SQLite to PostgreSQL by changing environment variable:

```env
DATABASE_URL=postgresql+psycopg2://user:password@host:5432/terminplanung
```

SQLAlchemy auto-migrates on startup (DDL via `create_all`). For production migrations, `alembic` is included as a dependency.

## Azure Container Instances Deployment

```bash
chmod +x azure/deploy.sh
./azure/deploy.sh terminplanung-rg westeurope
```

This script creates:
- Azure Resource Group
- Azure Container Registry (ACR) with built images
- Azure Storage File Share for persistent storage
- Container Group running frontend + backend

## Legal Context

This tool is designed for German construction projects where schedule documentation is legally relevant. It supports compliance with:

- **§ 650g BGB** — German Civil Code requirements for construction schedule documentation
- **VOB/B** — German standard conditions of contract for construction services

Schedule versions, comparisons, and formal PDF reports create an auditable record of project planning evolution.
