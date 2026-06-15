import json
import os
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import AiUsageLog, Bautagesbericht, Stoerung, Behinderungsanzeige, SchedulePosition
from ..services.auth_service import require_authenticated

router = APIRouter(prefix="/ai", tags=["ai"], dependencies=[Depends(require_authenticated)])

# Sonnet 4.6 pricing (per million tokens, USD)
_INPUT_PRICE_PER_MTOK = 3.00
_OUTPUT_PRICE_PER_MTOK = 15.00


# ── Shared helpers ────────────────────────────────────────────────────────────

def _get_client(api_key: str):
    import anthropic
    return anthropic.Anthropic(api_key=api_key)


def _require_key() -> str:
    key = os.environ.get("ANTHROPIC_API_KEY")
    if not key:
        raise HTTPException(status_code=503, detail="ANTHROPIC_API_KEY nicht konfiguriert")
    return key


def _call(
    client,
    prompt: str,
    model: str = "claude-sonnet-4-6",
    max_tokens: int = 2048,
    *,
    db: Optional[Session] = None,
    function_type: str = "unknown",
    stoerung_id: Optional[int] = None,
) -> str:
    try:
        msg = client.messages.create(
            model=model,
            max_tokens=max_tokens,
            messages=[{"role": "user", "content": prompt}],
        )
        if db is not None:
            try:
                log = AiUsageLog(
                    function_type=function_type,
                    model=msg.model,
                    input_tokens=msg.usage.input_tokens,
                    output_tokens=msg.usage.output_tokens,
                    stoerung_id=stoerung_id,
                    created_at=datetime.now(timezone.utc),
                )
                db.add(log)
                db.commit()
            except Exception:
                db.rollback()
        return msg.content[0].text
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"KI-Fehler: {e}")


def _stoerung_context(stoerung: Stoerung, vorgang: Optional[SchedulePosition] = None) -> list[str]:
    lines = [
        f"- Störungsnummer: {stoerung.stoerung_number}",
        f"- Titel: {stoerung.titel}",
        f"- Störungsart: {stoerung.stoerungsart or '–'}",
        f"- Beschreibung: {stoerung.beschreibung}",
        f"- Störungsbeginn: {stoerung.stoerungsbeginn.strftime('%d.%m.%Y') if stoerung.stoerungsbeginn else '–'}",
        f"- Störungsende: {stoerung.stoerungsende.strftime('%d.%m.%Y') if stoerung.stoerungsende else 'andauernd'}",
        f"- Verantwortungsbereich: {stoerung.verantwortungsbereich or '–'}",
        f"- Verursacher: {stoerung.verursacher or '–'}",
        f"- Betroffener Bereich: {stoerung.betroffener_bereich or '–'}",
    ]
    if stoerung.hindernde_wirkung:
        lines.append(f"- Hindernde Wirkung: {stoerung.hindernde_wirkung}")
    if stoerung.sofortmassnahme:
        lines.append(f"- Sofortmaßnahme: {stoerung.sofortmassnahme}")
    if stoerung.erforderliche_mitwirkung_ag:
        lines.append(f"- Erforderliche Mitwirkung AG: {stoerung.erforderliche_mitwirkung_ag}")
    if vorgang:
        lines += [
            f"- Betroffener Vorgang: {vorgang.title}",
            f"  Geplanter Beginn: {vorgang.start_date.strftime('%d.%m.%Y') if vorgang.start_date else '–'}",
            f"  Geplantes Ende: {vorgang.end_date.strftime('%d.%m.%Y') if vorgang.end_date else '–'}",
            f"  Dauer: {vorgang.duration_days or '–'} Arbeitstage",
        ]
    return lines


# ── 1. VOB-Text (Behinderungsanzeige) ────────────────────────────────────────

class VobTextRequest(BaseModel):
    stoerung_id: int
    behinderungsanzeige_id: Optional[int] = None
    hinweis: Optional[str] = None


class VobTextResponse(BaseModel):
    text: str
    model: str


