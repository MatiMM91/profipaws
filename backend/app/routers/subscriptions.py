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
)
from app.services.auth import get_current_user

router = APIRouter(prefix="/subscriptions", tags=["Subscriptions"])
settings = get_settings()

if settings.stripe_secret_key:
    stripe.api_key = settings.stripe_secret_key


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


@router.post("/checkout", response_model=CheckoutSessionResponse)
def create_checkout_session(
    payload: CheckoutSessionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a Stripe Checkout session for Pro (6.99 €/mo or 59 €/yr)."""
    interval = payload.interval or "yearly"
    price_id = (
        settings.stripe_price_id_pro_yearly
        if interval == "yearly"
        else settings.stripe_price_id_pro
    )
    # Fall back to monthly price if yearly ID is not configured yet
    if interval == "yearly" and not price_id:
        price_id = settings.stripe_price_id_pro

    if not settings.stripe_secret_key or not price_id:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Stripe is not configured. Set STRIPE_SECRET_KEY and STRIPE_PRICE_ID_PRO.",
        )

    sub = db.query(Subscription).filter(Subscription.user_id == current_user.id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")

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
        mode="subscription",
        line_items=[{"price": price_id, "quantity": 1}],
        success_url=success,
        cancel_url=cancel,
        metadata={"user_id": str(current_user.id), "interval": interval},
    )
    return CheckoutSessionResponse(checkout_url=session.url, session_id=session.id)


@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    """Handle Stripe subscription lifecycle events."""
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
        if user_id:
            sub = db.query(Subscription).filter(Subscription.user_id == int(user_id)).first()
            if sub:
                sub.tier = SubscriptionTier.PRO
                sub.status = SubscriptionStatus.ACTIVE
                sub.stripe_subscription_id = session.get("subscription")
                sub.stripe_customer_id = session.get("customer")
                db.commit()

    elif event["type"] in ("customer.subscription.updated", "customer.subscription.deleted"):
        subscription_obj = event["data"]["object"]
        sub = (
            db.query(Subscription)
            .filter(Subscription.stripe_subscription_id == subscription_obj["id"])
            .first()
        )
        if sub:
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
            if event["type"] == "customer.subscription.deleted":
                sub.tier = SubscriptionTier.FREE
                sub.status = SubscriptionStatus.CANCELED
            db.commit()

    return {"received": True}
