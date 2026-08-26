/**
 * Dashboard — home screen with 4-zone rhythm per DESIGN.md §3 and §5.2.
 *
 * Zone 1: KPI row (Predicted Demand, Total Sales, Inventory in Hand, Stock-Out Risk)
 * Zone 2: Primary chart (Actual vs Predicted, 60%) + Top Products table (40%)
 * Zone 3: Inventory Status donut + 7-day Forecast bar + Market Trends mini-feed
 * Zone 4: AI Recommendation banner
 */
import { useEffect, useRef, useState } from "react";
import {
  TrendingUp, IndianRupee, Package, AlertTriangle,
  ArrowUpRight, ArrowDownRight, Minus, RefreshCw,
} from "lucide-react";

import { Link } from "react-router-dom";
import AppShell    from "../components/layout/AppShell";
import KpiCard     from "../components/ui/KpiCard";
import AIBanner    from "../components/ui/AIBanner";
import StatusBadge from "../components/ui/StatusBadge";
import DemandChart from "../components/charts/DemandChart";
import ForecastBar from "../components/charts/ForecastBar";
import DonutChart  from "../components/charts/DonutChart";
import AddSaleModal from "../components/sales/AddSaleModal";
import { fetchDashboardSummary, sendDailyWhatsapp, triggerForecastRun } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (n, opts = {}) =>
  new Intl.NumberFormat("en-IN", opts).format(n);