@router.post("/vob-text", response_model=VobTextResponse)
def generate_vob_text(payload: VobTextRequest, db: Session = Depends(get_db)):
    key = _require_key()
    stoerung = db.get(Stoerung, payload.stoerung_id)
    if not stoerung:
        raise HTTPException(status_code=404, detail="Störung nicht gefunden")

    anzeige = db.get(Behinderungsanzeige, payload.behinderungsanzeige_id) if payload.behinderungsanzeige_id else None
    vorgang = db.get(SchedulePosition, stoerung.betroffener_vorgang_id) if stoerung.betroffener_vorgang_id else None

    lines = [
        "Du bist ein Baurechtsexperte mit Schwerpunkt VOB/B. Formuliere eine formelle Behinderungsanzeige gemäß § 6 Abs. 1 VOB/B.",
        "Verwende sachliche, präzise Sprache und juristisch korrekte Formulierungen.",
        "",
        "## Störungsdaten",
    ] + _stoerung_context(stoerung, vorgang)

    if anzeige and anzeige.adressat:
        lines += ["", f"## Adressat\n{anzeige.adressat}"]
    if payload.hinweis:
        lines += ["", f"## Zusätzlicher Hinweis\n{payload.hinweis}"]

    lines += [
        "",
        "## Aufgabe",
        "Erstelle den vollständigen Fließtext der Behinderungsanzeige. Enthalte: Anrede, Schilderung der Ursache,",
        "hindernde Wirkung auf die Bauausführung, Forderung nach Abhilfe, Hinweis auf § 6 VOB/B, Schlussformel.",
        "Gib NUR den Brieftext aus, ohne Erklärungen.",
    ]

    client = _get_client(key)
    text = _call(client, "\n".join(lines), db=db, function_type="vob_text", stoerung_id=payload.stoerung_id)
    return VobTextResponse(text=text, model="claude-sonnet-4-6")


# ── 2. Störungszusammenfassung ────────────────────────────────────────────────

class ZusammenfassungRequest(BaseModel):
    stoerung_id: int


class ZusammenfassungResponse(BaseModel):
    text: str
    model: str


@router.post("/zusammenfassung", response_model=ZusammenfassungResponse)
def generate_zusammenfassung(payload: ZusammenfassungRequest, db: Session = Depends(get_db)):
    key = _require_key()
    stoerung = db.get(Stoerung, payload.stoerung_id)
    if not stoerung:
        raise HTTPException(status_code=404, detail="Störung nicht gefunden")

    vorgang = db.get(SchedulePosition, stoerung.betroffener_vorgang_id) if stoerung.betroffener_vorgang_id else None

    lines = [
        "Du bist ein erfahrener Bauleitungsexperte. Erstelle eine knappe, sachliche Zusammenfassung der folgenden Störung",
        "für ein technisches Projektdossier. Die Zusammenfassung soll maximal 5 Sätze umfassen und alle wesentlichen",
        "Fakten (Ursache, Auswirkung, Verantwortung, Status) präzise wiedergeben.",
        "",
        "## Störungsdaten",
    ] + _stoerung_context(stoerung, vorgang) + [
        "",
        "Gib NUR den Zusammenfassungstext aus, ohne Überschrift oder Metadaten.",
    ]

    client = _get_client(key)
    text = _call(client, "\n".join(lines), max_tokens=512, db=db, function_type="zusammenfassung", stoerung_id=payload.stoerung_id)
    return ZusammenfassungResponse(text=text, model="claude-sonnet-4-6")


# ── 3. Bauzeitverlängerung ────────────────────────────────────────────────────

class BauzeitRequest(BaseModel):
    stoerung_id: int
    hinweis: Optional[str] = None


class BauzeitResponse(BaseModel):
    text: str
    model: str


