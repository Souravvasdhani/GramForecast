"""AI-generated business insights."""

import hashlib
import json
from datetime import datetime, timedelta
from threading import Lock
from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException, status
from groq import Groq
from pydantic import BaseModel

import models
from auth_utils import get_current_user
from config import settings

router = APIRouter()

SYSTEM_PROMPT = (
    "You are a business advisor for a rural Indian enterprise. Given this data, "
    "write ONE short, specific, plain-language recommendation (max 25 words) "
    "in the tone of a helpful advisor, no jargon."
)

_insight_cache: dict[str, tuple[datetime, str]] = {}
_cache_lock = Lock()


class InsightsRequest(BaseModel):
    current_forecast: Any
    inventory_status: Any
    sales_trend: Any
    language: Literal["en", "hi", "mr"] = "en"


class InsightsResponse(BaseModel):
    insight: str


def _cache_key(business_id: Any, request: InsightsRequest) -> str:
    context = json.dumps(request.model_dump(), sort_keys=True, default=str)
    return hashlib.sha256(f"{business_id}:{context}".encode()).hexdigest()


def _shorten_to_25_words(text: str) -> str:
    words = text.strip().split()
    return " ".join(words[:25])


@router.post("/insights", response_model=InsightsResponse)
def generate_insight(
    request: InsightsRequest,
    current_user: models.User = Depends(get_current_user),
):
    if not settings.GROQ_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI insights are not configured",
        )

    key = _cache_key(current_user.business_id, request)
    now = datetime.utcnow()
    with _cache_lock:
        cached = _insight_cache.get(key)
        if cached and cached[0] > now:
            return InsightsResponse(insight=cached[1])
        _insight_cache.pop(key, None)

    client = Groq(api_key=settings.GROQ_API_KEY)
    context = json.dumps(request.model_dump(), sort_keys=True, default=str)
    try:
        completion = client.chat.completions.create(
            model=settings.GROQ_MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT + (" Reply in simple Marathi (Devanagari)." if request.language == "mr" else " Reply in simple Hindi (Devanagari)." if request.language == "hi" else " Reply in English.")},
                {"role": "user", "content": f"Business data:\n{context}"},
            ],
            temperature=0.2,
            max_tokens=200,
        )
        generated = completion.choices[0].message.content or ""
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Unable to generate an AI insight",
        ) from exc

    insight = _shorten_to_25_words(generated)
    if not insight:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI returned an empty insight",
        )

    expires_at = now + timedelta(seconds=settings.AI_INSIGHTS_CACHE_TTL_SECONDS)
    with _cache_lock:
        _insight_cache[key] = (expires_at, insight)
    return InsightsResponse(insight=insight)