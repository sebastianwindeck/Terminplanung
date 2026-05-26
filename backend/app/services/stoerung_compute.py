from datetime import datetime, timezone
from typing import Optional

from app.models import Stoerung, Behinderungsanzeige

ALLOWED_TRANSITIONS: dict[str, list[str]] = {
    "entwurf": ["offen", "verworfen"],
    "offen": ["angezeigt", "in_beobachtung", "verworfen"],
    "angezeigt": ["in_beobachtung", "teilweise_behoben", "behoben", "verworfen"],
    "in_beobachtung": ["teilweise_behoben", "behoben", "angezeigt", "verworfen"],
    "teilweise_behoben": ["behoben", "in_beobachtung", "verworfen"],
    "behoben": ["abgemeldet", "in_beobachtung"],
    "abgemeldet": ["in_anspruchspruefung", "behoben"],
    "in_anspruchspruefung": ["abgeschlossen", "offen"],
    "abgeschlossen": [],
    "verworfen": [],
}


def assert_transition_allowed(current: str, target: str) -> None:
    allowed = ALLOWED_TRANSITIONS.get(current, [])
    if target not in allowed:
        raise ValueError(
            f"Statuswechsel von '{current}' nach '{target}' nicht erlaubt. "
            f"Erlaubt: {allowed or 'keine weiteren Übergänge'}"
        )


def compute_nachweis_ampel(stoerung: Stoerung) -> str:
    """Return 'gruen', 'gelb', or 'rot' based on documentation completeness."""
    anzeigen: list[Behinderungsanzeige] = stoerung.anzeigen or []
    anlagen = stoerung.anlagen or []

    has_erstanzeige = any(
        a.typ == "erstanzeige" and a.status in ("versendet", "unterschrieben")
        for a in anzeigen
    )
    has_abmeldung = any(
        a.typ == "abmeldung" and a.status in ("versendet", "unterschrieben")
        for a in anzeigen
    )
    has_beschreibung = bool(stoerung.beschreibung and len(stoerung.beschreibung) >= 20)
    has_kausalitaeten = bool(stoerung.kausalitaeten)
    has_anlagen = bool(anlagen)
    has_stoerungsende = stoerung.stoerungsende is not None
    is_beendet = stoerung.status in ("behoben", "abgemeldet", "in_anspruchspruefung", "abgeschlossen")

    score = 0
    if has_erstanzeige:
        score += 30
    if has_beschreibung:
        score += 20
    if has_kausalitaeten:
        score += 20
    if has_anlagen:
        score += 15
    if is_beendet and has_abmeldung:
        score += 15
    elif not is_beendet:
        score += 15  # not penalized if disruption still ongoing

    if score >= 80:
        return "gruen"
    if score >= 50:
        return "gelb"
    return "rot"


def next_stoerung_number(db_session, project_id: int) -> str:
    from sqlalchemy import func, select
    from app.models import Stoerung as St

    stmt = select(func.max(St.stoerung_number)).where(St.project_id == project_id)
    max_num: Optional[str] = db_session.scalar(stmt)
    if max_num is None:
        return "ST-001"
    try:
        n = int(max_num.split("-")[1]) + 1
    except (IndexError, ValueError):
        n = 1
    return f"ST-{n:03d}"
