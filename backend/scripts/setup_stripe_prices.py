"""
Create Profipaws Stripe Product + Prices and print env vars to set.

Usage (test mode recommended):
  set STRIPE_SECRET_KEY=sk_test_...
  python scripts/setup_stripe_prices.py

Creates:
  - Product: Profipaws Pro
  - Price monthly: 6.99 EUR
  - Price yearly:  59.00 EUR
"""
from __future__ import annotations

import os
import sys

try:
    import stripe
except ImportError:
    print("Install stripe first: pip install stripe", file=sys.stderr)
    sys.exit(1)


def main() -> int:
    key = os.environ.get("STRIPE_SECRET_KEY", "").strip()
    if not key or key.startswith("sk_test_xxx") or "xxx" in key:
        print(
            "Set a real STRIPE_SECRET_KEY first, e.g.:\n"
            "  $env:STRIPE_SECRET_KEY='sk_test_...'\n"
            "  python scripts/setup_stripe_prices.py",
            file=sys.stderr,
        )
        return 1

    stripe.api_key = key
    mode = "TEST" if key.startswith("sk_test_") else "LIVE"
    print(f"Using Stripe {mode} mode…")

    # Reuse existing product if present
    existing = stripe.Product.list(limit=100, active=True)
    product = next((p for p in existing.auto_paging_iter() if p.name == "Profipaws Pro"), None)
    if product:
        print(f"Reusing product {product.id}")
    else:
        product = stripe.Product.create(
            name="Profipaws Pro",
            description="Unlimited pets, automated alerts, and report export for Profipaws.",
            metadata={"app": "profipaws", "tier": "pro"},
        )
        print(f"Created product {product.id}")

    def find_or_create_price(*, nickname: str, unit_amount: int, interval: str) -> str:
        prices = stripe.Price.list(product=product.id, active=True, limit=100)
        for p in prices.auto_paging_iter():
            if (
                p.get("nickname") == nickname
                and p.get("unit_amount") == unit_amount
                and p.get("currency") == "eur"
                and (p.get("recurring") or {}).get("interval") == interval
            ):
                print(f"Reusing price {nickname}: {p.id}")
                return p.id
        created = stripe.Price.create(
            product=product.id,
            currency="eur",
            unit_amount=unit_amount,
            recurring={"interval": interval},
            nickname=nickname,
            metadata={"app": "profipaws", "interval": interval},
        )
        print(f"Created price {nickname}: {created.id}")
        return created.id

    monthly_id = find_or_create_price(
        nickname="pro_monthly_699",
        unit_amount=699,
        interval="month",
    )
    yearly_id = find_or_create_price(
        nickname="pro_yearly_5900",
        unit_amount=5900,
        interval="year",
    )

    print("\n=== Set these on Railway (profipaws-api) ===")
    print(f"STRIPE_PRICE_ID_PRO={monthly_id}")
    print(f"STRIPE_PRICE_ID_PRO_YEARLY={yearly_id}")
    print("Also set STRIPE_SECRET_KEY / STRIPE_PUBLISHABLE_KEY / STRIPE_WEBHOOK_SECRET from Dashboard.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
