"""
ML Service FastAPI — exposes forecast trigger and status endpoints.
The frontend/backend calls POST /forecast/run to trigger a forecast run.
"""

import os
import logging
from fastapi import FastAPI, BackgroundTasks, HTTPException
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

# Track background job status
_job_status: dict = {}


class ForecastRunRequest(BaseModel):
    business_id: str


@app.get("/health")
def health():
    return {"status": "ok", "service": "ml-service"}


@app.post("/forecast/run")
def trigger_forecast(req: ForecastRunRequest, bg: BackgroundTasks):
    """Trigger a background forecast run for a business."""
    _job_status[req.business_id] = {"status": "running", "started_at": str(__import__("datetime").datetime.utcnow())}

    def _run():
        try:
            results = run_forecasts_for_business(req.business_id)
            _job_status[req.business_id] = {"status": "done", "results": results}
        except Exception as e:
            logger.error(f"Forecast run failed: {e}")
            _job_status[req.business_id] = {"status": "error", "detail": str(e)}

    bg.add_task(_run)
    return {"message": "Forecast run started", "business_id": req.business_id}


@app.get("/forecast/status/{business_id}")
def forecast_status(business_id: str):
    status = _job_status.get(business_id, {"status": "not_started"})
    return status


@app.post("/forecast/run-all")
def trigger_all_forecast(bg: BackgroundTasks):
    """Trigger forecasts for all active businesses."""
    bg.add_task(run_all_businesses)
    return {"message": "Full forecast run started"}
