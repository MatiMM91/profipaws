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

if settings.stripe_secret_key:
    stripe.api_key = settings.stripe_secret_key


def _price_id_for_interval(interval: str) -> str | None:
    if interval == "yearly":
        price_id = settings.stripe_price_id_pro_yearly or settings.stripe_price_id_pro
    else:
        price_id = settings.stripe_price_id_pro
    return price_id or None


def _interval_from_price_id(price_id: str | None) -> str | None:
    if not price_id:
        return None
    if price_id == settings.stripe_price_id_pro_yearly:
        return "yearly"
    if price_id == settings.stripe_price_id_pro:
        return "monthly"
    return None


def _interval_from_stripe_subscription(stripe_sub) -> str | None:
    try:
        items = (stripe_sub.get("items") or {}).get("data") or []
        if not items:
            return None
        price = items[0].get("price") or {}
        price_id = price.get("id")
        mapped = _interval_from_price_id(price_id)
        if mapped:
            return mapped
        recurring = price.get("recurring") or {}
        stripe_interval = recurring.get("interval")
        if stripe_interval == "year":
            return "yearly"
        if stripe_interval == "month":
            return "monthly"
    except Exception:
        return None
    return None


def _sync_interval_from_stripe(sub: Subscription) -> None:
    """Fill billing_interval from Stripe when missing."""
    if sub.billing_interval or not sub.stripe_subscription_id or not settings.stripe_secret_key:
        return
    try:
        stripe_sub = stripe.Subscription.retrieve(sub.stripe_subscription_id)
        interval = _interval_from_stripe_subscription(stripe_sub)
        if interval:
            sub.billing_interval = interval
            period_end = stripe_sub.get("current_period_end")
            if period_end:
                sub.current_period_end = datetime.utcfromtimestamp(period_end)
    except Exception:
        pass


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

    if sub.tier == SubscriptionTier.PRO and not sub.billing_interval:
        _sync_interval_from_stripe(sub)
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
    price_id = _price_id_for_interval(interval)

    if not settings.stripe_secret_key or not price_id:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Stripe is not configured. Set STRIPE_SECRET_KEY and STRIPE_PRICE_ID_PRO.",
        )

    sub = db.query(Subscription).filter(Subscription.user_id == current_user.id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")

    if sub.tier == SubscriptionTier.PRO and sub.stripe_subscription_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Already on Pro. Use change-interval to switch monthly/yearly.",
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
        mode="subscription",
        line_items=[{"price": price_id, "quantity": 1}],
        success_url=success,
        cancel_url=cancel,
        metadata={"user_id": str(current_user.id), "interval": interval},
    )
    return CheckoutSessionResponse(checkout_url=session.url, session_id=session.id)


@router.post("/change-interval", response_model=ChangeIntervalResponse)
def change_billing_interval(
    payload: ChangeIntervalRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Switch an active Pro subscription between monthly and yearly (Stripe proration)."""
    interval = payload.interval
    price_id = _price_id_for_interval(interval)

    if not settings.stripe_secret_key or not price_id:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Stripe is not configured.",
        )
    if interval == "yearly" and not settings.stripe_price_id_pro_yearly:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Yearly price is not configured.",
        )

    sub = db.query(Subscription).filter(Subscription.user_id == current_user.id).first()
    if not sub or sub.tier != SubscriptionTier.PRO or not sub.stripe_subscription_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Active Pro subscription required to change billing interval.",
        )

    if not sub.billing_interval:
        _sync_interval_from_stripe(sub)

    if sub.billing_interval == interval:
        return ChangeIntervalResponse(
            billing_interval=interval,
            message="Already on this billing interval.",
        )

    try:
        stripe_sub = stripe.Subscription.retrieve(sub.stripe_subscription_id)
        items = (stripe_sub.get("items") or {}).get("data") or []
        if not items:
            raise HTTPException(status_code=400, detail="Stripe subscription has no items.")
        item_id = items[0]["id"]

        updated = stripe.Subscription.modify(
            sub.stripe_subscription_id,
            items=[{"id": item_id, "price": price_id}],
            proration_behavior="create_prorations",
            metadata={
                **(stripe_sub.get("metadata") or {}),
                "interval": interval,
                "user_id": str(current_user.id),
            },
        )
    except Exception as exc:
        # stripe.StripeError or API failures
        detail = getattr(exc, "user_message", None) or str(exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=detail,
        ) from exc

    sub.billing_interval = interval
    sub.tier = SubscriptionTier.PRO
    sub.status = SubscriptionStatus.ACTIVE
    period_end = updated.get("current_period_end")
    if period_end:
        sub.current_period_end = datetime.utcfromtimestamp(period_end)
    db.commit()

    return ChangeIntervalResponse(billing_interval=interval)


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
        interval = session.get("metadata", {}).get("interval")
        if user_id:
            sub = db.query(Subscription).filter(Subscription.user_id == int(user_id)).first()
            if sub:
                sub.tier = SubscriptionTier.PRO
                sub.status = SubscriptionStatus.ACTIVE
                sub.stripe_subscription_id = session.get("subscription")
                sub.stripe_customer_id = session.get("customer")
                if interval in ("monthly", "yearly"):
                    sub.billing_interval = interval
                elif sub.stripe_subscription_id and settings.stripe_secret_key:
                    try:
                        stripe_sub = stripe.Subscription.retrieve(sub.stripe_subscription_id)
                        detected = _interval_from_stripe_subscription(stripe_sub)
                        if detected:
                            sub.billing_interval = detected
                    except Exception:
                        pass
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
            detected = _interval_from_stripe_subscription(subscription_obj)
            if detected:
                sub.billing_interval = detected
            period_end = subscription_obj.get("current_period_end")
            if period_end:
                sub.current_period_end = datetime.utcfromtimestamp(period_end)
            if event["type"] == "customer.subscription.deleted":
                sub.tier = SubscriptionTier.FREE
                sub.status = SubscriptionStatus.CANCELED
                sub.billing_interval = None
            db.commit()

    return {"received": True}
