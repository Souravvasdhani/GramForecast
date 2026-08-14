-- ═══════════════════════════════════════════════════════════════
-- RuralDemand AI — PostgreSQL Schema v1.0
-- Matches DESIGN.md §7 data model
-- ═══════════════════════════════════════════════════════════════

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- for fuzzy text search

-- ───────────────────────────────────────────────
-- ENUM types
-- ───────────────────────────────────────────────
CREATE TYPE business_category AS ENUM (
  'kirana_store',
  'oil_mill',
  'flour_mill',
  'spice_trader',
  'dairy',
  'handicraft',
  'vegetable_seller',
  'wholesale_distributor',
  'other'
);

CREATE TYPE user_role AS ENUM ('owner', 'manager', 'viewer');

CREATE TYPE payment_method AS ENUM ('cash', 'upi', 'credit', 'barter', 'other');

CREATE TYPE inventory_status AS ENUM ('optimal', 'low_stock', 'out_of_stock', 'overstock');

CREATE TYPE alert_type AS ENUM (
  'low_stock',
  'out_of_stock',
  'high_demand_forecast',
  'price_increase',
  'overstock',
  'weather_risk',
  'forecast_updated',
  'system'
);

CREATE TYPE alert_priority AS ENUM ('high', 'medium', 'low');

CREATE TYPE report_type AS ENUM (
  'demand_forecast',
  'sales_summary',
  'inventory_status',
  'production_plan',
  'market_trends',
  'custom'
);

CREATE TYPE report_format AS ENUM ('pdf', 'excel', 'csv');
CREATE TYPE report_status AS ENUM ('generated', 'pending', 'failed');

