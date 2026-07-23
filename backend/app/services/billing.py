from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, Subscription, SubscriptionTier
from app.services.auth import get_current_user


def user_is_pro(db: Session, user: User) -> bool:
    sub = db.query(Subscription).filter(Subscription.user_id == user.id).first()
    return bool(sub and sub.tier == SubscriptionTier.PRO)


def require_pro(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> User:
    """Raise 402 unless the user has a Pro subscription."""
    if not user_is_pro(db, current_user):
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Pro plan required. Upgrade to unlock this feature.",
        )
    return current_user
