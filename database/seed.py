"""
RuralDemand AI — Realistic Seed Data Generator
================================================
Creates:
    - 1 business: "Sai Kirana Stores" (Nashik district, Maharashtra)
  - 1 owner user
    - 7 products including Maharashtra's volatile Onion (Kanda)
  - ~90 days of daily sales data with:
      * Realistic seasonal variation
      * Festival demand spikes (Diwali, Navratri, Holi)
      * Weekend dip pattern (rural Sunday slowdown)
      * Price variation
      * Random noise for realism
  - Inventory snapshots
  - Market signals (mock)
  - Sample alerts
  - Sample reports

Run: python seed.py
"""

import os
import random
import uuid
from datetime import date, timedelta, datetime
from decimal import Decimal

import psycopg2
from psycopg2.extras import execute_batch
from passlib.hash import bcrypt

# ─── Config ──────────────────────────────────────────────────────────────────
DATABASE_URL = os.environ["DATABASE_URL"]

SEED_DAYS = 90  # days of historical data
END_DATE = date.today()  # newest transaction date = today
START_DATE = END_DATE - timedelta(days=SEED_DAYS - 1)

random.seed(42)  # reproducible

# ─── Maharashtra festival calendar (approximate, within our 90-day window) ───
# We compute relative to today; the seeder adjusts if dates fall outside range.
FESTIVALS_2024_25 = [
    # (month, day, name, demand_multiplier)
    (10,  2, "Gandhi Jayanti",   1.15),
    (10, 12, "Navratri Start",   1.45),
    (10, 13, "Navratri",         1.50),
    (10, 14, "Navratri",         1.50),
    (10, 19, "Navratri End",     1.40),
    (10, 20, "Dussehra",         1.55),
    (11,  1, "Dhanteras",        1.70),
    (11,  3, "Diwali",           2.20),  # biggest spike
    (11,  4, "Diwali +1",        1.80),
    (11, 15, "Chhath Puja",      1.35),
    (12, 25, "Christmas/Year End",1.10),
    ( 1, 14, "Makar Sankranti",  1.40),
    ( 3, 30, "Gudi Padwa",       1.65),
    ( 9,  7, "Ganesh Chaturthi", 2.40),  # Maharashtra's strongest local spike
    ( 1, 26, "Republic Day",     1.15),
    ( 2, 26, "Holi -1",          1.30),
    ( 2, 27, "Holi",             1.60),
    ( 2, 28, "Holi +1",          1.45),
    ( 3, 14, "Ramzan start",     1.25),
    ( 4, 13, "Baisakhi",         1.30),
]

# ─── Product definitions ─────────────────────────────────────────────────────
PRODUCTS = [
    {
        "name":          "Onion (Kanda)",
        "category":      "Vegetables",
        "unit":          "kg",
        "base_demand":   38.0,
        "price":         42.0,
        "cost_price":    32.0,
        "current_stock": 180.0,
        "ideal_stock":   360.0,
        "safety_stock":  70.0,
        "high_months":   [8, 9, 10, 11],
        "low_months":    [4, 5, 6],
    },
    {
        "name":          "Mustard Oil",
        "category":      "Oils & Fats",
        "unit":          "litre",
        "base_demand":   28.0,   # litres / day
        "price":         185.0,  # ₹ per litre
        "cost_price":    158.0,
        "current_stock": 210.0,
        "ideal_stock":   350.0,
        "safety_stock":  55.0,
        # which months are seasonally HIGH (1=Jan, 12=Dec)
        "high_months":   [11, 12, 1, 2, 10],   # winter + festive
        "low_months":    [5, 6, 7],             # summer/monsoon dip
    },
    {
        "name":          "Wheat Flour",
        "category":      "Grains & Pulses",
        "unit":          "kg",
        "base_demand":   55.0,
        "price":         36.0,
        "cost_price":    28.0,
        "current_stock": 480.0,
        "ideal_stock":   700.0,
        "safety_stock":  110.0,
        "high_months":   [10, 11, 12, 1],
        "low_months":    [4, 5],
    },
    {
        "name":          "Turmeric Powder",
        "category":      "Spices",
        "unit":          "kg",
        "base_demand":   8.5,
        "price":         185.0,
        "cost_price":    145.0,
        "current_stock": 42.0,
        "ideal_stock":   90.0,
        "safety_stock":  17.0,
        "high_months":   [10, 11, 12, 3, 4],   # festive + wedding
        "low_months":    [6, 7, 8],
    },
    {
        "name":          "Gram Dal",
        "category":      "Grains & Pulses",
        "unit":          "kg",
        "base_demand":   32.0,
        "price":         95.0,
        "cost_price":    75.0,
        "current_stock": 95.0,   # intentionally low to trigger alerts
        "ideal_stock":   400.0,
        "safety_stock":  65.0,
        "high_months":   [11, 12, 1, 2, 3],    # winter protein demand
        "low_months":    [6, 7],
    },
    {
        "name":          "Rice",
        "category":      "Grains & Pulses",
        "unit":          "kg",
        "base_demand":   75.0,   # highest volume product
        "price":         54.0,
        "cost_price":    40.0,
        "current_stock": 820.0,
        "ideal_stock":   1000.0,
        "safety_stock":  150.0,
        "high_months":   [9, 10, 11],          # post-harvest abundance
        "low_months":    [5, 6],               # pre-harvest scarcity
    },
    {
        "name":          "Sugar",
        "category":      "Sweeteners",
        "unit":          "kg",
        "base_demand":   42.0,
        "price":         44.0,
        "cost_price":    35.0,
        "current_stock": 0.0,   # OUT OF STOCK — triggers alert
        "ideal_stock":   500.0,
        "safety_stock":  85.0,
        "high_months":   [10, 11],             # festive season
        "low_months":    [2, 3],
    },
]

