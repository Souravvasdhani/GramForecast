"""
RuralDemand AI — Prophet/SARIMA Forecasting Service
=====================================================
Loads sales data from PostgreSQL, fits a Prophet model per product,
generates 7-day forward forecasts, and writes results back to the
`forecasts` table.

Features:
  - Facebook Prophet as primary model (handles seasonality, holidays)
    Indian festival calendar as custom holidays
  - Falls back to Holt-Winters (statsmodels) if Prophet fails
  - Writes confidence intervals to DB
  - MAPE backtest on a held-out 7–14 day window → accuracy % (100 − MAPE)
"""

import os
import uuid
import logging
from datetime import date, timedelta, datetime
from typing import Optional

import numpy as np
# Compatibility shim: np.float_ was removed in NumPy 2.0; Prophet 1.1.x still uses it
if not hasattr(np, "float_"):
    np.float_ = np.float64
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
BACKTEST_DAYS    = 14
MODEL_VERSION    = "prophet_v1"

# ─── Indian festival holidays ─────────────────────────────────────────────────
INDIAN_HOLIDAYS = pd.DataFrame({
    "holiday": [
        "Diwali", "Diwali+1", "Navratri", "Navratri_End", "Dussehra",
        "Dhanteras", "Holi", "Holi+1", "Makar_Sankranti", "Eid_ul_Fitr",
        "Baisakhi", "Raksha_Bandhan", "Chhath_Puja",
        "Diwali_2025", "Holi_2026", "Raksha_Bandhan_2026", "Independence_Day_2026",
    ],
    "ds": pd.to_datetime([
        "2024-11-01", "2024-11-02", "2024-10-03", "2024-10-12", "2024-10-12",
        "2024-10-29", "2024-03-25", "2024-03-26", "2024-01-15", "2024-04-10",
        "2024-04-13", "2024-08-19", "2024-11-07",
        "2025-10-20", "2026-03-03", "2026-08-08", "2026-08-15",
    ]),
    "lower_window": [0, 0, -2, 0, 0, 0, -1, 0, 0, 0, 0, 0, -1, 0, -1, 0, 0],
    "upper_window": [1, 1,  9, 0, 1, 1,  1, 1, 1, 2, 1, 1,  1, 1,  1, 1, 0],
})


def _connect():
    return psycopg2.connect(DATABASE_URL)


# ─── Data loading ─────────────────────────────────────────────────────────────

def load_sales(conn, product_id: str) -> pd.DataFrame:
    """Load daily aggregated sales for a product, filling calendar gaps."""
    sql = """
        SELECT sale_date AS ds, SUM(quantity) AS y
        FROM sales
        WHERE product_id = %s
        GROUP BY sale_date
        ORDER BY sale_date
    """
    df = pd.read_sql_query(sql, conn, params=(product_id,))
    if df.empty:
        return df
    df["ds"] = pd.to_datetime(df["ds"])
    df["y"]  = df["y"].astype(float)
    daily = (
        df.set_index("ds")["y"]
        .asfreq("D")
        .interpolate(method="linear", limit=3)
        .fillna(0.0)
        .clip(lower=0)
        .reset_index()
    )
    daily.columns = ["ds", "y"]
    return daily


# ─── Prophet model ────────────────────────────────────────────────────────────

def fit_prophet(df: pd.DataFrame) -> Optional[object]:
    try:
        from prophet import Prophet
        span_days = int((df["ds"].max() - df["ds"].min()).days) if len(df) else 0
        model = Prophet(
            yearly_seasonality=span_days >= 365,
            weekly_seasonality=True,
            daily_seasonality=False,
            holidays=INDIAN_HOLIDAYS,
            seasonality_mode="additive",
            interval_width=0.80,
            changepoint_prior_scale=0.05,
            uncertainty_samples=100,
        )
        fit_kwargs = {}
        if len(df) < 150:
            fit_kwargs["algorithm"] = "Newton"
        model.fit(df, **fit_kwargs)
        return model
    except Exception as e:
        logger.warning(f"Prophet failed: {e}")
        return None


