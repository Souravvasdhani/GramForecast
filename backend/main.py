"""
RuralDemand AI — FastAPI Backend
=================================
Entrypoint. Mounts all routers and configures CORS, middleware, and lifespan.
"""

from contextlib import asynccontextmanager
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from database import engine, Base
from sqlalchemy import text
from routers import auth, dashboard, forecast, products, sales, inventory, alerts, market, ai, assistant, notify, credit, settings as settings_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables (idempotent — schema already applied via schema.sql)
    Base.metadata.create_all(bind=engine)
    with engine.begin() as connection:
        connection.execute(text("ALTER TABLE forecasts ADD COLUMN IF NOT EXISTS festival_name VARCHAR(100)"))
        connection.execute(text("ALTER TABLE forecasts ADD COLUMN IF NOT EXISTS festival_impact_pct DECIMAL(7, 2) DEFAULT 0"))
        connection.execute(text("ALTER TABLE businesses ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb"))
        connection.execute(text("""
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'credit_entries' AND column_name = 'entry_date'
                ) THEN
                    ALTER TABLE credit_entries RENAME COLUMN entry_date TO date;
                END IF;
            END $$;
        """))
    yield


app = FastAPI(
    title="RuralDemand AI API",
    description="AI-powered demand prediction for village enterprises",
    version="1.0.0",
    lifespan=lifespan,
)

# ─── CORS ────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers ─────────────────────────────────────────────────────────────────
app.include_router(auth.router,      prefix="/auth",      tags=["Auth"])
app.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
app.include_router(forecast.router,  prefix="/forecast",  tags=["Forecast"])
app.include_router(products.router,  prefix="/products",  tags=["Products"])
app.include_router(sales.router,     prefix="/sales",     tags=["Sales"])
app.include_router(inventory.router, prefix="/inventory", tags=["Inventory"])
app.include_router(alerts.router,    prefix="/alerts",    tags=["Alerts"])
app.include_router(market.router,    prefix="/market",    tags=["Market"])
app.include_router(ai.router,        prefix="/ai",        tags=["AI"])
app.include_router(assistant.router, prefix="/assistant", tags=["Assistant"])
app.include_router(notify.router, prefix="/notify", tags=["Notifications"])
app.include_router(credit.router,    prefix="/credit",   tags=["Udhaar"])
app.include_router(settings_router.router,  prefix="/settings", tags=["Settings"])

# Keep the /api-prefixed routes available for same-origin Vercel deployments.
app.include_router(auth.router,      prefix="/api/auth",      tags=["Auth"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(forecast.router,  prefix="/api/forecast",  tags=["Forecast"])
app.include_router(products.router,  prefix="/api/products",  tags=["Products"])
app.include_router(sales.router,     prefix="/api/sales",     tags=["Sales"])
app.include_router(inventory.router, prefix="/api/inventory", tags=["Inventory"])
app.include_router(alerts.router,    prefix="/api/alerts",    tags=["Alerts"])
app.include_router(market.router,    prefix="/api/market",    tags=["Market"])
app.include_router(ai.router,        prefix="/api/ai",        tags=["AI"])
app.include_router(assistant.router, prefix="/api/assistant", tags=["Assistant"])
app.include_router(notify.router, prefix="/api/notify", tags=["Notifications"])
app.include_router(credit.router,  prefix="/api/credit", tags=["Udhaar"])
app.include_router(settings_router.router, prefix="/api/settings", tags=["Settings"])


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "RuralDemand AI Backend"}


@app.get("/api/health")
def api_health_check():
    return {"status": "ok", "service": "RuralDemand AI Backend"}
