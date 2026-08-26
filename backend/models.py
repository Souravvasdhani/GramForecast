"""SQLAlchemy ORM models — mirrors schema.sql exactly."""

import uuid
from datetime import datetime, date

from sqlalchemy import (
    Column, String, Boolean, Integer, Numeric, Date, DateTime,
    Text, Enum, ForeignKey, UniqueConstraint, Index, JSON,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import enum

from database import Base


# ─── Enum classes ─────────────────────────────────────────────────────────────

class BusinessCategory(str, enum.Enum):
    kirana_store         = "kirana_store"
    oil_mill             = "oil_mill"
    flour_mill           = "flour_mill"
    spice_trader         = "spice_trader"
    dairy                = "dairy"
    handicraft           = "handicraft"
    vegetable_seller     = "vegetable_seller"
    wholesale_distributor= "wholesale_distributor"
    other                = "other"

class UserRole(str, enum.Enum):
    owner   = "owner"
    manager = "manager"
    viewer  = "viewer"

class PaymentMethod(str, enum.Enum):
    cash   = "cash"
    upi    = "upi"
    credit = "credit"
    barter = "barter"
    other  = "other"

class InventoryStatus(str, enum.Enum):
    optimal      = "optimal"
    low_stock    = "low_stock"
    out_of_stock = "out_of_stock"
    overstock    = "overstock"

class AlertType(str, enum.Enum):
    low_stock            = "low_stock"
    out_of_stock         = "out_of_stock"
    high_demand_forecast = "high_demand_forecast"
    price_increase       = "price_increase"
    overstock            = "overstock"
    weather_risk         = "weather_risk"
    forecast_updated     = "forecast_updated"
    system               = "system"

class AlertPriority(str, enum.Enum):
    high   = "high"
    medium = "medium"
    low    = "low"

class ReportType(str, enum.Enum):
    demand_forecast  = "demand_forecast"
    sales_summary    = "sales_summary"
    inventory_status = "inventory_status"
    production_plan  = "production_plan"
    market_trends    = "market_trends"
    custom           = "custom"

class ReportFormat(str, enum.Enum):
    pdf   = "pdf"
    excel = "excel"
    csv   = "csv"

class ReportStatus(str, enum.Enum):
    generated = "generated"
    pending   = "pending"
    failed    = "failed"

class CreditStatus(str, enum.Enum):
    unpaid = "unpaid"
    paid   = "paid"


# ─── Models ───────────────────────────────────────────────────────────────────

class Business(Base):
    __tablename__ = "businesses"

    id             = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name           = Column(String(200), nullable=False)
    owner_name     = Column(String(200), nullable=False)
    category       = Column(Enum(BusinessCategory, name="business_category"), nullable=False)
    location       = Column(String(300))
    latitude       = Column(Numeric(9, 6))
    longitude      = Column(Numeric(9, 6))
    business_since = Column(Integer)
    phone          = Column(String(20))
    email          = Column(String(200))
    logo_url       = Column(String(500))
    settings       = Column(JSON, default=dict)
    is_active      = Column(Boolean, default=True)
    created_at     = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at     = Column(DateTime(timezone=True), default=datetime.utcnow)

    users    = relationship("User", back_populates="business")
    products = relationship("Product", back_populates="business")
    sales    = relationship("Sale", back_populates="business")
    alerts   = relationship("Alert", back_populates="business")
    reports  = relationship("Report", back_populates="business")
    credit_entries = relationship("CreditEntry", back_populates="business")


class User(Base):
    __tablename__ = "users"

    id            = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_id   = Column(UUID(as_uuid=True), ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    name          = Column(String(200), nullable=False)
    role          = Column(Enum(UserRole, name="user_role"), default=UserRole.owner)
    mobile        = Column(String(20), unique=True, nullable=False)
    email         = Column(String(200), unique=True)
    password_hash = Column(String(500), nullable=False)
    is_active     = Column(Boolean, default=True)
    last_login_at = Column(DateTime(timezone=True))
    created_at    = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at    = Column(DateTime(timezone=True), default=datetime.utcnow)

    business = relationship("Business", back_populates="users")


class Product(Base):
    __tablename__ = "products"
    __table_args__ = (UniqueConstraint("business_id", "name"),)

    id            = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_id   = Column(UUID(as_uuid=True), ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    name          = Column(String(200), nullable=False)
    category      = Column(String(100))
    unit          = Column(String(50), default="kg")
    current_stock = Column(Numeric(12, 3), default=0)
    ideal_stock   = Column(Numeric(12, 3))
    target_stock  = Column(Numeric(12, 3))
    safety_stock  = Column(Numeric(12, 3))
    reorder_point = Column(Numeric(12, 3))
    cost_price    = Column(Numeric(10, 2))
    selling_price = Column(Numeric(10, 2))
    is_active     = Column(Boolean, default=True)
    created_at    = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at    = Column(DateTime(timezone=True), default=datetime.utcnow)

    business             = relationship("Business", back_populates="products")
    sales                = relationship("Sale", back_populates="product")
    forecasts            = relationship("Forecast", back_populates="product")
    inventory_snapshots  = relationship("InventorySnapshot", back_populates="product")
    alerts               = relationship("Alert", back_populates="product")


class Sale(Base):
    __tablename__ = "sales"

    id             = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_id    = Column(UUID(as_uuid=True), ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    product_id     = Column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="RESTRICT"), nullable=False)
    sale_date      = Column(Date, nullable=False)
    quantity       = Column(Numeric(12, 3), nullable=False)
    price_per_unit = Column(Numeric(10, 2), nullable=False)
    payment_method = Column(Enum(PaymentMethod, name="payment_method"), default=PaymentMethod.cash)
    region         = Column(String(200))
    customer_type  = Column(String(50))
    notes          = Column(Text)
    created_at     = Column(DateTime(timezone=True), default=datetime.utcnow)

    business = relationship("Business", back_populates="sales")
    product  = relationship("Product", back_populates="sales")


class CreditEntry(Base):
    __tablename__ = "credit_entries"

    id            = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_id   = Column(UUID(as_uuid=True), ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    customer_name = Column(String(200), nullable=False)
    phone         = Column(String(20))
    amount        = Column(Numeric(12, 2), nullable=False)
    note          = Column(Text)
    date          = Column(Date, nullable=False, default=date.today)
    status        = Column(Enum(CreditStatus, name="credit_status"), nullable=False, default=CreditStatus.unpaid)
    created_at    = Column(DateTime(timezone=True), default=datetime.utcnow)

    business = relationship("Business", back_populates="credit_entries")


class Forecast(Base):
    __tablename__ = "forecasts"
    __table_args__ = (UniqueConstraint("product_id", "forecast_date", "model_version"),)

    id               = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_id       = Column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    forecast_date    = Column(Date, nullable=False)
    predicted_demand = Column(Numeric(12, 3), nullable=False)
    lower_bound      = Column(Numeric(12, 3))
    upper_bound      = Column(Numeric(12, 3))
    confidence_level = Column(Numeric(5, 2))
    festival_name    = Column(String(100))
    festival_impact_pct = Column(Numeric(7, 2), default=0)
    model_version    = Column(String(50), default="prophet_v1")
    run_at           = Column(DateTime(timezone=True), default=datetime.utcnow)

    product = relationship("Product", back_populates="forecasts")


class InventorySnapshot(Base):
    __tablename__ = "inventory_snapshots"
    __table_args__ = (UniqueConstraint("product_id", "snapshot_date"),)

    id            = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_id    = Column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    snapshot_date = Column(Date, nullable=False)
    stock_level   = Column(Numeric(12, 3), nullable=False)
    status        = Column(Enum(InventoryStatus, name="inventory_status"), nullable=False)
    notes         = Column(Text)
    created_at    = Column(DateTime(timezone=True), default=datetime.utcnow)

    product = relationship("Product", back_populates="inventory_snapshots")


class MarketSignal(Base):
    __tablename__ = "market_signals"
    __table_args__ = (UniqueConstraint("region", "category", "signal_date", "source"),)

    id                = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    region            = Column(String(200), nullable=False)
    category          = Column(String(100), nullable=False)
    signal_date       = Column(Date, nullable=False)
    price             = Column(Numeric(10, 2))
    demand_index      = Column(Numeric(6, 2))
    supply_index      = Column(Numeric(6, 2))
    competition_level = Column(String(20))
    source            = Column(String(100), default="mock")
    weather_temp      = Column(Numeric(5, 2))
    weather_rainfall  = Column(Numeric(7, 2))
    created_at        = Column(DateTime(timezone=True), default=datetime.utcnow)


class Alert(Base):
    __tablename__ = "alerts"

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_id = Column(UUID(as_uuid=True), ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    product_id  = Column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="SET NULL"))
    type        = Column(Enum(AlertType, name="alert_type"), nullable=False)
    priority    = Column(Enum(AlertPriority, name="alert_priority"), default=AlertPriority.medium)
    message     = Column(Text, nullable=False)
    action_url  = Column(String(500))
    is_read     = Column(Boolean, default=False)
    resolved_at = Column(DateTime(timezone=True))
    created_at  = Column(DateTime(timezone=True), default=datetime.utcnow)

    business = relationship("Business", back_populates="alerts")
    product  = relationship("Product", back_populates="alerts")


class Report(Base):
    __tablename__ = "reports"

    id           = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_id  = Column(UUID(as_uuid=True), ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    type         = Column(Enum(ReportType, name="report_type"), nullable=False)
    period_start = Column(Date)
    period_end   = Column(Date)
    generated_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    format       = Column(Enum(ReportFormat, name="report_format"), default=ReportFormat.pdf)
    status       = Column(Enum(ReportStatus, name="report_status"), default=ReportStatus.generated)
    url          = Column(String(500))
    views        = Column(Integer, default=0)
    downloads    = Column(Integer, default=0)
    shares       = Column(Integer, default=0)

    business = relationship("Business", back_populates="reports")
