# Product Requirements Document (PRD)
## RuralDemand AI — Smarter Forecasts. Stronger Rural Businesses.

**Track:** Software Industry & MSME Innovation
**Problem Statement:** AI-powered demand prediction system for village enterprises
**Version:** 1.0 (Hackathon Submission)
**Status:** Draft for Build

---

## 1. Problem Statement

Village and rural micro-enterprises (kirana stores, dairy vendors, oil/flour mills, spice traders, handicraft units, small retailers) run almost entirely on gut feeling. They don't track historical sales in any structured way, have no visibility into seasonal or festival-driven demand swings, and can't see market price trends until it's too late.

This leads to three recurring, compounding losses:

1. **Overproduction / overstocking** — perishable or capital-locking goods pile up and lose value.
2. **Stockouts** — high-demand items run out during peak windows (festivals, monsoon, harvest season), and the sale is lost to a competitor or simply lost.
3. **No planning discipline** — production and procurement decisions are reactive, not data-driven, so profitability swings unpredictably month to month.

There is no affordable, simple, vernacular-friendly tool built for this segment. Enterprise ERP/forecasting tools are too complex, too expensive, and assume literacy in spreadsheets and English business jargon that rural entrepreneurs don't have.

## 2. Vision

Give every village enterprise the same demand-sensing power a large FMCG distributor has — a simple mobile-first dashboard that says, in plain language: *"make more of this, order less of that, this is coming next week."*

## 3. Goals & Success Metrics

| Goal | Metric (Target for MVP demo) |
|---|---|
| Accurate demand forecasting | ≥85% forecast accuracy (MAPE-based) on 7-day horizon using historical + seasonal data |
| Reduced inventory losses | Reduce simulated overstock/stockout incidents by ≥25% vs. no-forecast baseline |
| Improved production planning | Deliver a "recommended production" number per product, updated daily |
| Increased business profitability | Show projected revenue impact of following AI recommendations |
| Better market responsiveness | Surface price/demand trend alerts within 24 hours of a market shift |

## 4. Target Users / Personas

**Primary Persona — Ramesh Yadav, Village Enterprise Owner**
- Runs a small retail/trading business (e.g., mustard oil, wheat flour, turmeric powder, pulses) in a village near a Tier-3 town.
- Owns a smartphone, moderate digital literacy, comfortable with WhatsApp-style apps.
- Currently tracks stock and sales on paper or a notebook, if at all.
- Wants: "How much should I stock this week?" answered in one glance.

**Secondary Persona — Field/Cooperative Officer**
- Supports multiple village enterprises (FPOs, SHGs, cooperative societies).
- Needs a multi-business view to advise several vendors at once.

**Tertiary Persona — Lender / Microfinance Partner (future)**
- Uses aggregated demand/sales data as a signal for working-capital credit decisions.

## 5. Scope

### 5.1 In Scope (Hackathon MVP)
- Business onboarding (signup/login, OTP-based, business profile: category, products, location)
- Sales data import (manual entry + CSV/Excel upload)
- AI-powered demand prediction (7-day and category-level forecasts)
- Sales analytics dashboard (revenue, orders, category/region/payment breakdowns)
- Inventory management (current stock, status: optimal/low/out-of-stock/overstock)
- Inventory & production planning (recommended production, target stock, safety stock)
- Market trends module (price trend, demand index, seasonal outlook, trending products)
- Forecast reports (generate, download as PDF, schedule recurring reports)
- Alerts & notifications (low stock, high demand, price change, weather-linked risk)
- AI recommendation panel (plain-language action suggestions across every screen)
- Settings (profile, preferences, data integrations, notification controls)

### 5.2 Out of Scope (for hackathon; noted as roadmap)
- Payment/billing integrations, POS hardware integration
- Multi-language voice input (planned post-MVP; UI text localization is roadmap)
- Direct marketplace/selling integration (e-commerce checkout)
- Credit-scoring / lending features
- Native offline-first mobile app (MVP is responsive web; offline sync is roadmap)

## 6. Features & Functional Requirements

### 6.1 Authentication & Onboarding
- Sign up with Business Name, Owner Name, Mobile Number, Email, Password, Business Category, Business Location (with "Use My Location").
- Login via mobile/email + password; social login (Google/Facebook) as convenience option.
- OTP-based forgot-password flow (3-step: verify identity → verify OTP → reset password).
- Business profile stores: business type, primary products, "business since" year, team members (multi-user support per business).

