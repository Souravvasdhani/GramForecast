"""Dashboard router — KPI summary + chart data for the home screen."""

import logging
from datetime import date, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, cast, Date

import models
from database import get_db
from auth_utils import get_current_user
from forecast_runner import ensure_forecasts

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/summary")
def dashboard_summary(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    business_id = current_user.business_id
    try:
        ensure_forecasts(db, business_id)
    except Exception:
        logger.exception("Unable to refresh forecasts for dashboard: %s", business_id)

    # Determine 'today' dynamically based on latest sale date, falling back to actual today
    latest_sale = db.query(func.max(models.Sale.sale_date)).filter(models.Sale.business_id == business_id).scalar()
    today       = latest_sale + timedelta(days=1) if latest_sale else date.today()
    
    week_ago    = today - timedelta(days=7)
    two_week_ago= today - timedelta(days=14)
    month_ago   = today - timedelta(days=30)

    # ── KPI 1: Total Sales (last 7 days) ────────────────────────────────────
    sales_this_week = (
        db.query(func.sum(models.Sale.quantity * models.Sale.price_per_unit))
        .filter(
            models.Sale.business_id == business_id,
            models.Sale.sale_date >= week_ago,
            models.Sale.sale_date < today,
        )
        .scalar() or 0
    )
    sales_last_week = (
        db.query(func.sum(models.Sale.quantity * models.Sale.price_per_unit))
        .filter(
            models.Sale.business_id == business_id,
            models.Sale.sale_date >= two_week_ago,
            models.Sale.sale_date < week_ago,
        )
        .scalar() or 1
    )
    sales_delta_pct = round((float(sales_this_week) - float(sales_last_week)) / float(sales_last_week) * 100, 1)

    # ── KPI 2: Predicted Demand (next 7 days, sum across all products) ──────
    next_7 = today + timedelta(days=7)
    predicted_demand_next = (
        db.query(func.sum(models.Forecast.predicted_demand))
        .join(models.Product, models.Forecast.product_id == models.Product.id)
        .filter(
            models.Product.business_id == business_id,
            models.Forecast.forecast_date >= today,
            models.Forecast.forecast_date < next_7,
        )
        .scalar() or 0
    )

    # ── KPI 3: Inventory in hand (current_stock sum × selling_price) ────────
    inventory_value = (
        db.query(func.sum(models.Product.current_stock * models.Product.selling_price))
        .filter(models.Product.business_id == business_id)
        .scalar() or 0
    )

    # ── KPI 4: Stock-Out Risk count ─────────────────────────────────────────
    out_of_stock_count = (
        db.query(func.count(models.Product.id))
        .filter(
            models.Product.business_id == business_id,
            models.Product.current_stock <= 0,
        )
        .scalar() or 0
    )
    low_stock_count = (
        db.query(func.count(models.Product.id))
        .filter(
            models.Product.business_id == business_id,
            models.Product.current_stock > 0,
            models.Product.current_stock < models.Product.reorder_point,
        )
        .scalar() or 0
    )

    # ── Demand Prediction Overview chart (last 14 days actual + next 7 forecast) ─
    # Actual: aggregate daily sales quantity across all products
    actual_rows = (
        db.query(
            models.Sale.sale_date,
            func.sum(models.Sale.quantity).label("qty"),
        )
        .join(models.Product, models.Sale.product_id == models.Product.id)
        .filter(
            models.Sale.business_id == business_id,
            models.Sale.sale_date >= month_ago,
            models.Sale.sale_date < today,
        )
        .group_by(models.Sale.sale_date)
        .order_by(models.Sale.sale_date)
        .all()
    )

    # Forecast: aggregate daily predicted_demand across all products
    forecast_rows = (
        db.query(
            models.Forecast.forecast_date,
            func.sum(models.Forecast.predicted_demand).label("qty"),
            func.avg(models.Forecast.lower_bound).label("lower"),
            func.avg(models.Forecast.upper_bound).label("upper"),
        )
        .join(models.Product, models.Forecast.product_id == models.Product.id)
        .filter(
            models.Product.business_id == business_id,
            models.Forecast.forecast_date >= today,
            models.Forecast.forecast_date < next_7,
        )
        .group_by(models.Forecast.forecast_date)
        .order_by(models.Forecast.forecast_date)
        .all()
    )

    chart_data = []
    for row in actual_rows[-14:]:
        chart_data.append({
            "date":   str(row.sale_date),
            "actual": float(row.qty),
            "predicted": None,
            "lower": None,
            "upper": None,
        })
    for row in forecast_rows:
        chart_data.append({
            "date":      str(row.forecast_date),
            "actual":    None,
            "predicted": float(row.qty) if row.qty else None,
            "lower":     float(row.lower) if row.lower else None,
            "upper":     float(row.upper) if row.upper else None,
        })

    # ── Top Products table ───────────────────────────────────────────────────
    top_products_rows = (
        db.query(
            models.Product.id,
            models.Product.name,
            models.Product.category,
            models.Product.unit,
            models.Product.current_stock,
            models.Product.ideal_stock,
            models.Product.safety_stock,
            models.Product.reorder_point,
            models.Product.selling_price,
            func.sum(models.Sale.quantity).label("sales_7d"),
        )
        .join(models.Sale, models.Product.id == models.Sale.product_id, isouter=True)
        .filter(
            models.Product.business_id == business_id,
            models.Sale.sale_date >= week_ago,
        )
        .group_by(
            models.Product.id, models.Product.name, models.Product.category,
            models.Product.unit, models.Product.current_stock,
            models.Product.ideal_stock, models.Product.safety_stock,
            models.Product.reorder_point,
            models.Product.selling_price,
        )
        .order_by(func.sum(models.Sale.quantity).desc())
        .limit(6)
        .all()
    )

    top_products = []
    for p in top_products_rows:
        # Trend: compare this week vs last week for same product
        last_week_qty = (
            db.query(func.sum(models.Sale.quantity))
            .filter(
                models.Sale.product_id == p.id,
                models.Sale.sale_date >= two_week_ago,
                models.Sale.sale_date < week_ago,
            )
            .scalar() or 1
        )
        this_week_qty = float(p.sales_7d or 0)
        trend = round((this_week_qty - float(last_week_qty)) / float(last_week_qty) * 100, 1)
        # Next 7 day forecast for this product
        next_7_forecast = (
            db.query(func.sum(models.Forecast.predicted_demand))
            .filter(
                models.Forecast.product_id == p.id,
                models.Forecast.forecast_date >= today,
                models.Forecast.forecast_date < next_7,
            )
            .scalar() or 0
        )
        # Determine stock status — compare against reorder_point (not safety_stock)
        reorder_pt = float(p.reorder_point or 0)
        if float(p.current_stock) <= 0:
            stock_status = "out_of_stock"
        elif reorder_pt and float(p.current_stock) < reorder_pt:
            stock_status = "low_stock"
        elif p.ideal_stock and float(p.current_stock) > float(p.ideal_stock) * 1.2:
            stock_status = "overstock"
        else:
            stock_status = "optimal"

        top_products.append({
            "id":              str(p.id),
            "name":            p.name,
            "category":        p.category,
            "unit":            p.unit,
            "sales_7d":        round(this_week_qty, 1),
            "trend_pct":       trend,
            "forecast_7d":     round(float(next_7_forecast), 1),
            "current_stock":   float(p.current_stock),
            "stock_status":    stock_status,
            "selling_price":   float(p.selling_price or 0),
        })

    # ── Inventory donut ──────────────────────────────────────────────────────
    all_products = db.query(models.Product).filter(models.Product.business_id == business_id).all()
    inv_counts = {"optimal": 0, "low_stock": 0, "out_of_stock": 0, "overstock": 0}
    for p in all_products:
        s  = float(p.current_stock or 0)
        rp = float(p.reorder_point or 0)
        ideal = float(p.ideal_stock or 1)
        if s <= 0:
            inv_counts["out_of_stock"] += 1
        elif rp and s < rp:
            inv_counts["low_stock"] += 1
        elif s > ideal * 1.2:
            inv_counts["overstock"] += 1
        else:
            inv_counts["optimal"] += 1

    # ── 7-day Demand Forecast bar chart ────────────────────────────────────
    forecast_bar = []
    for row in forecast_rows:
        forecast_bar.append({
            "date":      str(row.forecast_date),
            "predicted": round(float(row.qty), 1) if row.qty else 0,
            "lower":     round(float(row.lower), 1) if row.lower else 0,
            "upper":     round(float(row.upper), 1) if row.upper else 0,
        })

    # ── Market Trends mini ──────────────────────────────────────────────────
    latest_signals = (
        db.query(models.MarketSignal)
        .order_by(models.MarketSignal.signal_date.desc())
        .limit(4)
        .all()
    )
    market_mini = [
        {
            "category":     sig.category,
            "demand_index": float(sig.demand_index or 0),
            "price":        float(sig.price or 0),
            "signal_date":  str(sig.signal_date),
        }
        for sig in latest_signals
    ]

    # ── AI Recommendation ────────────────────────────────────────────────────
    # Always generate a specific, data-backed recommendation from live business data.
    top_alert = (
        db.query(models.Alert)
        .filter(models.Alert.business_id == business_id, models.Alert.resolved_at.is_(None))
        .order_by(
            models.Alert.priority.desc(),
            models.Alert.created_at.desc(),
        )
        .first()
    )

    forecast_by_product = (
        db.query(
            models.Product.id,
            models.Product.name,
            models.Product.current_stock,
            models.Product.safety_stock,
            func.sum(models.Forecast.predicted_demand).label("forecast_7d"),
        )
        .join(models.Forecast, models.Product.id == models.Forecast.product_id)
        .filter(
            models.Product.business_id == business_id,
            models.Forecast.forecast_date >= today,
            models.Forecast.forecast_date < next_7,
        )
        .group_by(models.Product.id, models.Product.name, models.Product.current_stock, models.Product.safety_stock)
        .order_by(func.sum(models.Forecast.predicted_demand).desc())
        .first()
    )

    if top_alert:
        ai_recommendation = {
            "headline": top_alert.message,
            "detail":   "Review the alert and act before the next demand spike or stockout window.",
            "priority": top_alert.priority,
        }
    elif forecast_by_product:
        product_name = forecast_by_product.name
        forecast_7d = float(forecast_by_product.forecast_7d or 0)
        current_stock = float(forecast_by_product.current_stock or 0)
        safety_stock = float(forecast_by_product.safety_stock or 0)
        if current_stock < safety_stock:
            shortage = max(0, safety_stock - current_stock)
            ai_recommendation = {
                "headline": f"{product_name} is running {shortage:.0f} units below its safety stock buffer.",
                "detail": f"Forecasted demand is {forecast_7d:.0f} units next 7 days; current stock is {current_stock:.0f} units.",
                "priority": "high",
            }
        else:
            ai_recommendation = {
                "headline": f"{product_name} leads next-week demand with a forecast of {forecast_7d:.0f} units.",
                "detail": f"Current stock is {current_stock:.0f} units, which is enough to cover the forecast with a healthy buffer.",
                "priority": "low",
            }
    else:
        ai_recommendation = {
            "headline": "No forecast data is available yet for this business.",
            "detail": "Run the forecasting model to generate the first AI recommendation for your products.",
            "priority": "low",
        }

    return {
        "kpis": {
            "total_sales_7d":       round(float(sales_this_week), 2),
            "sales_delta_pct":      sales_delta_pct,
            "predicted_demand_7d":  round(float(predicted_demand_next), 1),
            "inventory_value":      round(float(inventory_value), 2),
            "out_of_stock_count":   out_of_stock_count,
            "low_stock_count":      low_stock_count,
        },
        "chart_data":        chart_data,
        "top_products":      top_products,
        "inventory_donut":   inv_counts,
        "forecast_bar":      forecast_bar,
        "market_mini":       market_mini,
        "ai_recommendation": ai_recommendation,
    }
