"""
RuralDemand AI — Prophet/SARIMA Forecasting Service
=====================================================
Loads sales data from PostgreSQL, fits a Prophet model per product,
generates 7-day forward forecasts, and writes results back to the
`forecasts` table.

Features:
  - Facebook Prophet as primary model (handles seasonality, holidays)
  - Indian festival calendar as custom holidays
  - Falls back to Holt-Winters (statsmodels) if Prophet fails
  - Writes confidence intervals to DB
  - Logs MAPE on held-out last-7-day window
"""

import os
import uuid
import logging
from datetime import date, timedelta, datetime
from typing import Optional

import numpy as np
import pandas as pd
import psycopg2
from psycopg2.extras import execute_batch

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://gramuser:grampassword@localhost:5432/gramforecast",
)

FORECAST_HORIZON = 7  # days
MODEL_VERSION    = "prophet_v1"

# ─── Indian festival holidays ─────────────────────────────────────────────────
INDIAN_HOLIDAYS = pd.DataFrame({
    "holiday": [
        "Diwali", "Diwali+1", "Navratri", "Navratri_End", "Dussehra",
        "Dhanteras", "Holi", "Holi+1", "Makar_Sankranti", "Eid_ul_Fitr",
        "Baisakhi", "Raksha_Bandhan", "Chhath_Puja",
    ],
    "ds": pd.to_datetime([
        "2024-11-01", "2024-11-02", "2024-10-03", "2024-10-12", "2024-10-12",
        "2024-10-29", "2024-03-25", "2024-03-26", "2024-01-15", "2024-04-10",
        "2024-04-13", "2024-08-19", "2024-11-07",
    ]),
    "lower_window": [0, 0, -2, 0, 0, 0, -1, 0, 0, 0, 0, 0, -1],
    "upper_window": [1, 1,  9, 0, 1, 1,  1, 1, 1, 2, 1, 1,  1],
})


# ─── Data loading ─────────────────────────────────────────────────────────────

def load_sales(conn, product_id: str) -> pd.DataFrame:
    """Load daily aggregated sales for a product."""
    sql = """
        SELECT sale_date AS ds, SUM(quantity) AS y
        FROM sales
        WHERE product_id = %s
        GROUP BY sale_date
        ORDER BY sale_date
    """
    df = pd.read_sql_query(sql, conn, params=(product_id,))
    df["ds"] = pd.to_datetime(df["ds"])
    df["y"]  = df["y"].astype(float)
    return df


# ─── Prophet model ────────────────────────────────────────────────────────────

def fit_prophet(df: pd.DataFrame) -> Optional[object]:
    try:
        from prophet import Prophet
        model = Prophet(
            yearly_seasonality=True,
            weekly_seasonality=True,
            daily_seasonality=False,
            holidays=INDIAN_HOLIDAYS,
            seasonality_mode="multiplicative",
            interval_width=0.80,
            changepoint_prior_scale=0.05,
        )
        model.fit(df)
        return model
    except Exception as e:
        logger.warning(f"Prophet failed: {e}")
        return None


def predict_prophet(model, horizon: int):
    future = model.make_future_dataframe(periods=horizon, freq="D")
    forecast = model.predict(future)
    tail = forecast.tail(horizon)[["ds", "yhat", "yhat_lower", "yhat_upper"]]
    tail["yhat"]       = tail["yhat"].clip(lower=0)
    tail["yhat_lower"] = tail["yhat_lower"].clip(lower=0)
    tail["yhat_upper"] = tail["yhat_upper"].clip(lower=0)
    return tail


# ─── Fallback: Holt-Winters ───────────────────────────────────────────────────

def fit_holtwinters(df: pd.DataFrame, horizon: int) -> pd.DataFrame:
    """Holt-Winters fallback when Prophet fails or data is sparse."""
    from statsmodels.tsa.holtwinters import ExponentialSmoothing

    series = df.set_index("ds")["y"].asfreq("D", fill_value=0)

    try:
        model = ExponentialSmoothing(
            series,
            trend="add",
            seasonal="add" if len(series) >= 14 else None,
            seasonal_periods=7,
        )
        fit   = model.fit(optimized=True, use_brute=False)
        preds = fit.forecast(horizon)
    except Exception:
        # Ultra-fallback: simple moving average
        window = min(7, len(series))
        avg    = float(series.iloc[-window:].mean())
        preds  = pd.Series(
            [avg] * horizon,
            index=pd.date_range(series.index[-1] + timedelta(days=1), periods=horizon),
        )

    last_date = series.index[-1] if not series.empty else date.today() - timedelta(days=1)
    future_dates = pd.date_range(last_date + timedelta(days=1), periods=horizon)

    # Widen preds to match future dates length
    if len(preds) != horizon:
        avg = float(series.iloc[-7:].mean()) if len(series) >= 7 else float(series.mean() or 0)
        preds = pd.Series([avg] * horizon, index=future_dates)

    result = pd.DataFrame({
        "ds":         future_dates,
        "yhat":       preds.values.clip(0),
        "yhat_lower": (preds.values * 0.8).clip(0),
        "yhat_upper": (preds.values * 1.2).clip(0),
    })
    return result