### 6.2 Dashboard (Home)
- At-a-glance KPI cards: Predicted Demand, Total Sales, Inventory in Hand, Stock-Out Risk.
- Demand Prediction Overview chart: actual vs. predicted demand, 7-day rolling.
- Inventory Status donut: optimal / low stock / high risk / overstock split.
- Demand Forecast (next 7 days) bar chart.
- Top Products table with predicted demand and trend direction.
- Market Trends summary (rising/declining demand, one-line market insight).
- Persistent "AI Recommendation" banner with a single, plain-language action.

### 6.3 Demand Prediction
- Headline metrics: AI Demand Forecast (units), Forecast Accuracy (%), Peak Demand Day, Total 7-day Forecast.
- Actual vs. Predicted Demand line chart with confidence shading for future days.
- Prediction Factors panel: seasonality, weather, market price, festivals/events, customer demand — each tagged High/Medium/Low impact.
- Top Predicted Products ranked list with per-product unit forecasts.
- 7-Day Demand Forecast bar chart (per day).
- Historical comparison (predicted vs. actual across last 4 weeks) to build user trust in the model.
- AI Forecast Insight card with a specific written explanation ("Demand expected to increase 18.6% next week; 15 May likely peak day").

### 6.4 Sales Analytics
- KPIs: Total Sales, Total Orders, Average Order Value, New Customers, Repeat Customer Rate.
- Sales Overview trend chart (this week vs. last week).
- Sales by Category (donut), Daily Sales Trend (bar), Sales by Payment Method (donut), Sales by Region (bar list).
- Top Selling Products table with week-over-week change.
- AI Sales Insight narrative summary.

### 6.5 Inventory Management
- KPIs: Total Inventory Value, Items in Stock, Low Stock Items, Out of Stock Items, Overstock Items.
- Inventory Overview donut (optimal/low/out-of-stock/overstock).
- Inventory Status table per product: current stock vs. ideal stock, status badge, "Reorder"/"Adjust"/"View" action.
- Stock Alerts panel with one-tap "Restock Now."
- Inventory Value Trend chart.
- Category breakdown donut.

### 6.6 Inventory & Production Planning
- KPIs: Recommended Production, Expected Demand (7 days), Target Stock Level, Projected Shortfall, Overstock Risk.
- Demand vs. Recommended Production chart.
- Inventory Planning Summary (current inventory, recommended production, expected demand, target stock, safety stock — default 10% of demand).
- Product-wise Production Plan table with per-product "Plan"/"Increase" action.
- Stock Level Guide donut + contextual planning tip.
- Top Actions panel — prioritized, product-specific recommendations with one-tap "Plan Now."

### 6.7 Market Trends
- KPIs: Market Demand Index, Price Trend (overall), Most Growing Category, Market Supply Index, Competition Level.
- Market Demand Index trend chart (last 4 weeks).
- Price Trend by Category table (avg price, WoW change, trend sparkline).
- Seasonal Demand Outlook table (next 3 months, per-month outlook + key insight — festival/monsoon aware).
- Top Trending Products list.
- Market Insights feed (plain-language, actionable).

### 6.8 Forecast Reports
- KPIs: Reports Generated, Downloads, Reports Shared, Total Views, Automated Reports (active schedules).
- Reports Overview chart (generated/downloaded/shared, last 7 days).
- Popular Report Types donut.
- All Reports table (name, type, period, generated date, format, status, actions: download/share/more).
- Scheduled Reports panel (weekly/monthly/custom recurring reports, toggle on/off).
- Quick Actions: create custom report, email, share, print, schedule.
- Report Insights narrative summary.

### 6.9 Alerts & Notifications
- KPIs: Total Alerts, High/Medium/Low Priority counts, Resolved Alerts.
- Recent Alerts feed (low stock, high demand forecast, weather alert, price increase, forecast updated) with priority tags.
- Alerts by Priority donut + Alert Summary trend (last 7 days, by priority).
- Alerts by Category breakdown (inventory, demand, market, weather, system).
- Recommended Actions panel with direct "Take Action"/"View Plan"/"View Tips" buttons.
- Notification Preferences (per-category toggle).

### 6.10 Settings
- Profile & Business Details (editable), team member management.
- Preferences: units, currency, language, date format, time zone.
- Notification Settings (per-category toggle, matches Alerts module).
- Data & Integrations: Weather Data Source (e.g., OpenWeather), Market Price Data (e.g., AgMarknet/state mandi APIs), Sales Data Import (CSV/Excel), optional Accounting Software connection.
- Account & Security: change password, 2FA, login activity, data export, account deletion.
- System Information: app version, last updated, database/backup status, data security notice.

### 6.11 Help & Support
- Searchable FAQ, categorized help topics, contact support (ticket/live chat/call/email), system status page.

## 7. AI / Forecasting Approach