PAYMENT_METHODS = ["cash", "upi", "cash", "cash", "upi", "credit"]  # weighted
CUSTOMER_TYPES  = ["walk-in", "walk-in", "regular", "regular", "wholesale"]
REGIONS         = [
    "Nashik District Village", "Pune District Village", "Lasalgaon Haat",
    "Vashi APMC", "Dindori Bazaar",
]


# ─── Helpers ─────────────────────────────────────────────────────────────────

def get_festival_multiplier(d: date) -> float:
    for month, day, name, mult in FESTIVALS_2024_25:
        if d.month == month and d.day == day:
            return mult
    return 1.0


def get_seasonal_multiplier(product: dict, d: date) -> float:
    if d.month in product["high_months"]:
        return 1.30
    if d.month in product["low_months"]:
        return 0.70
    return 1.0


def get_weekday_multiplier(d: date) -> float:
    """Sunday is slow in rural markets; Saturday and Monday are busier."""
    if d.weekday() == 6:   # Sunday
        return 0.55
    if d.weekday() == 0:   # Monday (stock-up after Sunday)
        return 1.25
    if d.weekday() == 5:   # Saturday (weekly market / haat day)
        return 1.40
    return 1.0


def generate_daily_quantity(product: dict, d: date) -> float:
    base = product["base_demand"]
    qty = base
    qty *= get_seasonal_multiplier(product, d)
    qty *= get_festival_multiplier(d)
    qty *= get_weekday_multiplier(d)
    # Add ±20% Gaussian noise
    noise = random.gauss(1.0, 0.12)
    qty *= max(0.3, noise)
    return round(max(0.5, qty), 2)


def generate_price(base_price: float, d: date) -> float:
    """Prices drift slightly over time + seasonal premium."""
    day_index = (d - START_DATE).days
    trend_factor = 1.0 + (day_index / SEED_DAYS) * 0.05  # ~5% price rise over period
    noise = random.gauss(1.0, 0.03)
    return round(base_price * trend_factor * noise, 2)


# ─── Main seeder ─────────────────────────────────────────────────────────────

