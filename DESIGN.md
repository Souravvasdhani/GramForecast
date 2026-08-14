# Design Document
## RuralDemand AI — System & UX Design

**Companion to:** PRD.md
**Version:** 1.0 (Hackathon Submission)

---

## 1. Design Philosophy

The product design (see attached mockups) already establishes a clear visual identity — this document formalizes it so engineering and design stay in sync while building.

- **Warm, trustworthy, rural-rooted:** hero illustrations of village life (farmer with smartphone, tractors, fields) paired with clean SaaS-grade dashboard UI — signals "this is for you," not a generic enterprise tool.
- **Green identity:** primary brand color is forest/leaf green, reinforcing agriculture, growth, and trust.
- **Data-dense but not overwhelming:** every screen follows the same rhythm — KPI cards → primary trend chart → supporting breakdowns → AI narrative banner. Once a user learns one screen, every other screen is predictable.
- **AI is always explained, never a black box:** every forecast/recommendation is paired with a plain-language "AI Recommendation" or "AI Insight" strip explaining *why*, in one sentence.

## 2. Information Architecture

```
RuralDemand AI
├── Auth
│   ├── Login
│   ├── Sign Up (business onboarding)
│   └── Forgot Password (3-step: identity → OTP → reset)
└── App (left sidebar nav, persistent)
    ├── Dashboard                  (home / overview)
    ├── Demand Prediction          (AI forecasting detail)
    ├── Sales Analytics            (historical performance)
    ├── Inventory Management       (current stock state)
    ├── Inventory Planning         (forward-looking production/stock plan)
    ├── Market Trends              (external market signals)
    ├── Forecast Reports           (generate/export/schedule)
    ├── Alerts & Notifications     (system-generated action feed)
    ├── Settings                   (profile, preferences, integrations, security)
    └── Help & Support             (FAQ, contact, docs)
```

## 3. Layout System

Every authenticated screen shares one shell:

- **Left sidebar (fixed, dark green `#0F3D2E`–`#14532D` gradient):** logo/wordmark ("RuralDemand AI" + tagline "Smarter Forecasts. Stronger Rural Businesses."), nav items with icon + label, active item highlighted with a lighter green pill, and a bottom "tip card" (illustration + contextual encouragement copy that changes per module).
- **Top bar:** hamburger/collapse toggle, page title + one-line description, date-range picker, notification bell (with unread badge), user avatar + name + business type, dropdown chevron.
- **Content area:** responsive grid —
  1. Row of 3–5 KPI stat cards (icon, label, headline number, trend delta vs. prior period)
  2. Primary chart (large, left ~60%) + a right-side detail/summary panel (~40%)
  3. Row of 2–3 secondary widgets (tables, donuts, lists)
  4. Full-width "AI Recommendation" / "AI Insight" banner at the bottom, with a small robot/lightbulb icon and rural illustration accent

This same 4-zone rhythm repeats across Dashboard, Demand Prediction, Sales Analytics, Inventory Management, Inventory Planning, Market Trends, Forecast Reports, and Alerts — which is what makes the product learnable in one sitting.

## 4. Visual Design System

### 4.1 Color Palette
| Token | Hex (approx.) | Usage |
|---|---|---|
| Primary Green (Dark) | `#14532D` / `#0F3D2E` | Sidebar background, primary buttons |
| Primary Green (Mid) | `#16A34A` / `#1E8E3E` | Active states, positive trend, links |
| Accent Green (Light) | `#DCFCE7` | Card icon backgrounds, subtle highlights |
| Success | `#22C55E` | Optimal status, positive change |
| Warning | `#F59E0B` | Low stock, medium priority |
| Danger | `#EF4444` | Out of stock, high priority, negative change |
| Info Blue | `#3B82F6` | Secondary data series, neutral KPIs |
| Purple (secondary accent) | `#8B5CF6` | Tertiary chart series, category tags |
| Neutral text | `#111827` / `#6B7280` | Headings / body-secondary |
| Surface | `#FFFFFF` on `#F9FAFB` background | Cards on page background |

### 4.2 Typography
- Sans-serif, system UI stack (e.g., Inter/Helvetica-equivalent) for legibility at small sizes on low-end phones.
- Headline numbers (KPI cards): bold, large (24–28px).
- Section headers: semibold, 16–18px.
- Body/table text: regular, 13–14px, generous line height for readability by less digitally-fluent users.

