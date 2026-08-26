"""Sales router — list sales and CSV import."""

from datetime import date, timedelta
from fastapi import APIRouter, Depends, Query, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import func

import models
from database import get_db
from auth_utils import get_current_user

router = APIRouter()


class SaleCreate(BaseModel):
    product_id: str
    quantity: float = Field(gt=0)
    price_per_unit: float = Field(ge=0)
    payment_method: models.PaymentMethod = models.PaymentMethod.cash


@router.post("")
def create_sale(
    request: SaleCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    product = db.query(models.Product).filter(
        models.Product.id == request.product_id,
        models.Product.business_id == current_user.business_id,
        models.Product.is_active == True,
    ).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    product.current_stock = float(product.current_stock or 0) - request.quantity
    sale = models.Sale(
        business_id=current_user.business_id,
        product_id=product.id,
        sale_date=date.today(),
        quantity=request.quantity,
        price_per_unit=request.price_per_unit,
        payment_method=request.payment_method,
    )
    db.add(sale)
    db.commit()
    db.refresh(sale)

    today = date.today()
    week_ago = today - timedelta(days=7)
    total_sales_7d = db.query(func.sum(models.Sale.quantity * models.Sale.price_per_unit)).filter(
        models.Sale.business_id == current_user.business_id,
        models.Sale.sale_date >= week_ago,
        models.Sale.sale_date <= today,
    ).scalar() or 0
    return {
        "id": str(sale.id),
        "product_id": str(product.id),
        "product_name": product.name,
        "sale_date": str(sale.sale_date),
        "quantity": float(sale.quantity),
        "price_per_unit": float(sale.price_per_unit),
        "total_amount": float(sale.quantity * sale.price_per_unit),
        "payment_method": sale.payment_method,
        "current_stock": float(product.current_stock),
        "total_sales_7d": float(total_sales_7d),
    }


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

    products = db.query(models.Product).filter(
        models.Product.business_id == current_user.business_id,
        models.Product.is_active == True,
    ).all()
    sales_30d = (
        db.query(models.Sale, models.Product)
        .join(models.Product, models.Sale.product_id == models.Product.id)
        .filter(
            models.Sale.business_id == current_user.business_id,
            models.Sale.sale_date >= month_ago,
        )
        .all()
    )
    sales_7d = [sale for sale, _ in sales_30d if sale.sale_date >= week_ago]
    revenue_7d = sum(float(sale.quantity) * float(sale.price_per_unit) for sale in sales_7d)
    profit_7d = sum(
        float(sale.quantity) * (float(sale.price_per_unit) - float(product.cost_price or 0))
        for sale, product in sales_30d if sale.sale_date >= week_ago
    )
    profit_30d = sum(
        float(sale.quantity) * (float(sale.price_per_unit) - float(product.cost_price or 0))
        for sale, product in sales_30d
    )

    product_stats = {}
    for product in products:
        product_sales = [(sale, joined_product) for sale, joined_product in sales_30d if sale.product_id == product.id]
        revenue = sum(float(sale.quantity) * float(sale.price_per_unit) for sale, _ in product_sales)
        profit = sum(
            float(sale.quantity) * (float(sale.price_per_unit) - float(product.cost_price or 0))
            for sale, _ in product_sales
        )
        recent_qty = sum(float(sale.quantity) for sale, _ in product_sales)
        last_sale = max((sale.sale_date for sale, _ in product_sales), default=None)
        days_since_sale = (today - last_sale).days if last_sale else None
        product_stats[product.id] = {
            "product_id": str(product.id),
            "product_name": product.name,
            "unit": product.unit,
            "current_stock": float(product.current_stock or 0),
            "cost_price": float(product.cost_price or 0),
            "revenue_30d": revenue,
            "profit_30d": profit,
            "margin_pct": profit / revenue * 100 if revenue else 0,
            "sales_qty_30d": recent_qty,
            "daily_velocity": recent_qty / 30,
            "days_since_last_sale": days_since_sale,
            "stock_value": float(product.current_stock or 0) * float(product.cost_price or 0),
        }

    margin_products = [item for item in product_stats.values() if item["revenue_30d"] > 0]
    best_margin = max(margin_products, key=lambda item: item["margin_pct"], default=None)
    stats_with_stock = [item for item in product_stats.values() if item["current_stock"] > 0]
    velocities = sorted(item["daily_velocity"] for item in stats_with_stock)
    velocity_cutoff = velocities[max(0, len(velocities) // 2 - 1)] if velocities else 0
    stock_values = sorted(item["stock_value"] for item in stats_with_stock)
    stock_cutoff = stock_values[len(stock_values) // 2] if stock_values else 0
    dead_stock = [item for item in stats_with_stock if (
        item["daily_velocity"] <= velocity_cutoff and item["stock_value"] >= stock_cutoff
    ) or item["days_since_last_sale"] is None or item["days_since_last_sale"] >= 14]
    dead_stock = sorted(dead_stock, key=lambda item: (-item["stock_value"], item["daily_velocity"]))[:5]
    dead_stock_payload = [{
        **item,
        "suggestion": "Discount or bundle this stock to release capital.",
    } for item in dead_stock]
    if not dead_stock_payload and stats_with_stock:
        slowest = min(stats_with_stock, key=lambda item: (item["daily_velocity"], -item["stock_value"]))
        dead_stock_payload = [{**slowest, "suggestion": "Discount or bundle this stock to release capital."}]

    return {
        "kpis": {
            "total_sales_7d":  round(this_week, 2),
            "total_sales_30d": round(this_month, 2),
            "sales_delta_pct": round((this_week - last_week) / max(last_week, 1) * 100, 1),
            "total_orders_7d": total_orders,
            "avg_order_value": round(this_week / max(total_orders, 1), 2),
        },
        "profit": {
            "total_7d": round(profit_7d, 2),
            "total_30d": round(profit_30d, 2),
            "margin_pct_30d": round(profit_30d / this_month * 100 if this_month else 0, 1),
        },
        "best_margin": ({
            "product_id": best_margin["product_id"],
            "product_name": best_margin["product_name"],
            "margin_pct": round(best_margin["margin_pct"], 1),
            "profit_30d": round(best_margin["profit_30d"], 2),
        } if best_margin else None),
        "capital_stuck": round(sum(item["stock_value"] for item in dead_stock_payload), 2),
        "dead_stock": dead_stock_payload,
        "product_velocity": list(product_stats.values()),
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
