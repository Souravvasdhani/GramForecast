"""Kirana Sahayak chat assistant grounded in the current shop data."""

from datetime import date, timedelta
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, status
from groq import Groq
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

import models
from auth_utils import get_current_user
from config import settings
from database import get_db
from forecast_runner import ensure_forecasts

router = APIRouter()

SYSTEM_PROMPT = (
    "You are Kirana Sahayak, a helpful assistant for a village kirana shop owner. "
    "Answer briefly and practically using ONLY the provided shop data. "
    "If language is 'hi', reply in simple Hindi (Devanagari). If language is 'mr', reply in simple Marathi (Devanagari)."
)


class ChatRequest(BaseModel):
    message: str
    language: Literal["en", "hi", "mr"] = "en"


class ChatResponse(BaseModel):
    reply: str


def _shop_context(db: Session, business_id) -> str:
    """Build a compact, current snapshot for the model to reason over."""
    latest_sale = (
        db.query(func.max(models.Sale.sale_date))
        .filter(models.Sale.business_id == business_id)
        .scalar()
    )
    today = latest_sale + timedelta(days=1) if latest_sale else date.today()
    next_7 = today + timedelta(days=7)

    forecast_rows = (
        db.query(
            models.Product.name,
            models.Product.unit,
            models.Product.current_stock,
            func.sum(models.Forecast.predicted_demand).label("forecast_7d"),
        )
        .join(models.Forecast, models.Product.id == models.Forecast.product_id)
        .filter(
            models.Product.business_id == business_id,
            models.Forecast.forecast_date >= today,
            models.Forecast.forecast_date < next_7,
        )
        .group_by(models.Product.id, models.Product.name, models.Product.unit, models.Product.current_stock)
        .order_by(func.sum(models.Forecast.predicted_demand).desc())
        .limit(8)
        .all()
    )

    products = db.query(models.Product).filter(models.Product.business_id == business_id).all()
    low_stock = [
        f"{product.name}: {float(product.current_stock or 0):g} {product.unit}"
        for product in products
        if float(product.current_stock or 0) <= 0
        or (
            product.reorder_point is not None
            and float(product.current_stock or 0) < float(product.reorder_point)
        )
    ]

    alerts = (
        db.query(models.Alert)
        .filter(
            models.Alert.business_id == business_id,
            models.Alert.priority == models.AlertPriority.high,
            models.Alert.resolved_at.is_(None),
        )
        .order_by(models.Alert.created_at.desc())
        .limit(5)
        .all()
    )

    lines = [f"Date basis: {today}", "Top predicted products (next 7 days):"]
    if forecast_rows:
        lines.extend(
            f"- {row.name}: {float(row.forecast_7d or 0):g} {row.unit} forecast, "
            f"{float(row.current_stock or 0):g} {row.unit} in stock"
            for row in forecast_rows
        )
    else:
        lines.append("- No forecast data is available.")
    lines.append("Low or out-of-stock items:")
    lines.extend(f"- {item}" for item in low_stock[:12])
    if not low_stock:
        lines.append("- None")
    lines.append("Open high-priority alerts:")
    lines.extend(f"- {alert.message}" for alert in alerts)
    if not alerts:
        lines.append("- None")
    return "\n".join(lines)


@router.post("/chat", response_model=ChatResponse)
def chat(
    request: ChatRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not settings.GROQ_API_KEY:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="AI assistant is not configured")
    if not request.message.strip():
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Message cannot be empty")

    try:
        ensure_forecasts(db, current_user.business_id)
    except Exception:
        # Chat can still answer stock and alert questions when forecasting is unavailable.
        db.rollback()

    try:
        context = _shop_context(db, current_user.business_id)
        completion = Groq(api_key=settings.GROQ_API_KEY).chat.completions.create(
            model=settings.GROQ_MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "system", "content": f"Current shop data:\n{context}"},
                {"role": "user", "content": f"Language: {request.language}\nQuestion: {request.message.strip()}"},
            ],
            temperature=0.2,
            max_tokens=500,
        )
        reply = (completion.choices[0].message.content or "").strip()
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Unable to contact the AI assistant") from exc

    if not reply:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="AI returned an empty response")
    return ChatResponse(reply=reply)