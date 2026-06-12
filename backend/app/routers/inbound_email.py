"""
Inbound email webhook endpoint.

Each project gets a unique email token visible in the project settings.
Set up email forwarding from your mail provider (e.g. Mailgun, Postmark,
SendGrid Inbound Parse) to POST to:
  POST /api/v1/inbound/{token}

Expected JSON body (from Mailgun-style webhook):
  {
    "sender": "...",
    "subject": "...",
    "body-plain": "...",  (or "text")
    "recipient": "...",
    "timestamp": "..."    (Unix timestamp, optional)
  }

Or Postmark-style:
  { "From": "...", "Subject": "...", "TextBody": "...", "Date": "..." }
"""
from datetime import datetime, timezone
from typing import Optional, Any

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Project, EmailEvent

router = APIRouter(prefix="/inbound", tags=["inbound-email"])


def _parse_mailgun(body: dict) -> dict:
    return {
        "sender": body.get("sender") or body.get("from") or "",
        "subject": body.get("subject") or "(kein Betreff)",
        "note": body.get("body-plain") or body.get("text") or body.get("body-html") or "",
        "recipients": body.get("recipient") or body.get("to") or "",
        "email_date": _parse_ts(body.get("timestamp")),
    }


def _parse_postmark(body: dict) -> dict:
    return {
        "sender": body.get("From") or body.get("from") or "",
        "subject": body.get("Subject") or body.get("subject") or "(kein Betreff)",
        "note": body.get("TextBody") or body.get("text") or "",
        "recipients": body.get("To") or body.get("to") or "",
        "email_date": _parse_date_str(body.get("Date") or body.get("date")),
    }


def _parse_ts(ts: Any) -> datetime:
    if ts is None:
        return datetime.now(timezone.utc).replace(tzinfo=None)
    try:
        return datetime.utcfromtimestamp(float(ts))
    except Exception:
        return datetime.now(timezone.utc).replace(tzinfo=None)


def _parse_date_str(s: Optional[str]) -> datetime:
    if not s:
        return datetime.now(timezone.utc).replace(tzinfo=None)
    for fmt in ("%a, %d %b %Y %H:%M:%S %z", "%Y-%m-%dT%H:%M:%SZ", "%Y-%m-%d %H:%M:%S"):
        try:
            dt = datetime.strptime(s[:31], fmt)
            return dt.replace(tzinfo=None)
        except Exception:
            continue
    return datetime.now(timezone.utc).replace(tzinfo=None)


@router.post("/{token}", status_code=status.HTTP_201_CREATED)
async def receive_email(token: str, request: Request, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.email_token == token).first()
    if not project:
        # Return 200 to avoid provider retries on invalid tokens
        return {"status": "ignored", "reason": "unknown token"}

    try:
        body = await request.json()
    except Exception:
        body = {}

    # Auto-detect format
    if "From" in body or "Subject" in body:
        parsed = _parse_postmark(body)
    else:
        parsed = _parse_mailgun(body)

    email = EmailEvent(
        project_id=project.id,
        subject=parsed["subject"][:500],
        sender=parsed["sender"][:255],
        recipients=str(parsed["recipients"])[:255] if parsed["recipients"] else None,
        email_date=parsed["email_date"],
        note=str(parsed["note"])[:10000] if parsed["note"] else None,
        tag="eingang",
        importance="normal",
    )
    db.add(email)
    db.commit()

    return {"status": "created", "email_id": email.id, "project_id": project.id}
