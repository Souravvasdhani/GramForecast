/**
 * DemandPrediction — deep AI forecasting screen per DESIGN.md §5.3 and PRD §6.3.
 *
 * Zone 1: KPI row — Forecast Accuracy, AI Demand Forecast, Peak Day, Total 7-day
 * Zone 2: Actual vs Predicted chart (60%) + Prediction Factors panel (40%)
 * Zone 3: 7-day bar + Historical comparison table
 * Zone 4: AI Forecast Insight banner
 */
import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
  Brain, Calendar, Target, TrendingUp, BarChart2,
  AlertTriangle, ChevronDown, RefreshCw,
} from "lucide-react";

import AppShell      from "../components/layout/AppShell";
import KpiCard       from "../components/ui/KpiCard";
import AIBanner      from "../components/ui/AIBanner";
import DemandChart   from "../components/charts/DemandChart";
import ForecastBar   from "../components/charts/ForecastBar";
import { fetchAllForecasts, fetchProductForecast, fetchProducts } from "../api/client";

const fmt = (n, d = 1) => Number(n || 0).toFixed(d);

const IMPACT_CONFIG = {
  High:   { dot: "bg-danger",   bar: "bg-red-200",    width: "w-full",    label: "text-red-600" },
  Medium: { dot: "bg-warning",  bar: "bg-amber-200",  width: "w-2/3",     label: "text-amber-600" },
  Low:    { dot: "bg-info",     bar: "bg-blue-100",   width: "w-1/3",     label: "text-blue-500" },
};

