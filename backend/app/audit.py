import json
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.models import AuditLog


def log_action(
    db: Session,
    entity_type: str,
    entity_id: int,
    action: str,
    user_email: str | None = None,
    field_changes: dict[str, Any] | None = None,
) -> None:
    entry = AuditLog(
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        user_email=user_email,
        field_changes=json.dumps(field_changes, default=str) if field_changes else None,
        timestamp=datetime.now(timezone.utc),
    )
    db.add(entry)
