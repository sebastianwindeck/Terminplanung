# Changelog

## [1.0.0] – 2026-05-13

### Neu
- Projektverwaltung mit CRUD (Erstellen, Bearbeiten, Löschen)
- Terminplan-Versionsmanagement: beliebig viele Versionen pro Projekt
- Versionen klonen – neue Planungsiterationen aus bestehenden ableiten
- Baseline-Markierung für Referenzversionen
- Terminplanpositionen: hierarchisch (Parent/Child), CRUD, Drag-Reorder
- Meilenstein-Markierung
- Status-Tracking: geplant / in Bearbeitung / abgeschlossen / verzögert / storniert
- Fortschrittsanzeige (0–100 %)
- Import: CSV und Excel (.xlsx/.xls) mit automatischer DE/EN Spaltenerkennung
- Export: Excel-Download pro Version
- Gantt-Diagramm: Tag-/Wochen-/Monatsansicht, farbig nach Status
- Versionsvergleich (Diff): hinzugefügt / entfernt / geändert zwischen zwei Versionen

### Technisch
- Backend: FastAPI 0.115, SQLAlchemy 2, Pydantic v2, Python 3.12
- Frontend: React 18, TypeScript, Vite, Tailwind CSS, TanStack Query, gantt-task-react
- Datenbank: SQLite (Dev) – DB-agnostisch via `DATABASE_URL` (PostgreSQL-ready)
- Deployment: Docker Compose + Azure ACI Deployment-Skript (`azure/deploy.sh`)
