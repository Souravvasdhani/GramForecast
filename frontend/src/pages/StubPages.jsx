/**
 * Operational screens for the remaining app modules.
 */
import { useEffect, useState } from "react";
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
import {
  fetchAlerts,
  fetchInventory,
  fetchInventoryPlanning,
  fetchMarketTrends,
  fetchSales,
  fetchSalesAnalytics,
} from "../api/client";

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

function SalesAnalytics() {
  const [analytics, setAnalytics] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchSalesAnalytics(), fetchSales(30)])
      .then(([salesAnalytics, sales]) => {
        setAnalytics(salesAnalytics);
        setTransactions(safeArray(sales));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const kpis = analytics?.kpis ?? {};
  const dailyTrend = safeArray(analytics?.daily_trend);
  const byCategory = safeArray(analytics?.by_category);
  const maxRevenue = Math.max(...dailyTrend.map((item) => Number(item.revenue || 0)), 1);

  return (
    <AppShell
      title="Sales Analytics"
      description="Historical sales performance, category mix, and transaction trends"
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
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
          <span className="text-xs text-gray-400">Last 30 days</span>
        </div>
        <div className="overflow-auto">
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
                  <td><StatusBadge status={row.payment_method === "upi" ? "active" : "pending"} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
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
        <div className="overflow-auto">
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
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-5">
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
        <div className="overflow-auto">
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
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
  const reportCards = [
    { title: "7-Day Demand Summary", status: "Generated", tone: "optimal" },
    { title: "Inventory Coverage Report", status: "Ready", tone: "medium" },
    { title: "Sales Performance Snapshot", status: "Queued", tone: "low" },
  ];

  return (
    <AppShell
      title="Forecast Reports"
      description="Generated summaries for operations, planning, and executive review"
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <KpiCard icon={BarChart3} label="Forecast Confidence" value="92.4%" iconBg="bg-purple-50" iconColor="text-purple-500" />
        <KpiCard icon={TrendingUp} label="7-Day Demand" value="1,240" unit="units" iconBg="bg-green-50" iconColor="text-brand-mid" />
        <KpiCard icon={ClipboardList} label="Generated Today" value="6" iconBg="bg-blue-50" iconColor="text-blue-500" />
        <KpiCard icon={CalendarRange} label="Next Run" value="Tomorrow" trendLabel="8:00 AM" iconBg="bg-amber-50" iconColor="text-warning" />
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
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAlerts()
      .then((payload) => setItems(safeArray(payload)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const openAlerts = items.filter((item) => !item.resolved_at).length;
  const highPriority = items.filter((item) => Number(item.priority) >= 2).length;

  return (
    <AppShell
      title="Alerts & Notifications"
      description="Operational issues, stock risks, and recommended follow-up actions"
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <KpiCard icon={Bell} label="Open Alerts" value={loading ? "—" : String(openAlerts)} iconBg="bg-red-50" iconColor="text-danger" loading={loading} />
        <KpiCard icon={AlertTriangle} label="High Priority" value={loading ? "—" : String(highPriority)} iconBg="bg-amber-50" iconColor="text-warning" loading={loading} />
        <KpiCard icon={CheckCircle2} label="Resolved" value={loading ? "—" : String(items.length - openAlerts)} iconBg="bg-green-50" iconColor="text-brand-mid" loading={loading} />
        <KpiCard icon={ShieldCheck} label="SLA Risk" value={loading ? "—" : "Low"} iconBg="bg-blue-50" iconColor="text-blue-500" loading={loading} />
      </div>

      <div className="content-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800 text-sm">Alert Feed</h3>
          <button className="btn-outline">Mark all read</button>
        </div>
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border border-gray-100 rounded-xl p-3 bg-gray-50/50">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <StatusBadge status={item.priority >= 2 ? "high" : "medium"} />
                  <span className="text-xs font-semibold text-gray-700 uppercase">{item.type}</span>
                </div>
                <p className="text-sm text-gray-700">{item.message}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-400">{formatDate(item.created_at)}</span>
                <button className="btn-action">Acknowledge</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}

function SettingsPage() {
  return (
    <AppShell
      title="Settings"
      description="Store preferences, notifications, and forecasting automation"
    >
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="content-card">
          <h3 className="font-semibold text-gray-800 text-sm mb-4">Business Profile</h3>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Business name</label>
              <input defaultValue="Ramesh Kirana & Oil Mill" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Contact number</label>
              <input defaultValue="+91 98765 43210" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Operating region</label>
              <input defaultValue="Rampur, Uttar Pradesh" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />
            </div>
          </div>
        </div>

        <div className="content-card">
          <h3 className="font-semibold text-gray-800 text-sm mb-4">Preferences</h3>
          <div className="space-y-3">
            {[
              "Daily AI forecast summary",
              "Low-stock alert notifications",
              "Weekly demand report emails",
              "Auto-generated reorder suggestions",
            ].map((item) => (
              <label key={item} className="flex items-center justify-between gap-3 text-sm text-gray-700">
                <span>{item}</span>
                <input type="checkbox" defaultChecked className="h-4 w-4 accent-brand-mid" />
              </label>
            ))}
          </div>
        </div>
      </div>
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
          <button className="btn-action">Call support</button>
          <button className="btn-outline">Email operations</button>
          <button className="btn-outline">View SOP guide</button>
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
