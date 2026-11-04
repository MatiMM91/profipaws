from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
import stripe
from app.config import get_settings
from app.database import get_db
from app.models import (
    User,
    Subscription,
    SubscriptionTier,
    SubscriptionStatus,
    StripeWebhookEvent,
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

    # The browser cannot choose where Stripe sends the customer.
    _ = (payload.success_url, payload.cancel_url)
    base = (settings.frontend_url or "").rstrip("/")
    success = f"{base}/dashboard?upgrade=success"
    cancel = f"{base}/planes?upgrade=canceled"

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


def _customer_id(session: dict) -> str | None:
    customer = session.get("customer")
    if isinstance(customer, dict):
        return customer.get("id")
    return customer


def _is_paid_lifetime(session: dict) -> bool:
    """True only for a collected one-time charge of 20 EUR."""
    if session.get("payment_status") != "paid":
        return False
    if str(session.get("currency") or "").lower() != "eur":
        return False
    try:
        amount = int(session.get("amount_total"))
    except (TypeError, ValueError):
        return False
    if amount != LIFETIME_AMOUNT_CENTS:
        return False
    mode = session.get("mode")
    purchase = (session.get("metadata") or {}).get("purchase")
    return mode == "payment" or purchase == LIFETIME_INTERVAL


def _remember_event(db: Session, event_id: str | None) -> bool:
    """Return False when this Stripe event was already applied."""
    if not event_id:
        return True
    if db.query(StripeWebhookEvent.id).filter(StripeWebhookEvent.event_id == event_id).first():
        return False
    db.add(StripeWebhookEvent(event_id=event_id))
    return True


def _apply_paid_checkout(db: Session, session: dict) -> None:
    metadata = session.get("metadata") or {}
    raw_user_id = metadata.get("user_id")
    try:
        user_id = int(raw_user_id)
    except (TypeError, ValueError):
        return
    sub = db.query(Subscription).filter(Subscription.user_id == user_id).first()
    if not sub:
        return
    if _is_paid_lifetime(session):
        _grant_lifetime(sub, customer_id=_customer_id(session))
        return
    # Legacy recurring checkout: require a collected payment and a subscription id.
    if (
        session.get("payment_status") == "paid"
        and session.get("mode") == "subscription"
        and session.get("subscription")
    ):
        sub.tier = SubscriptionTier.PRO
        sub.status = SubscriptionStatus.ACTIVE
        sub.stripe_subscription_id = session.get("subscription")
        sub.stripe_customer_id = _customer_id(session)
        interval = metadata.get("interval")
        if interval in ("monthly", "yearly"):
            sub.billing_interval = interval


@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    """Handle Stripe one-time payment (and legacy subscription) events."""
    if not settings.stripe_webhook_secret:
        raise HTTPException(status_code=503, detail="Stripe webhook secret not configured")

    payload = await request.body()
    sig = request.headers.get("stripe-signature")
    try:
        event = stripe.Webhook.construct_event(payload, sig, settings.stripe_webhook_secret)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid payload") from None

    if settings.stripe_secret_key.startswith("sk_live_") and not event.get("livemode"):
        return {"received": True}

    if not _remember_event(db, event.get("id")):
        return {"received": True}

    if event["type"] in ("checkout.session.completed", "checkout.session.async_payment_succeeded"):
        _apply_paid_checkout(db, event["data"]["object"])

    elif event["type"] in ("customer.subscription.updated", "customer.subscription.deleted"):
        subscription_obj = event["data"]["object"]
        sub = (
            db.query(Subscription)
            .filter(Subscription.stripe_subscription_id == subscription_obj["id"])
            .first()
        )
        if sub and sub.billing_interval != LIFETIME_INTERVAL:
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

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
    return {"received": True}
