"""Market Trends router."""

from datetime import date, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

import models
from database import get_db
from auth_utils import get_current_user

router = APIRouter()


@router.get("/trends")
def market_trends(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    today    = date.today()
    month_ago= today - timedelta(days=28)

    signals = (
        db.query(models.MarketSignal)
        .filter(models.MarketSignal.signal_date >= month_ago)
        .order_by(models.MarketSignal.signal_date.desc())
        .all()
    )

    # Aggregate by category
    by_category = {}
    for sig in signals:
        cat = sig.category
        if cat not in by_category:
            by_category[cat] = {"prices": [], "demand_indices": []}
        if sig.price:
            by_category[cat]["prices"].append(float(sig.price))
        if sig.demand_index:
            by_category[cat]["demand_indices"].append(float(sig.demand_index))

    category_trends = [
        {
            "category":       cat,
            "avg_price":      round(sum(v["prices"]) / len(v["prices"]), 2) if v["prices"] else 0,
            "demand_index":   round(sum(v["demand_indices"]) / len(v["demand_indices"]), 1) if v["demand_indices"] else 0,
        }
        for cat, v in by_category.items()
    ]

    # Overall market demand index (last signal)
    latest = signals[0] if signals else None

    return {
        "market_demand_index":  float(latest.demand_index) if latest else 65.0,
        "supply_index":         float(latest.supply_index) if latest else 55.0,
        "category_trends":      category_trends,
        "recent_signals":       [
            {
                "date":           str(sig.signal_date),
                "category":       sig.category,
                "demand_index":   float(sig.demand_index or 0),
                "price":          float(sig.price or 0),
                "weather_temp":   float(sig.weather_temp or 0),
                "weather_rain_mm":float(sig.weather_rainfall or 0),
            }
            for sig in signals[:20]
        ],
    }