@router.post("/bauzeitverlaengerung", response_model=BauzeitResponse)
def generate_bauzeitverlaengerung(payload: BauzeitRequest, db: Session = Depends(get_db)):
    key = _require_key()
    stoerung = db.get(Stoerung, payload.stoerung_id)
    if not stoerung:
        raise HTTPException(status_code=404, detail="Störung nicht gefunden")

    vorgang = db.get(SchedulePosition, stoerung.betroffener_vorgang_id) if stoerung.betroffener_vorgang_id else None

    lines = [
        "Du bist ein Baurechtsexperte mit Schwerpunkt VOB/B. Formuliere eine formelle Geltendmachung der Bauzeitverlängerung",
        "gemäß § 6 Abs. 4 i.V.m. § 6 Abs. 6 VOB/B basierend auf den folgenden Störungsdaten.",
        "",
        "## Störungsdaten",
    ] + _stoerung_context(stoerung, vorgang)

    if payload.hinweis:
        lines += ["", f"## Zusätzlicher Hinweis\n{payload.hinweis}"]

    lines += [
        "",
        "## Aufgabe",
        "Erstelle einen vollständigen Brief zur Geltendmachung der Bauzeitverlängerung mit:",
        "1. Berechnung der Verzögerungsdauer (in Kalender- und Arbeitstagen, soweit aus den Daten ableitbar)",
        "2. Rechtliche Begründung nach § 6 Abs. 4 VOB/B",
        "3. Ableitung der neuen Fristen und Fertigstellungstermine",
        "4. Vorbehalt auf Mehrkosten nach § 6 Abs. 6 VOB/B",
        "5. Aufforderung zur Terminbestätigung",
        "Gib NUR den Brieftext aus.",
    ]

    client = _get_client(key)
    text = _call(client, "\n".join(lines), max_tokens=2048, db=db, function_type="bauzeitverlaengerung", stoerung_id=payload.stoerung_id)
    return BauzeitResponse(text=text, model="claude-sonnet-4-6")


# ── 4. Kausalitäts-Vorschläge ─────────────────────────────────────────────────

class KausalitaetVorschlaegeRequest(BaseModel):
    stoerung_id: int


class KausalitaetVorschlag(BaseModel):
    ereignis: str
    verantwortungsbereich: str
    geplante_leistung: Optional[str] = None
    tatsaechliche_leistung: Optional[str] = None
    unmittelbare_auswirkung_json: Optional[str] = None
    mittelbare_auswirkung: Optional[str] = None
    bewertung: Optional[str] = None


class KausalitaetVorschlaegeResponse(BaseModel):
    vorschlaege: list[KausalitaetVorschlag]
    hinweis: str


@router.post("/kausalitaet-vorschlaege", response_model=KausalitaetVorschlaegeResponse)
def generate_kausalitaet_vorschlaege(payload: KausalitaetVorschlaegeRequest, db: Session = Depends(get_db)):
    key = _require_key()
    stoerung = db.get(Stoerung, payload.stoerung_id)
    if not stoerung:
        raise HTTPException(status_code=404, detail="Störung nicht gefunden")

    vorgang = db.get(SchedulePosition, stoerung.betroffener_vorgang_id) if stoerung.betroffener_vorgang_id else None

    berichte = (
        db.query(Bautagesbericht)
        .filter(Bautagesbericht.project_id == stoerung.project_id)
        .order_by(Bautagesbericht.datum)
        .limit(30)
        .all()
    )

    bericht_lines: list[str] = []
    for b in berichte:
        parts = [f"  Datum: {b.datum}"]
        if b.allgemeine_bemerkungen:
            parts.append(f"  Bemerkungen: {b.allgemeine_bemerkungen}")
        if b.abweichung_kommentar:
            parts.append(f"  Abweichung: {b.abweichung_kommentar}")
        if b.stoerung_vorhanden:
            parts.append("  Störung vermerkt: ja")
        if b.anordnung_vorhanden and b.anordnung_beschreibung:
            parts.append(f"  Anordnung: {b.anordnung_beschreibung}")
        if len(parts) > 1:
            bericht_lines.append("\n".join(parts))

    lines = [
        "Du bist ein Baurechtsexperte. Analysiere die folgenden Störungsdaten und Bautagesberichte und schlage",
        "konkrete Einträge für eine Kausalitätsmatrix vor, die die Ursache-Wirkung-Kette der Störung dokumentiert.",
        "",
        "## Störungsdaten",
    ] + _stoerung_context(stoerung, vorgang)

    if bericht_lines:
        lines += ["", "## Relevante Bautagesberichte"] + bericht_lines

    verantwortung_werte = "auftraggeber, objektplanung_architekt, fachplanung, bauleitung_ag, vorunternehmer_ag, behoerde, versorger, witterung, nachunternehmer_an, eigenes_unternehmen, lieferant, unklar"

    lines += [
        "",
        "## Aufgabe",
        "Gib 2–4 Kausalitätseinträge als JSON-Array zurück. Jeder Eintrag hat folgende Felder:",
        '{"ereignis": "...", "verantwortungsbereich": "...", "geplante_leistung": "...", "tatsaechliche_leistung": "...", "unmittelbare_auswirkung_json": "...", "mittelbare_auswirkung": "...", "bewertung": "hoch|mittel|gering"}',
        f"Erlaubte Werte für verantwortungsbereich: {verantwortung_werte}",
        "Gib NUR das JSON-Array aus, keine Erklärungen.",
    ]

    client = _get_client(key)
    raw = _call(client, "\n".join(lines), max_tokens=1500, db=db, function_type="kausalitaet_vorschlaege", stoerung_id=payload.stoerung_id)

    vorschlaege: list[KausalitaetVorschlag] = []
    try:
        start = raw.find("[")
        end = raw.rfind("]") + 1
        if start >= 0 and end > start:
            data = json.loads(raw[start:end])
            for item in data:
                vorschlaege.append(KausalitaetVorschlag(**{k: v for k, v in item.items() if k in KausalitaetVorschlag.model_fields}))
    except Exception:
        pass

    hinweis = "" if vorschlaege else "KI-Antwort konnte nicht geparst werden. Bitte manuell eingeben."
    return KausalitaetVorschlaegeResponse(vorschlaege=vorschlaege, hinweis=hinweis)


