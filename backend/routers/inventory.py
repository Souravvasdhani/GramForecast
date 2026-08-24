"""Inventory router."""

from datetime import date, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

import models
from database import get_db
from auth_utils import get_current_user
from forecast_runner import ensure_forecasts

router = APIRouter()


@router.get("/")
def get_inventory(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    products = (
        db.query(models.Product)
        .filter(models.Product.business_id == current_user.business_id)
        .all()
    )
    items = []
    for p in products:
        stock = float(p.current_stock or 0)
        ideal = float(p.ideal_stock or 1)
        safety = float(p.safety_stock or 0)
        if stock == 0:
            status = "out_of_stock"
        elif safety and stock < safety:
            status = "low_stock"
        elif stock > ideal * 1.2:
            status = "overstock"
        else:
            status = "optimal"
        items.append({
            "id":            str(p.id),
            "name":          p.name,
            "category":      p.category,
            "unit":          p.unit,
            "current_stock": stock,
            "ideal_stock":   ideal,
            "safety_stock":  safety,
            "target_stock":  float(p.target_stock or 0),
            "selling_price": float(p.selling_price or 0),
            "stock_value":   round(stock * float(p.selling_price or 0), 2),
            "status":        status,
            "reorder_qty":   max(0, round(ideal - stock, 1)),
        })
    total_value = sum(i["stock_value"] for i in items)
    return {
        "items":         items,
        "total_value":   round(total_value, 2),
        "counts": {
            "total":        len(items),
            "optimal":      sum(1 for i in items if i["status"] == "optimal"),
            "low_stock":    sum(1 for i in items if i["status"] == "low_stock"),
            "out_of_stock": sum(1 for i in items if i["status"] == "out_of_stock"),
            "overstock":    sum(1 for i in items if i["status"] == "overstock"),
        },
    }


@router.get("/planning")
def get_planning(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Inventory planning — recommended production/reorder per product."""
    ensure_forecasts(db, current_user.business_id)
    latest_sale = db.query(func.max(models.Sale.sale_date)).filter(
        models.Sale.business_id == current_user.business_id
    ).scalar()
    today  = latest_sale + timedelta(days=1) if latest_sale else date.today()
    next_7 = today + timedelta(days=7)
    products = (
        db.query(models.Product)
        .filter(models.Product.business_id == current_user.business_id)
        .all()
    )
    plans = []
    for p in products:
        forecast_7d = float(
            db.query(func.sum(models.Forecast.predicted_demand))
            .filter(
                models.Forecast.product_id == p.id,
                models.Forecast.forecast_date >= today,
                models.Forecast.forecast_date < next_7,
            ).scalar() or 0
        )
        safety = float(p.safety_stock or forecast_7d * 0.1)
        target = float(p.target_stock or (forecast_7d + safety))
        current = float(p.current_stock or 0)
        recommended_production = max(0, target - current + forecast_7d)
        shortfall = max(0, forecast_7d - current)
        plans.append({
            "product_id":               str(p.id),
            "product_name":             p.name,
            "unit":                     p.unit,
            "current_inventory":        current,
            "expected_demand_7d":       round(forecast_7d, 1),
            "recommended_production":   round(recommended_production, 1),
            "target_stock":             round(target, 1),
            "safety_stock":             round(safety, 1),
            "projected_shortfall":      round(shortfall, 1),
            "overstock_risk":           max(0, round(current - target, 1)),
        })
    return {
        "plans": sorted(plans, key=lambda x: -x["projected_shortfall"]),
        "summary": {
            "total_recommended_production": round(sum(p["recommended_production"] for p in plans), 1),
            "total_expected_demand":        round(sum(p["expected_demand_7d"] for p in plans), 1),
            "products_with_shortfall":      sum(1 for p in plans if p["projected_shortfall"] > 0),
        },
    }
