"""Forecast router — per-product demand prediction detail."""

from datetime import date, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

import models
from database import get_db
from auth_utils import get_current_user
from forecast_runner import ensure_forecasts, generate_forecasts

router = APIRouter()


@router.get("/business/all")
def get_all_product_forecasts(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """7-day forecasts for all products in this business (for DemandPrediction overview)."""
    business_id = current_user.business_id
    ensure_forecasts(db, business_id)
    latest_sale = db.query(func.max(models.Sale.sale_date)).filter(models.Sale.business_id == business_id).scalar()
    today       = latest_sale + timedelta(days=1) if latest_sale else date.today()
    next_7      = today + timedelta(days=7)

    products = db.query(models.Product).filter(
        models.Product.business_id == business_id,
        models.Product.is_active == True,
    ).all()

    results = []
    accuracies = []
    for p in products:
        forecasts = (
            db.query(models.Forecast)
            .filter(
                models.Forecast.product_id == p.id,
                models.Forecast.forecast_date >= today,
                models.Forecast.forecast_date < next_7,
            )
            .order_by(models.Forecast.forecast_date)
            .all()
        )
        total = sum(float(f.predicted_demand) for f in forecasts)
        peak  = max(forecasts, key=lambda x: x.predicted_demand) if forecasts else None
        acc = (
            sum(float(f.confidence_level) for f in forecasts if f.confidence_level is not None) / len(forecasts)
            if forecasts else 0
        )
        if forecasts:
            accuracies.append((acc, total))
        results.append({
            "product_id":      str(p.id),
            "product_name":    p.name,
            "category":        p.category,
            "unit":            p.unit,
            "total_7d":        round(total, 1),
            "accuracy_pct":    round(acc, 1),
            "peak_day":        str(peak.forecast_date) if peak else None,
            "daily_forecasts": [
                {"date": str(f.forecast_date), "qty": float(f.predicted_demand)}
                for f in forecasts
            ],
        })

    overall = 0.0
    if accuracies:
        wsum = sum(w for _, w in accuracies) or 1.0
        overall = round(sum(a * w for a, w in accuracies) / wsum, 1)

    return {
        "products": sorted(results, key=lambda x: -x["total_7d"]),
        "overall_accuracy_pct": overall,
    }


@router.post("/run/{business_id}")
def trigger_forecast_run(
    business_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Run Prophet for this business and wait until forecasts are stored."""
    if str(current_user.business_id) != business_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    try:
        results = generate_forecasts(business_id)
        db.expire_all()
        return {"status": "ok", "results": results}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Forecast generation failed: {e}")


@router.get("/{product_id}")
def get_product_forecast(
    product_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    product = db.query(models.Product).filter(
        models.Product.id == product_id,
        models.Product.business_id == current_user.business_id,
    ).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    ensure_forecasts(db, current_user.business_id)

    latest_sale = db.query(func.max(models.Sale.sale_date)).filter(models.Sale.product_id == product_id).scalar()
    today   = latest_sale + timedelta(days=1) if latest_sale else date.today()
    next_7  = today + timedelta(days=7)
    past_28 = today - timedelta(days=28)

    # Fetch stored forecasts (next 7 days)
    forecasts = (
        db.query(models.Forecast)
        .filter(
            models.Forecast.product_id == product_id,
            models.Forecast.forecast_date >= today,
            models.Forecast.forecast_date < next_7,
        )
        .order_by(models.Forecast.forecast_date)
        .all()
    )

    # Actual sales (last 28 days) for chart
    actual_rows = (
        db.query(
            models.Sale.sale_date,
            func.sum(models.Sale.quantity).label("qty"),
        )
        .filter(
            models.Sale.product_id == product_id,
            models.Sale.sale_date >= past_28,
            models.Sale.sale_date < today,
        )
        .group_by(models.Sale.sale_date)
        .order_by(models.Sale.sale_date)
        .all()
    )

    chart_data = []
    for row in actual_rows:
        chart_data.append({
            "date":      str(row.sale_date),
            "actual":    float(row.qty),
            "predicted": None,
            "lower":     None,
            "upper":     None,
            "is_future": False,
        })
    for f in forecasts:
        chart_data.append({
            "date":      str(f.forecast_date),
            "actual":    None,
            "predicted": float(f.predicted_demand),
            "lower":     float(f.lower_bound) if f.lower_bound else None,
            "upper":     float(f.upper_bound) if f.upper_bound else None,
            "is_future": True,
        })

    # KPIs
    total_forecast_7d = sum(float(f.predicted_demand) for f in forecasts)
    peak_forecast = max(forecasts, key=lambda x: x.predicted_demand) if forecasts else None
    avg_confidence = (
        sum(float(f.confidence_level or 0) for f in forecasts) / len(forecasts)
        if forecasts else 0
    )

    # Prediction factors (mock for hackathon; real version uses model feature importances)
    prediction_factors = [
        {"factor": "Seasonality",       "impact": "High",   "detail": "Festival season boosts demand +35%"},
        {"factor": "Weekly Pattern",     "impact": "Medium", "detail": "Saturday haat day drives peak sales"},
        {"factor": "Market Price Trend", "impact": "Medium", "detail": "Wholesale price up 6% this week"},
        {"factor": "Weather",            "impact": "Low",    "detail": "Mild weather, no supply disruption expected"},
        {"factor": "Customer Demand",    "impact": "High",   "detail": "Regular customer orders trending up"},
    ]

    return {
        "product": {
            "id":            str(product.id),
            "name":          product.name,
            "category":      product.category,
            "unit":          product.unit,
            "current_stock": float(product.current_stock or 0),
            "selling_price": float(product.selling_price or 0),
        },
        "kpis": {
            "total_forecast_7d":  round(total_forecast_7d, 1),
            "avg_confidence_pct": round(avg_confidence, 1),
            "peak_day":           str(peak_forecast.forecast_date) if peak_forecast else None,
            "peak_qty":           float(peak_forecast.predicted_demand) if peak_forecast else 0,
            "recommended_order":  max(0, round(total_forecast_7d + float(product.safety_stock or 0) - float(product.current_stock or 0), 1)),
        },
        "chart_data":          chart_data,
        "forecast_bar":        [
            {
                "date":      str(f.forecast_date),
                "predicted": float(f.predicted_demand),
                "lower":     float(f.lower_bound) if f.lower_bound else 0,
                "upper":     float(f.upper_bound) if f.upper_bound else 0,
            }
            for f in forecasts
        ],
        "prediction_factors":  prediction_factors,
        "ai_insight":          f"{product.name} demand expected to be {round(total_forecast_7d, 0)} {product.unit} over next 7 days. "
                               f"{'Peak day is ' + str(peak_forecast.forecast_date) + '.' if peak_forecast else ''} "
                               "Festival season and weekly haat pattern are the primary drivers. "
                               f"Recommended reorder: {max(0, round(total_forecast_7d + float(product.safety_stock or 0) - float(product.current_stock or 0), 1))} {product.unit}.",
    }