export default function DemandPrediction() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products,     setProducts]     = useState([]);
  const [selectedId,   setSelectedId]   = useState(searchParams.get("product") || null);
  const [forecastData, setForecastData] = useState(null);
  const [overview,     setOverview]     = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);

  // Load product list
  useEffect(() => {
    fetchProducts()
      .then((prods) => {
        setProducts(prods);
        if (!selectedId && prods.length > 0) {
          setSelectedId(String(prods[0].id));
        }
      })
      .catch(() => {});
  }, []);

  // Load per-product forecast + overview
  useEffect(() => {
    if (!selectedId) return;
    setLoading(true);
    setError(null);
    setSearchParams({ product: selectedId });

    Promise.all([
      fetchProductForecast(selectedId),
      fetchAllForecasts().catch(() => ({ products: [] })),
    ])
      .then(([forecast, all]) => {
        setForecastData(forecast);
        setOverview(all);
      })
      .catch((e) => setError(e.response?.data?.detail || e.message))
      .finally(() => setLoading(false));
  }, [selectedId]);

  const kpis      = forecastData?.kpis ?? {};
  const chartData = forecastData?.chart_data ?? [];
  const barData   = forecastData?.forecast_bar ?? [];
  const factors   = forecastData?.prediction_factors ?? [];
  const product   = forecastData?.product ?? {};
  const insight   = forecastData?.ai_insight ?? "";
  const allProds  = overview?.products ?? [];

  return (
    <AppShell
      title="Demand Prediction"
      description="AI-powered 7-day demand forecast with confidence intervals and prediction drivers"
    >
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* ── Product Selector ────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <span className="text-gray-500 text-sm font-medium">Product:</span>
        <div className="relative">
          <select
            id="demand-product-selector"
            className="appearance-none bg-white border border-gray-200 rounded-xl px-4 py-2 pr-8 text-sm font-semibold text-gray-800 shadow-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-mid"
            value={selectedId || ""}
            onChange={(e) => setSelectedId(e.target.value)}
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
        {product.unit && (
          <span className="text-gray-400 text-xs bg-gray-100 px-3 py-1.5 rounded-lg">
            Unit: <strong>{product.unit}</strong>
          </span>
        )}
        {product.current_stock !== undefined && (
          <span className="text-gray-400 text-xs bg-gray-100 px-3 py-1.5 rounded-lg">
            In stock: <strong>{fmt(product.current_stock, 0)} {product.unit}</strong>
          </span>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* ZONE 1 — KPI Cards (model-trust first, per DESIGN.md §5.3)      */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <KpiCard
          icon={Brain}
          label="Forecast Accuracy"
          value={loading ? "—" : `${fmt(kpis.avg_confidence_pct, 1)}%`}
          iconBg="bg-purple-50"
          iconColor="text-purple-500"
          loading={loading}
        />
        <KpiCard
          icon={TrendingUp}
          label="AI Demand Forecast"
          value={loading ? "—" : `${fmt(kpis.total_forecast_7d, 0)}`}
          unit={product.unit}
          trendLabel="next 7 days"
          iconBg="bg-blue-50"
          iconColor="text-blue-500"
          loading={loading}
        />
        <KpiCard
          icon={Calendar}
          label="Peak Demand Day"
          value={loading || !kpis.peak_day ? "—" : new Date(kpis.peak_day).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
          iconBg="bg-amber-50"
          iconColor="text-warning"
          loading={loading}
        />
        <KpiCard
          icon={Target}
          label="Recommended Reorder"
          value={loading ? "—" : `${fmt(kpis.recommended_order, 0)}`}
          unit={product.unit}
          trendLabel="to meet demand + safety stock"
          iconBg="bg-green-50"
          iconColor="text-brand-mid"
          loading={loading}
        />
      </div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* ZONE 2 — Actual vs Predicted chart + Prediction Factors          */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-5">
        {/* Chart — 60% */}
        <div className="content-card lg:col-span-3">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-gray-800 text-sm">
                {product.name || "Product"} — Actual vs Predicted
              </h3>
              <p className="text-gray-400 text-xs">
                Last 28 days of actual sales + 7-day AI forecast with confidence band
              </p>
            </div>
          </div>
          {loading ? (
            <div className="skeleton h-[300px] rounded-xl" />
          ) : chartData.length > 0 ? (
            <DemandChart data={chartData} height={300} showLegend={true} />
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-400 text-sm">
              No forecast data. Run the forecasting model first.
            </div>
          )}
        </div>

        {/* Prediction Factors — 40% (KEY TRUST BUILDING per DESIGN.md §5.3) */}
        <div className="content-card lg:col-span-2">
          <h3 className="font-semibold text-gray-800 text-sm mb-1">Prediction Factors</h3>
          <p className="text-gray-400 text-xs mb-4">
            Why this forecast? Key drivers and their impact level.
          </p>
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => <div key={i} className="skeleton h-10 rounded-lg" />)}
            </div>
          ) : (
            <ul className="space-y-4">
              {factors.map((f, i) => {
                const cfg = IMPACT_CONFIG[f.impact] ?? IMPACT_CONFIG.Low;
                return (
                  <li key={i}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
                        <span className="text-gray-800 text-xs font-medium">{f.factor}</span>
                      </div>
                      <span className={`text-xs font-semibold ${cfg.label}`}>{f.impact}</span>
                    </div>
                    {/* Impact bar */}
                    <div className="h-1.5 bg-gray-100 rounded-full mb-1">
                      <div className={`h-1.5 rounded-full ${cfg.bar.replace("bg-", "bg-").replace("-100", "-400").replace("-200", "-400")} ${cfg.width}`} />
                    </div>
                    <p className="text-gray-400 text-[10px] leading-snug">{f.detail}</p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* ZONE 3 — 7-day bar + All Products ranked list                    */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
        {/* 7-day Forecast bar */}
        <div className="content-card">
          <h3 className="font-semibold text-gray-800 text-sm mb-1">7-Day Forecast — {product.name}</h3>
          <p className="text-gray-400 text-xs mb-3">Daily predicted demand in {product.unit}</p>
          {loading ? (
            <div className="skeleton h-48 rounded-xl" />
          ) : barData.length > 0 ? (
            <ForecastBar data={barData} height={200} />
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
              No forecast data yet.
            </div>
          )}
        </div>

        {/* Top Predicted Products — all products ranked */}
        <div className="content-card">
          <h3 className="font-semibold text-gray-800 text-sm mb-3">All Products — 7-Day Forecast Rank</h3>
          <div className="overflow-x-auto w-full">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Product</th>
                  <th className="text-right">7d Total</th>
                  <th>Peak Day</th>
                </tr>
              </thead>
              <tbody>
                {allProds.length > 0
                  ? allProds.map((p, i) => (
                      <tr
                        key={p.product_id}
                        className={`cursor-pointer ${p.product_id === selectedId ? "bg-brand-lighter" : ""}`}
                        onClick={() => setSelectedId(p.product_id)}
                      >
                        <td className="text-gray-400 font-medium w-6">{i + 1}</td>
                        <td>
                          <div className="font-medium text-gray-800 text-xs">{p.product_name}</div>
                          <div className="text-[10px] text-gray-400">{p.category}</div>
                        </td>
                        <td className="numeric text-blue-600 font-bold">
                          {fmt(p.total_7d, 0)} <span className="text-gray-400 font-normal">{p.unit}</span>
                        </td>
                        <td className="text-xs text-gray-500">
                          {p.peak_day
                            ? new Date(p.peak_day).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })
                            : "—"}
                        </td>
                      </tr>
                    ))
                  : loading
                  ? [...Array(6)].map((_, i) => (
                      <tr key={i}>
                        <td colSpan={4}><div className="skeleton h-8 rounded" /></td>
                      </tr>
                    ))
                  : (
                    <tr>
                      <td colSpan={4} className="text-center text-gray-400 text-xs py-6">
                        No forecast data yet. Run the model first.
                      </td>
                    </tr>
                  )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* ZONE 4 — AI Forecast Insight                                     */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <AIBanner
        headline={insight || "Run the Prophet forecasting model to get your AI forecast insight for this product."}
        detail={`Forecast accuracy: ${fmt(kpis.avg_confidence_pct, 1)}% | Model: Prophet (Indian festival calendar aware) | Updated daily`}
        priority="low"
        loading={loading}
      />
    </AppShell>
  );
}
