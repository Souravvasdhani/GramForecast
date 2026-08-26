/**
 * KpiCard — icon, label, headline number, trend delta.
 * DESIGN.md §4.3 stat card spec.
 */
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { clsx } from "clsx";
import { useLanguage } from "../../context/LanguageContext";

export default function KpiCard({
  icon: Icon,
  label,
  value,
  unit = "",
  trendPct,
  trendLabel = "vs last week",
  iconBg = "bg-brand-light",
  iconColor = "text-brand-mid",
  loading = false,
}) {
  const { t } = useLanguage();
  if (loading) {
    return (
      <div className="kpi-card">
        <div className="skeleton h-11 w-11 rounded-xl mb-4" />
        <div className="skeleton h-3 w-24 mb-2" />
        <div className="skeleton h-7 w-32 mb-2" />
        <div className="skeleton h-3 w-20" />
      </div>
    );
  }

  const trendUp   = trendPct > 0;
  const trendDown = trendPct < 0;
  const trendAbs  = trendPct !== undefined ? Math.abs(trendPct).toFixed(1) : null;

  return (
    <div className="kpi-card">
      <div className="flex items-start gap-4">
        <div className={clsx("kpi-icon-wrapper", iconBg)}>
          <Icon className={clsx("w-5 h-5", iconColor)} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-gray-500 text-xs font-medium mb-1 truncate">{t(label)}</p>
          <p className="text-gray-900 font-bold text-2xl leading-tight tabular-nums">
            {value}
            {unit && <span className="text-base font-semibold text-gray-500 ml-1">{unit}</span>}
          </p>
          {trendAbs !== null && (
            <div className="flex items-center gap-1 mt-1.5">
              {trendUp   && <TrendingUp  className="w-3.5 h-3.5 text-green-500" />}
              {trendDown && <TrendingDown className="w-3.5 h-3.5 text-red-500" />}
              {!trendUp && !trendDown && <Minus className="w-3.5 h-3.5 text-gray-400" />}
              <span className={clsx("text-xs font-semibold", {
                "text-green-600": trendUp,
                "text-red-500":   trendDown,
                "text-gray-400":  !trendUp && !trendDown,
              })}>
                {trendUp ? "+" : trendDown ? "-" : ""}{trendAbs}%
              </span>
              <span className="text-gray-400 text-xs">{t(trendLabel)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
