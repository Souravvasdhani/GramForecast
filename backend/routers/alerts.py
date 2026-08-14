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
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = (
        db.query(models.Alert)
        .filter(models.Alert.business_id == current_user.business_id)
    )
    if not resolved:
        query = query.filter(models.Alert.resolved_at.is_(None))
    alerts = query.order_by(models.Alert.priority.desc(), models.Alert.created_at.desc()).limit(50).all()
    return [
        {
            "id":          str(a.id),
            "type":        a.type,
            "priority":    a.priority,
            "message":     a.message,
            "product_id":  str(a.product_id) if a.product_id else None,
            "is_read":     a.is_read,
            "created_at":  str(a.created_at),
            "resolved_at": str(a.resolved_at) if a.resolved_at else None,
        }
        for a in alerts
    ]
