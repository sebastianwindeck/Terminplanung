from datetime import datetime, timezone
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape
from weasyprint import HTML

from app.models import Stoerung
from app.services.stoerung_compute import compute_nachweis_ampel

TEMPLATE_DIR = Path(__file__).parent.parent / "reports" / "templates"


def _jinja_env() -> Environment:
    return Environment(
        loader=FileSystemLoader(str(TEMPLATE_DIR)),
        autoescape=select_autoescape(["html"]),
    )


def render_stoerungsakte_pdf(stoerung: Stoerung) -> bytes:
    env = _jinja_env()
    tpl = env.get_template("stoerungsakte.html")
    html_str = tpl.render(
        stoerung=stoerung,
        project=stoerung.project,
        anzeigen=stoerung.anzeigen or [],
        kausalitaeten=stoerung.kausalitaeten or [],
        anlagen=stoerung.anlagen or [],
        nachweis_ampel=compute_nachweis_ampel(stoerung),
        now=datetime.now(timezone.utc).strftime("%d.%m.%Y %H:%M"),
    )
    return HTML(string=html_str).write_pdf()