def predict_prophet(model, last_ds, horizon: int) -> pd.DataFrame:
    """Predict `horizon` days starting the day after last_ds (not a tail of history)."""
    start = pd.Timestamp(last_ds) + pd.Timedelta(days=1)
    future = pd.DataFrame({"ds": pd.date_range(start, periods=horizon, freq="D")})
    forecast = model.predict(future)
    out = forecast[["ds", "yhat", "yhat_lower", "yhat_upper"]].copy()
    out["yhat"]       = out["yhat"].clip(lower=0)
    out["yhat_lower"] = out["yhat_lower"].clip(lower=0)
    out["yhat_upper"] = out["yhat_upper"].clip(lower=0)
    # Guard against inverted / missing intervals
    out["yhat_lower"] = np.minimum(out["yhat_lower"], out["yhat"])
    out["yhat_upper"] = np.maximum(out["yhat_upper"], out["yhat"])
    return out


# ─── Fallback: Holt-Winters ───────────────────────────────────────────────────

def fit_holtwinters(df: pd.DataFrame, horizon: int) -> pd.DataFrame:
    """Holt-Winters fallback when Prophet fails or data is sparse."""
    from statsmodels.tsa.holtwinters import ExponentialSmoothing

    series = df.set_index("ds")["y"].asfreq("D", fill_value=0)
    last_date = series.index[-1] if not series.empty else pd.Timestamp(date.today()) - pd.Timedelta(days=1)
    future_dates = pd.date_range(last_date + pd.Timedelta(days=1), periods=horizon)

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
        window = min(7, len(series))
        avg    = float(series.iloc[-window:].mean()) if window else 0.0
        preds  = pd.Series([avg] * horizon, index=future_dates)

    if len(preds) != horizon:
        avg = float(series.iloc[-7:].mean()) if len(series) >= 7 else float(series.mean() or 0)
        preds = pd.Series([avg] * horizon, index=future_dates)

    values = np.asarray(preds, dtype=float).clip(0)
    return pd.DataFrame({
        "ds":         future_dates,
        "yhat":       values,
        "yhat_lower": (values * 0.8).clip(0),
        "yhat_upper": (values * 1.2).clip(0),
    })


# ─── MAPE evaluation ──────────────────────────────────────────────────────────

def compute_mape(actual: list, predicted: list) -> float:
    pairs = [(float(a), float(p)) for a, p in zip(actual, predicted) if float(a) > 0]
    if not pairs:
        return None
    mape = np.mean([abs(a - p) / a for a, p in pairs]) * 100
    return round(float(mape), 2)


def mape_to_accuracy(mape: Optional[float]) -> float:
    """Accuracy % derived from MAPE. Never a hardcoded constant."""
    if mape is None:
        return 0.0
    return round(float(max(0.0, min(100.0, 100.0 - mape))), 1)


def backtest_mape(df: pd.DataFrame) -> tuple[Optional[float], str]:
    """
    Train on history before the last 7–14 days, predict that window, compare to actuals.
    Uses 14-day holdout when ≥ 28 daily points exist; otherwise 7 days.
    """
    holdout_n = BACKTEST_DAYS if len(df) >= 28 else 7
    if len(df) <= holdout_n + 7:
        holdout_n = min(7, max(0, len(df) - 7))
    if holdout_n < 3:
        return None, "insufficient_holdout"

    train_df = df.iloc[:-holdout_n].copy()
    holdout  = df.iloc[-holdout_n:].copy()
    if len(train_df) < 7:
        return None, "insufficient_train"

    model_used = "holtwinters"
    bt_model = fit_prophet(train_df)
    if bt_model:
        future = pd.DataFrame({"ds": pd.to_datetime(holdout["ds"])})
        fc_eval = bt_model.predict(future)
        predicted = fc_eval["yhat"].clip(lower=0).tolist()
        model_used = "prophet"
    else:
        hw_eval = fit_holtwinters(train_df, holdout_n)
        predicted = hw_eval["yhat"].tolist()

    return compute_mape(holdout["y"].tolist(), predicted), model_used


# ─── Write forecasts to DB ────────────────────────────────────────────────────

