"""Udhaar (credit) ledger endpoints."""

from datetime import date as date_type

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

import models
from auth_utils import get_current_user
from database import get_db

router = APIRouter()


class CreditEntryCreate(BaseModel):
    customer_name: str = Field(min_length=1, max_length=200)
    phone: str | None = Field(default=None, max_length=20)
    amount: float = Field(gt=0)
    note: str | None = None
    date: date_type = Field(default_factory=date_type.today)


def serialize_entry(entry: models.CreditEntry):
    return {
        "id": str(entry.id),
        "customer_name": entry.customer_name,
        "phone": entry.phone,
        "amount": float(entry.amount),
        "note": entry.note,
        "date": str(entry.date),
        "status": entry.status.value,
    }


@router.get("/")
def list_credit_entries(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    entries = (
        db.query(models.CreditEntry)
        .filter(models.CreditEntry.business_id == current_user.business_id)
        .order_by(models.CreditEntry.date.desc(), models.CreditEntry.created_at.desc())
        .all()
    )
    outstanding = sum(float(entry.amount) for entry in entries if entry.status == models.CreditStatus.unpaid)
    return {"total_outstanding": outstanding, "entries": [serialize_entry(entry) for entry in entries]}


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_credit_entry(
    request: CreditEntryCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    entry = models.CreditEntry(business_id=current_user.business_id, **request.model_dump())
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return serialize_entry(entry)


@router.patch("/{entry_id}/paid")
def mark_credit_paid(
    entry_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    entry = db.query(models.CreditEntry).filter(
        models.CreditEntry.id == entry_id,
        models.CreditEntry.business_id == current_user.business_id,
    ).first()
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Udhaar entry not found")
    entry.status = models.CreditStatus.paid
    db.commit()
    db.refresh(entry)
    return serialize_entry(entry)