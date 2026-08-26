/**
 * Operational screens for the remaining app modules.
 */
import { useEffect, useState } from "react";
import { useTutorial } from "../context/TutorialContext";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bell,
  CalendarRange,
  CheckCircle2,
  ClipboardList,
  IndianRupee,
  Package,
  Settings,
  ShieldCheck,
  TrendingUp,
  Warehouse,
} from "lucide-react";

import AppShell from "../components/layout/AppShell";
import KpiCard from "../components/ui/KpiCard";
import StatusBadge from "../components/ui/StatusBadge";
import AddSaleModal from "../components/sales/AddSaleModal";
import ForecastTrustPanel from "../components/charts/ForecastTrustPanel";
import {
  fetchAlerts,
  fetchAllForecasts,
  fetchProductForecast,
  fetchInventory,
  fetchInventoryPlanning,
  fetchMarketTrends,
  fetchSales,
  fetchSalesAnalytics,
  fetchSettings,
  updateSettings,
} from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";

const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const compactNumber = (value) => {
  const n = Number(value || 0);
  if (n >= 100000) return `${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(Math.round(n));
};

const formatDate = (dateString) => {
  if (!dateString) return "—";
  try {
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateString;
  }
};

const safeArray = (value) => (Array.isArray(value) ? value : []);

// Map DB payment_method values to kirana-friendly display labels + colours
const PAYMENT_DISPLAY = {
  cash:   { label: "Cash",    cls: "bg-green-100  text-green-700"  },
  upi:    { label: "UPI",     cls: "bg-blue-100   text-blue-700"   },
  credit: { label: "Udhaar",  cls: "bg-amber-100  text-amber-700"  },
  barter: { label: "Barter",  cls: "bg-purple-100 text-purple-700" },
  other:  { label: "Other",   cls: "bg-gray-100   text-gray-600"   },
};
function PaymentBadge({ method }) {
  const cfg = PAYMENT_DISPLAY[method] ?? PAYMENT_DISPLAY.other;
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

function SalesAnalytics() {
  const [analytics, setAnalytics] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaleOpen, setIsSaleOpen] = useState(false);

  const refreshSales = () => {
    setLoading(true);
    Promise.all([fetchSalesAnalytics(), fetchSales(30)])
      .then(([salesAnalytics, sales]) => {
        setAnalytics(salesAnalytics);
        setTransactions(safeArray(sales));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { refreshSales(); }, []);

  const kpis = analytics?.kpis ?? {};
  const dailyTrend = safeArray(analytics?.daily_trend);
  const byCategory = safeArray(analytics?.by_category);
  const profit = analytics?.profit ?? {};
  const bestMargin = analytics?.best_margin;
  const deadStock = safeArray(analytics?.dead_stock);
  const maxRevenue = Math.max(...dailyTrend.map((item) => Number(item.revenue || 0)), 1);

  // Dynamic date-range label for the transactions header
  const salesRangeLabel = (() => {
    if (transactions.length === 0) return "Last 30 days";
    const dates = transactions.map((r) => r.sale_date).filter(Boolean).sort();
    const from = new Date(dates[0]).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
    const to   = new Date(dates[dates.length - 1]).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    return `${from} – ${to}`;
  })();

  return (
    <AppShell
      title="Sales Analytics"
      description="Historical sales performance, category mix, and transaction trends"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <KpiCard
          icon={IndianRupee}
          label="Total Sales (7d)"
          value={loading ? "—" : money(kpis.total_sales_7d)}
          trendPct={loading ? undefined : Number(kpis.sales_delta_pct || 0)}
          iconBg="bg-green-50"
          iconColor="text-brand-mid"
          loading={loading}
        />
        <KpiCard
          icon={BarChart3}
          label="Sales 30d"
          value={loading ? "—" : money(kpis.total_sales_30d)}
          trendLabel="rolling month"
          iconBg="bg-blue-50"
          iconColor="text-blue-500"
          loading={loading}
        />
        <KpiCard
          icon={CalendarRange}
          label="Orders (7d)"
          value={loading ? "—" : compactNumber(kpis.total_orders_7d)}
          trendLabel="store orders"
          iconBg="bg-purple-50"
          iconColor="text-purple-500"
          loading={loading}
        />
        <KpiCard
          icon={TrendingUp}
          label="Avg Order Value"
          value={loading ? "—" : money(kpis.avg_order_value)}
          trendLabel="per invoice"
          iconBg="bg-amber-50"
          iconColor="text-warning"
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <KpiCard
          icon={IndianRupee}
          label={t("Profit (7d)")}
          value={loading ? "—" : money(profit.total_7d)}
          trendLabel="revenue minus cost"
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          loading={loading}
        />
        <KpiCard
          icon={TrendingUp}
          label={t("Profit (30d)")}
          value={loading ? "—" : money(profit.total_30d)}
          trendLabel={loading ? "" : `${profit.margin_pct_30d || 0}% margin`}
          iconBg="bg-green-50"
          iconColor="text-brand-mid"
          loading={loading}
        />
        <KpiCard
          icon={BarChart3}
          label={t("Best-margin product")}
          value={loading ? "—" : (bestMargin?.product_name || "—")}
          trendLabel={bestMargin ? `${bestMargin.margin_pct}% margin` : "no sales yet"}
          iconBg="bg-blue-50"
          iconColor="text-blue-500"
          loading={loading}
        />
        <KpiCard
          icon={Warehouse}
          label={t("Capital stuck in slow movers")}
          value={loading ? "—" : money(analytics?.capital_stuck)}
          trendLabel="at-cost stock value"
          iconBg="bg-amber-50"
          iconColor="text-warning"
          loading={loading}
        />
      </div>

      <div className="content-card mb-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-gray-800 text-sm">{t("Dead stock / spoilage risk")}</h3>
            <p className="text-gray-400 text-xs mt-1">{t("High stock value with the lowest recent sales velocity")}</p>
          </div>
          <AlertTriangle className="w-5 h-5 text-warning" />
        </div>
        {loading ? (
          <div className="skeleton h-16 rounded-lg" />
        ) : deadStock.length > 0 ? (
          <div className="space-y-3">
            {deadStock.map((item) => (
              <div key={item.product_id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg bg-amber-50/70 px-3 py-3">
                <div>
                  <div className="text-sm font-semibold text-gray-800">{item.product_name}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {t("Sales velocity")}: {Number(item.daily_velocity || 0).toFixed(1)} {item.unit || "units"}/day
                    {" · "}{t("Stock value")}: {money(item.stock_value)}
                    {item.days_since_last_sale !== null && ` · ${item.days_since_last_sale}d since last sale`}
                  </div>
                </div>
                <span className="text-xs font-semibold text-amber-700">{t(item.suggestion)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">No dead-stock risk detected.</p>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-5">
        <div className="content-card xl:col-span-2">
          <h3 className="font-semibold text-gray-800 text-sm mb-4">Daily Revenue Trend</h3>
          <div className="flex items-end gap-2 h-44">
            {dailyTrend.map((item, index) => (
              <div key={`${item.date}-${index}`} className="flex-1 flex flex-col items-center gap-2">
                <div
                  className="w-full rounded-t-xl bg-brand-mid/80"
                  style={{ height: `${Math.max(18, (Number(item.revenue || 0) / maxRevenue) * 100)}%` }}
                />
                <span className="text-[10px] text-gray-400 uppercase">
                  {new Date(item.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="content-card">
          <h3 className="font-semibold text-gray-800 text-sm mb-4">Revenue by Category</h3>
          <div className="space-y-4">
            {byCategory.map((item) => {
              const total = byCategory.reduce((sum, row) => sum + Number(row.revenue || 0), 0) || 1;
              const width = (Number(item.revenue || 0) / total) * 100;
              return (
                <div key={item.category}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-700">{item.category}</span>
                    <span className="text-xs font-semibold text-gray-800">{money(item.revenue)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100">
                    <div className="h-2 rounded-full bg-brand-mid" style={{ width: `${width}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="content-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800 text-sm">Recent Transactions</h3>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-gray-400 sm:inline">{salesRangeLabel}</span>
            <button type="button" onClick={() => setIsSaleOpen(true)} className="btn-action">+ Add Sale / बिक्री जोड़ें</button>
          </div>
        </div>
        <div className="overflow-x-auto w-full">
          <table className="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Date</th>
                <th className="text-right">Qty</th>
                <th className="text-right">Amount</th>
                <th>Payment</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((row) => (
                <tr key={row.id}>
                  <td className="font-medium text-gray-800">{row.product_name}</td>
                  <td>{formatDate(row.sale_date)}</td>
                  <td className="numeric">{Number(row.quantity || 0).toFixed(0)}</td>
                  <td className="numeric font-semibold text-gray-800">{money(row.total_amount)}</td>
                  <td><PaymentBadge method={row.payment_method} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <AddSaleModal isOpen={isSaleOpen} onClose={() => setIsSaleOpen(false)} onSuccess={refreshSales} />
    </AppShell>
  );
}

function InventoryPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInventory()
      .then((payload) => setItems(safeArray(payload.items)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const totalValue = items.reduce((sum, item) => sum + Number(item.stock_value || 0), 0);
  const lowStock = items.filter((item) => item.status === "low_stock").length;
  const outOfStock = items.filter((item) => item.status === "out_of_stock").length;

  return (
    <AppShell
      title="Inventory Management"
      description="Current stock health, coverage, and replenishment status"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <KpiCard
          icon={Warehouse}
          label="Inventory Value"
          value={loading ? "—" : money(totalValue)}
          iconBg="bg-purple-50"
          iconColor="text-purple-500"
          loading={loading}
        />
        <KpiCard
          icon={Package}
          label="Total SKUs"
          value={loading ? "—" : String(items.length)}
          trendLabel="active products"
          iconBg="bg-green-50"
          iconColor="text-brand-mid"
          loading={loading}
        />
        <KpiCard
          icon={AlertTriangle}
          label="Low Stock"
          value={loading ? "—" : String(lowStock)}
          trendLabel="watch closely"
          iconBg="bg-amber-50"
          iconColor="text-warning"
          loading={loading}
        />
        <KpiCard
          icon={ShieldCheck}
          label="Out of Stock"
          value={loading ? "—" : String(outOfStock)}
          trendLabel="urgent action"
          iconBg="bg-red-50"
          iconColor="text-danger"
          loading={loading}
        />
      </div>

      <div className="content-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800 text-sm">Stock Overview</h3>
          <span className="text-xs text-gray-400">Coverage by product</span>
        </div>
        <div className="overflow-x-auto w-full">
          <table className="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th className="text-right">Current</th>
                <th className="text-right">Ideal</th>
                <th className="text-right">Safety</th>
                <th className="text-right">Reorder</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="font-medium text-gray-800">{item.name}</td>
                  <td>{item.category}</td>
                  <td className="numeric">{Number(item.current_stock || 0).toFixed(0)} {item.unit}</td>
                  <td className="numeric">{Number(item.ideal_stock || 0).toFixed(0)} {item.unit}</td>
                  <td className="numeric">{Number(item.safety_stock || 0).toFixed(0)}</td>
                  <td className="numeric">{Number(item.reorder_qty || 0).toFixed(0)}</td>
                  <td><StatusBadge status={item.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}

function PlanningPage() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInventoryPlanning()
      .then((payload) => setPlans(safeArray(payload.plans)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const totalProduction = plans.reduce((sum, item) => sum + Number(item.recommended_production || 0), 0);
  const totalDemand = plans.reduce((sum, item) => sum + Number(item.expected_demand_7d || 0), 0);

  return (
    <AppShell
      title="Inventory Planning"
      description="Recommended production and reorder quantities for the next 7 days"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-5">
        <KpiCard
          icon={ClipboardList}
          label="Recommended Production"
          value={loading ? "—" : `${Number(totalProduction).toFixed(0)}`}
          unit="units"
          iconBg="bg-green-50"
          iconColor="text-brand-mid"
          loading={loading}
        />
        <KpiCard
          icon={TrendingUp}
          label="Expected Demand"
          value={loading ? "—" : `${Number(totalDemand).toFixed(0)}`}
          unit="units"
          iconBg="bg-blue-50"
          iconColor="text-blue-500"
          loading={loading}
        />
        <KpiCard
          icon={AlertTriangle}
          label="Shortfall SKUs"
          value={loading ? "—" : String(plans.filter((item) => Number(item.projected_shortfall || 0) > 0).length)}
          trendLabel="need stock-up"
          iconBg="bg-red-50"
          iconColor="text-danger"
          loading={loading}
        />
      </div>

      <div className="content-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800 text-sm">Production Plan</h3>
          <span className="text-xs text-gray-400">Based on 7-day demand + safety stock</span>
        </div>
        <div className="overflow-x-auto w-full">
          <table className="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th className="text-right">Current</th>
                <th className="text-right">Demand</th>
                <th className="text-right">Target</th>
                <th className="text-right">Production</th>
                <th className="text-right">Shortfall</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((plan) => (
                <tr key={plan.product_id}>
                  <td className="font-medium text-gray-800">{plan.product_name}</td>
                  <td className="numeric">{Number(plan.current_inventory || 0).toFixed(0)}</td>
                  <td className="numeric">{Number(plan.expected_demand_7d || 0).toFixed(0)}</td>
                  <td className="numeric">{Number(plan.target_stock || 0).toFixed(0)}</td>
                  <td className="numeric font-semibold text-brand-mid">{Number(plan.recommended_production || 0).toFixed(0)}</td>
                  <td className="numeric">{Number(plan.projected_shortfall || 0).toFixed(0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}

function MarketTrends() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMarketTrends()
      .then((payload) => setData(payload))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const categoryTrends = safeArray(data?.category_trends);
  const recentSignals = safeArray(data?.recent_signals);

  return (
    <AppShell
      title="Market Trends"
      description="External demand and supply signals impacting pricing and stocking"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <KpiCard
          icon={TrendingUp}
          label="Market Demand Index"
          value={loading ? "—" : `${Number(data?.market_demand_index || 0).toFixed(0)}`}
          trendLabel="across categories"
          iconBg="bg-green-50"
          iconColor="text-brand-mid"
          loading={loading}
        />
        <KpiCard
          icon={Package}
          label="Supply Index"
          value={loading ? "—" : `${Number(data?.supply_index || 0).toFixed(0)}`}
          trendLabel="coverage"
          iconBg="bg-blue-50"
          iconColor="text-blue-500"
          loading={loading}
        />
        <KpiCard
          icon={IndianRupee}
          label="Avg Price"
          value={loading ? "—" : `₹${Number(categoryTrends.reduce((sum, row) => sum + Number(row.avg_price || 0), 0) / Math.max(categoryTrends.length, 1)).toFixed(0)}`}
          trendLabel="per category"
          iconBg="bg-purple-50"
          iconColor="text-purple-500"
          loading={loading}
        />
        <KpiCard
          icon={CalendarRange}
          label="Signals Tracked"
          value={loading ? "—" : String(recentSignals.length)}
          trendLabel="last 28 days"
          iconBg="bg-amber-50"
          iconColor="text-warning"
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-5">
        <div className="content-card">
          <h3 className="font-semibold text-gray-800 text-sm mb-4">Category Trend Snapshot</h3>
          <div className="space-y-4">
            {categoryTrends.map((item) => (
              <div key={item.category}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-gray-700">{item.category}</span>
                  <span className="text-xs text-gray-500">Demand {Number(item.demand_index || 0).toFixed(0)}</span>
                </div>
                <div className="h-2 rounded-full bg-gray-100">
                  <div className="h-2 rounded-full bg-brand-mid" style={{ width: `${Math.min(100, Number(item.demand_index || 0))}%` }} />
                </div>
                <div className="mt-1 text-[10px] text-gray-400">Avg price: ₹{Number(item.avg_price || 0).toFixed(0)}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="content-card">
          <h3 className="font-semibold text-gray-800 text-sm mb-4">Recent Market Signals</h3>
          <div className="space-y-3">
            {recentSignals.slice(0, 6).map((signal, index) => (
              <div key={`${signal.date}-${index}`} className="flex items-center justify-between border-b border-gray-50 pb-2 last:border-0 last:pb-0">
                <div>
                  <p className="text-xs font-medium text-gray-800">{signal.category}</p>
                  <p className="text-[10px] text-gray-400">{formatDate(signal.date)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-gray-800">Demand {Number(signal.demand_index || 0).toFixed(0)}</p>
                  <p className="text-[10px] text-gray-400">₹{Number(signal.price || 0).toFixed(0)}/unit</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function ForecastReports() {
  const { language } = useLanguage();
  const [fcData,   setFcData]   = useState(null);
  const [trustData, setTrustData] = useState(null);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    fetchAllForecasts()
      .then((d) => {
        setFcData(d);
        const firstProduct = d.products?.[0];
        if (firstProduct) return fetchProductForecast(firstProduct.product_id, language).then(setTrustData);
        return null;
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [language]);

  // Derive KPIs from the same /forecast/business/all response that
  // Demand Prediction uses — guarantees identical numbers across screens.
  const products      = fcData?.products ?? [];
  const overallAcc    = fcData?.overall_accuracy_pct ?? null;
  const total7d       = products.reduce((s, p) => s + (p.total_7d ?? 0), 0);
  const reportCount   = products.length;   // one report card per product

  const reportCards = [
    { title: "7-Day Demand Summary",       status: "Generated", tone: "optimal" },
    { title: "Inventory Coverage Report",  status: "Ready",     tone: "medium"  },
    { title: "Sales Performance Snapshot", status: "Queued",    tone: "low"     },
  ];

  return (
    <AppShell
      title="Forecast Reports"
      description="Generated summaries for operations, planning, and executive review"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <KpiCard
          icon={BarChart3}
          label="Forecast Confidence"
          value={loading ? "—" : overallAcc !== null ? `${overallAcc.toFixed(1)}%` : "—"}
          iconBg="bg-purple-50"
          iconColor="text-purple-500"
          loading={loading}
        />
        <KpiCard
          icon={TrendingUp}
          label="7-Day Demand"
          value={loading ? "—" : Math.round(total7d).toLocaleString("en-IN")}
          unit="units"
          iconBg="bg-green-50"
          iconColor="text-brand-mid"
          loading={loading}
        />
        <KpiCard
          icon={ClipboardList}
          label="Products Forecasted"
          value={loading ? "—" : String(reportCount)}
          iconBg="bg-blue-50"
          iconColor="text-blue-500"
          loading={loading}
        />
        <KpiCard
          icon={CalendarRange}
          label="Next Run"
          value="Tomorrow"
          trendLabel="8:00 AM"
          iconBg="bg-amber-50"
          iconColor="text-warning"
        />
      </div>

      <div className="mb-5">
        <ForecastTrustPanel forecastData={trustData} loading={loading} compact />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {reportCards.map((report) => (
          <div key={report.title} className="content-card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800 text-sm">{report.title}</h3>
              <StatusBadge status={report.tone} />
            </div>
            <p className="text-gray-500 text-xs leading-relaxed mb-4">
              Summary includes demand drivers, stock coverage, and suggested actions for the next operational cycle.
            </p>
            <button className="btn-action w-full justify-center">
              Open report <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </AppShell>
  );
}

function AlertsPage() {
  const { language, t } = useLanguage();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAlerts(language)
      .then((payload) => setItems(safeArray(payload)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [language]);

  const openAlerts   = items.filter((item) => !item.resolved_at).length;
  const highPriority = items.filter((item) => item.priority === "high").length;
  // SLA Risk: derived from open high-priority alert count — not hardcoded
  const slaRisk = highPriority >= 3 ? "High" : highPriority >= 1 ? "Medium" : "Low";

  return (
    <AppShell
      title={t("Alerts & Notifications")}
      description="Operational issues, stock risks, and recommended follow-up actions"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <KpiCard icon={Bell} label={t("Open Alerts")} value={loading ? "—" : String(openAlerts)} iconBg="bg-red-50" iconColor="text-danger" loading={loading} />
        <KpiCard icon={AlertTriangle} label={t("High Priority")} value={loading ? "—" : String(highPriority)} iconBg="bg-amber-50" iconColor="text-warning" loading={loading} />
        <KpiCard icon={CheckCircle2} label={t("Resolved")} value={loading ? "—" : String(items.length - openAlerts)} iconBg="bg-green-50" iconColor="text-brand-mid" loading={loading} />
        <KpiCard icon={ShieldCheck} label={t("Stock Risk")} value={loading ? "—" : slaRisk} iconBg="bg-blue-50" iconColor="text-blue-500" loading={loading} />
      </div>

      <div className="content-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800 text-sm">{t("Alert Feed")}</h3>
          <button className="btn-outline">{t("Mark all read")}</button>
        </div>
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border border-gray-100 rounded-xl p-3 bg-gray-50/50">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <StatusBadge status={item.priority === "high" ? "high" : "medium"} />
                  <span className="text-xs font-semibold text-gray-700 uppercase">{item.type}</span>
                </div>
                <p className="text-sm text-gray-700">{item.message}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-400">{formatDate(item.created_at)}</span>
                <button className="btn-action">{t("Acknowledge")}</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}

function SettingsPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [form, setForm] = useState({ business_name: "", mobile: "", location: "", preferences: {} });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    fetchSettings()
      .then((settings) => setForm(settings))
      .catch(() => setToast({ type: "error", message: "Settings could not be loaded." }))
      .finally(() => setLoading(false));
  }, []);

  const updateField = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const updatePreference = (name) => setForm((current) => ({ ...current, preferences: { ...current.preferences, [name]: !current.preferences[name] } }));
  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setToast(null);
    try {
      const saved = await updateSettings(form);
      setForm(saved);
      setToast({ type: "success", message: "Settings saved successfully." });
    } catch (requestError) {
      setToast({ type: "error", message: requestError.response?.data?.detail || "Settings could not be saved." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell
      title="Settings"
      description="Store preferences, notifications, and forecasting automation"
    >
      {toast && <div className={`mb-4 rounded-xl border px-4 py-3 text-sm ${toast.type === "success" ? "border-green-200 bg-green-50 text-green-700" : "border-red-200 bg-red-50 text-red-700"}`} role="status">{toast.message}</div>}
      <form onSubmit={save} className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="content-card">
          <h3 className="font-semibold text-gray-800 text-sm mb-4">Business Profile</h3>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Business name</label>
              <input name="business_name" value={form.business_name || user?.business_name || ""} onChange={updateField} disabled={loading || saving} required className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Contact number</label>
              <input name="mobile" value={form.mobile || user?.mobile || ""} onChange={updateField} disabled={loading || saving} required inputMode="numeric" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Operating region</label>
              <input name="location" value={form.location || user?.location || ""} onChange={updateField} disabled={loading || saving} required className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />
            </div>
          </div>
        </div>

        <div className="content-card">
          <h3 className="font-semibold text-gray-800 text-sm mb-4">Preferences</h3>
          <div className="space-y-3">
            {[ ["daily_ai_forecast", "Daily AI forecast summary"], ["low_stock_alerts", "Low-stock alert notifications"], ["weekly_report_emails", "Weekly demand report emails"], ["auto_reorder_suggestions", "Auto-generated reorder suggestions"]].map(([name, item]) => (
              <label key={item} className="flex items-center justify-between gap-3 text-sm text-gray-700">
                <span>{item}</span>
                <input type="checkbox" checked={form.preferences[name] ?? true} onChange={() => updatePreference(name)} disabled={loading || saving} className="h-4 w-4 accent-brand-mid" />
              </label>
            ))}
          </div>
        </div>
        <button type="submit" disabled={loading || saving} className="btn-action xl:col-span-2 justify-center disabled:opacity-60">{saving ? "Saving..." : "Save Settings"}</button>
      </form>
    </AppShell>
  );
}

function HelpPage() {
  const topics = [
    { title: "Forecasting basics", detail: "Learn how demand, seasonal spikes, and safety stock affect recommendations." },
    { title: "Inventory health", detail: "Understand optimal, low-stock, and out-of-stock categories before placing orders." },
    { title: "Alerts workflow", detail: "Acknowledge alerts and resolve high-priority issues from the alert feed." },
  ];

  return (
    <AppShell title="Help & Support" description="Guides, FAQs, and support details for store operations">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {topics.map((topic) => (
          <div key={topic.title} className="content-card">
            <h3 className="font-semibold text-gray-800 text-sm mb-2">{topic.title}</h3>
            <p className="text-gray-500 text-xs leading-relaxed">{topic.detail}</p>
          </div>
        ))}
      </div>

      <div className="content-card mt-4">
        <h3 className="font-semibold text-gray-800 text-sm mb-3">Need direct help?</h3>
        <div className="flex flex-wrap gap-3">
          <a href="tel:+919876543210" className="btn-action">Call support</a>
          <a href="mailto:support@gramforecast.in" className="btn-outline">Email support</a>
        </div>
      </div>
    </AppShell>
  );
}

export {
  SalesAnalytics,
  InventoryPage,
  PlanningPage,
  MarketTrends,
  ForecastReports,
  AlertsPage,
  SettingsPage,
  HelpPage,
};
