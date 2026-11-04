"""Temporary vet-access links. The secret is shown once and stored only as a hash."""

import base64
import io
import secrets
import time
from datetime import datetime

import qrcode
from fastapi import HTTPException, Request, status
from sqlalchemy.orm import Session

from app.models import Pet, VetBrowseSession
from app.services.auth import hash_api_key

_ATTEMPTS: dict[str, list[float]] = {}
_WINDOW_SEC = 600
_MAX_ATTEMPTS = 120
_MIN_TOKEN_LEN = 32


def issue_vet_access_token() -> tuple[str, str]:
    """Return (raw token, sha256 hex). The raw token is not stored."""
    raw = secrets.token_urlsafe(32)
    return raw, hash_api_key(raw)


def _client_key(request: Request) -> str:
    return request.client.host if request and request.client else "unknown"


def _recent_attempts(ip: str, now: float) -> list[float]:
    return [stamp for stamp in _ATTEMPTS.get(ip, []) if now - stamp < _WINDOW_SEC]


def enforce_vet_access_rate_limit(request: Request) -> None:
    """Block an address that has already missed too often. Successes are not counted."""
    ip = _client_key(request)
    if len(_recent_attempts(ip, time.time())) >= _MAX_ATTEMPTS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many attempts. Try again later.",
        )


def record_vet_access_failure(request: Request) -> None:
    ip = _client_key(request)
    now = time.time()
    recent = _recent_attempts(ip, now)
    recent.append(now)
    _ATTEMPTS[ip] = recent
    if len(_ATTEMPTS) > 10000:
        _ATTEMPTS.clear()


def pet_by_vet_token(db: Session, token: str) -> Pet:
    presented = (token or "").strip()
    if len(presented) < _MIN_TOKEN_LEN:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invalid or expired access link")
    pet = db.query(Pet).filter(Pet.access_pin == hash_api_key(presented)).first()
    if (
        not pet
        or not pet.access_pin_expires_at
        or pet.access_pin_expires_at < datetime.utcnow()
    ):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invalid or expired access link")
    return pet


def issue_browse_session(db: Session, pet: Pet) -> tuple[str, datetime]:
    """Cookie secret for the vet visit. The QR token itself stays valid until it expires."""
    raw = secrets.token_urlsafe(32)
    expires = pet.access_pin_expires_at or datetime.utcnow()
    db.add(VetBrowseSession(id=hash_api_key(raw), pet_id=pet.id, expires_at=expires))
    db.commit()
    return raw, expires


def pet_by_browse_cookie(db: Session, raw: str | None) -> Pet:
    presented = (raw or "").strip()
    if len(presented) < _MIN_TOKEN_LEN:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invalid or expired access link")
    row = db.get(VetBrowseSession, hash_api_key(presented))
    if not row or row.expires_at < datetime.utcnow():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invalid or expired access link")
    pet = db.get(Pet, row.pet_id)
    if not pet:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invalid or expired access link")
    return pet


def qr_data_url(payload: str) -> str:
    image = qrcode.make(payload, box_size=6, border=2)
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    encoded = base64.b64encode(buffer.getvalue()).decode("ascii")
    return f"data:image/png;base64,{encoded}"
