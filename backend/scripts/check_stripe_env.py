from pathlib import Path
import subprocess
import sys

env_path = Path(r"C:\Users\matia\Documents\Dev\profipaws\backend\.env")
print("=== local .env STRIPE_* ===")
if env_path.exists():
    for line in env_path.read_text(encoding="utf-8").splitlines():
        if not line.startswith("STRIPE_"):
            continue
        key, _, val = line.partition("=")
        val = val.strip().strip('"').strip("'")
        if not val:
            status = "EMPTY"
        elif "xxx" in val.lower() or val.endswith("_xxx"):
            status = "PLACEHOLDER"
        elif val.startswith(("sk_", "pk_", "whsec_", "price_")):
            status = f"SET(len={len(val)}, prefix={val[:7]}...)"
        else:
            status = f"SET(len={len(val)})"
        print(f"{key}={status}")
else:
    print("no .env")

print("\n=== railway STRIPE_* keys ===")
proc = subprocess.run(
    ["npx", "--yes", "@railway/cli", "variable", "list", "--service", "profipaws-api", "--kv"],
    cwd=r"C:\Users\matia\Documents\Dev\profipaws\backend",
    capture_output=True,
    text=True,
    shell=True,
)
out = (proc.stdout or "") + (proc.stderr or "")
found = False
for line in out.splitlines():
    if line.startswith("STRIPE_"):
        found = True
        key, _, val = line.partition("=")
        val = val.strip()
        if not val:
            status = "EMPTY"
        elif "xxx" in val.lower():
            status = "PLACEHOLDER"
        else:
            status = f"SET(len={len(val)}, prefix={val[:7]}...)"
        print(f"{key}={status}")
if not found:
    print("none or could not list")
    # show last lines for debug without secrets
    for line in out.splitlines()[-15:]:
        if "STRIPE" not in line.upper() and "sk_" not in line and "pk_" not in line:
            print(line)