-- ───────────────────────────────────────────────
-- businesses
-- ───────────────────────────────────────────────
CREATE TABLE businesses (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name             VARCHAR(200) NOT NULL,
  owner_name       VARCHAR(200) NOT NULL,
  category         business_category NOT NULL,
  location         VARCHAR(300),               -- "Village, Block, District, State"
  latitude         DECIMAL(9, 6),
  longitude        DECIMAL(9, 6),
  business_since   INTEGER,                    -- year
  phone            VARCHAR(20),
  email            VARCHAR(200),
  logo_url         VARCHAR(500),
  is_active        BOOLEAN DEFAULT TRUE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ───────────────────────────────────────────────
-- users
-- ───────────────────────────────────────────────
CREATE TABLE users (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id      UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name             VARCHAR(200) NOT NULL,
  role             user_role NOT NULL DEFAULT 'owner',
  mobile           VARCHAR(20) UNIQUE NOT NULL,
  email            VARCHAR(200) UNIQUE,
  password_hash    VARCHAR(500) NOT NULL,
  is_active        BOOLEAN DEFAULT TRUE,
  last_login_at    TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_business_id ON users(business_id);
CREATE INDEX idx_users_mobile      ON users(mobile);

-- ───────────────────────────────────────────────
-- products
-- ───────────────────────────────────────────────
CREATE TABLE products (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id      UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name             VARCHAR(200) NOT NULL,
  category         VARCHAR(100),               -- e.g. "Oils & Fats", "Grains & Pulses"
  unit             VARCHAR(50) DEFAULT 'kg',   -- kg, litre, piece, quintal, etc.
  current_stock    DECIMAL(12, 3) DEFAULT 0,
  ideal_stock      DECIMAL(12, 3),
  target_stock     DECIMAL(12, 3),
  safety_stock     DECIMAL(12, 3),             -- default = 10% of 7-day forecast
  reorder_point    DECIMAL(12, 3),
  cost_price       DECIMAL(10, 2),             -- per unit
  selling_price    DECIMAL(10, 2),             -- per unit
  is_active        BOOLEAN DEFAULT TRUE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(business_id, name)
);

CREATE INDEX idx_products_business_id ON products(business_id);
CREATE INDEX idx_products_category    ON products(category);

-- ───────────────────────────────────────────────
-- sales
-- ───────────────────────────────────────────────
CREATE TABLE sales (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id      UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  product_id       UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  sale_date        DATE NOT NULL,
  quantity         DECIMAL(12, 3) NOT NULL CHECK (quantity > 0),
  price_per_unit   DECIMAL(10, 2) NOT NULL,
  total_amount     DECIMAL(12, 2) GENERATED ALWAYS AS (quantity * price_per_unit) STORED,
  payment_method   payment_method DEFAULT 'cash',
  region           VARCHAR(200),               -- sub-region within business area
  customer_type    VARCHAR(50),               -- 'walk-in', 'regular', 'wholesale'
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sales_business_id  ON sales(business_id);
CREATE INDEX idx_sales_product_id   ON sales(product_id);
CREATE INDEX idx_sales_date         ON sales(sale_date);
CREATE INDEX idx_sales_biz_date     ON sales(business_id, sale_date DESC);

-- ───────────────────────────────────────────────
-- forecasts
-- ───────────────────────────────────────────────
CREATE TABLE forecasts (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id       UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  forecast_date    DATE NOT NULL,
  predicted_demand DECIMAL(12, 3) NOT NULL,
  lower_bound      DECIMAL(12, 3),             -- 80% confidence interval lower
  upper_bound      DECIMAL(12, 3),             -- 80% confidence interval upper
  confidence_level DECIMAL(5, 2),              -- 0–100
  model_version    VARCHAR(50) DEFAULT 'prophet_v1',
  run_at           TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, forecast_date, model_version)
);

CREATE INDEX idx_forecasts_product_id    ON forecasts(product_id);
CREATE INDEX idx_forecasts_date          ON forecasts(forecast_date);
CREATE INDEX idx_forecasts_prod_date     ON forecasts(product_id, forecast_date DESC);

-- ───────────────────────────────────────────────
-- inventory_snapshots
-- ───────────────────────────────────────────────
CREATE TABLE inventory_snapshots (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id       UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  snapshot_date    DATE NOT NULL,
  stock_level      DECIMAL(12, 3) NOT NULL,
  status           inventory_status NOT NULL,
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, snapshot_date)
);

CREATE INDEX idx_inv_snapshots_product_id ON inventory_snapshots(product_id);
CREATE INDEX idx_inv_snapshots_date       ON inventory_snapshots(snapshot_date);

-- ───────────────────────────────────────────────
-- market_signals
-- ───────────────────────────────────────────────
CREATE TABLE market_signals (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  region           VARCHAR(200) NOT NULL,
  category         VARCHAR(100) NOT NULL,
  signal_date      DATE NOT NULL,
  price            DECIMAL(10, 2),             -- wholesale/mandi price per unit
  demand_index     DECIMAL(6, 2),              -- 0–100
  supply_index     DECIMAL(6, 2),              -- 0–100
  competition_level VARCHAR(20),              -- 'low', 'medium', 'high'
  source           VARCHAR(100) DEFAULT 'mock',  -- 'agmarknet', 'openweather', 'mock'
  weather_temp     DECIMAL(5, 2),              -- °C
  weather_rainfall DECIMAL(7, 2),             -- mm
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(region, category, signal_date, source)
);

CREATE INDEX idx_market_signals_region   ON market_signals(region);
CREATE INDEX idx_market_signals_category ON market_signals(category);
CREATE INDEX idx_market_signals_date     ON market_signals(signal_date);

-- ───────────────────────────────────────────────
-- alerts
-- ───────────────────────────────────────────────
CREATE TABLE alerts (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id      UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  product_id       UUID REFERENCES products(id) ON DELETE SET NULL,
  type             alert_type NOT NULL,
  priority         alert_priority NOT NULL DEFAULT 'medium',
  message          TEXT NOT NULL,
  action_url       VARCHAR(500),               -- deep-link into the app
  is_read          BOOLEAN DEFAULT FALSE,
  resolved_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_alerts_business_id ON alerts(business_id);
CREATE INDEX idx_alerts_priority    ON alerts(priority);
CREATE INDEX idx_alerts_created_at  ON alerts(created_at DESC);

-- ───────────────────────────────────────────────
-- reports
-- ───────────────────────────────────────────────
CREATE TABLE reports (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id      UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  type             report_type NOT NULL,
  period_start     DATE,
  period_end       DATE,
  generated_at     TIMESTAMPTZ DEFAULT NOW(),
  format           report_format DEFAULT 'pdf',
  status           report_status DEFAULT 'generated',
  url              VARCHAR(500),
  views            INTEGER DEFAULT 0,
  downloads        INTEGER DEFAULT 0,
  shares           INTEGER DEFAULT 0
);

CREATE INDEX idx_reports_business_id ON reports(business_id);
CREATE INDEX idx_reports_generated   ON reports(generated_at DESC);

-- ───────────────────────────────────────────────
-- Trigger: updated_at auto-maintenance
-- ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_businesses_updated BEFORE UPDATE ON businesses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_products_updated BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
