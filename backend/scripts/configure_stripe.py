"""One-shot Stripe + Railway setup for Profipaws. Reads keys from env; never prints secrets."""
from __future__ import annotations

import os
import re
import subprocess
import sys

import stripe

BACKEND = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def mask(val: str) -> str:
    if not val:
        return "(empty)"
    if len(val) < 12:
        return "***"
    return f"{val[:7]}…{val[-4:]} (len={len(val)})"


def update_dotenv(path: str, updates: dict[str, str]) -> None:
    p = os.path.join(path)
    lines: list[str] = []
    if os.path.exists(p):
        with open(p, encoding="utf-8") as f:
            lines = f.read().splitlines()
    keys_seen: set[str] = set()
    out: list[str] = []
    for line in lines:
        m = re.match(r"^([A-Za-z0-9_]+)=(.*)$", line)
        if m and m.group(1) in updates:
            out.append(f"{m.group(1)}={updates[m.group(1)]}")
            keys_seen.add(m.group(1))
        else:
            out.append(line)
    for k, v in updates.items():
        if k not in keys_seen:
            out.append(f"{k}={v}")
    with open(p, "w", encoding="utf-8", newline="\n") as f:
        f.write("\n".join(out) + "\n")


def railway_set(vars_map: dict[str, str]) -> None:
    args = ["npx", "--yes", "@railway/cli", "variable", "set"]
    for k, v in vars_map.items():
        args.append(f"{k}={v}")
    args += ["--service", "profipaws-api"]
    proc = subprocess.run(
        args,
        cwd=BACKEND,
        capture_output=True,
        text=True,
        shell=True,
    )
    if proc.returncode != 0:
        print("Railway variable set failed:", file=sys.stderr)
        # scrub secrets from stderr if echoed
        err = proc.stderr or proc.stdout or ""
        for secret in vars_map.values():
            if secret and secret in err:
                err = err.replace(secret, "[REDACTED]")
        print(err[-2000:], file=sys.stderr)
        raise SystemExit(1)
    print("Railway variables updated (values redacted).")


def main() -> int:
    secret = os.environ.get("STRIPE_SECRET_KEY", "").strip()
    publishable = os.environ.get("STRIPE_PUBLISHABLE_KEY", "").strip()
    if not secret.startswith("sk_test_") or not publishable.startswith("pk_test_"):
        print("Need STRIPE_SECRET_KEY (sk_test_) and STRIPE_PUBLISHABLE_KEY (pk_test_)", file=sys.stderr)
        return 1

    print("Secret:", mask(secret))
    print("Publishable:", mask(publishable))

    stripe.api_key = secret

    products = stripe.Product.list(limit=100, active=True)
    product = next((p for p in products.auto_paging_iter() if p.name == "Profipaws Pro"), None)
    if not product:
        product = stripe.Product.create(
            name="Profipaws Pro",
            description="Unlimited pets, automated alerts, and report export.",
            metadata={"app": "profipaws", "tier": "pro"},
        )
        print("Created product:", product.id)
    else:
        print("Reusing product:", product.id)

    def price_id(nickname: str, amount: int, interval: str) -> str:
        for p in stripe.Price.list(product=product.id, active=True, limit=100).auto_paging_iter():
            if (
                p.nickname == nickname
                and p.unit_amount == amount
                and p.currency == "eur"
                and (p.recurring or {}).get("interval") == interval
            ):
                print(f"Reusing {nickname}:", p.id)
                return p.id
        created = stripe.Price.create(
            product=product.id,
            currency="eur",
            unit_amount=amount,
            recurring={"interval": interval},
            nickname=nickname,
            metadata={"app": "profipaws", "interval": interval},
        )
        print(f"Created {nickname}:", created.id)
        return created.id

    monthly = price_id("pro_monthly_699", 699, "month")
    yearly = price_id("pro_yearly_5900", 5900, "year")

    webhook_url = "https://profipaws-api-production.up.railway.app/api/subscriptions/webhook"
    webhook_secret = ""
    existing = stripe.WebhookEndpoint.list(limit=100)
    endpoint = next((e for e in existing.auto_paging_iter() if e.url == webhook_url), None)
    events = [
        "checkout.session.completed",
        "customer.subscription.updated",
        "customer.subscription.deleted",
    ]
    if endpoint:
        print("Reusing webhook endpoint:", endpoint.id)
        # Secret only returned on create; keep existing Railway value if any
        webhook_secret = os.environ.get("STRIPE_WEBHOOK_SECRET", "").strip()
        if not webhook_secret:
            # recreate to get a secret
            stripe.WebhookEndpoint.delete(endpoint.id)
            endpoint = None
    if not endpoint:
        created_wh = stripe.WebhookEndpoint.create(
            url=webhook_url,
            enabled_events=events,
            description="Profipaws API subscriptions",
            metadata={"app": "profipaws"},
        )
        webhook_secret = created_wh["secret"]
        print("Created webhook endpoint:", created_wh.id)
        print("Webhook secret:", mask(webhook_secret))

    updates = {
        "STRIPE_SECRET_KEY": secret,
        "STRIPE_PUBLISHABLE_KEY": publishable,
        "STRIPE_PRICE_ID_PRO": monthly,
        "STRIPE_PRICE_ID_PRO_YEARLY": yearly,
    }
    if webhook_secret:
        updates["STRIPE_WEBHOOK_SECRET"] = webhook_secret

    update_dotenv(os.path.join(BACKEND, ".env"), updates)
    print("Updated backend/.env (not committed).")

    railway_set(updates)
    print("Done.")
    print("Monthly price:", monthly)
    print("Yearly price:", yearly)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
