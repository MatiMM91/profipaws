"""Roll is Dashboard-only for standard keys. This script updates env given a NEW secret key."""
from __future__ import annotations

import os
import re
import subprocess
import sys

BACKEND = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def update_dotenv(path: str, updates: dict[str, str]) -> None:
    lines: list[str] = []
    if os.path.exists(path):
        with open(path, encoding="utf-8") as f:
            lines = f.read().splitlines()
    seen: set[str] = set()
    out: list[str] = []
    for line in lines:
        m = re.match(r"^([A-Za-z0-9_]+)=(.*)$", line)
        if m and m.group(1) in updates:
            out.append(f"{m.group(1)}={updates[m.group(1)]}")
            seen.add(m.group(1))
        else:
            out.append(line)
    for k, v in updates.items():
        if k not in seen:
            out.append(f"{k}={v}")
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write("\n".join(out) + "\n")


def railway_set(secret: str) -> None:
    proc = subprocess.run(
        [
            "npx",
            "--yes",
            "@railway/cli",
            "variable",
            "set",
            f"STRIPE_SECRET_KEY={secret}",
            "--service",
            "profipaws-api",
        ],
        cwd=BACKEND,
        capture_output=True,
        text=True,
        shell=True,
    )
    if proc.returncode != 0:
        err = (proc.stderr or proc.stdout or "").replace(secret, "[REDACTED]")
        print(err[-1500:], file=sys.stderr)
        raise SystemExit(1)


def verify(secret: str) -> None:
    import stripe

    stripe.api_key = secret
    # lightweight auth check
    stripe.Balance.retrieve()


def main() -> int:
    secret = os.environ.get("STRIPE_SECRET_KEY", "").strip()
    if not secret.startswith("sk_test_"):
        print("Set STRIPE_SECRET_KEY to the NEW sk_test_… key", file=sys.stderr)
        return 1
    print("Verifying new key with Stripe…")
    verify(secret)
    print("OK. Updating local .env and Railway…")
    update_dotenv(os.path.join(BACKEND, ".env"), {"STRIPE_SECRET_KEY": secret})
    railway_set(secret)
    print("Updated STRIPE_SECRET_KEY locally and on Railway.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
