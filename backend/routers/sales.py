"""Sales router — list sales and CSV import."""

from datetime import date, timedelta
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

import models
from database import get_db
from auth_utils import get_current_user

router = APIRouter()


@router.get("/")
def list_sales(
    days: int = Query(30, ge=1, le=365),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    latest_sale = db.query(func.max(models.Sale.sale_date)).filter(models.Sale.business_id == current_user.business_id).scalar()
    today = latest_sale + timedelta(days=1) if latest_sale else date.today()
    since = today - timedelta(days=days)
    sales = (
        db.query(models.Sale)
        .join(models.Product)
        .filter(
            models.Sale.business_id == current_user.business_id,
            models.Sale.sale_date >= since,
        )
        .order_by(models.Sale.sale_date.desc())
        .limit(500)
        .all()
    )
    return [
        {
            "id":             str(s.id),
            "product_name":   s.product.name,
            "sale_date":      str(s.sale_date),
            "quantity":       float(s.quantity),
            "price_per_unit": float(s.price_per_unit),
            "total_amount":   float(s.quantity * s.price_per_unit),
            "payment_method": s.payment_method,
            "region":         s.region,
        }
        for s in sales
    ]


@router.get("/analytics")
def sales_analytics(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Sales Analytics screen data."""
    latest_sale = db.query(func.max(models.Sale.sale_date)).filter(models.Sale.business_id == current_user.business_id).scalar()
    today = latest_sale + timedelta(days=1) if latest_sale else date.today()
    week_ago     = today - timedelta(days=7)
    two_week_ago = today - timedelta(days=14)
    month_ago    = today - timedelta(days=30)

    def week_total(start, end):
        return float(
            db.query(func.sum(models.Sale.quantity * models.Sale.price_per_unit))
            .filter(
                models.Sale.business_id == current_user.business_id,
                models.Sale.sale_date >= start,
                models.Sale.sale_date < end,
            ).scalar() or 0
        )

    this_week  = week_total(week_ago, today)
    last_week  = week_total(two_week_ago, week_ago)
    this_month = week_total(month_ago, today)

    # Daily trend (last 14 days)
    daily = (
        db.query(
            models.Sale.sale_date,
            func.sum(models.Sale.quantity * models.Sale.price_per_unit).label("revenue"),
            func.count(models.Sale.id).label("orders"),
        )
        .filter(
            models.Sale.business_id == current_user.business_id,
            models.Sale.sale_date >= today - timedelta(days=14),
        )
        .group_by(models.Sale.sale_date)
        .order_by(models.Sale.sale_date)
        .all()
    )

    # By category
    by_category = (
        db.query(
            models.Product.category,
            func.sum(models.Sale.quantity * models.Sale.price_per_unit).label("revenue"),
        )
        .join(models.Product, models.Sale.product_id == models.Product.id)
        .filter(
            models.Sale.business_id == current_user.business_id,
            models.Sale.sale_date >= month_ago,
        )
        .group_by(models.Product.category)
        .all()
    )

    # By payment method
    by_payment = (
        db.query(
            models.Sale.payment_method,
            func.sum(models.Sale.quantity * models.Sale.price_per_unit).label("revenue"),
        )
        .filter(
            models.Sale.business_id == current_user.business_id,
            models.Sale.sale_date >= month_ago,
        )
        .group_by(models.Sale.payment_method)
        .all()
    )

    total_orders = (
        db.query(func.count(models.Sale.id))
        .filter(
            models.Sale.business_id == current_user.business_id,
            models.Sale.sale_date >= week_ago,
        ).scalar() or 0
    )

    return {
        "kpis": {
            "total_sales_7d":  round(this_week, 2),
            "total_sales_30d": round(this_month, 2),
            "sales_delta_pct": round((this_week - last_week) / max(last_week, 1) * 100, 1),
            "total_orders_7d": total_orders,
            "avg_order_value": round(this_week / max(total_orders, 1), 2),
        },
        "daily_trend": [
            {
                "date":    str(row.sale_date),
                "revenue": round(float(row.revenue), 2),
                "orders":  row.orders,
            }
            for row in daily
        ],
        "by_category": [
            {"category": row.category or "Other", "revenue": round(float(row.revenue), 2)}
            for row in by_category
        ],
        "by_payment": [
            {"method": row.payment_method, "revenue": round(float(row.revenue), 2)}
            for row in by_payment
        ],
    }
