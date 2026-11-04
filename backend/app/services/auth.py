from datetime import datetime, timedelta
from typing import Optional
import hashlib
import secrets
import jwt
from fastapi import Cookie, Depends, HTTPException, Response, status, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.config import get_settings, is_deployed_environment
from app.database import get_db
from app.models import AuthSession, User, ClinicApiKey

settings = get_settings()
security = HTTPBearer(auto_error=False)
SESSION_COOKIE = "profipaws_session"


def maintenance_allowed_emails() -> set[str]:
    raw = settings.maintenance_allowlist or ""
    return {e.strip().lower() for e in raw.split(",") if e.strip()}


def is_allowed_during_maintenance(email: str | None) -> bool:
    """Outside maintenance everyone is allowed; inside, only the allowlist."""
    if not settings.maintenance_mode:
        return True
    if not email:
        return False
    return email.strip().lower() in maintenance_allowed_emails()


def create_access_token(user_id: int, email: str, expires_minutes: int | None = None) -> str:
    minutes = expires_minutes if expires_minutes is not None else settings.jwt_expire_minutes
    expire = datetime.utcnow() + timedelta(minutes=minutes)
    payload = {"sub": str(user_id), "email": email, "exp": expire}
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def issue_session(db: Session, user: User, expires_minutes: int | None = None) -> tuple[str, int]:
    """Persist a revocable session and return (jwt, max_age_seconds)."""
    minutes = expires_minutes if expires_minutes is not None else settings.jwt_expire_minutes
    expire = datetime.utcnow() + timedelta(minutes=minutes)
    sid = secrets.token_urlsafe(24)
    db.add(AuthSession(id=sid, user_id=user.id, expires_at=expire))
    db.flush()
    payload = {"sub": str(user.id), "email": user.email, "sid": sid, "exp": expire}
    token = jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)
    return token, minutes * 60


def cookie_flags() -> dict:
    front = (settings.frontend_url or "").lower()
    cross_site = front.startswith("https://") or settings.app_env.strip().lower() == "production"
    if cross_site or is_deployed_environment():
        return {"secure": True, "samesite": "none"}
    return {"secure": False, "samesite": "lax"}


def attach_session_cookie(response: Response, token: str, max_age: int) -> None:
    flags = cookie_flags()
    response.set_cookie(
        SESSION_COOKIE,
        token,
        httponly=True,
        max_age=max_age,
        path="/",
        secure=flags["secure"],
        samesite=flags["samesite"],
    )


def clear_session_cookie(response: Response) -> None:
    flags = cookie_flags()
    response.delete_cookie(
        SESSION_COOKIE,
        path="/",
        secure=flags["secure"],
        samesite=flags["samesite"],
    )


def revoke_token_session(db: Session, token: str | None) -> None:
    if not token:
        return
    try:
        payload = decode_access_token(token)
    except HTTPException:
        return
    sid = payload.get("sid")
    if not sid:
        return
    row = db.get(AuthSession, sid)
    if row and row.revoked_at is None:
        row.revoked_at = datetime.utcnow()
        db.commit()


def decode_access_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
    except jwt.ExpiredSignatureError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired"
        ) from exc
    except jwt.InvalidTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token"
        ) from exc


def user_from_token(db: Session, token: str) -> User:
    payload = decode_access_token(token)
    user_id = payload.get("sub")
    sid = payload.get("sid")
    if not user_id or not sid:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")
    row = db.get(AuthSession, sid)
    if (
        not row
        or row.revoked_at is not None
        or row.expires_at < datetime.utcnow()
        or str(row.user_id) != str(user_id)
    ):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired")
    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    if not is_allowed_during_maintenance(user.email):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Profipaws is under development. Access is temporarily limited.",
        )
    return user


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    profipaws_session: Optional[str] = Cookie(default=None),
    db: Session = Depends(get_db),
) -> User:
    token = credentials.credentials if credentials and credentials.credentials else profipaws_session
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    return user_from_token(db, token)


def hash_api_key(raw_key: str) -> str:
    return hashlib.sha256(raw_key.encode()).hexdigest()


def generate_api_key() -> tuple[str, str, str]:
    """Returns (raw_key, prefix, key_hash)."""
    raw = f"ppk_{secrets.token_urlsafe(32)}"
    prefix = raw[:12]
    return raw, prefix, hash_api_key(raw)


def get_clinic_from_api_key(
    x_api_key: Optional[str] = Header(default=None, alias="X-API-Key"),
    db: Session = Depends(get_db),
) -> ClinicApiKey:
    if not x_api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing X-API-Key header",
        )
    key_hash = hash_api_key(x_api_key)
    clinic_key = (
        db.query(ClinicApiKey)
        .filter(ClinicApiKey.key_hash == key_hash, ClinicApiKey.is_active.is_(True))
        .first()
    )
    if not clinic_key:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid API key")
    clinic_key.last_used_at = datetime.utcnow()
    db.commit()
    return clinic_key