def main():
    print(f"🌱 Connecting to database: {DATABASE_URL[:50]}...")
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = False
    cur = conn.cursor()

    try:
        print("🏢 Creating business (idempotent)...")
        business_id = str(uuid.uuid4())
        cur.execute(
            """
            INSERT INTO businesses
              (id, name, owner_name, category, location, latitude, longitude,
               business_since, phone, email)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            ON CONFLICT DO NOTHING
            """,
            (
                business_id,
                "Sai Kirana Stores",
                "Ramesh Patil",
                "kirana_store",
                "Dindori Village, Nashik District, Maharashtra",
                20.0087,
                73.7870,
                2015,
                "+919876543210",
                "ramesh.yadav@example.com",
            ),
        )
        # Always resolve to the actual business_id in the DB (in case it already existed)
        cur.execute("SELECT id FROM businesses WHERE phone = %s", ("+919876543210",))
        row = cur.fetchone()
        if row:
            business_id = str(row[0])
            cur.execute(
                "UPDATE businesses SET name=%s, owner_name=%s, location=%s, latitude=%s, longitude=%s WHERE phone=%s",
                ("Sai Kirana Stores", "Ramesh Patil", "Dindori Village, Nashik District, Maharashtra", 20.0087, 73.7870, "+919876543210"),
            )
        cur.execute("UPDATE businesses SET is_active = TRUE WHERE id = %s", (business_id,))

        print("👤 Creating owner user (idempotent)...")
        user_id = str(uuid.uuid4())
        password_hash = bcrypt.hash("Demo@12345")
        cur.execute(
            """
            INSERT INTO users
              (id, business_id, name, role, mobile, email, password_hash)
            VALUES (%s,%s,%s,%s,%s,%s,%s)
            ON CONFLICT (mobile) DO NOTHING
            """,
            (
                user_id,
                business_id,
                "Ramesh Patil",
                "owner",
                "+919876543210",
                "ramesh.patil@example.com",
                password_hash,
            ),
        )
        cur.execute("UPDATE users SET is_active = TRUE WHERE mobile = %s", ("+919876543210",))
        cur.execute("UPDATE users SET name=%s, email=%s, business_id=%s WHERE mobile=%s", ("Ramesh Patil", "ramesh.patil@example.com", business_id, "+919876543210"))

        print("📦 Creating products (idempotent)...")
        product_ids = {}
        for p in PRODUCTS:
            pid = str(uuid.uuid4())
            target_stock = p["ideal_stock"] * 0.9
            reorder_point = p["safety_stock"] * 2
            cur.execute(
                """
                INSERT INTO products
                  (id, business_id, name, category, unit, current_stock,
                   ideal_stock, target_stock, safety_stock, reorder_point,
                   cost_price, selling_price)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                ON CONFLICT (business_id, name) DO NOTHING
                """,
                (
                    pid, business_id, p["name"], p["category"], p["unit"],
                    p["current_stock"], p["ideal_stock"], target_stock,
                    p["safety_stock"], reorder_point,
                    p["cost_price"], p["price"],
                ),
            )
            # Always resolve to the actual product_id in the DB
            cur.execute(
                "SELECT id FROM products WHERE business_id = %s AND name = %s",
                (business_id, p["name"]),
            )
            prod_row = cur.fetchone()
            if prod_row:
                product_ids[p["name"]] = str(prod_row[0])
                cur.execute("UPDATE products SET is_active = TRUE WHERE id = %s", (prod_row[0],))

        print(f"🗑️  Clearing old sales rows for this business (idempotent re-seed)...")
        cur.execute("DELETE FROM sales WHERE business_id = %s", (business_id,))
        print(f"   ✓ Old sales deleted")

        print(f"📊 Generating {SEED_DAYS} days of sales data ({START_DATE} → {END_DATE})...")
        sales_rows = []
        current_date = START_DATE
        while current_date <= END_DATE:
            for p in PRODUCTS:
                # Some products skip some days (sparse rural market reality)
                if random.random() < 0.08:  # 8% chance of no sale on that day
                    continue
                qty = generate_daily_quantity(p, current_date)
                price = generate_price(p["price"], current_date)
                sales_rows.append((
                    str(uuid.uuid4()),
                    business_id,
                    product_ids[p["name"]],
                    current_date,
                    qty,
                    price,
                    random.choice(PAYMENT_METHODS),
                    random.choice(REGIONS),
                    random.choice(CUSTOMER_TYPES),
                ))
            current_date += timedelta(days=1)

        execute_batch(
            cur,
            """
            INSERT INTO sales
              (id, business_id, product_id, sale_date, quantity, price_per_unit,
               payment_method, region, customer_type)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)
            """,
            sales_rows,
            page_size=500,
        )
        print(f"   ✓ Inserted {len(sales_rows)} sale records (newest date = {END_DATE})")

        print("📸 Creating inventory snapshots (last 30 days)...")
        inv_rows = []
        snap_start = END_DATE - timedelta(days=29)
        for p in PRODUCTS:
            pid = product_ids[p["name"]]
            # Simulate stock declining then being restocked
            stock = p["current_stock"] * 1.5  # started higher
            d = snap_start
            while d <= END_DATE:
                daily_sales = generate_daily_quantity(p, d) * 0.7
                stock = max(0, stock - daily_sales)
                if stock < p["safety_stock"] * 0.5 and random.random() < 0.3:
                    stock += p["ideal_stock"] * 0.6  # partial restock
                if p["name"] == "Sugar" and d >= END_DATE - timedelta(days=5):
                    stock = 0.0  # force out-of-stock for demo
                # Determine status
                if stock == 0:
                    status = "out_of_stock"
                elif stock < p["safety_stock"]:
                    status = "low_stock"
                elif stock > p["ideal_stock"] * 1.2:
                    status = "overstock"
                else:
                    status = "optimal"
                inv_rows.append((str(uuid.uuid4()), pid, d, round(stock, 2), status))
                d += timedelta(days=1)

        execute_batch(
            cur,
            """
            INSERT INTO inventory_snapshots (id, product_id, snapshot_date, stock_level, status)
            VALUES (%s,%s,%s,%s,%s)
            ON CONFLICT (product_id, snapshot_date) DO NOTHING
            """,
            inv_rows,
            page_size=200,
        )
        print(f"   ✓ Inserted {len(inv_rows)} inventory snapshot records")

        print("📡 Creating market signals (mock, last 60 days)...")
        categories = ["Oils & Fats", "Grains & Pulses", "Spices", "Sweeteners"]
        market_rows = []
        for i in range(60):
            sig_date = END_DATE - timedelta(days=59 - i)
            for cat in categories:
                demand_idx = round(random.gauss(62, 12), 2)
                supply_idx = round(random.gauss(55, 10), 2)
                base_price = {"Oils & Fats": 165, "Grains & Pulses": 45, "Spices": 160, "Sweeteners": 38}[cat]
                price = round(base_price * random.gauss(1.0, 0.04), 2)
                market_rows.append((
                    str(uuid.uuid4()),
                    "Maharashtra — Lasalgaon / Vashi APMC",
                    cat,
                    sig_date,
                    max(10, price),
                    max(0, min(100, demand_idx)),
                    max(0, min(100, supply_idx)),
                    random.choice(["low", "medium", "medium", "high"]),
                    "Maharashtra APMC mock",
                    round(random.gauss(26, 5), 1),
                    round(max(0, random.gauss(3, 8)), 1),
                ))
        execute_batch(
            cur,
            """
            INSERT INTO market_signals
              (id, region, category, signal_date, price, demand_index, supply_index,
               competition_level, source, weather_temp, weather_rainfall)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            ON CONFLICT (region, category, signal_date, source) DO NOTHING
            """,
            market_rows,
            page_size=200,
        )
        print(f"   ✓ Inserted {len(market_rows)} market signal records")

        print("🔔 Creating alerts...")
        alerts_data = [
            (business_id, product_ids["Sugar"],         "out_of_stock",         "high",   "Sugar is out of stock! Restock immediately — Diwali season demand is high."),
            (business_id, product_ids["Gram Dal"],      "low_stock",             "high",   "Gram Dal stock (95 kg) is below safety level. Recommend ordering 300 kg."),
            (business_id, product_ids["Mustard Oil"],   "high_demand_forecast",  "medium", "Mustard Oil demand forecast +24% next week due to festival season."),
            (business_id, product_ids["Turmeric Powder"],"price_increase",       "medium", "Turmeric wholesale price up 8% this week at Vashi APMC."),
            (business_id, product_ids["Onion (Kanda)"],   "price_increase",       "high",   "Onion price at Lasalgaon APMC down 18% — good time to stock."),
            (business_id, None,                         "weather_risk",          "low",    "Light rain forecast next 3 days — ensure dry storage for flour products."),
            (business_id, product_ids["Wheat Flour"],   "forecast_updated",      "low",    "AI demand model retrained with latest 90 days of sales data."),
        ]
        alert_rows = []
        for i, (bid, pid, atype, priority, msg) in enumerate(alerts_data):
            alert_rows.append((
                str(uuid.uuid4()), bid, pid, atype, priority, msg,
                datetime.now() - timedelta(hours=random.randint(1, 48)),
            ))
        execute_batch(
            cur,
            """
            INSERT INTO alerts (id, business_id, product_id, type, priority, message, created_at)
            VALUES (%s,%s,%s,%s,%s,%s,%s)
            """,
            alert_rows,
        )
        print(f"   ✓ Inserted {len(alert_rows)} alerts")

        print("📑 Creating sample reports...")
        report_rows = []
        report_types_list = [
            ("demand_forecast", "pdf"), ("sales_summary", "pdf"),
            ("inventory_status", "excel"), ("production_plan", "pdf"),
            ("market_trends", "csv"),
        ]
        for rtype, fmt in report_types_list:
            report_rows.append((
                str(uuid.uuid4()), business_id, rtype,
                END_DATE - timedelta(days=7), END_DATE,
                datetime.now() - timedelta(days=random.randint(0, 14)),
                fmt, "generated",
                random.randint(2, 15), random.randint(1, 8), random.randint(0, 3),
            ))
        execute_batch(
            cur,
            """
            INSERT INTO reports
              (id, business_id, type, period_start, period_end, generated_at,
               format, status, views, downloads, shares)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            """,
            report_rows,
        )
        print(f"   ✓ Inserted {len(report_rows)} reports")

        conn.commit()
        print("\n✅ Seed complete!")
        print(f"   Business ID : {business_id}")
        print(f"   User mobile : +919876543210")
        print(f"   Password    : Demo@12345")
        print(f"   Products    : {len(PRODUCTS)}")
        print(f"   Sales rows  : {len(sales_rows)}")

        print("\n🤖 Generating AI forecasts (Prophet)...")
        try:
            import subprocess, json
            from urllib.request import Request, urlopen
            from urllib.error import URLError
            from pathlib import Path
            repo    = Path(__file__).resolve().parent.parent
            ml_path = repo / "ml-service"

            # Prefer the backend venv (has Prophet); fall back to the current
            # interpreter (e.g. the database/ venv used by the Docker seeder).
            venv_py = repo / "backend" / ".venv" / "bin" / "python"
            import sys as _sys
            py = str(venv_py) if venv_py.exists() else _sys.executable

            # Drop ALL stale forecast rows for this business so the fresh run
            # covers exactly the new next-7-day window with no leftover dates.
            cur.execute(
                """
                DELETE FROM forecasts
                WHERE product_id IN (SELECT id FROM products WHERE business_id = %s)
                """,
                (business_id,),
            )
            conn.commit()
            print(f"   ✓ Cleared old forecast rows for business {business_id}")

            if ml_path.exists():
                # Always run forecaster.py as a fresh subprocess so there is no
                # risk of importing a stale cached module.
                proc = subprocess.run(
                    [py, str(ml_path / "forecaster.py"), "--business_id", business_id],
                    cwd=str(ml_path), capture_output=True, text=True, timeout=300,
                )
            else:
                # In Docker, ml-service is a separate image and owns Prophet.
                request = Request(
                    os.getenv("ML_SERVICE_URL", "http://ml-service:8001") + "/forecast/run",
                    data=json.dumps({"business_id": business_id}).encode(),
                    headers={"Content-Type": "application/json"},
                    method="POST",
                )
                with urlopen(request, timeout=300) as response:
                    payload = json.load(response)
                proc = subprocess.CompletedProcess([], 0, json.dumps(payload), "")
            # Print forecaster output so it's visible in the seed log
            if proc.stdout:
                for line in proc.stdout.strip().splitlines():
                    print(f"   {line}")
            if proc.returncode != 0:
                err_detail = (proc.stderr or proc.stdout or "forecaster.py failed").strip()
                raise RuntimeError(err_detail)

            # Re-read results directly from DB to print a summary
            cur.execute(
                """
                SELECT p.name,
                       COUNT(f.id)                          AS days,
                       SUM(f.predicted_demand)              AS total_7d,
                       AVG(f.confidence_level)              AS avg_acc
                FROM forecasts f
                JOIN products p ON f.product_id = p.id
                WHERE p.business_id = %s
                GROUP BY p.name
                ORDER BY total_7d DESC
                """,
                (business_id,),
            )
            rows = cur.fetchall()
            print(f"   ✓ Forecasts stored for {len(rows)}/{len(PRODUCTS)} products:")
            overall_num   = 0.0
            overall_denom = 0.0
            for pname, days, total, avg_acc in rows:
                acc = float(avg_acc or 0)
                tot = float(total or 0)
                print(f"     {pname}: {days} days, {tot:.1f} units, accuracy={acc:.1f}%")
                overall_num   += acc * tot
                overall_denom += tot
            if overall_denom:
                print(f"   Overall MAPE-based accuracy: {overall_num / overall_denom:.1f}%")

        except Exception as ml_err:
            print(f"   ⚠️  Could not run forecast: {ml_err}")
            print(
                "   Run manually:\n"
                f"   {py} ml-service/forecaster.py --business_id {business_id}"
            )

    except Exception as e:
        conn.rollback()
        print(f"\n❌ Seed failed: {e}")
        raise
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    main()
