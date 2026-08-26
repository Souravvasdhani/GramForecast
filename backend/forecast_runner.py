"""
In-process + HTTP forecast trigger used by the API.

Prefers running ml-service/forecaster directly (local backend venv already
has Prophet). Falls back to the ML HTTP service when the import is unavailable
(e.g. Docker backend talking to gramforecast_ml).
"""

from __future__ import annotations

import logging
import sys
import threading
from datetime import date, timedelta
from pathlib import Path

import httpx
from sqlalchemy.orm import Session
from sqlalchemy import func

import models
from config import settings

FORECAST_MODEL_VERSION = "prophet_v2_festival"

logger = logging.getLogger(__name__)

_ML_DIR = Path(__file__).resolve().parent.parent / "ml-service"
if str(_ML_DIR) not in sys.path:
    sys.path.insert(0, str(_ML_DIR))

_lock = threading.Lock()


def _window(db: Session, business_id) -> tuple[date, date]:
    latest_sale = (
        db.query(func.max(models.Sale.sale_date))
        .filter(models.Sale.business_id == business_id)
        .scalar()
    )
    today = latest_sale + timedelta(days=1) if latest_sale else date.today()
    return today, today + timedelta(days=7)


def forecasts_ready(db: Session, business_id) -> bool:
    today, next_7 = _window(db, business_id)
    count = (
        db.query(func.count(models.Forecast.id))
        .join(models.Product, models.Forecast.product_id == models.Product.id)
        .filter(
            models.Product.business_id == business_id,
            models.Forecast.forecast_date >= today,
            models.Forecast.forecast_date < next_7,
            models.Forecast.model_version == FORECAST_MODEL_VERSION,
        )
        .scalar()
        or 0
    )
    return count > 0


def generate_forecasts(business_id: str) -> dict:
    """Run Prophet for every active product. Blocking. Thread-safe."""
    with _lock:
        try:
            from forecaster import run_forecasts_for_business
            logger.info("Running in-process Prophet for business %s", business_id)
            return run_forecasts_for_business(str(business_id))
        except Exception as import_err:
            logger.warning("In-process forecast failed (%s); trying ML service", import_err)

        url = f"{settings.ML_SERVICE_URL.rstrip('/')}/forecast/run"
        try:
            resp = httpx.post(
                url,
                json={"business_id": str(business_id)},
                timeout=180.0,
            )
            resp.raise_for_status()
            payload = resp.json()
            return payload.get("results") or payload
        except Exception as http_err:
            logger.error("ML service forecast failed: %s", http_err)
            raise RuntimeError(
                f"Could not generate forecasts (in-process: {import_err}; ml-service: {http_err})"
            ) from http_err


def ensure_forecasts(db: Session, business_id) -> bool:
    """
    Generate forecasts if none exist for the next-7-day window.
    Returns True if a run was executed.
    SQLAlchemy session is expired so subsequent queries see the new rows.
    """
    if forecasts_ready(db, business_id):
        return False
    generate_forecasts(str(business_id))
    db.expire_all()
    return True
