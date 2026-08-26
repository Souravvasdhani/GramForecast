"""Forecast router — per-product demand prediction detail."""

from datetime import date, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
import httpx

import models
from database import get_db
from auth_utils import get_current_user
from forecast_runner import ensure_forecasts, generate_forecasts, FORECAST_MODEL_VERSION
from config import settings

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
                models.Forecast.model_version == FORECAST_MODEL_VERSION,
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
    language: str = Query("en", pattern="^(en|hi|mr)$"),
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
            models.Forecast.model_version == FORECAST_MODEL_VERSION,
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

    actual_by_date = {str(row.sale_date): float(row.qty) for row in actual_rows}
    backtest = {"accuracy_pct": 0.0, "mape_pct": None, "model": "unavailable", "points": []}
    try:
        response = httpx.post(
            f"{settings.ML_SERVICE_URL.rstrip('/')}/forecast/backtest",
            json={"product_id": str(product.id), "category": product.category},
            timeout=180.0,
        )
        response.raise_for_status()
        backtest = response.json()
    except Exception:
        pass

    chart_data = [
        {
            "date": point["date"],
            "actual": point["actual"],
            "predicted": point["predicted"],
            "lower": None,
            "upper": None,
            "is_future": False,
        }
        for point in backtest["points"]
    ]
    for f in forecasts:
        chart_data.append({
            "date":      str(f.forecast_date),
            "actual":    None,
            "predicted": float(f.predicted_demand),
            "lower":     float(f.lower_bound) if f.lower_bound is not None else None,
            "upper":     float(f.upper_bound) if f.upper_bound is not None else None,
            "is_future": True,
        })

    # KPIs
    total_forecast_7d = sum(float(f.predicted_demand) for f in forecasts)
    peak_forecast = max(forecasts, key=lambda x: x.predicted_demand) if forecasts else None
    accuracy_pct = float(backtest.get("accuracy_pct") or 0)

    festival_groups = {}
    for forecast in forecasts:
        if forecast.festival_name and float(forecast.festival_impact_pct or 0) > 0:
            group = festival_groups.setdefault(forecast.festival_name, {"date": forecast.forecast_date, "impacts": []})
            group["date"] = min(group["date"], forecast.forecast_date)
            group["impacts"].append(float(forecast.festival_impact_pct))
    business_festival_rows = (
        db.query(models.Forecast, models.Product.name)
        .join(models.Product, models.Forecast.product_id == models.Product.id)
        .filter(
            models.Product.business_id == current_user.business_id,
            models.Forecast.forecast_date >= today,
            models.Forecast.forecast_date < next_7,
            models.Forecast.model_version == FORECAST_MODEL_VERSION,
            models.Forecast.festival_name.isnot(None),
            models.Forecast.festival_impact_pct > 0,
        )
        .all()
    )
    affected_by_festival = {}
    for row, product_name in business_festival_rows:
        affected_by_festival.setdefault(row.festival_name, set()).add(product_name)
    upcoming_festival_impact = [
        {
            "festival": name,
            "date": str(group["date"]),
            "affected_products": sorted(affected_by_festival.get(name, {product.name})),
            "impact_pct": round(sum(group["impacts"]) / len(group["impacts"]), 1),
        }
        for name, group in sorted(festival_groups.items(), key=lambda item: item[1]["date"])[:2]
    ]
    if language in {"hi", "mr"}:
        festival_labels = {
            "Diwali": "दिवाली", "Holi": "होली", "Raksha Bandhan": "रक्षा बंधन",
            "Eid": "ईद", "Navratri": "नवरात्रि", "Harvest": "फसल का मौसम",
            "Wedding Season": "शादी का मौसम", "Monsoon": "मानसून", "Ganesh Chaturthi": "गणेश चतुर्थी", "Gudi Padwa": "गुढी पाडवा", "Makar Sankranti": "मकर संक्रांति",
        }
        if language == "mr":
            festival_labels.update({"Diwali": "दिवाळी", "Harvest": "पीक हंगाम", "Wedding Season": "लग्नाचा हंगाम", "Monsoon": "पावसाळा", "Makar Sankranti": "मकर संक्रांत"})
        for festival in upcoming_festival_impact:
            festival["festival"] = festival_labels.get(festival["festival"], festival["festival"])

    seasonality_detail = (
        f"{upcoming_festival_impact[0]['festival']} adds {upcoming_festival_impact[0]['impact_pct']}% in the model forecast."
        if upcoming_festival_impact else "No festival uplift is present in the next 7-day model output."
    )

    # Prediction factors (mock for hackathon; real version uses model feature importances)
    prediction_factors = [
        {"factor": "Seasonality",       "impact": "High" if upcoming_festival_impact else "Low", "detail": seasonality_detail},
        {"factor": "Weekly Pattern",     "impact": "Medium", "detail": "Saturday haat day drives peak sales"},
        {"factor": "Market Price Trend", "impact": "Medium", "detail": "Wholesale price up 6% this week"},
        {"factor": "Weather",            "impact": "Low",    "detail": "Mild weather, no supply disruption expected"},
        {"factor": "Customer Demand",    "impact": "High",   "detail": "Regular customer orders trending up"},
    ]
    if language in {"hi", "mr"}:
        factor_names = {
            "Seasonality": "मौसमी मांग",
            "Weekly Pattern": "साप्ताहिक पैटर्न",
            "Market Price Trend": "बाजार मूल्य रुझान",
            "Weather": "मौसम",
            "Customer Demand": "ग्राहक मांग",
        }
        factor_details = {
            "Seasonality": (f"मॉडल के अनुसार {upcoming_festival_impact[0]['festival']} से मांग {upcoming_festival_impact[0]['impact_pct']}% बढ़ती है"
                            if upcoming_festival_impact else "अगले 7 दिनों में त्योहार से मांग वृद्धि नहीं है"),
            "Weekly Pattern": "शनिवार का हाट बिक्री बढ़ाता है",
            "Market Price Trend": "इस सप्ताह थोक मूल्य 6% बढ़ा है",
            "Weather": "मौसम सामान्य है, आपूर्ति में रुकावट नहीं",
            "Customer Demand": "नियमित ग्राहकों के ऑर्डर बढ़ रहे हैं",
        }
        if language == "mr":
            factor_details.update({"Seasonality": f"मॉडेलनुसार {upcoming_festival_impact[0]['festival']} मुळे मागणी {upcoming_festival_impact[0]['impact_pct']}% वाढते" if upcoming_festival_impact else "पुढील ७ दिवसांत सणामुळे मागणी वाढ नाही", "Weekly Pattern": "शनिवारच्या आठवडी बाजारामुळे विक्री वाढते", "Market Price Trend": "या आठवड्यात घाऊक भाव ६% वाढला", "Weather": "हवामान सामान्य आहे, पुरवठ्यात अडथळा नाही", "Customer Demand": "नियमित ग्राहकांच्या ऑर्डर्स वाढत आहेत"})
        if language == "mr":
            factor_names.update({"Seasonality": "हंगामी मागणी", "Weekly Pattern": "साप्ताहिक पद्धत", "Market Price Trend": "बाजारभावाचा कल", "Weather": "हवामान", "Customer Demand": "ग्राहक मागणी"})
        prediction_factors = [
            {**factor, "factor": factor_names[factor["factor"]], "detail": factor_details[factor["factor"]]}
            for factor in prediction_factors
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
            "avg_confidence_pct": round(accuracy_pct, 1),
            "accuracy_pct":        round(accuracy_pct, 1),
            "peak_day":           str(peak_forecast.forecast_date) if peak_forecast else None,
            "peak_qty":           float(peak_forecast.predicted_demand) if peak_forecast else 0,
            "recommended_order":  max(0, round(total_forecast_7d + float(product.safety_stock or 0) - float(product.current_stock or 0), 1)),
        },
        "chart_data":          chart_data,
        "backtest": {
            "accuracy_pct": round(accuracy_pct, 1),
            "mape_pct": backtest.get("mape_pct"),
            "model": backtest.get("model"),
            "points": backtest.get("points", []),
        },
        "forecast_bar":        [
            {
                "date":      str(f.forecast_date),
                "predicted": float(f.predicted_demand),
                "lower":     float(f.lower_bound) if f.lower_bound is not None else 0,
                "upper":     float(f.upper_bound) if f.upper_bound is not None else 0,
            }
            for f in forecasts
        ],
        "prediction_factors":  prediction_factors,
        "upcoming_festival_impact": upcoming_festival_impact,
        "ai_insight":          (f"पुढील ७ दिवसांत {product.name} ची मागणी {round(total_forecast_7d, 0)} {product.unit} राहण्याची शक्यता आहे. सणांचा हंगाम आणि साप्ताहिक हाट हे मुख्य कारण आहेत. सुचवलेली पुनर्भरती: {max(0, round(total_forecast_7d + float(product.safety_stock or 0) - float(product.current_stock or 0), 1))} {product.unit}." if language == "mr" else f"अगले 7 दिनों में {product.name} की मांग {round(total_forecast_7d, 0)} {product.unit} रहने की उम्मीद है। "
                       f"मुख्य कारण त्योहारों का मौसम और साप्ताहिक हाट पैटर्न हैं। "
                       f"अनुशंसित पुनः ऑर्डर: {max(0, round(total_forecast_7d + float(product.safety_stock or 0) - float(product.current_stock or 0), 1))} {product.unit}." if language == "hi" else f"{product.name} demand expected to be {round(total_forecast_7d, 0)} {product.unit} over next 7 days. "
                               f"{'Peak day is ' + str(peak_forecast.forecast_date) + '.' if peak_forecast else ''} "
                               "Festival season and weekly haat pattern are the primary drivers. "
                       f"Recommended reorder: {max(0, round(total_forecast_7d + float(product.safety_stock or 0) - float(product.current_stock or 0), 1))} {product.unit}."),
    }