# ─── MAPE evaluation ──────────────────────────────────────────────────────────

def compute_mape(actual: list, predicted: list) -> float:
    pairs = [(a, p) for a, p in zip(actual, predicted) if a > 0]
    if not pairs:
        return 0.0
    mape = np.mean([abs(a - p) / a for a, p in pairs]) * 100
    return round(float(mape), 2)


# ─── Write forecasts to DB ────────────────────────────────────────────────────

def write_forecasts(conn, product_id: str, preds: pd.DataFrame):
    rows = []
    for _, row in preds.iterrows():
        rows.append((
            str(uuid.uuid4()),
            product_id,
            row["ds"].date() if hasattr(row["ds"], "date") else row["ds"],
            float(row["yhat"]),
            float(row["yhat_lower"]),
            float(row["yhat_upper"]),
            85.0,   # fixed confidence for now; real = 100 - MAPE
            MODEL_VERSION,
            datetime.utcnow(),
        ))
    cur = conn.cursor()
    execute_batch(
        cur,
        """
        INSERT INTO forecasts
          (id, product_id, forecast_date, predicted_demand,
           lower_bound, upper_bound, confidence_level, model_version, run_at)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)
        ON CONFLICT (product_id, forecast_date, model_version)
        DO UPDATE SET
          predicted_demand = EXCLUDED.predicted_demand,
          lower_bound      = EXCLUDED.lower_bound,
          upper_bound      = EXCLUDED.upper_bound,
          confidence_level = EXCLUDED.confidence_level,
          run_at           = EXCLUDED.run_at
        """,
        rows,
    )
    conn.commit()
    cur.close()


# ─── Main forecast runner ─────────────────────────────────────────────────────

def run_forecasts_for_business(business_id: str):
    logger.info(f"Starting forecast run for business {business_id}")
    conn = psycopg2.connect(DATABASE_URL)
    cur  = conn.cursor()

    # Fetch all active products for this business
    cur.execute(
        "SELECT id, name FROM products WHERE business_id = %s AND is_active = TRUE",
        (business_id,),
    )
    products = cur.fetchall()
    cur.close()

    results = {}
    for pid, pname in products:
        logger.info(f"  Forecasting: {pname} ({pid})")
        df = load_sales(conn, str(pid))

        if len(df) < 7:
            logger.warning(f"  Skipping {pname} — only {len(df)} data points (need ≥7)")
            results[pname] = {"status": "skipped", "reason": "insufficient_data"}
            continue

        # Hold out last 7 days for MAPE evaluation
        train_df  = df.iloc[:-7] if len(df) > 14 else df
        holdout   = df.iloc[-7:] if len(df) > 7 else pd.DataFrame()

        # Try Prophet first
        model = fit_prophet(train_df)
        if model:
            preds = predict_prophet(model, FORECAST_HORIZON)
            model_used = "prophet"
        else:
            logger.info(f"  Falling back to Holt-Winters for {pname}")
            preds = fit_holtwinters(train_df, FORECAST_HORIZON)
            model_used = "holtwinters"

        # MAPE on holdout
        mape = 0.0
        if not holdout.empty:
            # Get in-sample predictions for the holdout window
            if model and model_used == "prophet":
                future_eval = model.make_future_dataframe(periods=7, freq="D")
                fc_eval     = model.predict(future_eval)
                predicted_holdout = fc_eval.tail(7)["yhat"].clip(0).tolist()
            else:
                hw_eval = fit_holtwinters(train_df, 7)
                predicted_holdout = hw_eval["yhat"].tolist()
            mape = compute_mape(holdout["y"].tolist(), predicted_holdout)

        # Update confidence based on MAPE
        confidence = max(50, round(100 - mape, 1))
        preds_final = preds.copy()

        write_forecasts(conn, str(pid), preds_final)
        logger.info(f"  ✓ {pname}: {model_used}, MAPE={mape}%, confidence={confidence}%")
        results[pname] = {
            "status":     "ok",
            "model":      model_used,
            "mape_pct":   mape,
            "confidence": confidence,
            "forecast_7d_total": float(preds_final["yhat"].sum()),
        }

    conn.close()
    logger.info(f"Forecast run complete for {business_id}")
    return results


def run_all_businesses():
    """Run forecasts for all businesses in the DB."""
    conn = psycopg2.connect(DATABASE_URL)
    cur  = conn.cursor()
    cur.execute("SELECT id, name FROM businesses WHERE is_active = TRUE")
    businesses = cur.fetchall()
    cur.close()
    conn.close()

    all_results = {}
    for bid, bname in businesses:
        logger.info(f"\n{'='*60}")
        logger.info(f"Business: {bname}")
        all_results[bname] = run_forecasts_for_business(str(bid))
    return all_results


if __name__ == "__main__":
    import sys
    if "--business_id" in sys.argv:
        idx = sys.argv.index("--business_id")
        bid = sys.argv[idx + 1]
        run_forecasts_for_business(bid)
    else:
        run_all_businesses()