const fmtRs = (n) => {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000)   return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${fmt(n, { maximumFractionDigits: 0 })}`;
};

const TREND_ICON = (pct) => {
  if (pct > 0)  return <ArrowUpRight className="w-3.5 h-3.5 text-green-500" />;
  if (pct < 0)  return <ArrowDownRight className="w-3.5 h-3.5 text-red-500" />;
  return <Minus className="w-3.5 h-3.5 text-gray-400" />;
};

const INV_COLORS  = ["#22C55E", "#F59E0B", "#EF4444", "#8B5CF6"];
const INV_LABELS  = ["Optimal", "Low Stock", "Out of Stock", "Overstock"];

// ─── Component ───────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isSaleOpen, setIsSaleOpen] = useState(false);
  const [whatsappState, setWhatsappState] = useState(null);
  const [sendingWhatsapp, setSendingWhatsapp] = useState(false);
  const autoWhatsappSent = useRef(false);

  const loadData = async () => {
    try {
      setError(null);
      const d = await fetchDashboardSummary(language);
      setData(d);
    } catch (e) {
      setError(e.response?.data?.detail || e.message || "Failed to load dashboard.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadData(); }, [language]);

  useEffect(() => {
    if (!data || !data.kpis?.out_of_stock_count || autoWhatsappSent.current) return;
    autoWhatsappSent.current = true;
    sendDailyWhatsapp()
      .then((result) => setWhatsappState(result))
      .catch(() => {});
  }, [data]);

  const handleWhatsapp = async () => {
    setSendingWhatsapp(true);
    try {
      setWhatsappState(await sendDailyWhatsapp());
    } catch (e) {
      setWhatsappState({ preview: "WhatsApp plan could not be prepared. Please try again." });
    } finally {
      setSendingWhatsapp(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleRunForecast = async () => {
    if (!user?.business_id) return;
    setRefreshing(true);
    try {
      await triggerForecastRun(user.business_id);
      await loadData();
    } catch (e) {
      setError(e.response?.data?.detail || e.message || "Failed to run forecast.");
      setRefreshing(false);
    }
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const kpis       = data?.kpis       ?? {};
  const chartData  = data?.chart_data ?? [];
  const topProds   = data?.top_products ?? [];
  const invDonut   = data?.inventory_donut ?? {};
  const forecastBar= data?.forecast_bar ?? [];
  const marketMini = data?.market_mini ?? [];
  const aiRec      = data?.ai_recommendation ?? {};

  const invDonutData = INV_LABELS.map((label, i) => ({
    name:  label,
    value: invDonut[label.toLowerCase().replace(" ", "_")] ?? 0,
  }));
  const totalProducts = invDonutData.reduce((s, d) => s + d.value, 0);

  return (
    <AppShell
      title="Dashboard"
      description="Your business at a glance — today's demand, stock, and AI forecast"
    >
      {/* ── Error banner ─────────────────────────────────────────────────── */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
          <button onClick={loadData} className="ml-auto underline text-xs">Retry</button>
        </div>
      )}

      {/* ── Refresh button ───────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-gray-700 text-sm font-medium">
            {t("Welcome back,")} <span className="text-brand-mid font-semibold">{user?.name ?? "there"}</span> 👋
          </h2>
          <p className="text-gray-400 text-xs">{t("Here's how your business is looking today.")}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <button type="button" onClick={handleWhatsapp} disabled={sendingWhatsapp} className="btn-outline">{sendingWhatsapp ? t("Sending...") : t("Send today's plan to WhatsApp")}</button>
            <button type="button" onClick={() => setIsSaleOpen(true)} className="btn-action">+ Add Sale / बिक्री जोड़ें</button>
          </div>
          <button
            id="dashboard-refresh-btn"
            onClick={handleRefresh}
            className={`btn-outline flex items-center gap-1.5 ${refreshing ? "opacity-60" : ""}`}
            disabled={refreshing}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              {t("Refresh")}
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* ZONE 1 — KPI Cards                                               */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <div id="dashboard-kpi-cards" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <KpiCard
          icon={TrendingUp}
          label={t("Predicted Demand (7d)")}
          value={loading ? "—" : `${fmt(kpis.predicted_demand_7d || 0, { maximumFractionDigits: 0 })}`}
          unit="units"
          trendPct={loading ? undefined : kpis.demand_delta_pct ?? undefined}
          iconBg="bg-blue-50"
          iconColor="text-blue-500"
          loading={loading}
        />
        <KpiCard
          icon={IndianRupee}
          label={t("Total Sales (7 days)")}
          value={loading ? "—" : fmtRs(kpis.total_sales_7d || 0)}
          trendPct={loading ? undefined : kpis.sales_delta_pct}
          iconBg="bg-green-50"
          iconColor="text-brand-mid"
          loading={loading}
        />
        <KpiCard
          icon={Package}
          label={t("Inventory in Hand")}
          value={loading ? "—" : fmtRs(kpis.inventory_value || 0)}
          iconBg="bg-purple-50"
          iconColor="text-purple-500"
          loading={loading}
        />
        <KpiCard
          icon={AlertTriangle}
          label={t("Stock-Out Risk")}
          value={loading ? "—" : `${(kpis.out_of_stock_count || 0) + (kpis.low_stock_count || 0)}`}
          unit={((kpis.out_of_stock_count || 0) + (kpis.low_stock_count || 0)) === 1 ? "product" : "products"}
          trendLabel="need attention"
          iconBg="bg-red-50"
          iconColor="text-danger"
          loading={loading}
        />
      </div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* ZONE 2 — Primary chart + Top Products                            */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-5">
        {/* Demand chart — 60% */}
        <div className="content-card lg:col-span-3">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-gray-800 text-sm">{t("Demand Prediction Overview")}</h3>
              <p className="text-gray-400 text-xs">Actual sales vs AI forecast — last 14 days + next 7 days</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-brand-mid rounded inline-block" />
                <span className="text-gray-500">{t("Actual")}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-info rounded inline-block" style={{ borderTop: "2px dashed #3B82F6", height: 0 }} />
                <span className="text-gray-500">{t("Predicted")}</span>
              </span>
            </div>
          </div>
          {loading ? (
            <div className="skeleton h-[280px] rounded-xl" />
          ) : (
            <DemandChart data={chartData} height={280} showLegend={false} />
          )}
        </div>

        {/* Top Products table — 40% */}
        <div className="content-card lg:col-span-2 flex flex-col">
          <h3 className="font-semibold text-gray-800 text-sm mb-4">{t("Top Products")}</h3>
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="skeleton h-10 rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="flex-1 overflow-x-auto w-full -mx-1">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th className="text-right">Sales 7d</th>
                    <th className="text-right">Forecast</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {topProds.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <div className="font-medium text-gray-800 text-xs leading-tight">{p.name}</div>
                        <div className="text-gray-400 text-[10px]">{p.category}</div>
                      </td>
                      <td className="numeric">
                        <div className="flex items-center justify-end gap-1">
                          {TREND_ICON(p.trend_pct)}
                          <span>{fmt(p.sales_7d, { maximumFractionDigits: 0 })} {p.unit}</span>
                        </div>
                      </td>
                      <td className="numeric text-blue-600 font-semibold">
                        {fmt(p.forecast_7d, { maximumFractionDigits: 0 })}
                      </td>
                      <td>
                        <StatusBadge status={p.stock_status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* ZONE 3 — Inventory Donut + Forecast Bar + Market Mini-feed       */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
        {/* Inventory Status donut */}
        <div className="content-card">
          <h3 className="font-semibold text-gray-800 text-sm mb-3">{t("Inventory Status")}</h3>
          {loading ? (
            <div className="skeleton h-44 rounded-xl" />
          ) : (
            <DonutChart
              data={invDonutData}
              colors={INV_COLORS}
              centerLabel={totalProducts}
              centerSub="Products"
              height={150}
            />
          )}
        </div>

        {/* 7-day Forecast bar */}
        <div className="content-card">
          <h3 className="font-semibold text-gray-800 text-sm mb-3">{t("Demand Forecast — Next 7 Days")}</h3>
          <p className="text-gray-400 text-xs mb-3">Total units across all products</p>
          {loading ? (
            <div className="skeleton h-44 rounded-xl" />
          ) : forecastBar.length > 0 ? (
            <ForecastBar data={forecastBar} height={160} />
          ) : (
            <div className="h-40 flex items-center justify-center text-gray-400 text-xs text-center">
              Forecast not yet generated.{" "}
              <span
                className="text-brand-mid cursor-pointer underline ml-1"
                onClick={handleRunForecast}
              >
                Generate now
              </span>
            </div>
          )}
        </div>

        {/* Market Trends mini-feed */}
        <div className="content-card">
          <h3 className="font-semibold text-gray-800 text-sm mb-3">{t("Market Signals")}</h3>
          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-10 rounded-lg" />)}
            </div>
          ) : marketMini.length > 0 ? (
            <ul className="space-y-3">
              {marketMini.map((sig, i) => (
                <li key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-gray-800 text-xs font-medium">{sig.category}</p>
                    <p className="text-gray-400 text-[10px]">{sig.signal_date}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-xs font-bold tabular-nums ${sig.demand_index >= 65 ? "text-brand-mid" : sig.demand_index >= 45 ? "text-warning" : "text-danger"}`}>
                      Demand {sig.demand_index.toFixed(0)}
                    </p>
                    <p className="text-gray-400 text-[10px]">₹{sig.price}/unit</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-400 text-xs text-center py-8">No market signals available.</p>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* ZONE 4 — AI Recommendation banner                                */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <div id="dashboard-ai-banner">
        <AIBanner
          headline={aiRec.headline || "Run the forecasting model to get your first AI recommendation."}
          detail={aiRec.detail}
          priority={aiRec.priority || "low"}
          loading={loading}
        />
        <div className="mt-3 flex justify-end">
          <Link id="restock-now-btn" to="/planning" className="btn-action">Restock Now <ArrowUpRight className="w-3.5 h-3.5" /></Link>
        </div>
      </div>
      <AddSaleModal isOpen={isSaleOpen} onClose={() => setIsSaleOpen(false)} onSuccess={loadData} />
      {whatsappState && (
        <div className="fixed bottom-24 right-5 z-[80] w-[min(380px,calc(100vw-2rem))] rounded-2xl border border-green-200 bg-white p-4 shadow-2xl sm:right-6">
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-sm font-bold text-green-800">{whatsappState.sent ? t("WhatsApp message sent") : t("WhatsApp preview")}</p>
            <button type="button" onClick={() => setWhatsappState(null)} className="text-xs text-gray-400 hover:text-gray-700" aria-label="Close WhatsApp preview">{t("Close")}</button>
          </div>
          <p className="whitespace-pre-wrap text-xs leading-relaxed text-gray-600">{whatsappState.preview}</p>
        </div>
      )}
    </AppShell>
  );
}
