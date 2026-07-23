from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import httpx
from app.database import get_db
from app.models import User, Subscription, SubscriptionTier, SubscriptionStatus
from app.schemas import GoogleAuthRequest, TokenResponse, UserOut
from app.services.auth import create_access_token, get_current_user, is_allowed_during_maintenance
from app.config import get_settings

router = APIRouter(prefix="/auth", tags=["Auth"])
settings = get_settings()


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

    user = db.query(User).filter(User.google_id == google_user["sub"]).first()
    if not user:
        user = db.query(User).filter(User.email == google_user["email"]).first()

    if not user:
        user = User(
            email=google_user["email"],
            full_name=google_user.get("name"),
            google_id=google_user["sub"],
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
        db.commit()
        db.refresh(user)
    else:
        user.google_id = google_user["sub"]
        user.full_name = google_user.get("name") or user.full_name
        user.avatar_url = google_user.get("picture") or user.avatar_url
        db.commit()
        db.refresh(user)

    token = create_access_token(user.id, user.email)
    return TokenResponse(access_token=token, user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user


async def _verify_google_token(id_token: str) -> dict:
    """Validate Google ID token. Falls back to a dev stub when client id is unset."""
    if not settings.google_client_id:
        # Dev mode stub — DO NOT use in production
        if id_token.startswith("dev:"):
            email = id_token.split(":", 1)[1]
            return {
                "sub": f"dev-{email}",
                "email": email,
                "name": email.split("@")[0].title(),
                "picture": None,
            }
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="GOOGLE_CLIENT_ID not configured. Use id_token='dev:you@email.com' for local testing.",
        )

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://oauth2.googleapis.com/tokeninfo",
            params={"id_token": id_token},
        )
    if resp.status_code != 200:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Google token")

    data = resp.json()
    if data.get("aud") != settings.google_client_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token audience mismatch")
    return data
