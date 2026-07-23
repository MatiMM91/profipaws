"""Upcoming reminders and optional email dispatch for Pro subscribers."""
from __future__ import annotations

import logging
import smtplib
from datetime import date, datetime, timedelta
from email.message import EmailMessage
from typing import Any

from sqlalchemy.orm import Session

from app.config import get_settings
from app.models import (
    CalendarEvent,
    Pet,
    Subscription,
    SubscriptionTier,
    User,
    Vaccine,
)

logger = logging.getLogger(__name__)
settings = get_settings()


def _pro_user_ids(db: Session) -> set[int]:
    rows = (
        db.query(Subscription.user_id)
        .filter(Subscription.tier == SubscriptionTier.PRO)
        .all()
    )
    return {r[0] for r in rows}


def upcoming_for_owner(db: Session, user: User, days: int = 14) -> list[dict[str, Any]]:
    """In-app alert list for one Pro owner."""
    today = date.today()
    until = today + timedelta(days=days)
    pets = db.query(Pet).filter(Pet.owner_id == user.id).all()
    pet_map = {p.id: p for p in pets}
    if not pets:
        return []

    pet_ids = list(pet_map.keys())
    items: list[dict[str, Any]] = []

    vaccines = (
        db.query(Vaccine)
        .filter(
            Vaccine.pet_id.in_(pet_ids),
            Vaccine.next_due_at.isnot(None),
            Vaccine.next_due_at >= today,
            Vaccine.next_due_at <= until,
        )
        .order_by(Vaccine.next_due_at.asc())
        .all()
    )
    for v in vaccines:
        pet = pet_map[v.pet_id]
        items.append(
            {
                "kind": "vaccine",
                "pet_id": pet.id,
                "pet_name": pet.name,
                "title": v.name,
                "due_at": v.next_due_at.isoformat(),
                "id": v.id,
            }
        )

    now = datetime.utcnow()
    later = now + timedelta(days=days)
    events = (
        db.query(CalendarEvent)
        .filter(
            CalendarEvent.pet_id.in_(pet_ids),
            CalendarEvent.completed.is_(False),
            CalendarEvent.scheduled_at >= now,
            CalendarEvent.scheduled_at <= later,
        )
        .order_by(CalendarEvent.scheduled_at.asc())
        .all()
    )
    for ev in events:
        pet = pet_map[ev.pet_id]
        items.append(
            {
                "kind": "event",
                "pet_id": pet.id,
                "pet_name": pet.name,
                "title": ev.title,
                "due_at": ev.scheduled_at.isoformat(),
                "id": ev.id,
                "event_type": ev.event_type.value if hasattr(ev.event_type, "value") else ev.event_type,
            }
        )

    items.sort(key=lambda x: x["due_at"])
    return items


def _send_email(to_email: str, subject: str, body: str) -> bool:
    if not settings.smtp_host or not settings.smtp_from:
        logger.info("SMTP not configured; skip email to %s (%s)", to_email, subject)
        return False
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = settings.smtp_from
    msg["To"] = to_email
    msg.set_content(body)
    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=20) as smtp:
        if settings.smtp_use_tls:
            smtp.starttls()
        if settings.smtp_user:
            smtp.login(settings.smtp_user, settings.smtp_password)
        smtp.send_message(msg)
    return True


def dispatch_due_reminders(db: Session, within_hours: int = 72) -> dict[str, Any]:
    """
    Email Pro owners about calendar events due soon (and not yet reminded).
    Safe to call from a cron job with ALERTS_CRON_SECRET.
    """
    pro_ids = _pro_user_ids(db)
    if not pro_ids:
        return {"sent": 0, "skipped": 0, "candidates": 0}

    now = datetime.utcnow()
    until = now + timedelta(hours=within_hours)
    events = (
        db.query(CalendarEvent)
        .join(Pet, Pet.id == CalendarEvent.pet_id)
        .filter(
            Pet.owner_id.in_(pro_ids),
            CalendarEvent.completed.is_(False),
            CalendarEvent.reminder_sent.is_(False),
            CalendarEvent.scheduled_at >= now,
            CalendarEvent.scheduled_at <= until,
        )
        .all()
    )

    sent = 0
    skipped = 0
    for ev in events:
        pet = db.query(Pet).filter(Pet.id == ev.pet_id).first()
        if not pet:
            continue
        owner = db.query(User).filter(User.id == pet.owner_id).first()
        if not owner:
            continue
        when = ev.scheduled_at.strftime("%Y-%m-%d %H:%M")
        subject = f"Profipaws: recordatorio — {pet.name}"
        body = (
            f"Hola{(' ' + owner.full_name) if owner.full_name else ''},\n\n"
            f"Tienes un recordatorio próximo para {pet.name}:\n"
            f"  · {ev.title}\n"
            f"  · Fecha: {when}\n\n"
            f"Abre Profipaws: {settings.frontend_url}/pets/{pet.id}\n\n"
            f"— Profipaws\n"
        )
        ok = _send_email(owner.email, subject, body)
        if ok:
            ev.reminder_sent = True
            sent += 1
        else:
            # Still mark so we don't loop forever without SMTP; cron can re-run after SMTP is set
            # Only mark if SMTP missing? Better: mark only on success.
            skipped += 1

    db.commit()
    return {
        "sent": sent,
        "skipped": skipped,
        "candidates": len(events),
        "smtp_configured": bool(settings.smtp_host and settings.smtp_from),
    }
