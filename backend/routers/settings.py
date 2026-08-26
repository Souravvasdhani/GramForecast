"""Business and user settings."""

import re

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

import models
from auth_utils import get_current_user
from database import get_db

router = APIRouter()

DEFAULT_PREFERENCES = {
    "daily_ai_forecast": True,
    "low_stock_alerts": True,
    "weekly_report_emails": True,
    "auto_reorder_suggestions": True,
}


class SettingsUpdate(BaseModel):
    business_name: str = Field(min_length=1)
    mobile: str = Field(min_length=1)
    location: str = Field(min_length=1)
    preferences: dict[str, bool] = Field(default_factory=dict)

    @field_validator("business_name", "mobile", "location")
    @classmethod
    def non_empty(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("This field is required")
        return value

    @field_validator("mobile")
    @classmethod
    def valid_mobile(cls, value: str) -> str:
        if not re.fullmatch(r"[6-9]\d{9}", value):
            raise ValueError("Mobile must be exactly 10 digits and start with 6-9")
        return value


def _payload(user: models.User) -> dict:
    preferences = {**DEFAULT_PREFERENCES, **(user.business.settings or {})}
    return {
        "business_name": user.business.name,
        "mobile": user.mobile,
        "location": user.business.location or "",
        "preferences": preferences,
    }


@router.get("/")
def get_settings(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return _payload(current_user)


@router.patch("/")
def update_settings(
    request: SettingsUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    current_user.business.name = request.business_name
    current_user.business.location = request.location
    current_user.mobile = request.mobile
    current_user.business.settings = {**DEFAULT_PREFERENCES, **request.preferences}
    db.commit()
    db.refresh(current_user)
    return _payload(current_user)