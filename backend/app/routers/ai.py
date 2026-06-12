import os
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Stoerung, Behinderungsanzeige, SchedulePosition
from ..services.auth_service import require_authenticated

router = APIRouter(prefix="/ai", tags=["ai"], dependencies=[Depends(require_authenticated)])


class VobTextRequest(BaseModel):
    stoerung_id: int
    behinderungsanzeige_id: Optional[int] = None
    hinweis: Optional[str] = None  # optional user hint


class VobTextResponse(BaseModel):
    text: str
    model: str


def _build_prompt(stoerung: Stoerung, anzeige: Optional[Behinderungsanzeige], vorgang: Optional[SchedulePosition], hinweis: Optional[str]) -> str:
    lines = [
        "Du bist ein Baurechtsexperte mit Schwerpunkt VOB/B. Formuliere eine formelle Behinderungsanzeige gemäß § 6 Abs. 1 VOB/B.",
        "Verwende sachliche, präzise Sprache und juristisch korrekte Formulierungen.",
        "",
        "## Störungsdaten",
        f"- Störungsnummer: {stoerung.stoerung_number}",
        f"- Titel: {stoerung.titel}",
        f"- Störungsart: {stoerung.stoerungsart or 'nicht angegeben'}",
        f"- Beschreibung: {stoerung.beschreibung}",
        f"- Störungsbeginn: {stoerung.stoerungsbeginn.strftime('%d.%m.%Y %H:%M') if stoerung.stoerungsbeginn else 'unbekannt'}",
        f"- Verantwortungsbereich: {stoerung.verantwortungsbereich or 'nicht angegeben'}",
        f"- Verursacher: {stoerung.verursacher or 'nicht angegeben'}",
    ]
    if stoerung.hindernde_wirkung:
        lines.append(f"- Hindernde Wirkung: {stoerung.hindernde_wirkung}")
    if stoerung.sofortmassnahme:
        lines.append(f"- Sofortmaßnahme: {stoerung.sofortmassnahme}")
    if stoerung.erforderliche_mitwirkung_ag:
        lines.append(f"- Erforderliche Mitwirkung AG: {stoerung.erforderliche_mitwirkung_ag}")

    if vorgang:
        lines += [
            "",
            "## Betroffener Vorgang",
            f"- Bezeichnung: {vorgang.title}",
            f"- Geplanter Beginn: {vorgang.start_date.strftime('%d.%m.%Y') if vorgang.start_date else 'unbekannt'}",
            f"- Geplantes Ende: {vorgang.end_date.strftime('%d.%m.%Y') if vorgang.end_date else 'unbekannt'}",
        ]

    if anzeige and anzeige.adressat:
        lines += ["", f"## Adressat\n{anzeige.adressat}"]

    if hinweis:
        lines += ["", f"## Zusätzlicher Hinweis\n{hinweis}"]

    lines += [
        "",
        "## Aufgabe",
        "Erstelle den vollständigen Text der Behinderungsanzeige gemäß VOB/B § 6 Abs. 1.",
        "Der Text soll enthalten:",
        "1. Anrede und Einleitung",
        "2. Schilderung der Behinderungsursache",
        "3. Beschreibung der hindernden Wirkung auf die Bauausführung",
        "4. Forderung nach Abhilfe / Ankündigung der Terminverschiebung",
        "5. Hinweis auf Fristverlängerung nach § 6 VOB/B",
        "6. Schlussformel",
        "",
        "Gib NUR den Brieftext aus, ohne Erklärungen oder Metadaten.",
    ]
    return "\n".join(lines)


@router.post("/vob-text", response_model=VobTextResponse)
def generate_vob_text(payload: VobTextRequest, db: Session = Depends(get_db)):
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(status_code=503, detail="ANTHROPIC_API_KEY nicht konfiguriert")

    stoerung = db.get(Stoerung, payload.stoerung_id)
    if not stoerung:
        raise HTTPException(status_code=404, detail="Störung nicht gefunden")

    anzeige = db.get(Behinderungsanzeige, payload.behinderungsanzeige_id) if payload.behinderungsanzeige_id else None
    vorgang = db.get(SchedulePosition, stoerung.betroffener_vorgang_id) if stoerung.betroffener_vorgang_id else None

    prompt = _build_prompt(stoerung, anzeige, vorgang, payload.hinweis)

    try:
        import anthropic
        client = anthropic.Anthropic(api_key=api_key)
        message = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=2048,
            messages=[{"role": "user", "content": prompt}],
        )
        text = message.content[0].text
        return VobTextResponse(text=text, model=message.model)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"KI-Fehler: {e}")
