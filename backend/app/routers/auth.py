import asyncio
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy import func
from sqlalchemy.orm import Session
import jwt
from jwt import PyJWKClient
import secrets
import time
from app.database import get_db
from app.models import User, Subscription, SubscriptionTier, SubscriptionStatus
from app.schemas import (
    GoogleAuthRequest,
    TokenResponse,
    UserOut,
    MobileHandoffOut,
    MobileHandoffExchange,
)
from app.services.auth import (
    create_access_token,
    get_current_user,
    is_allowed_during_maintenance,
    security,
)
from app.services.demo import get_or_create_demo_user, is_demo_email, reset_demo_pets
from app.config import get_settings

router = APIRouter(prefix="/auth", tags=["Auth"])
settings = get_settings()

# Short-lived one-time codes for Expo Go (no deep-link JWT URLs).
_MOBILE_HANDOFFS: dict[str, dict] = {}
_DEMO_LAST_HIT: dict[str, float] = {}
_HANDOFF_TTL_SEC = 180
_DEMO_COOLDOWN_SEC = 4
_GOOGLE_CERTS_URL = "https://www.googleapis.com/oauth2/v3/certs"
_GOOGLE_ISSUERS = ["accounts.google.com", "https://accounts.google.com"]
_google_jwks = PyJWKClient(_GOOGLE_CERTS_URL, cache_keys=True)


def _purge_handoffs(now: float | None = None) -> None:
    ts = now if now is not None else time.time()
    expired = [k for k, v in _MOBILE_HANDOFFS.items() if v["exp"] <= ts]
    for k in expired:
        _MOBILE_HANDOFFS.pop(k, None)


@router.post("/google", response_model=TokenResponse)
async def google_login(payload: GoogleAuthRequest, db: Session = Depends(get_db)):
    """
    Exchange a Google ID token for a Profipaws JWT.
    In production, validate against Google's tokeninfo / certs endpoint.
    """
    google_user = await _verify_google_token(payload.id_token)
    if not is_allowed_during_maintenance(google_user.get("email")):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Profipaws is under development. Access is temporarily limited.",
        )

    # Never let Google (or local dev:) hijack the shared demo sandbox identity
    if is_demo_email(google_user.get("email")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Usa el botón Probar demo en la web para entrar a la cuenta de prueba.",
        )

    sub = str(google_user["sub"])
    email = str(google_user["email"]).strip().lower()
    user = db.query(User).filter(User.google_id == sub).first()
    if user is None:
        user = db.query(User).filter(func.lower(User.email) == email).first()
        if user is not None and user.google_id and user.google_id != sub:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="This email is already linked to another Google account",
            )

    if not user:
        user = User(
            email=email,
            full_name=google_user.get("name"),
            google_id=sub,
            avatar_url=google_user.get("picture"),
        )
        db.add(user)
        db.flush()
        db.add(
            Subscription(
                user_id=user.id,
                tier=SubscriptionTier.FREE,
                status=SubscriptionStatus.ACTIVE,
            )
        )
    elif not user.google_id:
        user.google_id = sub

    user.full_name = google_user.get("name") or user.full_name
    user.avatar_url = google_user.get("picture") or user.avatar_url
    db.commit()
    db.refresh(user)

    token = create_access_token(user.id, user.email)
    return TokenResponse(access_token=token, user=UserOut.model_validate(user))


@router.post("/demo", response_model=TokenResponse)
def demo_login(request: Request, db: Session = Depends(get_db)):
    """
    One-click Free sandbox for portfolio visitors.
    Resets sample pets on each entry; JWT lasts ~60 minutes.
    """
    if not settings.demo_login_enabled:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Demo unavailable")

    if settings.maintenance_mode and not is_allowed_during_maintenance(settings.demo_user_email):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Profipaws is under development. Access is temporarily limited.",
        )

    client = request.client.host if request.client else "unknown"
    now = time.time()
    last = _DEMO_LAST_HIT.get(client, 0)
    if now - last < _DEMO_COOLDOWN_SEC:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Espera un momento y vuelve a intentar la demo.",
        )
    _DEMO_LAST_HIT[client] = now

    user = get_or_create_demo_user(db)
    reset_demo_pets(db, user)
    db.commit()
    db.refresh(user)

    token = create_access_token(
        user.id,
        user.email,
        expires_minutes=settings.demo_jwt_expire_minutes,
    )
    return TokenResponse(access_token=token, user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/mobile-handoff", response_model=MobileHandoffOut)
def create_mobile_handoff(
    current_user: User = Depends(get_current_user),
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
):
    """Create a tiny one-time code so Expo Go can deep-link without a huge JWT URL."""
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    _purge_handoffs()
    code = secrets.token_urlsafe(12)
    _MOBILE_HANDOFFS[code] = {
        "access_token": credentials.credentials,
        "user_id": current_user.id,
        "exp": time.time() + _HANDOFF_TTL_SEC,
    }
    return MobileHandoffOut(code=code)


@router.post("/mobile-handoff/exchange", response_model=TokenResponse)
def exchange_mobile_handoff(payload: MobileHandoffExchange, db: Session = Depends(get_db)):
    _purge_handoffs()
    entry = _MOBILE_HANDOFFS.pop(payload.code, None)
    if not entry:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Código inválido o expirado. Vuelve a iniciar sesión.",
        )
    user = db.query(User).filter(User.id == entry["user_id"]).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return TokenResponse(access_token=entry["access_token"], user=UserOut.model_validate(user))


def _email_is_verified(value) -> bool:
    return value is True or str(value).lower() == "true"


def _decode_google_id_token(id_token: str) -> dict:
    signing_key = _google_jwks.get_signing_key_from_jwt(id_token)
    return jwt.decode(
        id_token,
        signing_key.key,
        algorithms=["RS256"],
        audience=settings.google_client_id,
        issuer=_GOOGLE_ISSUERS,
    )


async def _verify_google_token(id_token: str) -> dict:
    """Validate a Google ID token against Google's certificates."""
    if not settings.google_client_id:
        if settings.app_env == "production":
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Google sign-in is not configured",
            )
        if (
            settings.allow_dev_google_login
            and settings.app_env == "development"
            and id_token.startswith("dev:")
        ):
            email = id_token.split(":", 1)[1].strip().lower()
            if not email or "@" not in email:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Google token")
            return {
                "sub": f"dev-{email}",
                "email": email,
                "email_verified": True,
                "name": email.split("@")[0].title(),
                "picture": None,
            }
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google sign-in is not configured",
        )

    try:
        data = await asyncio.to_thread(_decode_google_id_token, id_token)
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Google token") from None

    if not _email_is_verified(data.get("email_verified")):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Google email is not verified")
    email = str(data.get("email") or "").strip().lower()
    sub = data.get("sub")
    if not email or not sub or "@" not in email:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Google token")
    data["email"] = email
    data["sub"] = str(sub)
    return data
