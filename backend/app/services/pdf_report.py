import base64
from pathlib import Path
from typing import Optional

from jinja2 import Environment, FileSystemLoader
from weasyprint import HTML

from ..schemas import SequentialComparisonResponse

_TEMPLATES_DIR = Path(__file__).parent.parent / "reports" / "templates"


def _get_jinja_env() -> Environment:
    return Environment(
        loader=FileSystemLoader(str(_TEMPLATES_DIR)),
        autoescape=True,
    )


def generate_sequential_comparison_pdf(
    project_name: str,
    comparison: SequentialComparisonResponse,
    settings: object,
    logo_bytes: Optional[bytes],
) -> bytes:
    env = _get_jinja_env()
    template = env.get_template("sequential_comparison.html")

    logo_b64 = base64.b64encode(logo_bytes).decode("utf-8") if logo_bytes else None
    generated_at = comparison.generated_at.strftime("%d.%m.%Y %H:%M")

    html_str = template.render(
        project_name=project_name,
        steps=comparison.steps,
        settings=settings,
        logo_b64=logo_b64,
        generated_at=generated_at,
    )

    return HTML(string=html_str).write_pdf()