# ── 5. Dokument-Text (Mängelanzeige, Bedenkenanmeldung etc.) ─────────────────

DOKUMENT_TYPEN = {
    "maengelanzeige": {
        "label": "Mängelanzeige",
        "paragraph": "§ 13 Abs. 5 VOB/B",
        "anweisung": (
            "Formuliere eine formelle Mängelanzeige nach § 13 Abs. 5 VOB/B. "
            "Enthalte: präzise Beschreibung des Mangels, Fristsetzung zur Nacherfüllung, "
            "Ankündigung von Selbstvornahme und Kostenersatz bei Fristablauf."
        ),
    },
    "bedenkenanmeldung": {
        "label": "Bedenkenanmeldung",
        "paragraph": "§ 4 Abs. 3 VOB/B",
        "anweisung": (
            "Formuliere eine formelle Bedenkenanmeldung nach § 4 Abs. 3 VOB/B. "
            "Enthalte: konkrete technische oder rechtliche Bedenken, Beschreibung der Risiken, "
            "Aufforderung zur schriftlichen Bestätigung der Anordnung, Haftungsausschluss."
        ),
    },
    "nachtragsforderung": {
        "label": "Nachtragsforderung",
        "paragraph": "§ 2 Nr. 5/6 VOB/B",
        "anweisung": (
            "Formuliere eine Nachtragsforderung nach § 2 Nr. 5 VOB/B (geänderte Leistung) "
            "bzw. § 2 Nr. 6 VOB/B (zusätzliche Leistung). "
            "Enthalte: Beschreibung der Abweichung vom Vertragsinhalt, Ankündigung der Nachtragsberechnung, "
            "Aufforderung zur Beauftragung vor Ausführung."
        ),
    },
    "abmahnung_verzug": {
        "label": "Abmahnung Leistungsverzug",
        "paragraph": "§ 5 Abs. 3/4 VOB/B",
        "anweisung": (
            "Formuliere eine Abmahnung wegen Leistungsverzug nach § 5 Abs. 3/4 VOB/B. "
            "Enthalte: Feststellung des Verzugs, Fristsetzung zur Beschleunigung, "
            "Ankündigung von Schadensersatz und Kündigung bei Fristablauf."
        ),
    },
}


class DokumentTextRequest(BaseModel):
    stoerung_id: int
    dokument_typ: str
    hinweis: Optional[str] = None


