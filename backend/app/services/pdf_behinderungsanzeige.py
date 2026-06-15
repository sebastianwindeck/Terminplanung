import base64
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from jinja2 import Environment, FileSystemLoader, select_autoescape
from weasyprint import HTML

from app.models import Behinderungsanzeige, CompanySettings
from app.services import storage as _storage

TEMPLATE_DIR = Path(__file__).parent.parent / "reports" / "templates"

TYP_LABELS = {
    "erstanzeige": "Erstanzeige",
    "folgenanzeige": "Folge-/Fortschreibungsanzeige",
    "abmeldung": "Abmeldung der Behinderung",
    "sonstiges": "Sonstiges",
}


def _jinja_env() -> Environment:
    return Environment(
        loader=FileSystemLoader(str(TEMPLATE_DIR)),
        autoescape=select_autoescape(["html"]),
    )


def _logo_b64(settings: Optional[CompanySettings]) -> Optional[str]:
    if settings and settings.logo_stored_path:
        try:
            data = _storage.read_file(settings.logo_stored_path)
            return base64.b64encode(data).decode()
        except Exception:
            pass
    return None


def render_behinderungsanzeige_pdf(anzeige: Behinderungsanzeige, settings: Optional[CompanySettings]) -> bytes:
    stoerung = anzeige.stoerung
    project = stoerung.project
    vorgang = stoerung.betroffener_vorgang

    now = datetime.now(timezone.utc)
    ort = project.construction_site_address or (settings.address if settings else None) or ""
    city = ort.split(",")[-1].strip() if "," in ort else ort
    ort_datum = f"{city + ', ' if city else ''}{now.strftime('%d.%m.%Y')}"

    env = _jinja_env()
    tpl = env.get_template("behinderungsanzeige.html")
    html_str = tpl.render(
        anzeige=anzeige,
        stoerung=stoerung,
        project=project,
        vorgang=vorgang,
        company=settings,
        logo_b64=_logo_b64(settings),
        briefdatum=now.strftime("%d.%m.%Y"),
        ort_datum=ort_datum,
        typ_label=TYP_LABELS.get(anzeige.typ, anzeige.typ.capitalize()),
    )
    return HTML(string=html_str).write_pdf()