def write_forecasts(conn, product_id: str, preds: pd.DataFrame, accuracy: float = 0.0):
    rows = []
    for _, row in preds.iterrows():
        ds = row["ds"]
        forecast_date = ds.date() if hasattr(ds, "date") else ds
        rows.append((
            str(uuid.uuid4()),
            product_id,
            forecast_date,
            float(row["yhat"]),
            float(row["yhat_lower"]),
            float(row["yhat_upper"]),
            float(accuracy),
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
    conn = _connect()
    cur  = conn.cursor()

    cur.execute(
        "SELECT id, name FROM products WHERE business_id = %s AND is_active = TRUE",
        (business_id,),
    )
    products = cur.fetchall()

    # ── Business-level anchor date ────────────────────────────────────────────
    # All products must share the same forecast window so that the API queries
    # (which use MAX(sale_date) across the whole business) return a full set.
    # A product whose last sale was a day earlier (e.g. due to an 8%-skip day)
    # would otherwise start its forecast one day early and miss the last day of
    # the query window.
    cur.execute(
        """
        SELECT MAX(s.sale_date)
        FROM sales s
        JOIN products p ON s.product_id = p.id
        WHERE p.business_id = %s
        """,
        (business_id,),
    )
    biz_max_sale = cur.fetchone()[0]
    cur.close()

    if biz_max_sale is None:
        logger.warning(f"No sales found for business {business_id}; aborting.")
        conn.close()
        return {"_overall": {"accuracy_pct": 0.0}}

    # forecast_anchor is the last date we treat as "already known".
    # predict_prophet will generate days [anchor+1 … anchor+HORIZON].
    forecast_anchor = pd.Timestamp(biz_max_sale)
    logger.info(
        f"Business max sale date = {biz_max_sale}; "
        f"forecasting {forecast_anchor + pd.Timedelta(days=1)} … "
        f"{forecast_anchor + pd.Timedelta(days=FORECAST_HORIZON)}"
    )

    results = {}
    mape_weights = []  # (accuracy, 7d_total) for overall

    for pid, pname in products:
        logger.info(f"  Forecasting: {pname} ({pid})")
        df = load_sales(conn, str(pid))

        if len(df) < 7:
            logger.warning(f"  Skipping {pname} — only {len(df)} data points (need ≥7)")
            results[pname] = {"status": "skipped", "reason": "insufficient_data"}
            continue

        # If a product's last sale is earlier than the business anchor (e.g. no
        # sale that day), extend the training series up to the anchor with zeros
        # so Prophet anchors at the same date as every other product.
        if df["ds"].max() < forecast_anchor:
            gap_dates = pd.date_range(
                df["ds"].max() + pd.Timedelta(days=1),
                forecast_anchor,
                freq="D",
            )
            gap_df = pd.DataFrame({"ds": gap_dates, "y": 0.0})
            df = pd.concat([df, gap_df], ignore_index=True)
            logger.info(
                f"  Extended {pname} training data by {len(gap_df)} day(s) "
                f"to reach business anchor {biz_max_sale}"
            )

        mape, bt_model = backtest_mape(df)
        accuracy = mape_to_accuracy(mape)

        model_used = "holtwinters"
        full_model = fit_prophet(df)
        if full_model:
            # Always anchor on the business-level max sale date, not df["ds"].max(),
            # so every product covers the identical 7-day window.
            preds = predict_prophet(full_model, forecast_anchor, FORECAST_HORIZON)
            model_used = "prophet"
        else:
            logger.info(f"  Falling back to Holt-Winters for {pname}")
            preds = fit_holtwinters(df, FORECAST_HORIZON)
            model_used = "holtwinters"
            # Re-anchor HW output to the business window as well
            correct_dates = pd.date_range(
                forecast_anchor + pd.Timedelta(days=1),
                periods=FORECAST_HORIZON,
                freq="D",
            )
            preds = preds.copy()
            preds["ds"] = correct_dates

        total_7d = float(preds["yhat"].sum())
        write_forecasts(conn, str(pid), preds, accuracy=accuracy)
        logger.info(
            f"  ✓ {pname}: {model_used}, backtest={bt_model}, "
            f"MAPE={mape}%, accuracy={accuracy}%, 7d={total_7d:.1f}"
        )
        results[pname] = {
            "status":            "ok",
            "model":             model_used,
            "mape_pct":          mape,
            "accuracy_pct":      accuracy,
            "confidence":        accuracy,  # alias used by seed printer
            "forecast_7d_total": total_7d,
        }
        if mape is not None:
            mape_weights.append((accuracy, total_7d))

    overall = 0.0
    if mape_weights:
        wsum = sum(w for _, w in mape_weights) or 1.0
        overall = round(sum(a * w for a, w in mape_weights) / wsum, 1)
    results["_overall"] = {"accuracy_pct": overall}

    conn.close()
    logger.info(f"Forecast run complete for {business_id} (overall accuracy={overall}%)")
    return results


def run_all_businesses():
    """Run forecasts for all businesses in the DB."""
    conn = _connect()
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
