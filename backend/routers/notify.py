"""Outbound shop notifications."""

from datetime import date, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

import models
from auth_utils import get_current_user
from database import get_db
from forecast_runner import ensure_forecasts
from whatsapp_service import send_whatsapp

router = APIRouter()


def compose_daily_digest(db: Session, business_id) -> str:
    """Compose the exact message used both for Twilio and the preview bubble."""
    try:
        ensure_forecasts(db, business_id)
    except Exception:
        db.rollback()

    latest_sale = db.query(func.max(models.Sale.sale_date)).filter(models.Sale.business_id == business_id).scalar()
    today = latest_sale + timedelta(days=1) if latest_sale else date.today()
    next_7 = today + timedelta(days=7)
    forecasts = (
        db.query(
            models.Product.name,
            models.Product.unit,
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
        .group_by(models.Product.id, models.Product.name, models.Product.unit, models.Product.current_stock, models.Product.safety_stock)
        .order_by(func.sum(models.Forecast.predicted_demand).desc())
        .all()
    )

    restock = []
    for row in forecasts:
        needed = max(0, float(row.forecast_7d or 0) + float(row.safety_stock or 0) - float(row.current_stock or 0))
        if needed > 0:
            restock.append(f"{row.name}: {needed:.0f} {row.unit}")
    low_items = [
        f"{product.name} ({float(product.current_stock or 0):.0f} {product.unit})"
        for product in db.query(models.Product).filter(models.Product.business_id == business_id).all()
        if float(product.current_stock or 0) <= 0
        or (product.reorder_point is not None and float(product.current_stock or 0) < float(product.reorder_point))
    ]
    signal = db.query(models.MarketSignal).order_by(models.MarketSignal.signal_date.desc()).first()
    market_note = (
        f"📈 {signal.category}: मांग सूचकांक {float(signal.demand_index or 0):.0f}, भाव ₹{float(signal.price or 0):.0f}।"
        if signal else "🎉 त्योहार का मौसम: जरूरी सामान का स्टॉक रखें।"
    )

    lines = ["🙏 नमस्ते! आज की दुकान योजना", "", "🛒 इस सप्ताह मंगाएं:"]
    lines.extend(f"• {item}" for item in restock[:3]) or lines.append("• अभी अतिरिक्त ऑर्डर जरूरी नहीं है।")
    lines.extend(["", "⚠️ कम / खत्म स्टॉक:"])
    lines.extend(f"• {item}" for item in low_items[:8]) or lines.append("• कोई नहीं")
    lines.extend(["", market_note, "", "Kirana Sahayak"])
    return "\n".join(lines)


@router.post("/whatsapp/daily")
def send_daily_whatsapp(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    message = compose_daily_digest(db, current_user.business_id)
    sent = send_whatsapp(current_user.mobile, message)
    return {
        "sent": sent,
        "preview": message,
        "message": "WhatsApp message sent" if sent else "Twilio unavailable; preview ready",
    }