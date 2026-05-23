# UX Design Concept: Störungsmanagement-Modul
## Terminplanung App — Fassadenbau

**Version:** 1.0  
**Datum:** 2026-05-22  
**Status:** Design Spec (approved for implementation)

---

## Table of Contents

1. [Information Architecture](#1-information-architecture)
2. [Navigation Recommendation](#2-navigation-recommendation)
3. [User Journey Maps](#3-user-journey-maps)
4. [Screen Flows & ASCII Wireframes](#4-screen-flows--ascii-wireframes)
5. [Traffic Light System (Nachweisampel)](#5-traffic-light-system-nachweisampel)
6. [Progressive Disclosure Pattern](#6-progressive-disclosure-pattern)
7. [Component Design Patterns](#7-component-design-patterns)
8. [Mobile Adaptations](#8-mobile-adaptations)
9. [Data Model Additions](#9-data-model-additions)

---

## 1. Information Architecture

### 1.1 Current App Structure

```
Terminplanung
├── [/]           Projekte (Dashboard)
│   └── [/projects/:id]   Projekt-Detail
│       ├── Tab: Versionen (Gantt, Positionen)
│       ├── Tab: E-Mails
│       └── Tab: Vergleich
│           └── [/projects/:id/versions/:vid]  Terminplan-Ansicht
└── [/settings]   Einstellungen
```

### 1.2 Proposed Structure with Störungsmanagement

```
Terminplanung
├── [/]           Projekte (Dashboard)
│   └── [/projects/:id]   Projekt-Detail
│       ├── Tab: Versionen
│       ├── Tab: E-Mails
│       ├── Tab: Vergleich
│       └── Tab: Störungen  ← NEW (project-scoped)
│           ├── [/projects/:id/stoerungen]
│           │   └── Störungsübersicht (Liste + Filterpanel)
│           ├── [/projects/:id/stoerungen/neu]
│           │   └── Schnellerfassung (5-Minuten-Formular)
│           ├── [/projects/:id/stoerungen/:sid]
│           │   └── Störung Detail
│           │       ├── Tab: Überblick
│           │       ├── Tab: Anzeigen (Behinderungsanzeigen)
│           │       ├── Tab: Tagesberichte
│           │       ├── Tab: Anlagen (Dateien, Fotos)
│           │       └── Tab: Kausalität
│           ├── [/projects/:id/stoerungen/:sid/anzeige/neu]
│           │   └── Behinderungsanzeige erstellen
│           └── [/projects/:id/tagesberichte]
│               └── Tagesberichte-Liste (Kalenderansicht)
│                   └── [/projects/:id/tagesberichte/neu]
│                       └── Tagesbericht-Formular
└── [/settings]   Einstellungen
    └── (existing company settings + new: Benutzer/Rollen - future)
```

### 1.3 Site Map Summary

The Störungsmanagement module is **project-scoped** — every disruption belongs to exactly one project. There is no global disruption list across projects (this keeps the mental model clean). Access is always via `Projekt → Tab "Störungen"`.

---

## 2. Navigation Recommendation

### Decision: Project-Scoped, not Top-Level

**Rationale:**

1. **Mental model match:** A Bauleiter thinks "Ich bin auf Baustelle X und habe eine Störung" — not "Ich habe eine Störung, welchem Projekt gehört sie?" The project is the primary context.

2. **Existing pattern:** The app already scopes Versionen, E-Mails and Vergleich inside a project. Störungen follow the same pattern.

3. **No cross-project workflows:** The VOB/B claim lifecycle (Behinderungsanzeige → Nachforderung) is always project-specific.

4. **Mobile entry point:** The Bauleiter opens their project first (bookmarked or via recent projects list) and taps "Störungen" — two taps to reach the right place.

**Rejected alternative:** Top-level "Störungen" nav item was considered but rejected because it forces the user to always filter by project, adding friction without benefit.

### Tab Order in Projekt-Detail

```
[ Versionen ] [ E-Mails ] [ Vergleich ] [ Störungen ]
                                                 ^^^
                                         New tab, last position
                                         Badge shows open count:
                                         Störungen (3)
```

The "Störungen" tab shows a badge with the count of non-abgeschlossene Störungen for the project. This creates a visible signal on the project overview without requiring a separate navigation level.

### New Global Quick-Access (optional, phase 2)

A floating "+" button on mobile (bottom-right, thumb zone) that opens a quick-action sheet:
- Neue Störung erfassen
- Tagesbericht für heute
- Datei hochladen

This allows the Bauleiter to reach the 5-minute form in one tap even before navigating into the correct project (the form then asks to confirm/select the project).

---

## 3. User Journey Maps

### Journey 1: Schnellerfassung Störung (Bauleiter, 5 Minuten)

**User:** Klaus Bauer, Obermonteur, steht auf der Baustelle  
**Gerät:** Samsung Galaxy A55, Arbeitshandschuhe, schlechtes WLAN  
**Ziel:** Eine Störung rechtssicher dokumentieren, bevor sie vergessen wird  
**Zeitbudget:** 5 Minuten, dann muss er zurück zur Mannschaft

| Schritt | Was der User tut | Was die App macht | Zu vermeiden |
|---------|-----------------|-------------------|--------------|
| 1 | Öffnet App, sieht Projektliste | Dashboard lädt schnell (cached), zeigt aktuelle Projekte | Lange Ladezeiten ohne Skeleton |
| 2 | Tippt auf sein Projekt "Rathausplatz, Block C" | Projekt-Detail öffnet, Tab "Störungen" mit Badge | Kein Deep-Link — macht Navigation komplizierter |
| 3 | Tippt auf Tab "Störungen" | Störungsübersicht öffnet, Ampeln sichtbar | Zu viele Infos auf einmal |
| 4 | Tippt auf "+ Neue Störung" | Schnellerfassung-Formular öffnet, Schritt 1/3 | Modalfenster auf Mobile — lieber eigene Seite |
| 5 | Tippt Kurzbezeichnung ein: "Kranstellung blockiert durch Fremdgewerk" | Autocomplete schlägt ähnliche Störungsarten vor | Pflichtfeldmarkierung ohne klare Reihenfolge |
| 6 | Wählt Störungsart aus Dropdown: "Behinderung durch Dritte" | Art gesetzt, nächste Pflichtfelder leuchten auf | Zu viele Felder gleichzeitig |
| 7 | Tippt kurze Beschreibung | Textarea wächst mit | Keyboard überdeckt Save-Button |
| 8 | Wählt betroffenen Terminplanpunkt aus | Suchbare Liste der Positionen aus aktuellem Terminplan | Lange flat-Liste ohne Suche |
| 9 | Setzt Beginn-Datum (auto: heute) | Datepicker öffnet, heute vorbelegt | Komplizierter Kalender-Picker |
| 10 | Tippt "Als Entwurf speichern" | Störung gespeichert, Bestätigung, zurück zur Übersicht | "Erfolgreich gespeichert" ohne Rückkehr-Navigation |
| **Ende** | Sieht Störung in Liste mit Ampel ROT | Ampel zeigt: 3 Pflichtfelder noch ausstehend | Unklares Status-Feedback |

**Pain Points (known, must avoid):**
- Touch targets < 44px (Finger mit Handschuhen)
- "Speichern"-Button unterhalb des Keyboards nicht sichtbar
- Datepicker mit kleinen Pfeilen statt großem Monatsgitter
- Pflichtfelder erst beim Speichern markiert (zu spät)
- Offline-Verlust: Formular weg nach Verbindungsverlust

---

### Journey 2: Vollständige Störungsakte aufbauen (Projektleiter)

**User:** Sandra Meier, Projektleiterin, Büro, Laptop  
**Ziel:** Entwurf-Störung vollständig ausarbeiten, Nachweisampel auf Grün bringen  
**Kontext:** Erhält E-Mail/Push "Klaus hat Störung als Entwurf gespeichert"

| Schritt | Was der User tut | Was die App macht |
|---------|-----------------|-------------------|
| 1 | Öffnet App, sieht Notification-Badge auf Projekt | Dashboard hebt Projekt hervor: "1 Entwurf Störung" |
| 2 | Öffnet Störungsübersicht | Rote Ampel sofort sichtbar bei der Entwurf-Störung |
| 3 | Öffnet Störung-Detail | Überblick-Tab, Nachweisampel zeigt Checkliste: 5/8 Felder ✓ |
| 4 | Füllt fehlende Felder aus: Verantwortungsbereich | Tooltip erklärt "§ 6 Abs. 1 VOB/B — wessen Sphäre?" |
| 5 | Setzt Leistungsbereitschaft: "Ja, Kolonne stand bereit" | Freitext + Ausweichleistung-Feld erscheint (conditional) |
| 6 | Beschreibt Sofortmaßnahmen | Pflichtfeld, min. 20 Zeichen |
| 7 | Öffnet Tab "Anlagen", lädt 3 Fotos hoch | Drag-and-Drop (Desktop), direkte Kamera (Mobile) |
| 8 | Sieht Ampel springen auf GELB | 7/8 Felder ✓ — fehlt: Kausalitätsdokumentation |
| 9 | Öffnet Tab "Kausalität" | Kausalitätsmatrix zeigt verknüpfte Positionen |
| 10 | Verknüpft 2 betroffene Terminplanpositionen | Ampel springt auf GRÜN |
| 11 | Klickt "Behinderungsanzeige generieren" | Schritt-für-Schritt-Dialog öffnet |
| 12 | Überprüft und ergänzt generierten Text | Rich-Text-Editor mit auto-ausgefüllten Feldern |
| 13 | Klickt "Zur Freigabe einreichen" | Status → "Wartet auf Freigabe", Technischer Leiter informiert |

**Pain Points (must avoid):**
- Ampel zeigt nur Gesamtstatus ohne Detail-Checkliste (unklar was fehlt)
- Kein Kontext zu VOB/B-Feldern (Pflicht ohne Erklärung)
- Kausalität als separates Tool, nicht in der Störungsakte
- Freigegebene Anzeige noch bearbeitbar (Beweiswert verloren)

---

### Journey 3: Behinderungsanzeige erstellen & versenden

**User:** Sandra Meier (Projektleiterin) oder Thomas König (Technischer Leiter)  
**Ziel:** Rechtssichere Behinderungsanzeige gem. § 6 Abs. 1 VOB/B versenden  
**Trigger:** Störungsampel ist GRÜN, "Behinderungsanzeige generieren" geklickt

| Schritt | Aktion | App-Verhalten |
|---------|--------|---------------|
| 1 | "Neue Behinderungsanzeige" | Wizard-Dialog: 4 Schritte sichtbar in Kopfzeile |
| 2 | Schritt 1: Empfänger | Vorbelegt mit Bauherr aus Projektstamm, editierbar |
| 3 | Schritt 2: Text prüfen | Auto-generierter Text aus Störungsfeldern, Rich-Text-Editor |
| 4 | Schritt 3: Anlagen | Zeigt alle Störungs-Anlagen, checkboxbasierte Auswahl |
| 5 | Schritt 4: Freigabe | Unterschriftsfeld (Name + Rolle + Datum) oder Bestätigungs-Checkbox |
| 6 | Klickt "Anzeige freigeben" | Dokument wird gesperrt (readonly), Timestamp gesetzt |
| 7 | Klickt "Als versendet markieren" | Dialog: Datum/Uhrzeit der Übersendung, Übersendungsart |
| 8 | Status springt auf "Versendet" | Ampel in der Störungsübersicht: GRÜN + Häkchen |
| 9 | Kann PDF herunterladen | Vollständige Akte als PDF mit Deckblatt |

**Immutability Rule:** Nach "Freigeben" sind alle Felder gesperrt. Korrekturen nur als neue Version mit Begründungsfeld. Dies ist UX-kritisch — das System muss den Beweiswert schützen.

---

### Journey 4: Tagesbericht erfassen (Bauleiter, täglich)

**User:** Klaus Bauer, Obermonteur, morgens auf der Baustelle  
**Ziel:** Tagesbericht für gestern oder heute in < 3 Minuten erfassen  
**Kontext:** Routine-Task, täglich vor Arbeitsbeginn oder abends

| Schritt | Aktion | App-Verhalten |
|---------|--------|---------------|
| 1 | Navigiert zu Projekt → Tab "Störungen" → "Tagesberichte" | Tagesberichtsliste öffnet, Kalenderansicht |
| 2 | Tippt "+" für neuen Bericht | Formular öffnet, Datum auto = gestern (sinnvoller Default) |
| 3 | Wetter auswählen | Icon-Grid: ☀️ 🌤️ ⛅ 🌧️ ❄️ — ein Tap |
| 4 | Temperatur eingeben (optional) | Zahlenfeld, Celsius |
| 5 | Personal: Anzahl Personen heute | Spinner +/- (große Buttons), kein Keyboard nötig |
| 6 | Geplante Leistung: was sollte gemacht werden | Vorbelegt mit Terminplanpositionen des Tages (auto) |
| 7 | Tatsächliche Leistung: was wurde gemacht | Freitext oder Position-Checkboxen |
| 8 | "Störungen heute?" | Toggle YES/NO — wenn YES: Störungen des Projekts wählbar |
| 9 | Auswahl der betroffenen Störungen | Multi-Select Liste (Checkboxen, je mit Ampel) |
| 10 | "Speichern" | Bericht gespeichert, Kalender zeigt grünen Punkt für Datum |

**Pain Points (must avoid):**
- Datum-Picker als Pflichtfeld mit komplex Kalender
- Freie Texteingabe für Wetter statt Quick-Picker
- Kein Link zwischen Tagesbericht und Störungen

---

### Journey 5: Störungsakte PDF exportieren

**User:** Sandra Meier, Projektleiterin, vor Sachverständigenmeeting  
**Ziel:** Vollständige Störungsdokumentation als druckbares PDF  
**Kontext:** Rechtlicher Konflikt, braucht lückenlose Dokumentation

| Schritt | Aktion | App-Verhalten |
|---------|--------|---------------|
| 1 | Öffnet Störungsübersicht | Liste mit allen Störungen |
| 2 | Selektiert 3 Störungen via Checkbox | Floating Action Bar erscheint: "3 ausgewählt — PDF Export" |
| 3 | Klickt "PDF Export" | Export-Dialog öffnet |
| 4 | Wählt Berichtstyp | Radio: Einzelstörung (je Seite) / Projektübersicht / Kausalitätsbericht |
| 5 | Wählt enthaltene Sektionen | Checkboxen: Stammblatt, Beschreibung, Anzeigen, Tagesberichte, Fotos, Kausalitätsmatrix |
| 6 | Vorschau | In-App PDF-Preview (wichtig für Vertrauen) |
| 7 | Herunterladen | Browser-Download, Dateiname: `Stoerungsakte_[Projekt]_[Datum].pdf` |

---

## 4. Screen Flows & ASCII Wireframes

### 4.1 Schnellerfassung — 5-Minuten-Flow (Mobile)

```
SCHRITT 1/3: GRUNDDATEN
┌─────────────────────────────────┐
│ ← Neue Störung        Entwurf   │  ← Header, immer sichtbar
├─────────────────────────────────┤
│ ●●●○○  Schritt 1 von 3          │  ← Fortschrittsanzeige
├─────────────────────────────────┤
│                                 │
│ KURZBEZEICHNUNG *               │
│ ┌─────────────────────────────┐ │
│ │ z.B. "Kran blockiert durch …│ │  ← Large font, big hit area
│ └─────────────────────────────┘ │
│                                 │
│ STÖRUNGSART *                   │
│ ┌─────────────────────────────┐ │
│ │ ▼ Bitte wählen…             │ │  ← Full-screen modal picker
│ └─────────────────────────────┘ │
│                                 │
│ HÄUFIGE ARTEN (Schnellauswahl): │
│ ┌──────────┐ ┌──────────────┐  │
│ │ Wetter   │ │ Fremdgewerk  │  │  ← Chip-style quick selects
│ └──────────┘ └──────────────┘  │
│ ┌──────────┐ ┌──────────────┐  │
│ │ Plan-    │ │ Bauherr-     │  │
│ │ verzug   │ │ Änderung     │  │
│ └──────────┘ └──────────────┘  │
│                                 │
│ BEGINN DER STÖRUNG *            │
│ ┌─────────────────────────────┐ │
│ │ Heute, 22.05.2026     ▼    │ │  ← Default: heute, änderbar
│ └─────────────────────────────┘ │
│                                 │
│   [         Weiter →         ]  │  ← Primary button, full width
│                                 │
│   Als Entwurf speichern         │  ← Secondary, unterhalb
└─────────────────────────────────┘


SCHRITT 2/3: AUSWIRKUNG
┌─────────────────────────────────┐
│ ← Neue Störung        Entwurf   │
├─────────────────────────────────┤
│ ●●●●○  Schritt 2 von 3          │
├─────────────────────────────────┤
│                                 │
│ BETROFFENER TERMINPLANPUNKT *   │
│ ┌─────────────────────────────┐ │
│ │ 🔍 Position suchen…         │ │  ← Searchable
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ □  2.1 Fassade EG Ost       │ │
│ │ □  2.2 Fassade EG West      │ │  ← Checkbox list from project
│ │ □  3.1 Fenster OG Nord      │ │
│ │ □  3.2 Fenster OG Süd       │ │
│ └─────────────────────────────┘ │
│                                 │
│ HINDERNDE WIRKUNG *             │
│ ┌─────────────────────────────┐ │
│ │                             │ │
│ │ Beschreiben Sie kurz die    │ │  ← Placeholder text helpful
│ │ Auswirkung auf den          │ │
│ │ Bauablauf…                  │ │
│ │                             │ │
│ └─────────────────────────────┘ │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ VOB/B § 6 Abs. 1: Die       │ │
│ │ hindernde Wirkung muss      │ │  ← Legal hint, collapsible
│ │ konkret beschrieben werden. │ │
│ └─────────────────────────────┘ │
│                                 │
│   [         Weiter →         ]  │
│   Als Entwurf speichern         │
└─────────────────────────────────┘


SCHRITT 3/3: BESTÄTIGUNG & SPEICHERN
┌─────────────────────────────────┐
│ ← Neue Störung        Entwurf   │
├─────────────────────────────────┤
│ ●●●●●  Schritt 3 von 3          │
├─────────────────────────────────┤
│                                 │
│ ZUSAMMENFASSUNG                 │
│ ┌─────────────────────────────┐ │
│ │ Bezeichnung:                │ │
│ │ Kran blockiert durch        │ │
│ │ Fremdgewerk                 │ │
│ │                             │ │
│ │ Art:  Behinderung Dritte    │ │
│ │ Beginn:  22.05.2026         │ │
│ │ Betrifft: 2.1 Fassade EG    │ │
│ └─────────────────────────────┘ │
│                                 │
│ NACHWEISAMPEL — VORSCHAU        │
│ ┌─────────────────────────────┐ │
│ │  🔴 ENTWURF                 │ │
│ │  ✓ Kurzbezeichnung          │ │
│ │  ✓ Störungsart              │ │
│ │  ✓ Beginn                   │ │
│ │  ✓ Terminplanpunkt          │ │
│ │  ✓ Hindernde Wirkung        │ │
│ │  ○ Verantwortungsbereich    │ │  ← Still missing
│ │  ○ Leistungsbereitschaft    │ │  ← Still missing
│ │  ○ Sofortmaßnahmen          │ │  ← Still missing
│ └─────────────────────────────┘ │
│                                 │
│ → Projektleiter wird informiert │
│                                 │
│   [    Als Entwurf speichern ]  │  ← Primary
│   [    Jetzt vollständig     ]  │  ← Sekundär (mehr Zeit?)
│        ausfüllen                │
└─────────────────────────────────┘
```

---

### 4.2 Störungsübersicht (Desktop/Tablet)

```
┌──────────────────────────────────────────────────────────────────────┐
│ Terminplanung  │ Projekte  │ Einstellungen                           │
├──────────────────────────────────────────────────────────────────────┤
│  Rathausplatz, Block C                              [+ Neue Störung] │
│  ┌──────────────────────────────────────────────────────────────────┐│
│  │ Versionen │ E-Mails │ Vergleich │ Störungen (4)                  ││
│  └──────────────────────────────────────────────────────────────────┘│
│                                                                      │
│  STÖRUNGEN                                                           │
│  ┌──── Filter ─────────────────────────────────────────────────────┐ │
│  │ Status: [Alle ▼]   Art: [Alle ▼]   Ampel: [🟢🟡🔴]   [Suche…] │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │ □ │ Ampel │ Nr.  │ Kurzbezeichnung      │ Art       │ Beginn   │ │
│  │   │       │      │                      │           │ Status   │ │
│  ├───┼───────┼──────┼──────────────────────┼───────────┼──────────┤ │
│  │ □ │  🔴   │ S-04 │ Kran blockiert durch │ Behinderung│ 22.05.  │ │
│  │   │       │      │ Fremdgewerk          │ Dritte    │ Entwurf  │ │
│  ├───┼───────┼──────┼──────────────────────┼───────────┼──────────┤ │
│  │ □ │  🟡   │ S-03 │ Planlieferverzug     │ Planver-  │ 15.05.  │ │
│  │   │       │      │ Fensterelemente       │ zug       │ In Bearb.│ │
│  ├───┼───────┼──────┼──────────────────────┼───────────┼──────────┤ │
│  │ □ │  🟢   │ S-02 │ Starkregen 18.04.    │ Wetter-   │ 18.04.  │ │
│  │   │       │      │                      │ ereignis  │ Angezeigt│ │
│  ├───┼───────┼──────┼──────────────────────┼───────────┼──────────┤ │
│  │ □ │  🟢   │ S-01 │ Bauherrnachtr. Glas- │ Leistungs-│ 03.03.  │ │
│  │   │       │      │ fassade Typ B statt A│ änderung  │ Abgeschl.│ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  [Ausgewählt: 0]                     Seite 1/1 — 4 Störungen gesamt │
└──────────────────────────────────────────────────────────────────────┘
```

**Ampel-Bedeutung in der Liste:**
- 🔴 ROT — Entwurf oder kritische Felder fehlen, keine Behinderungsanzeige möglich
- 🟡 GELB — Basisfelder vollständig, Kausalität oder Anlagen fehlen noch
- 🟢 GRÜN — Vollständig nachgewiesen; Behinderungsanzeige wurde erstellt oder kann sofort erstellt werden

---

### 4.3 Störung Detail — Überblick-Tab (Desktop)

```
┌──────────────────────────────────────────────────────────────────────┐
│ ← Zurück zur Übersicht                          [Bearbeiten] [...]   │
├──────────────────────────────────────────────────────────────────────┤
│  S-04 — Kran blockiert durch Fremdgewerk                            │
│  Status: ● Entwurf           Erstellt: K. Bauer, 22.05.2026 09:14  │
├──────────────────────────────────────────────────────────────────────┤
│  [ Überblick ] [ Anzeigen (0) ] [ Tagesberichte (3) ] [ Anlagen (2) ] [ Kausalität ]
├───────────────────────────────────────┬──────────────────────────────┤
│                                       │                              │
│  STÖRUNGSDETAILS                      │  NACHWEISAMPEL               │
│  ─────────────────────────────────── │  ─────────────────────────── │
│  Kurzbezeichnung:                     │  🔴 Nicht nachweisbereit     │
│  Kran blockiert durch Fremdgewerk    │                              │
│                                       │  Pflichtfelder (5/8):        │
│  Störungsart:                         │  ✓ Kurzbezeichnung           │
│  Behinderung durch Dritte (VOB/B)    │  ✓ Störungsart               │
│                                       │  ✓ Beginn                    │
│  Beginn der Störung:                  │  ✓ Terminplanpunkt           │
│  22.05.2026                           │  ✓ Hindernde Wirkung         │
│                                       │  ○ Verantwortungsbereich     │
│  Ende der Störung:                    │  ○ Leistungsbereitschaft     │
│  — (noch andauernd)                   │  ○ Sofortmaßnahmen           │
│                                       │                              │
│  Betroffener Terminplanpunkt:         │  Anlagen (1/2):              │
│  2.1 Fassade EG Ost                   │  ✓ mind. 1 Datei/Foto        │
│                                       │  ○ Schriftl. Dokumentation   │
│  Hindernde Wirkung:                   │                              │
│  Der Fremdunternehmer XY blockiert   │  Kausalität (0/1):           │
│  den Stellplatz des Turmdrehkrans.   │  ○ Kausalverknüpfung         │
│  Arbeiten an 2.1 ab 08:00 nicht      │                              │
│  möglich.                             │  ─────────────────────────── │
│                                       │  [Behinderungsanzeige        │
│  Verantwortungsbereich:               │   generieren]  ← disabled    │
│  — Noch nicht ausgefüllt —            │  (erst bei 🟢 aktiv)         │
│  [Jetzt ausfüllen]                    │                              │
│                                       │                              │
│  Leistungsbereitschaft:               │  LETZTE ÄNDERUNG             │
│  — Noch nicht ausgefüllt —            │  ─────────────────────────── │
│  [Jetzt ausfüllen]                    │  22.05.2026 09:14 K. Bauer  │
│                                       │  (Entwurf angelegt)          │
│  Sofortmaßnahmen:                     │                              │
│  — Noch nicht ausgefüllt —            │                              │
│  [Jetzt ausfüllen]                    │                              │
│                                       │                              │
│  Ausweichleistungen:                  │                              │
│  — Noch nicht ausgefüllt —            │                              │
│                                       │                              │
└───────────────────────────────────────┴──────────────────────────────┘
```

---

### 4.4 Tagesbericht Formular (Mobile)

```
┌─────────────────────────────────┐
│ ← Tagesbericht           🗄 ✓   │
├─────────────────────────────────┤
│ DATUM                           │
│ ┌─────────────────────────────┐ │
│ │ ◀ Donnerstag, 21.05.2026 ▶ │ │  ← Vortag als Default
│ └─────────────────────────────┘ │
│                                 │
│ WITTERUNG                       │
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐   │
│ │ ☀️  │ │ ⛅ │ │ 🌧️ │ │ ❄️  │   │  ← Big icon picker
│ └────┘ └────┘ └────┘ └────┘   │
│  ┌───────────────────────────┐  │
│  │ Temp: [  14  ] °C         │  │  ← Optional
│  └───────────────────────────┘  │
│                                 │
│ PERSONAL                        │
│ ┌─────────────────────────────┐ │
│ │   [ − ]    7    [ + ]       │ │  ← Spinner, large buttons
│ └─────────────────────────────┘ │
│ Kolonnenführer anwesend? ✓/✗    │
│                                 │
│ GEPLANTE LEISTUNG               │
│ ┌─────────────────────────────┐ │
│ │ ☑ 2.1 Fassade EG Ost       │ │  ← Auto aus Terminplan
│ │ ☑ 2.2 Fassade EG West      │ │
│ │ ☐ 3.1 Fenster OG Nord      │ │
│ └─────────────────────────────┘ │
│                                 │
│ TATSÄCHLICHE LEISTUNG           │
│ ┌─────────────────────────────┐ │
│ │ Fassade EG Ost: 60% fertig │ │  ← Freitext oder %
│ │ EG West: nicht gestartet   │ │
│ └─────────────────────────────┘ │
│                                 │
│ STÖRUNGEN HEUTE?                │
│   ○ Nein     ● Ja              │  ← Toggle
│                                 │
│ VERKNÜPFTE STÖRUNGEN            │
│ ┌─────────────────────────────┐ │
│ │ ☑ S-04 🔴 Kran blockiert   │ │
│ │ ☐ S-03 🟡 Planlieferverzug │ │
│ └─────────────────────────────┘ │
│                                 │
│ SONSTIGE BEMERKUNGEN            │
│ ┌─────────────────────────────┐ │
│ │ optional…                   │ │
│ └─────────────────────────────┘ │
│                                 │
│   [       Bericht speichern  ]  │  ← Sticky, always visible
└─────────────────────────────────┘
```

---

### 4.5 Behinderungsanzeige — Wizard (Desktop/Tablet)

```
┌──────────────────────────────────────────────────────────────────────┐
│ Behinderungsanzeige erstellen — S-04                                 │
│ ═══════════════════════════════════════════════════════════════════  │
│  1 Empfänger   ─────►  2 Text   ─────►  3 Anlagen  ─────►  4 Freigabe │
│  ●              ─────   ○         ─────   ○           ─────   ○      │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  EMPFÄNGER                                                           │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ AN:   Muster Bauherr GmbH, Herr Müller                        │ │
│  │       [aus Projektstamm übernommen — änderbar]                 │ │
│  ├────────────────────────────────────────────────────────────────┤ │
│  │ CC:   [+ Empfänger hinzufügen]                                 │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  BEZUG                                                               │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ Bauvorhaben: Rathausplatz, Block C                             │ │
│  │ Vertrag Nr.: V-2025-042                                        │ │
│  │ Datum:       22.05.2026                                        │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  REFERENZ-PARAGRAF                                                   │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ ● § 6 Abs. 1 VOB/B — Behinderungsanzeige (Standard)           │ │
│  │ ○ § 4 Abs. 3 VOB/B — Bedenkenanmeldung                        │ │
│  │ ○ § 2 Abs. 5 VOB/B — Nachtrag-Ankündigung                     │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│                              [Abbrechen]  [Weiter: Text prüfen →]   │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 5. Traffic Light System (Nachweisampel)

### 5.1 Design-Philosophie

Die Nachweisampel ist das zentrale UX-Konzept des Moduls. Sie kommuniziert in einem Blick, ob eine Störungsakte gerichtsverwertbar ist. Sie erscheint an drei Stellen:

1. **Störungsübersicht** — als Icon-Spalte in der Tabelle
2. **Störung Detail** — als prominentes Widget in der rechten Seitenleiste
3. **Tab-Badge** in der Projektnavigation — aggregierte Warnung

### 5.2 Farbzustände

| Status | Farbe | Icon | Bedeutung | Behinderungsanzeige |
|--------|-------|------|-----------|---------------------|
| Entwurf | 🔴 ROT | `●` (blinkend) | Pflichtfelder fehlen. Nicht nachweisbereit. | Nicht möglich |
| In Bearbeitung | 🟡 GELB | `●` | Basisfelder vollständig, Nachweise/Kausalität unvollständig | Nicht möglich |
| Nachweisbereit | 🟢 GRÜN | `●` | Alle Felder ausgefüllt, Anlagen vorhanden | Möglich |
| Angezeigt | 🟢 GRÜN + `✓` | `✓` | Behinderungsanzeige versendet | Abgeschlossen |
| Abgeschlossen | ⚫ GRAU | `✓` | Störung abgeschlossen und archiviert | Archiviert |

### 5.3 Ampel-Checkliste (Detail Widget)

Das Ampel-Widget im Detail-Tab zeigt eine interaktive Checkliste. Jeder Punkt ist ein Link zu dem betreffenden Feld:

```
NACHWEISAMPEL
─────────────────────────────────
  🔴  Nicht nachweisbereit

  PFLICHTFELDER (§ 6 Abs. 1 VOB/B)
  ✓  Kurzbezeichnung
  ✓  Störungsart
  ✓  Beginn der Störung
  ✓  Betroffener Terminplanpunkt
  ✓  Hindernde Wirkung (konkret)
  ○  Verantwortungsbereich          → [Ausfüllen]
  ○  Leistungsbereitschaft          → [Ausfüllen]
  ○  Sofortmaßnahmen/Ausweichen    → [Ausfüllen]

  ANLAGEN
  ✓  Min. 1 Foto/Dokument
  ○  Schriftl. Dokumentation        → [Hochladen]

  KAUSALITÄT
  ○  Terminliche Auswirkung         → [Verknüpfen]
─────────────────────────────────
  [Behinderungsanzeige generieren]
  (verfügbar wenn 🟢)
```

### 5.4 Schwellenwerte (Ampel-Logik)

```
ROT   → wenn: irgendein VOB-Pflichtfeld fehlt
GELB  → wenn: alle 8 VOB-Pflichtfelder ausgefüllt
         ABER: (keine Anlagen ODER keine Kausalverknüpfung)
GRÜN  → wenn: alle Pflichtfelder + min. 1 Anlage + min. 1 Kausalverknüpfung
GRÜN✓ → wenn: Behinderungsanzeige erstellt + versendet
```

### 5.5 Ampel-Präsenz im UI

Die Ampel erscheint **nicht** als störendes Alert oder Banner. Sie ist:
- In der Tabellenliste: als farbiger Kreis-Icon (12px, erste Spalte)
- Im Detail: als Widget in der rechten Sidebar (immer sichtbar beim Scrollen → `position: sticky`)
- Im Tab-Header: als farbiger Dot neben dem Tab-Label wenn Gesamtstatus < GRÜN

Was die Ampel NICHT tut:
- Keine modalen Warnungen beim Speichern
- Kein Blockieren des "Entwurf speichern"-Buttons
- Keine roten Fehlermeldungen bei noch-nicht-ausgefüllten optionalen Feldern

---

## 6. Progressive Disclosure Pattern

### 6.1 Das Kernprinzip

Der Bauleiter kann eine Störung in 5 Minuten als Entwurf anlegen. Der Projektleiter vervollständigt die Akte später am Schreibtisch. Das System führt ihn dabei, statt ihn zu blockieren.

### 6.2 Drei Vervollständigungs-Ebenen

```
EBENE 1 — Schnellerfassung (5 Min, Mobile, Bauleiter)
  Pflichtfelder:
  • Kurzbezeichnung
  • Störungsart
  • Beginn-Datum
  • Betroffener Terminplanpunkt
  • Hindernde Wirkung (Kurztext)
  
  Ergebnis: Status "Entwurf", Ampel 🔴

EBENE 2 — Vollständige Akte (20-30 Min, Desktop, Projektleiter)
  Zusätzliche Felder:
  • Verantwortungsbereich (Auftraggeber- / Auftragnehmer-Sphäre)
  • Leistungsbereitschaft (war Kolonne einsatzbereit?)
  • Ausweichleistungen (was wurde stattdessen gemacht?)
  • Sofortmaßnahmen (was wurde unternommen?)
  • Ende der Störung (oder "andauernd")
  • Anlagen hochladen (mind. 1)
  • Kausalverknüpfung mit Terminplanpositionen
  
  Ergebnis: Status "In Bearbeitung" oder "Nachweisbereit", Ampel 🟡/🟢

EBENE 3 — Behinderungsanzeige (5-10 Min, Projektleiter / Techn. Leiter)
  • Empfänger prüfen
  • Text überprüfen und ggf. anpassen
  • Anlagen auswählen
  • Freigeben + Als versendet markieren
  
  Ergebnis: Status "Angezeigt", Ampel 🟢✓, Dokument gesperrt
```

### 6.3 "Jetzt ausfüllen"-Links

Wenn ein Feld in der Detailansicht leer ist, zeigt es einen Inline-Link `[Jetzt ausfüllen]`. Dieser öffnet das Feld direkt in einen Inline-Editier-Modus (kein Modal, kein Seitenwechsel). So kann der Projektleiter sequentiell alle Felder abarbeiten, ohne die Übersicht zu verlieren.

### 6.4 Entwurf vs. Gespeichert

Es gibt keinen Unterschied zwischen "Entwurf" und "gespeichert" aus technischer Sicht — alle Störungen werden sofort gespeichert. "Entwurf" ist ein Status-Label, das signalisiert: "Diese Störung ist noch nicht vollständig dokumentiert." Der Bauleiter verliert nie Daten durch Verbindungsabbruch.

**Offline-Verhalten:** Das Formular speichert im Browser-LocalStorage und synchronisiert beim nächsten Online-Moment. Sichtbarer Indikator: kleines Cloud-Icon mit "nicht synchronisiert"-Zustand.

---

## 7. Component Design Patterns

### 7.1 Bestehende Komponenten (wiederverwenden)

| Komponente | Bestehende Datei | Wiederverwendung |
|------------|-----------------|-----------------|
| Layout (Header, Nav) | `components/Layout.tsx` | Direkt — Tab "Störungen" in bestehende Projektseite |
| Modal | `components/Modal.tsx` | Für Lösch-Bestätigungen, Status-Änderungen |
| Tab-Navigation | Pattern aus `ProjectDetail.tsx` (`activeTab` State) | Gleicher Tab-Switch-Pattern für Störung-Detail |
| Status-Badges | `STATUS_COLORS` in `types/index.ts` | Neue `STOERUNG_STATUS_COLORS` daneben |
| Toast-Nachrichten | `react-hot-toast` | Direkt |
| Form-Inputs (`.input`, `.label` CSS-Klassen) | `index.css` | Direkt |

### 7.2 Neue Komponenten (erstellen)

| Komponente | Datei | Beschreibung |
|------------|-------|-------------|
| `Nachweisampel` | `components/stoerungen/Nachweisampel.tsx` | Traffic-light widget mit Checkliste |
| `StoerungCard` | `components/stoerungen/StoerungCard.tsx` | Compact card für Liste/Mobile |
| `StoerungForm` | `components/stoerungen/StoerungForm.tsx` | Multi-step Schnellerfassungsformular |
| `StepIndicator` | `components/stoerungen/StepIndicator.tsx` | Fortschrittsanzeige (●●●○○) |
| `QuickTypeChips` | `components/stoerungen/QuickTypeChips.tsx` | Chip-Grid für häufige Störungsarten |
| `WetterPicker` | `components/tagesberichte/WetterPicker.tsx` | Icon-Grid Wetterwahl |
| `PersonalSpinner` | `components/tagesberichte/PersonalSpinner.tsx` | +/- Spinner für Personalzahl |
| `KausalitaetsMatrix` | `components/stoerungen/KausalitaetsMatrix.tsx` | Tabelle: Störungen ↔ Positionen |
| `BehinderungsanzeigenWizard` | `components/stoerungen/BehinderungsanzeigenWizard.tsx` | 4-Schritt Wizard |
| `PositionSelector` | `components/stoerungen/PositionSelector.tsx` | Suchbare Liste der Terminplanpositionen |
| `AuditTrailRow` | `components/stoerungen/AuditTrailRow.tsx` | "Erstellt/Geändert von + Timestamp" |
| `OfflineIndicator` | `components/OfflineIndicator.tsx` | Cloud-Sync-Status Icon |

### 7.3 Neue Typen (in `types/index.ts` oder `types/stoerungen.ts`)

```typescript
// Neue Datei: types/stoerungen.ts

export type StoerungsArt =
  | "behinderung_dritte"
  | "witterung"
  | "planverzug"
  | "bauherr_aenderung"
  | "leistungsaenderung"
  | "sonstiges";

export type StoerungsStatus =
  | "entwurf"
  | "in_bearbeitung"
  | "nachweisbereit"
  | "angezeigt"
  | "abgeschlossen";

export type NachweisampelColor = "rot" | "gelb" | "gruen" | "gruen_haken" | "grau";

export interface Stoerung {
  id: number;
  project_id: number;
  nummer: string;              // S-04
  kurzbezeichnung: string;
  art: StoerungsArt;
  status: StoerungsStatus;
  beginn_datum: string;
  ende_datum?: string;
  ist_andauernd: boolean;
  terminplan_position_ids: number[];
  hindernde_wirkung: string;
  verantwortungsbereich?: string;
  leistungsbereitschaft?: string;
  ausweichleistungen?: string;
  sofortmassnahmen?: string;
  ampel: NachweisampelColor;   // berechnet vom Backend
  created_by: string;
  created_at: string;
  updated_by: string;
  updated_at: string;
}

export interface Behinderungsanzeige {
  id: number;
  stoerung_id: number;
  nummer: string;              // BA-04-01
  empfaenger: string;
  cc?: string;
  bezug_paragraf: string;      // "§ 6 Abs. 1 VOB/B"
  text: string;
  anlagen_ids: number[];
  freigegeben_von?: string;
  freigegeben_am?: string;
  versendet_am?: string;
  uebersendungsart?: string;   // "E-Mail", "Fax", "Post"
  gesperrt: boolean;           // true nach Freigabe (immutable)
  created_at: string;
  updated_at: string;
}

export interface Tagesbericht {
  id: number;
  project_id: number;
  datum: string;
  wetter: "sonnig" | "bewoelkt" | "regen" | "schnee" | "sturm";
  temperatur_celsius?: number;
  personal_anzahl: number;
  kolonnen_fuehrer_anwesend: boolean;
  geplante_leistung: string;
  tatsaechliche_leistung: string;
  stoerung_ids: number[];
  sonstige_bemerkungen?: string;
  created_by: string;
  created_at: string;
}

export const STOERUNGSART_LABELS: Record<StoerungsArt, string> = {
  behinderung_dritte: "Behinderung durch Dritte",
  witterung: "Witterungsereignis",
  planverzug: "Planlieferverzug",
  bauherr_aenderung: "Bauherrnänderung (§ 1 Abs. 3 VOB/B)",
  leistungsaenderung: "Leistungsänderung (§ 2 Nr. 5 VOB/B)",
  sonstiges: "Sonstiges",
};

export const STOERUNGSART_VOB: Record<StoerungsArt, string> = {
  behinderung_dritte: "§ 6 Abs. 1 VOB/B",
  witterung: "§ 6 Abs. 2 Nr. 2 VOB/B",
  planverzug: "§ 6 Abs. 1 VOB/B",
  bauherr_aenderung: "§ 1 Abs. 3 i.V.m. § 6 VOB/B",
  leistungsaenderung: "§ 2 Nr. 5 VOB/B",
  sonstiges: "§ 6 VOB/B",
};

export const STOERUNGSSTATUS_LABELS: Record<StoerungsStatus, string> = {
  entwurf: "Entwurf",
  in_bearbeitung: "In Bearbeitung",
  nachweisbereit: "Nachweisbereit",
  angezeigt: "Angezeigt",
  abgeschlossen: "Abgeschlossen",
};
```

---

## 8. Mobile Adaptations

### 8.1 Touch Target Sizing

**Minimum: 48px × 48px** für alle interaktiven Elemente (überschreibt Tailwind defaults).

Kritische Bereiche:
- Störungsart-Chips: min `h-12` (48px), ausreichend Abstand zwischen Chips
- Datepicker-Pfeile: ersetzt durch vollflächige `<` / `>` Buttons
- Tagesbericht-Wetter-Icons: min `56px × 56px` Icon-Buttons
- Spinner +/- Buttons: `64px × 64px` (Daumen mit Handschuh)
- Listen-Zeilen in Störungsübersicht: min `56px` Zeilenhöhe

### 8.2 Thumb Zone Map (Mobile, Hochformat)

```
┌─────────────────────┐
│ ← Header            │  SCHWER erreichbar (oben)
│ Projekt-Titel       │  → Nur Navigation, keine kritischen Actions
├─────────────────────┤
│                     │
│  Content-Bereich    │  MITTEL — scrollbarer Inhalt
│  (Liste, Felder)    │
│                     │
├─────────────────────┤
│                     │  GUT erreichbar (Daumen-Zone)
│ [  Primary Button ] │  → Primäre Aktionen HIER
│                     │
└─────────────────────┘
```

**Implementierung:**
- Primary-Buttons (Weiter, Speichern) sind `position: sticky` am unteren Rand
- Sekundäre Aktionen (Abbrechen, Entwurf) direkt darüber
- Keine wichtigen Aktionen in der oberen Navigation-Bar

### 8.3 Keyboard-Overlap Prevention

Wenn eine `<textarea>` fokussiert wird:
- Das Formular scrollt automatisch so, dass das aktive Feld + "Speichern"-Button sichtbar bleiben
- Nutze `scrollIntoView({ behavior: 'smooth', block: 'center' })` bei Focus-Events
- iOS Safari-spezifisch: `visualViewport`-API für korrekte Keyboard-Höhe

### 8.4 Offline-First Strategie

**Service Worker:** Formulardaten werden per `localStorage` zwischengespeichert, bevor sie die API erreichen.

```
USER ACTION → localStorage (sofort) → API (wenn online)
                                    → Queue (wenn offline)
                                         → Retry beim nächsten Online-Event
```

**UI-Feedback:**
```
┌────────────────────────────────────┐
│ 🔴 Offline — Entwurf lokal gespeichert │  ← Toast, 4 Sek.
└────────────────────────────────────┘

                    später:

┌────────────────────────────────────┐
│ ✓ Online — Störung synchronisiert  │  ← Toast, 2 Sek.
└────────────────────────────────────┘
```

Offline-erkennbare Felder: Kurzbezeichnung, Störungsart, Beginn, Terminplanpunkt, Hindernde Wirkung (Ebene 1). Fotos-Upload nur bei Online.

### 8.5 Mobile Navigation Pattern

Auf Smartphones (< 768px) wird der Störung-Detail-Screen vereinfacht:

```
MOBILE STÖRUNG DETAIL:
┌─────────────────────────────────┐
│ ← S-04  Kran blockiert…  🔴  ⋮  │  ← Ampel + Menu-Icon
├─────────────────────────────────┤
│ ┌─────┐ ┌──────┐ ┌────┐ ┌───┐  │
│ │Überb│ │Anzeig│ │Tage│ │Anl│  │  ← Scrollable Tab-Bar
│ └─────┘ └──────┘ └────┘ └───┘  │
│                                 │
│ [Tab-Inhalt, gescrollt]         │
│                                 │
│                                 │
└─────────────────────────────────┘
```

Tabs scrollen horizontal, kein Text-Overflow. "Kausalität" Tab wird auf Mobile unter "Anlagen" sortiert (weniger häufig genutzt).

---

## 9. Data Model Additions

### 9.1 Backend Route-Struktur (neu)

```
GET    /api/projects/:id/stoerungen
POST   /api/projects/:id/stoerungen
GET    /api/projects/:id/stoerungen/:sid
PUT    /api/projects/:id/stoerungen/:sid
DELETE /api/projects/:id/stoerungen/:sid

GET    /api/projects/:id/stoerungen/:sid/anlagen
POST   /api/projects/:id/stoerungen/:sid/anlagen
DELETE /api/projects/:id/stoerungen/:sid/anlagen/:aid

GET    /api/projects/:id/stoerungen/:sid/anzeigen
POST   /api/projects/:id/stoerungen/:sid/anzeigen
GET    /api/projects/:id/stoerungen/:sid/anzeigen/:bid
PUT    /api/projects/:id/stoerungen/:sid/anzeigen/:bid  ← nur wenn !gesperrt
POST   /api/projects/:id/stoerungen/:sid/anzeigen/:bid/freigeben
POST   /api/projects/:id/stoerungen/:sid/anzeigen/:bid/versendet

GET    /api/projects/:id/tagesberichte
POST   /api/projects/:id/tagesberichte
GET    /api/projects/:id/tagesberichte/:tid
PUT    /api/projects/:id/tagesberichte/:tid

GET    /api/projects/:id/stoerungen/export/pdf    (POST mit Body: ids[], sections[])
GET    /api/projects/:id/stoerungen/kausalitaet   (Matrix-View)
```

### 9.2 Ampel-Berechnung (Backend)

Die Ampel-Farbe wird server-seitig berechnet und im `GET`-Response mitgeliefert. Der Client rechnet sie nicht nach. Das stellt Konsistenz sicher und ermöglicht Server-seitige Validierung für die Behinderungsanzeige.

```python
def berechne_ampel(stoerung: Stoerung) -> str:
    pflichtfelder = [
        stoerung.kurzbezeichnung,
        stoerung.art,
        stoerung.beginn_datum,
        stoerung.terminplan_position_ids,  # mind. 1
        stoerung.hindernde_wirkung,
        stoerung.verantwortungsbereich,
        stoerung.leistungsbereitschaft,
        stoerung.sofortmassnahmen,
    ]
    if not all(pflichtfelder):
        return "rot"
    
    hat_anlagen = len(stoerung.anlagen) > 0
    hat_kausalitaet = len(stoerung.kausalitaet_links) > 0
    
    if not hat_anlagen or not hat_kausalitaet:
        return "gelb"
    
    hat_anzeige = any(a.versendet_am for a in stoerung.anzeigen)
    if hat_anzeige:
        return "gruen_haken"
    
    return "gruen"
```

### 9.3 Audit Trail

Jede Änderung an Störung, Behinderungsanzeige, Tagesbericht wird in einer `audit_log`-Tabelle festgehalten:

```
audit_log:
  id, entity_type, entity_id, action (create/update/delete),
  changed_by, changed_at, old_values (JSON), new_values (JSON)
```

Im UI wird das Audit-Trail als aufklappbarer "Verlauf"-Bereich am Ende des Detail-Tabs angezeigt. Es ist nicht prominent, aber immer erreichbar.

---

## Anhang A: Störungsarten und VOB/B-Verweise

| Störungsart | Label (DE) | VOB/B-Referenz | Hinweis-Text |
|-------------|-----------|----------------|--------------|
| behinderung_dritte | Behinderung durch Dritte | § 6 Abs. 1 | Anzeige unverzüglich erforderlich |
| witterung | Witterungsereignis | § 6 Abs. 2 Nr. 2 | Außergewöhnliche Witterung nachweisen |
| planverzug | Planlieferverzug | § 6 Abs. 1 | Konkrete Pläne benennen |
| bauherr_aenderung | Bauherrnänderung | § 1 Abs. 3 i.V.m. § 6 | Leistungsänderungsanordnung dokumentieren |
| leistungsaenderung | Leistungsänderung | § 2 Nr. 5 | Nachtrag erforderlich |
| sonstiges | Sonstiges | § 6 VOB/B | Genaue Rechtsgrundlage bei Anzeige angeben |

---

## Anhang B: Implementierungs-Reihenfolge (MVP)

1. **Sprint 1** — Datenbankmodell + Backend-API (Störungen CRUD, Ampelberechnung)
2. **Sprint 2** — Schnellerfassung Mobile (5-Minuten-Flow, Schritte 1-3)
3. **Sprint 3** — Störungsübersicht + Störung-Detail (Überblick-Tab + Nachweisampel)
4. **Sprint 4** — Anlagen-Upload + Tagesbericht-Formular
5. **Sprint 5** — Behinderungsanzeige-Wizard + Freigabe/Sperren
6. **Sprint 6** — PDF-Export, Kausalitätsmatrix, Offline-Support
7. **Sprint 7** — Rollen/Berechtigungen, E-Mail-Benachrichtigungen
