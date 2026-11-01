"""Grant full app access (Pro / lifetime) to one or more emails.

Usage (from backend/, with DATABASE_URL set):
  python -m scripts.grant_full_access paula.borgono@gmail.com
  python -m scripts.grant_full_access a@x.com b@y.com
"""

from __future__ import annotations

import sys

from app.database import SessionLocal
from app.models import Subscription, SubscriptionStatus, SubscriptionTier, User

LIFETIME = "lifetime"


def grant(email: str) -> None:
    email = email.strip().lower()
    if not email or "@" not in email:
        raise SystemExit(f"Invalid email: {email!r}")

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            user = User(
                email=email,
                full_name=email.split("@")[0].replace(".", " ").title(),
                google_id=None,
                is_active=True,
            )
            db.add(user)
            db.flush()
            print(f"Created user id={user.id} email={user.email}")
        else:
            user.is_active = True
            print(f"Found user id={user.id} email={user.email}")

        sub = db.query(Subscription).filter(Subscription.user_id == user.id).first()
        if not sub:
            sub = Subscription(
                user_id=user.id,
                tier=SubscriptionTier.PRO,
                status=SubscriptionStatus.ACTIVE,
                billing_interval=LIFETIME,
            )
            db.add(sub)
            print("Created PRO lifetime subscription")
        else:
            prev = sub.tier
            sub.tier = SubscriptionTier.PRO
            sub.status = SubscriptionStatus.ACTIVE
            sub.billing_interval = LIFETIME
            # Detach from Stripe recurring so a cancel webhook cannot revoke access.
            sub.stripe_subscription_id = None
            sub.current_period_end = None
            print(f"Updated subscription to PRO lifetime (was {prev})")

        db.commit()
        print("OK: full access granted (Pro + lifetime)")
    finally:
        db.close()


if __name__ == "__main__":
    if len(sys.argv) < 2:
        raise SystemExit(
            "Usage: python -m scripts.grant_full_access email@example.com [more@emails...]"
        )
    for arg in sys.argv[1:]:
        grant(arg)
