from fastapi import HTTPException, status

from app.models import Behinderungsanzeige

LOCKED_STATUSES = ("versendet", "unterschrieben")


def assert_anzeige_not_locked(anzeige: Behinderungsanzeige) -> None:
    if anzeige.status in LOCKED_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Behinderungsanzeige kann nicht geändert werden: "
                f"Status ist '{anzeige.status}'. "
                "Versendete oder unterschriebene Anzeigen sind unveränderlich."
            ),
        )


def assert_stoerung_editable(stoerung_status: str) -> None:
    if stoerung_status in ("abgeschlossen", "verworfen"):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Störung kann nicht bearbeitet werden: "
                f"Status ist '{stoerung_status}'. "
                "Abgeschlossene oder verworfene Störungen sind gesperrt."
            ),
        )
