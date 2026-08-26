"""Alerts router."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

import models
from database import get_db
from auth_utils import get_current_user

router = APIRouter()


@router.get("/")
def list_alerts(
    resolved: bool = Query(False),
    language: str = Query("en", pattern="^(en|hi|mr)$"),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = (
        db.query(models.Alert)
        .filter(models.Alert.business_id == current_user.business_id)
    )
    if not resolved:
        query = query.filter(models.Alert.resolved_at.is_(None))
    alerts = query.order_by(models.Alert.created_at.desc()).limit(50).all()
    return [
        {
            "id":          str(a.id),
            "type":        a.type,
            "priority":    a.priority,
            "message":     (
                ({
                    "out_of_stock": f"{a.product.name if a.product else 'उत्पादन'} चा साठा संपला आहे. त्वरित भरपाई करा.",
                    "low_stock": f"{a.product.name if a.product else 'उत्पादन'} चा साठा सुरक्षा पातळीखाली आहे. ऑर्डर करण्याची शिफारस.",
                    "high_demand_forecast": f"{a.product.name if a.product else 'उत्पादनाची'} मागणी पुढील आठवड्यात वाढण्याची शक्यता आहे.",
                    "price_increase": f"{a.product.name if a.product else 'उत्पादनाचा'} घाऊक भाव या आठवड्यात वाढला आहे.",
                    "weather_risk": "पुढील ३ दिवस हलका पाऊस अपेक्षित आहे. पीठ कोरड्या जागी ठेवा.",
                    "forecast_updated": "अलीकडील विक्रीच्या आधारे AI मागणी मॉडेल अपडेट केले आहे.",
                } if language == "mr" else {
                    "out_of_stock": f"{a.product.name if a.product else 'उत्पाद'} का स्टॉक खत्म है। तुरंत भरें।",
                    "low_stock": f"{a.product.name if a.product else 'उत्पाद'} का स्टॉक सुरक्षा स्तर से कम है। ऑर्डर करने की सलाह है।",
                    "high_demand_forecast": f"{a.product.name if a.product else 'उत्पाद'} की मांग अगले सप्ताह बढ़ने का अनुमान है।",
                    "price_increase": f"{a.product.name if a.product else 'उत्पाद'} का थोक मूल्य इस सप्ताह बढ़ा है।",
                    "weather_risk": "अगले 3 दिनों में हल्की बारिश का अनुमान है। आटा सूखी जगह रखें।",
                    "forecast_updated": "AI मांग मॉडल को हाल की बिक्री से अपडेट किया गया है।",
                }).get(a.type.value if hasattr(a.type, "value") else a.type, a.message)
                if language in {"hi", "mr"} else a.message
            ),
            "product_id":  str(a.product_id) if a.product_id else None,
            "is_read":     a.is_read,
            "created_at":  str(a.created_at),
            "resolved_at": str(a.resolved_at) if a.resolved_at else None,
        }
        for a in alerts
    ]
