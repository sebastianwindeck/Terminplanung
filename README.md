# Terminplanung

Terminplanungs-App ähnlich Koppla – importiert Terminplanpositionen und verwaltet diese in verschiedenen Versionen mit Gantt-Ansicht.

## Features

- **Projekte** verwalten mit mehreren Terminplan-Versionen
- **Versionen klonen** – neue Planungsiterationen aus bestehenden Versionen ableiten
- **Positionen importieren** – CSV und Excel (`.xlsx`/`.xls`) mit flexibler Spaltenerkennung (DE/EN)
- **Excel-Export** direkt aus der App
- **Gantt-Diagramm** – Tag-/Wochen-/Monatsansicht
- **Versionsvergleich** – Diff zwischen zwei Versionen (hinzugefügt / entfernt / geändert)
- **Hierarchische Positionen** – Über-/Unterordnung mit Collapse
- **Status & Fortschritt** – geplant, in Bearbeitung, abgeschlossen, verzögert, storniert
- **Meilensteine** mit eigener Markierung

## Tech-Stack

| Schicht | Technologie |
|---------|-------------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| State / Fetch | TanStack Query |
| Diagramm | gantt-task-react |
| Backend | FastAPI, Python 3.12 |
| ORM | SQLAlchemy 2 (DB-agnostisch) |
| Datenbank (Dev) | SQLite |
| Datenbank (Prod) | PostgreSQL / Azure SQL (via `DATABASE_URL`) |
| Deployment | Docker, Azure Container Instances (ACI) |

## Lokale Entwicklung

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
# API läuft auf http://localhost:8000
# Swagger UI: http://localhost:8000/docs
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# App läuft auf http://localhost:3000
```

### Mit Docker (empfohlen)

```bash
docker compose up --build
# App: http://localhost
# API: http://localhost:8000/docs
```

## Import-Format

Die Importfunktion erkennt Spaltenbezeichnungen automatisch – sowohl deutsch als auch englisch. Mindestanforderung ist eine Spalte mit der Bezeichnung/dem Titel des Vorgangs.

**Beispiel CSV:**
```csv
Pos.-Nr.;Bezeichnung;Beginn;Ende;Dauer;Verantwortlich;Gewerk;Status;Fortschritt
1.1;Rohbau Erdgeschoss;01.03.2025;31.05.2025;92;Max Muster;Rohbau;in_progress;30
1.1.1;Fundament;01.03.2025;20.03.2025;20;Max Muster;Rohbau;completed;100
```

## Datenbank wechseln (SQLite → PostgreSQL)

Nur die Umgebungsvariable ändern:

```env
DATABASE_URL=postgresql+psycopg2://user:password@host:5432/terminplanung
```

SQLAlchemy übernimmt die Migration automatisch beim Start (DDL via `create_all`).  
Für Produktions-Migrationen: `alembic` ist bereits als Abhängigkeit enthalten.

## Azure ACI Deployment

```bash
chmod +x azure/deploy.sh
./azure/deploy.sh terminplanung-rg westeurope
```

Das Skript erstellt:
- Azure Resource Group
- Azure Container Registry (ACR) + baut Images
- Azure Storage File Share für persistente SQLite-Daten
- Container Group mit Frontend + Backend
