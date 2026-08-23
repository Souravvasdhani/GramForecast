"""
RuralDemand AI — FastAPI Backend
=================================
Entrypoint. Mounts all routers and configures CORS, middleware, and lifespan.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from database import engine, Base
from routers import auth, dashboard, forecast, products, sales, inventory, alerts, market, ai


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables (idempotent — schema already applied via schema.sql)
    Base.metadata.create_all(bind=engine)
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


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "RuralDemand AI Backend"}


@app.get("/api/health")
def api_health_check():
    return {"status": "ok", "service": "RuralDemand AI Backend"}