class DokumentTextResponse(BaseModel):
    text: str
    label: str
    paragraph: str
    model: str


@router.post("/dokument-text", response_model=DokumentTextResponse)
def generate_dokument_text(payload: DokumentTextRequest, db: Session = Depends(get_db)):
    key = _require_key()
    if payload.dokument_typ not in DOKUMENT_TYPEN:
        raise HTTPException(status_code=400, detail=f"Unbekannter Dokumenttyp: {payload.dokument_typ}")

    stoerung = db.get(Stoerung, payload.stoerung_id)
    if not stoerung:
        raise HTTPException(status_code=404, detail="Störung nicht gefunden")

    vorgang = db.get(SchedulePosition, stoerung.betroffener_vorgang_id) if stoerung.betroffener_vorgang_id else None
    dok = DOKUMENT_TYPEN[payload.dokument_typ]

    lines = [
        f"Du bist ein Baurechtsexperte mit Schwerpunkt VOB/B. {dok['anweisung']}",
        "Verwende sachliche, präzise Sprache und juristisch korrekte Formulierungen.",
        "",
        "## Störungsdaten (Kontext)",
    ] + _stoerung_context(stoerung, vorgang)

    if payload.hinweis:
        lines += ["", f"## Zusätzlicher Hinweis\n{payload.hinweis}"]

    lines += [
        "",
        "Gib NUR den vollständigen Brieftext aus, ohne Erklärungen oder Metadaten.",
    ]

    client = _get_client(key)
    text = _call(client, "\n".join(lines), max_tokens=2048, db=db, function_type=f"dokument_{payload.dokument_typ}", stoerung_id=payload.stoerung_id)
    return DokumentTextResponse(
        text=text,
        label=dok["label"],
        paragraph=dok["paragraph"],
        model="claude-sonnet-4-6",
    )


# ── 6. Usage Stats ────────────────────────────────────────────────────────────

class AiUsageEntry(BaseModel):
    function_type: str
    calls: int
    input_tokens: int
    output_tokens: int


class AiUsageStats(BaseModel):
    total_calls: int
    total_input_tokens: int
    total_output_tokens: int
    estimated_cost_usd: float
    by_function: list[AiUsageEntry]
    calls_today: int
    calls_this_month: int
    api_key_configured: bool


@router.get("/usage", response_model=AiUsageStats)
def get_usage_stats(db: Session = Depends(get_db)):
    from datetime import date
    today = datetime.now(timezone.utc).date()
    month_start = today.replace(day=1)

    rows = (
        db.query(
            AiUsageLog.function_type,
            func.count(AiUsageLog.id).label("calls"),
            func.sum(AiUsageLog.input_tokens).label("input_tokens"),
            func.sum(AiUsageLog.output_tokens).label("output_tokens"),
        )
        .group_by(AiUsageLog.function_type)
        .all()
    )

    total_calls = sum(r.calls for r in rows)
    total_in = sum(r.input_tokens or 0 for r in rows)
    total_out = sum(r.output_tokens or 0 for r in rows)
    cost = (total_in / 1_000_000) * _INPUT_PRICE_PER_MTOK + (total_out / 1_000_000) * _OUTPUT_PRICE_PER_MTOK

    calls_today = (
        db.query(func.count(AiUsageLog.id))
        .filter(func.date(AiUsageLog.created_at) == today)
        .scalar() or 0
    )
    calls_month = (
        db.query(func.count(AiUsageLog.id))
        .filter(AiUsageLog.created_at >= datetime(month_start.year, month_start.month, 1))
        .scalar() or 0
    )

    return AiUsageStats(
        total_calls=total_calls,
        total_input_tokens=total_in,
        total_output_tokens=total_out,
        estimated_cost_usd=round(cost, 4),
        by_function=[
            AiUsageEntry(
                function_type=r.function_type,
                calls=r.calls,
                input_tokens=r.input_tokens or 0,
                output_tokens=r.output_tokens or 0,
            )
            for r in rows
        ],
        calls_today=calls_today,
        calls_this_month=calls_month,
        api_key_configured=bool(os.environ.get("ANTHROPIC_API_KEY")),
    )
