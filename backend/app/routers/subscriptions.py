from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
import stripe
from app.config import get_settings
from app.database import get_db
from app.models import (
    User,
    Subscription,
    SubscriptionTier,
    SubscriptionStatus,
)
from app.schemas import (
    SubscriptionOut,
    CheckoutSessionRequest,
    CheckoutSessionResponse,
    ChangeIntervalRequest,
    ChangeIntervalResponse,
)
from app.services.auth import get_current_user

router = APIRouter(prefix="/subscriptions", tags=["Subscriptions"])
settings = get_settings()

LIFETIME_AMOUNT_CENTS = 2000  # 20.00 EUR
LIFETIME_INTERVAL = "lifetime"

if settings.stripe_secret_key:
    stripe.api_key = settings.stripe_secret_key


def _lifetime_line_item() -> dict:
    """Prefer a configured one-time Price; otherwise build inline EUR 20 price_data."""
    price_id = (settings.stripe_price_id_lifetime or "").strip()
    if price_id:
        return {"price": price_id, "quantity": 1}
    return {
        "price_data": {
            "currency": "eur",
            "unit_amount": LIFETIME_AMOUNT_CENTS,
            "product_data": {
                "name": "Profipaws — Acceso completo",
                "description": "Pago único. Acceso completo a la app sin suscripción.",
            },
        },
        "quantity": 1,
    }


def _grant_lifetime(sub: Subscription, *, customer_id: str | None = None) -> None:
    sub.tier = SubscriptionTier.PRO
    sub.status = SubscriptionStatus.ACTIVE
    sub.billing_interval = LIFETIME_INTERVAL
    sub.current_period_end = None
    # Lifetime purchases must not be tied to a recurring subscription that can cancel them.
    sub.stripe_subscription_id = None
    if customer_id:
        sub.stripe_customer_id = customer_id


@router.get("/me", response_model=SubscriptionOut)
def get_my_subscription(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sub = db.query(Subscription).filter(Subscription.user_id == current_user.id).first()
    if not sub:
        sub = Subscription(
            user_id=current_user.id,
            tier=SubscriptionTier.FREE,
            status=SubscriptionStatus.ACTIVE,
        )
        db.add(sub)
        db.commit()
        db.refresh(sub)
        return sub
    return sub


@router.post("/checkout", response_model=CheckoutSessionResponse)
def create_checkout_session(
    payload: CheckoutSessionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a Stripe Checkout session for one-time full access (20 €)."""
    from app.services.demo import is_demo_email

    if is_demo_email(current_user.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La cuenta demo es solo de prueba. Crea tu cuenta con Google para comprar el acceso completo.",
        )

    if not settings.stripe_secret_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Stripe is not configured. Set STRIPE_SECRET_KEY.",
        )

    sub = db.query(Subscription).filter(Subscription.user_id == current_user.id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")

    if sub.tier == SubscriptionTier.PRO:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya tienes acceso completo.",
        )

    customer_id = sub.stripe_customer_id
    if not customer_id:
        customer = stripe.Customer.create(
            email=current_user.email,
            name=current_user.full_name,
            metadata={"user_id": str(current_user.id)},
        )
        customer_id = customer.id
        sub.stripe_customer_id = customer_id
        db.commit()

    success = payload.success_url or f"{settings.frontend_url}/dashboard?upgrade=success"
    cancel = payload.cancel_url or f"{settings.frontend_url}/pricing?upgrade=canceled"

    session = stripe.checkout.Session.create(
        customer=customer_id,
        mode="payment",
        line_items=[_lifetime_line_item()],
        success_url=success,
        cancel_url=cancel,
        metadata={
            "user_id": str(current_user.id),
            "purchase": LIFETIME_INTERVAL,
        },
    )
    return CheckoutSessionResponse(checkout_url=session.url, session_id=session.id)


@router.post("/change-interval", response_model=ChangeIntervalResponse)
def change_billing_interval(
    payload: ChangeIntervalRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Legacy endpoint: subscriptions were replaced by a one-time purchase."""
    _ = payload, current_user, db
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Profipaws ya no usa suscripción mensual/anual. El acceso completo es un pago único de 20 €.",
    )


@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    """Handle Stripe one-time payment (and legacy subscription) events."""
    if not settings.stripe_webhook_secret:
        raise HTTPException(status_code=503, detail="Stripe webhook secret not configured")

    payload = await request.body()
    sig = request.headers.get("stripe-signature")
    try:
        event = stripe.Webhook.construct_event(payload, sig, settings.stripe_webhook_secret)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Webhook error: {exc}") from exc

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        user_id = session.get("metadata", {}).get("user_id")
        purchase = session.get("metadata", {}).get("purchase")
        mode = session.get("mode")
        if user_id:
            sub = db.query(Subscription).filter(Subscription.user_id == int(user_id)).first()
            if sub:
                if mode == "payment" or purchase == LIFETIME_INTERVAL:
                    _grant_lifetime(sub, customer_id=session.get("customer"))
                else:
                    # Legacy subscription checkout
                    sub.tier = SubscriptionTier.PRO
                    sub.status = SubscriptionStatus.ACTIVE
                    sub.stripe_subscription_id = session.get("subscription")
                    sub.stripe_customer_id = session.get("customer")
                    interval = session.get("metadata", {}).get("interval")
                    if interval in ("monthly", "yearly"):
                        sub.billing_interval = interval
                db.commit()

    elif event["type"] in ("customer.subscription.updated", "customer.subscription.deleted"):
        subscription_obj = event["data"]["object"]
        sub = (
            db.query(Subscription)
            .filter(Subscription.stripe_subscription_id == subscription_obj["id"])
            .first()
        )
        if sub:
            # Never revoke manually granted / one-time lifetime access.
            if sub.billing_interval == LIFETIME_INTERVAL:
                return {"received": True}

            status_map = {
                "active": SubscriptionStatus.ACTIVE,
                "canceled": SubscriptionStatus.CANCELED,
                "past_due": SubscriptionStatus.PAST_DUE,
                "trialing": SubscriptionStatus.TRIALING,
                "incomplete": SubscriptionStatus.INCOMPLETE,
            }
            sub.status = status_map.get(
                subscription_obj.get("status"), SubscriptionStatus.ACTIVE
            )
            period_end = subscription_obj.get("current_period_end")
            if period_end:
                sub.current_period_end = datetime.utcfromtimestamp(period_end)
            if event["type"] == "customer.subscription.deleted":
                sub.tier = SubscriptionTier.FREE
                sub.status = SubscriptionStatus.CANCELED
                sub.billing_interval = None
            db.commit()

    return {"received": True}