**Core model:** Time-series demand forecasting per product/category, using a hybrid approach suited to sparse rural sales data:
- **Baseline:** Moving average / exponential smoothing (Holt-Winters) for early-stage businesses with limited history.
- **Primary model:** Facebook Prophet or SARIMA for seasonality + trend decomposition (handles festival/monsoon seasonality well with minimal tuning — good hackathon fit).
- **Stretch model:** Gradient-boosted trees (XGBoost/LightGBM) with engineered features once enough data exists, for higher accuracy.

**Input features:**
- Historical sales (date, product, quantity, price)
- Calendar effects (day of week, festival calendar, harvest season)
- Weather signals (rainfall, temperature — via weather API)
- Market price trend (mandi/wholesale price API or manually entered)
- Local events/promotions (manual flag)

**Outputs:**
- Per-product 7-day unit forecast with confidence level
- Category-level aggregated forecast
- Recommended production/reorder quantity = forecasted demand + safety stock − current inventory
- Plain-language recommendation text generated from the top 1–2 drivers (e.g., "Turmeric demand rising due to festival season — increase stock by 20%")

**Fallback for cold-start businesses (no history):** category-level benchmarks from similar businesses/region (anonymized, aggregated) until the business accumulates 4+ weeks of its own data.

## 8. Technical Requirements (Non-Functional)

- **Performance:** Dashboard loads in <2s on 3G/4G rural connectivity; charts must degrade gracefully on low bandwidth.
- **Accessibility:** Large tap targets, high-contrast UI, minimal text-per-screen, iconography-led navigation for lower digital literacy.
- **Localization:** UI copy structured for easy translation (Hindi + regional languages) — English-only acceptable for hackathon MVP, flagged as immediate roadmap item.
- **Data privacy:** Business sales data is private per account; only anonymized/aggregated data used for cold-start benchmarks or market trend indices.
- **Reliability:** Forecast recompute daily (batch) with manual "Refresh" option.
- **Scalability:** Architecture should support multi-tenant village enterprises across regions without per-business infrastructure.

## 9. Suggested Tech Stack (Hackathon-Feasible)

| Layer | Suggestion |
|---|---|
| Frontend | React + Tailwind CSS (matches existing high-fidelity mockups), Recharts/Chart.js for visualizations |
| Backend | Node.js (Express) or Python (FastAPI) |
| Database | PostgreSQL (relational: businesses, products, sales, inventory) |
| ML/Forecasting | Python: Prophet / statsmodels (SARIMA), scikit-learn |
| Auth | JWT + OTP via SMS gateway (e.g., MSG91/Twilio) |
| External APIs | OpenWeather (weather), AgMarknet / state mandi price APIs (market price) |
| Hosting | Vercel/Netlify (frontend), Render/Railway (backend), for hackathon demo speed |

## 10. Hackathon Build Plan (Suggested Milestones)

| Phase | Deliverable |
|---|---|
| Hour 0–4 | Finalize PRD/DESIGN (this doc), set up repo, DB schema, seed sample rural-business dataset |
| Hour 4–10 | Build auth + business onboarding, CSV sales import, base dashboard shell (matches mockups) |
| Hour 10–18 | Implement forecasting model (Prophet/SARIMA) on seed data, wire Demand Prediction + Inventory Planning screens |
| Hour 18–26 | Build Sales Analytics, Inventory Management, Market Trends screens with live/mock data |
| Hour 26–32 | Alerts engine (threshold-based), Forecast Reports (PDF export), Settings |
| Hour 32–38 | Polish UI to match mockups, mobile responsiveness pass, plain-language AI recommendation copy |
| Hour 38–42 | End-to-end testing, demo data curation, judge-facing narrative/pitch deck |
| Hour 42–48 | Buffer, bug fixes, rehearsal |

## 11. Risks & Assumptions

- **Assumption:** Village enterprises can access a smartphone with basic internet (2G/3G/4G) — no assumption of desktop access.
- **Risk:** Sparse/no historical sales data for new users → mitigated via cold-start category benchmarks.
- **Risk:** Market price/weather API rate limits or unavailability in some regions → mitigated with cached/mock fallback data for demo.
- **Risk:** Trust in "black box" AI recommendations → mitigated by always showing the *why* (Prediction Factors, AI Insight narrative) alongside every number.

## 12. Expected Outcomes (Recap per Problem Statement)

- Accurate demand forecasting — delivered via Demand Prediction module (7-day, product + category level).
- Reduced inventory losses — delivered via Inventory Management + Planning (status flags, recommended production, safety stock).
- Improved production planning — delivered via Inventory Planning's recommended production numbers.
- Increased business profitability — delivered via Sales Analytics + AI Recommendation narratives quantifying upside.
- Better market responsiveness — delivered via Market Trends + Alerts & Notifications.
