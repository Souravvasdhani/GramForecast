#!/usr/bin/env python3
"""
Regenerate AI forecasts for all businesses (or a specific one).

Usage
-----
  # Default demo account (Ramesh Kirana +919876543210):
  backend/.venv/bin/python regenerate_forecast.py --demo

  # One business by ID:
  backend/.venv/bin/python regenerate_forecast.py --business_id <uuid>

  # All active businesses:
  backend/.venv/bin/python regenerate_forecast.py

What it does
------------
1. Deletes existing forecast rows for the target business(es) so stale
   out-of-window rows cannot shadow the fresh ones.
2. Calls forecaster.run_forecasts_for_business() which:
   - Loads 90-day sales per product
   - Runs a MAPE backtest (train on history before last 14 days, predict
     that window, compare to actuals) → real accuracy %, no hardcoding
   - Fits Facebook Prophet (falls back to Holt-Winters if Prophet fails)
   - Uses the BUSINESS-LEVEL max sale date as anchor so every product
     covers the exact same 7-day window regardless of individual skip days
   - Upserts 7 rows per product into the forecasts table
3. Prints a per-product and overall summary.

After running, backend endpoints immediately serve the new values —
no server restart needed.
"""

import argparse
import os
import sys
from pathlib import Path

# ── path setup ────────────────────────────────────────────────────────────────
REPO    = Path(__file__).resolve().parent
ML_PATH = REPO / "ml-service"
if str(ML_PATH) not in sys.path:
    sys.path.insert(0, str(ML_PATH))

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://gramuser:grampassword@localhost:5432/gramforecast",
)
os.environ.setdefault("DATABASE_URL", DATABASE_URL)

# ── NumPy 2.0 compat shim — must happen before Prophet is imported ─────────
import numpy as np
if not hasattr(np, "float_"):
    np.float_ = np.float64

import psycopg2
from forecaster import run_forecasts_for_business  # noqa: E402


# ── helpers ───────────────────────────────────────────────────────────────────

def _connect():
    return psycopg2.connect(DATABASE_URL)


def clear_forecasts(business_id: str) -> int:
    """Delete all forecast rows for a business. Returns deleted row count."""
    conn = _connect()
    cur  = conn.cursor()
    cur.execute(
        """
        DELETE FROM forecasts
        WHERE product_id IN (
            SELECT id FROM products WHERE business_id = %s
        )
        """,
        (business_id,),
    )
    deleted = cur.rowcount
    conn.commit()
    cur.close()
    conn.close()
    return deleted


def print_summary(results: dict, business_label: str) -> None:
    print(f"\n{'─'*60}")
    print(f"  Business : {business_label}")
    print(f"{'─'*60}")
    product_rows = [
        (name, info) for name, info in results.items()
        if name != "_overall" and isinstance(info, dict)
    ]
    ok_count = sum(1 for _, info in product_rows if info.get("status") == "ok")
    print(f"  Products forecast : {ok_count}/{len(product_rows)}")
    print()
    for name, info in sorted(product_rows, key=lambda x: -(x[1].get("forecast_7d_total") or 0)):
        if info.get("status") == "ok":
            acc  = info.get("accuracy_pct", info.get("confidence", 0))
            mape = info.get("mape_pct")
            tot  = info.get("forecast_7d_total", 0)
            mdl  = info.get("model", "?")
            mape_str = f"MAPE={mape:.1f}%" if mape is not None else "MAPE=n/a"
            print(f"  ✓  {name:<22}  7d={tot:>7.1f}  acc={acc:.1f}%  {mape_str}  [{mdl}]")
        else:
            reason = info.get("reason", info.get("status", "unknown"))
            print(f"  ✗  {name:<22}  skipped ({reason})")
    overall = (results.get("_overall") or {}).get("accuracy_pct", 0)
    print()
    print(f"  Overall MAPE-based accuracy : {overall:.1f}%")
    print(f"{'─'*60}\n")


def run_for_business(business_id: str, business_name: str) -> None:
    print(f"\n▶  Clearing old forecasts for '{business_name}' ...")
    deleted = clear_forecasts(business_id)
    print(f"   {deleted} stale rows removed.")
    print(f"▶  Running Prophet forecaster for '{business_name}' ...")
    results = run_forecasts_for_business(business_id)
    print_summary(results, business_name)


def get_demo_business():
    conn = _connect()
    cur  = conn.cursor()
    cur.execute("SELECT id, name FROM businesses WHERE phone = %s LIMIT 1", ("+919876543210",))
    row = cur.fetchone()
    cur.close()
    conn.close()
    if not row:
        raise SystemExit("Demo business not found. Run: python database/seed.py")
    return str(row[0]), row[1]


def get_all_businesses():
    conn = _connect()
    cur  = conn.cursor()
    cur.execute("SELECT id, name FROM businesses WHERE is_active = TRUE ORDER BY name")
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return [(str(r[0]), r[1]) for r in rows]


# ── CLI ───────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Regenerate Prophet AI forecasts and store results in the DB."
    )
    group = parser.add_mutually_exclusive_group()
    group.add_argument("--business_id", metavar="UUID",
                       help="Run forecast for this specific business UUID.")
    group.add_argument("--demo", action="store_true",
                       help="Run for the default demo account (+919876543210).")
    args = parser.parse_args()

    print("=" * 60)
    print("  GramForecast — AI Forecast Regeneration")
    print("=" * 60)

    if args.business_id:
        conn = _connect()
        cur  = conn.cursor()
        cur.execute("SELECT name FROM businesses WHERE id = %s", (args.business_id,))
        row  = cur.fetchone()
        cur.close(); conn.close()
        run_for_business(args.business_id, row[0] if row else args.business_id)

    elif args.demo:
        bid, bname = get_demo_business()
        run_for_business(bid, bname)

    else:
        businesses = get_all_businesses()
        if not businesses:
            print("\nNo active businesses found.")
            sys.exit(1)
        print(f"\n  Found {len(businesses)} active business(es).")
        for bid, bname in businesses:
            run_for_business(bid, bname)

    print("✅  Done.")
    print()
    print("  To regenerate at any time:")
    print("    backend/.venv/bin/python regenerate_forecast.py --demo")
    print()


if __name__ == "__main__":
    main()