### 4.3 Components
- **Stat card:** icon in tinted circle (top-left), label, big number, small trend line ("↑ 8.6% vs last week") in green/red.
- **Donut chart:** center label with total + legend list showing category, value, and %.
- **Status badge (pill):** color-coded — green "Optimal", orange "Low Stock", red "Out of Stock", purple "Overstock", blue "Active".
- **Action button (inline, table row):** small pill button (e.g., "Reorder", "Plan", "Take Action", "View") — one tap from insight to action, no extra navigation.
- **AI banner:** light green background strip, robot/bulb icon, bold one-line takeaway + supporting sentence, always the last element on a page.
- **Table:** clean row separators, no heavy borders, right-aligned numeric columns, colored trend arrows.

### 4.4 Iconography
Outline-style icons (home, chart, box, bell, gear, question-mark) — consistent stroke width, used both in the sidebar and inside stat cards, always paired with a text label (never icon-only, to support lower literacy).

## 5. Screen-by-Screen Design Notes

### 5.1 Auth Screens (Login / Sign Up / Forgot Password)
- Split layout: left panel = full-bleed rural photography/illustration + value props ("AI-Powered Forecasts", "Smart Inventory Planning", "Data-Driven Growth") + a "Secure & Trusted" trust badge; right panel = the form on a white card.
- Sign-up captures: Business Name, Owner Name, Mobile (+91 prefixed), Email, Password (+confirm), Business Category (dropdown), Business Location (with geolocation "Use My Location" shortcut), ToS/Privacy checkbox. Social sign-up (Google/Facebook) offered as a secondary path.
- Forgot Password is a 3-step stepper (Verify Identity → Verify OTP → Reset Password) with clear step indicators — reduces drop-off for less tech-confident users.

### 5.2 Dashboard
Single-glance business health screen. KPI row = Predicted Demand, Total Sales, Inventory in Hand, Stock-Out Risk. Center-left = Demand Prediction Overview chart (actual vs predicted). Right column = Top Products table with trend arrows. Bottom row = Inventory Status donut, Demand Forecast bar chart, Market Trends mini-feed. Closing AI Recommendation banner.

### 5.3 Demand Prediction
Deepest AI-facing screen. KPI row leads with model-trust metrics (Forecast Accuracy 92.4%, Peak Demand Day) before raw numbers — deliberately builds confidence in the AI before asking the user to act on it. Actual vs Predicted chart uses a dashed line + shaded confidence band for the future window. Right-side "Prediction Factors" panel is the key trust-building element: it names *why* (seasonality, weather, market price, festivals, customer demand) with impact levels, not just *what*.

### 5.4 Sales Analytics
Retrospective companion to Demand Prediction — same visual grammar (KPI row, trend chart, donuts) but framed entirely in "what happened" language (Total Sales, Total Orders, Repeat Customer Rate) rather than predictions. Sales by Region and Payment Method give the owner operational, not just financial, visibility.

### 5.5 Inventory Management
Present-state stock control. Status-driven design: every product row gets one of 4 colored states (Optimal/Low Stock/Out of Stock/Overstock), and every non-optimal row gets an inline action button. Stock Alerts panel duplicates the most urgent items with a one-tap "Restock Now" — deliberate redundancy so nothing urgent is buried in a table.

### 5.6 Inventory Planning
Forward-looking counterpart to Inventory Management. Core equation surfaced visually: Expected Demand vs. Recommended Production, with Target Stock Level and Safety Stock (defaulted to 10% of demand) always visible so the user understands the buffer logic, not just the final number. "Top Actions" panel ranks the 3–4 highest-impact moves for the week.

### 5.7 Market Trends
External-signal screen — deliberately visually distinct data (Market Demand Index, Supply Index, Competition Level) so users learn to separate "what my business is doing" from "what the market is doing." Seasonal Demand Outlook table (3-month forward view) is the anchor widget — directly answers "should I prepare for a big month."

### 5.8 Forecast Reports
Utility screen for sharing insight beyond the app (with lenders, family, cooperative officers). Emphasis on one-tap export/share/print/schedule actions and a visible library (All Reports table) so past reports are never lost.

### 5.9 Alerts & Notifications
Action-first design. Every alert card pairs directly with a Recommended Action (Take Action / View Plan / View Tips) — alerts are never dead-end notifications. Alerts by Priority + Alerts by Category give the user a triage view before they read the full feed.

