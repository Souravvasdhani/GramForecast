import { ShieldCheck } from "lucide-react";
import DemandChart from "./DemandChart";
import { useLanguage } from "../../context/LanguageContext";

const formatAccuracy = (value) => `${Number(value || 0).toFixed(1)}%`;

export default function ForecastTrustPanel({ forecastData, loading = false, compact = false }) {
  const { language, t } = useLanguage();
  const accuracy = forecastData?.backtest?.accuracy_pct ?? forecastData?.kpis?.accuracy_pct ?? 0;
  const chartData = forecastData?.chart_data ?? [];
  const productName = forecastData?.product?.name || t("AI forecast");
  const trustLine = language === "hi"
    ? `पिछले ${forecastData?.backtest?.points?.length || 0} दिन में हमारा अनुमान ${formatAccuracy(accuracy)} सही रहा`
    : `Our forecast was ${formatAccuracy(accuracy)} accurate over the last ${forecastData?.backtest?.points?.length || 0} days`;

  return (
    <section className={`content-card ${compact ? "" : "border-l-4 border-brand-mid"}`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-brand-mid" />
            <h3 className="font-semibold text-gray-800 text-sm">{t("How accurate are we?")}</h3>
          </div>
          <p className="mt-1 text-xs text-gray-400">{productName} · {t("Past predicted vs actual, with future confidence band")}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold tabular-nums text-brand-dark">{loading ? "—" : formatAccuracy(accuracy)}</p>
          <p className="text-[10px] text-gray-400">{t("Backtest accuracy")}</p>
        </div>
      </div>
      {loading ? (
        <div className="skeleton h-[260px] rounded-xl" />
      ) : chartData.length > 0 ? (
        <DemandChart data={chartData} height={compact ? 240 : 280} showLegend />
      ) : (
        <div className="flex h-[240px] items-center justify-center text-sm text-gray-400">{t("Not enough history for a backtest yet.")}</div>
      )}
      <p className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-xs font-semibold text-green-800">{trustLine}</p>
    </section>
  );
}