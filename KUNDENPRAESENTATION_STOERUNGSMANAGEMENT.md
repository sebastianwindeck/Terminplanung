# Störungsmanagement – Digitales Behinderungsmanagement für den Fassadenbau

**Terminplanung · Modulbeschreibung für Kunden**
*Version 1.0 · Mai 2026*

---

## Überblick

Das neue **Störungsmanagement-Modul** erweitert die Terminplanung-App um eine vollständige digitale Lösung zur Erfassung, Dokumentation und rechtssicheren Nachweisführung von Behinderungen und Störungen im Bauprojekt.

Es richtet sich an Bauleiter, Obermonteure und kaufmännische Projektleiter, die Behinderungen nach **VOB/B § 6** und **BGB § 642** rechtzeitig anzeigen und lückenlos dokumentieren müssen.

---

## Kernfunktionen im Überblick

### 1. Störungserfassung

Jede Störung wird mit wenigen Klicks angelegt:

| Feld | Beschreibung |
|---|---|
| Störungsart | 20 vordefinierte Kategorien (z. B. Fehlende Vorleistung, Witterung, Planänderung) |
| Verantwortungsbereich | 12 Zuordnungen (Auftraggeber, Fachplanung, Behörde, etc.) |
| Zeitraum | Störungsbeginn / -ende mit automatischer Dauerberechnung |
| Beschreibung | Freitext mit hindernder Wirkung und Sofortmaßnahme |
| Kritikalität | Niedrig / Mittel / Hoch / Kritisch |

**Ziel:** Ersterfassung in unter 5 Minuten direkt auf der Baustelle (mobiloptimiert).

---

### 2. Behinderungsanzeigen (VOB/B § 6)

Das Modul unterstützt die gesamte Anzeige-Kette:

- **Erstanzeige** – schriftliche Behinderungsmeldung an den Auftraggeber
- **Zwischenmeldung** – Statusupdate bei andauernder Störung
- **Behinderungsabmeldung** – formale Aufhebung der Behinderung

Jede Anzeige wird nach dem Versenden **gesperrt** (unveränderlich) – für rechtssichere, nachvollziehbare Dokumentation. Versanddatum und -status werden protokolliert.

---

### 3. Status-Workflow

Störungen durchlaufen einen kontrollierten Lebenszyklus:

```
Entwurf → Offen → Angezeigt → In Beobachtung → Teilweise behoben
       → Behoben → Abgemeldet → In Anspruchsprüfung → Abgeschlossen
```

Statuswechsel sind nur in definierten Richtungen erlaubt. Das System verhindert unlogische Übergänge.

---

### 4. Nachweis-Ampel

Jede Störung zeigt eine **automatisch berechnete Ampel**, die den Dokumentationsstand bewertet:

| Ampel | Bedeutung | Kriterien |
|---|---|---|
| 🟢 Grün | Vollständig belegt | Erstanzeige versendet, Beschreibung vorhanden, Kausalitätskette erfasst |
| 🟡 Gelb | Teilweise belegt | Einige Nachweise fehlen noch |
| 🔴 Rot | Unvollständig | Wesentliche Belege fehlen |

Die Ampel hilft dem Bauleiter, proaktiv Lücken im Nachweis zu schließen – bevor es zum Streit kommt.

---

### 5. Anlagen-Management

Belege werden direkt zur Störung gespeichert:

- **Fotos** (JPG, PNG) – Fotodokumentation von Behinderungen
- **E-Mails** (PDF, EML) – Schriftverkehr mit dem Auftraggeber
- **Protokolle, Pläne, Tagesberichte** – alle baurelevanten Dokumente

Alle Anlagen erscheinen im PDF-Export als **Anlagenverzeichnis** mit Nummerierung.

---

### 6. Kausalitätskette

Für die Anspruchssicherung erfasst das Modul die **Kausalkette** der Behinderung:

- Welches Ereignis hat die Störung ausgelöst?
- Welche Leistung wurde konkret behindert?
- Unmittelbare und mittelbare Auswirkungen
- Bewertung und Eigenverschulden-Prüfung

Dies bildet die fachliche Grundlage für Nachtragsangebote und Behinderungsschäden.

---

### 7. Störungsakte als PDF

Mit einem Klick wird eine vollständige **Störungsakte** als PDF exportiert:

- Deckblatt mit Projektdaten und Störungsnummer
- Alle Stammdaten der Störung
- Übersicht der Behinderungsanzeigen
- Kausalitätstabelle
- Nummeriertes Anlagenverzeichnis
- Nachweis-Ampel-Status
- Automatische Kopf-/Fußzeile mit Seitenzählung

Das Dokument ist sofort versandfertig für Rechtsanwälte, Schiedsverfahren oder den Auftraggeber.

---

### 8. Bautagesberichte

Als ergänzendes Modul können digitale **Bautagesberichte** erfasst werden:

- Tageswetter (Sonnig, Regen, Frost, Schnee, Sturm, …)
- Personalanzahl und Arbeitszeiten
- Geplante vs. tatsächlich ausgeführte Leistung
- Direkte Verknüpfung mit einer Störung
- Freigabe-Workflow (Erstellt → Freigegeben)

Bautagesberichte dienen als unabhängiges Beweismittel zur Untermauerung von Behinderungsanzeigen.

---

## Integration in die bestehende App

Das Störungsmanagement ist nahtlos in die Terminplanung-App integriert:

- **Projektzuordnung** – Störungen gehören zu einem Projekt
- **Vorgangsbezug** – Behinderungen können direkt einem Terminplanvorgang zugeordnet werden
- **Einheitliche Navigation** – neuer Reiter „Störungen" in der Hauptnavigation
- **Konsistentes Design** – gleiche UI-Sprache wie Terminplanung und Versionsverwaltung

---

## Technische Eckdaten

| Komponente | Technologie |
|---|---|
| Backend | FastAPI (Python), SQLAlchemy 2.0, SQLite |
| Frontend | React 18, TypeScript 5, TanStack Query v5, Tailwind CSS |
| PDF-Export | WeasyPrint + Jinja2 (serverseitiges Rendering) |
| Deployment | Docker Compose, kein externer Clouddienst erforderlich |
| Datenspeicherung | On-Premise, alle Daten verbleiben auf dem eigenen Server |

---

## Datenschutz und Datensicherheit

- Alle Daten werden **lokal auf Ihrem Server** gespeichert – keine Cloud-Abhängigkeit
- Behinderungsanzeigen sind nach dem Versenden **unveränderlich** (Manipulationsschutz)
- Lückenloser Audit-Trail: Erstellungsdatum und -zeitpunkt für jede Störung und Anzeige

---

## Nächste Schritte

1. **Pilotprojekt** – Einführung auf einem laufenden Fassadenprojekt
2. **Schulung** – 1-stündiges Einführungstraining für Bauleitungsteam
3. **Feedback** – Rückmeldung nach 4 Wochen, ggf. Anpassungen
4. **Rollout** – Ausweitung auf weitere Projekte

---

*Bei Fragen wenden Sie sich an Ihren Ansprechpartner oder direkt an den Entwickler.*

