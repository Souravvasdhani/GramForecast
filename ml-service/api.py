"""
ML Service FastAPI — exposes forecast trigger and status endpoints.
The frontend/backend calls POST /forecast/run to trigger a forecast run.
Runs synchronously so callers receive stored results, not a fire-and-forget job.
"""

import logging
from datetime import datetime

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from forecaster import run_forecasts_for_business, run_all_businesses

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="RuralDemand AI — ML Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

_job_status: dict = {}


class ForecastRunRequest(BaseModel):
    business_id: str


class BacktestRequest(BaseModel):
    product_id: str
    category: str | None = None


@app.get("/health")
def health():
    return {"status": "ok", "service": "ml-service"}


@app.post("/forecast/run")
def trigger_forecast(req: ForecastRunRequest):
    """Run forecasts for a business and wait until rows are written."""
    _job_status[req.business_id] = {"status": "running", "started_at": str(datetime.utcnow())}
    try:
        results = run_forecasts_for_business(req.business_id)
        _job_status[req.business_id] = {"status": "done", "results": results}
        return {"message": "Forecast run complete", "business_id": req.business_id, "results": results}
    except Exception as e:
        logger.error(f"Forecast run failed: {e}")
        _job_status[req.business_id] = {"status": "error", "detail": str(e)}
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/forecast/status/{business_id}")
def forecast_status(business_id: str):
    return _job_status.get(business_id, {"status": "not_started"})


@app.post("/forecast/backtest")
def forecast_backtest(req: BacktestRequest):
    """Evaluate the same held-out window used during forecast generation."""
    import forecaster

    conn = forecaster._connect()
    try:
        frame = forecaster.load_sales(conn, req.product_id)
        return forecaster.backtest_series(frame, req.category)
    finally:
        conn.close()


@app.post("/forecast/run-all")
def trigger_all_forecast():
    results = run_all_businesses()
    return {"message": "Full forecast run complete", "results": results}