### 5.10 Settings
Grouped into 6 clear cards: Profile & Business, Preferences, Notifications, Data & Integrations (Weather API, Market Price API, Sales CSV import, optional accounting software), Account & Security, Help. System Information card at the bottom builds trust (data security, backup status) — important for a first-time digital user handing over business data.

### 5.11 Help & Support
Self-serve first (search + FAQ + categorized help topics), human support second (ticket/live chat/call/email) — reduces support load while keeping a safety net visible.

## 6. System Architecture

```
┌─────────────────────┐      ┌──────────────────────┐      ┌───────────────────────┐
│   Client (Web/PWA)   │◄────►│   Backend API (REST)  │◄────►│      PostgreSQL DB     │
│  React + Tailwind    │      │  Node.js/FastAPI      │      │  businesses, products, │
│  Recharts/Chart.js   │      │  Auth (JWT + OTP)      │      │  sales, inventory,     │
└─────────────────────┘      │  Report generation     │      │  forecasts, alerts     │
                              └──────────┬─────────────┘      └───────────────────────┘
                                         │
                     ┌───────────────────┼────────────────────┐
                     ▼                   ▼                    ▼
           ┌─────────────────┐ ┌──────────────────┐ ┌──────────────────────┐
           │ Forecasting      │ │ External APIs     │ │ Alerting Engine       │
           │ Service (Python) │ │ - Weather API      │ │ (threshold rules on   │
           │ Prophet/SARIMA   │ │ - Market Price API │ │  stock/demand/price)  │
           └─────────────────┘ └──────────────────┘ └──────────────────────┘
```

- **Client** renders the dashboard shell described in Section 3, calling REST endpoints per module.
- **Backend API** handles auth, CRUD for business/product/sales/inventory data, and orchestrates calls to the Forecasting Service.
- **Forecasting Service** runs as a separate Python service (or scheduled job) — trains/updates per-business, per-product models nightly, writes forecast results back to the DB for fast read on the dashboard.
- **Alerting Engine** runs threshold checks (e.g., stock < reorder point, forecasted demand change > X%, price change > Y%) after each forecast/data update and writes to the alerts table.

## 7. Data Model (Core Entities)

```
businesses (id, name, owner_name, category, location, business_since, ...)
users (id, business_id, name, role, mobile, email, ...)
products (id, business_id, name, category, unit, current_stock, ideal_stock, target_stock, safety_stock)
sales (id, business_id, product_id, date, quantity, price, payment_method, region)
forecasts (id, product_id, forecast_date, predicted_demand, confidence_level, model_version)
inventory_snapshots (id, product_id, date, stock_level, status)
market_signals (id, region, category, date, price, demand_index, supply_index, source)
alerts (id, business_id, type, priority, message, product_id?, created_at, resolved_at?)
reports (id, business_id, type, period, generated_at, format, url)
```

## 8. Key API Endpoints (Illustrative)

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/auth/signup` | Create business + owner account |
| POST | `/auth/login` | Authenticate, return JWT |
| POST | `/auth/otp/verify` | OTP verification for password reset |
| GET | `/dashboard/summary` | KPI + chart data for home screen |
| GET | `/forecast/{productId}` | Demand prediction detail for a product |
| POST | `/sales/import` | CSV/Excel sales upload |
| GET | `/inventory` | Current inventory status list |
| GET | `/inventory/planning` | Recommended production/target stock |
| GET | `/market/trends` | Market demand index, price trends |
| GET | `/reports` / `POST /reports/generate` | List/generate forecast reports |
| GET | `/alerts` | Alert feed with priority/category filters |
| PATCH | `/settings/preferences` | Update units/currency/language/etc. |

## 9. Accessibility & Inclusive Design Notes

- Minimum tap target 44x44px for all buttons/actions (rural users often on budget touchscreens).
- Every icon paired with a text label — no icon-only navigation.
- Color is never the *only* signal — status badges always include text ("Low Stock", not just orange).
- AI recommendation copy is written at a plain, conversational reading level — no jargon like "MAPE" or "confidence interval" surfaced to the end user (those stay in the Prediction Factors detail, softened as "High/Medium/Low impact").
- Design supports future Hindi/regional-language localization: all UI copy kept short and componentized rather than embedded in images.

## 10. Design-to-Build Mapping

Since high-fidelity mockups already exist for every core screen, the hackathon build should treat them as the source of truth for spacing, color, and component shape — engineering effort goes into wiring real data (or realistic seed data) into this existing visual system rather than designing from scratch.
