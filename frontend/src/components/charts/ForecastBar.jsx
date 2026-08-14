/**
 * ForecastBar — 7-day demand forecast bar chart with error bounds.
 * DESIGN.md §5.2 — "Demand Forecast (next 7 days) bar chart"
 */
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ErrorBar,
} from "recharts";
import { format, parseISO } from "date-fns";

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-xs">
      <p className="font-semibold text-gray-700 mb-1">
        {label ? format(parseISO(label), "EEEE, d MMM") : ""}
      </p>
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-brand-mid" />
        <span className="text-gray-600">Forecast:</span>
        <span className="font-bold text-gray-900 tabular-nums">
          {Number(item?.value || 0).toFixed(1)}
        </span>
      </div>
    </div>
  );
}

export default function ForecastBar({ data = [], height = 200 }) {
  const enriched = data.map((d) => ({
    ...d,
    error: d.upper && d.lower ? [d.predicted - d.lower, d.upper - d.predicted] : undefined,
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={enriched} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barSize={28}>
        <defs>
          <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#16A34A" stopOpacity={0.9} />
            <stop offset="100%" stopColor="#16A34A" stopOpacity={0.5} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: "#9CA3AF" }}
          tickFormatter={(d) => { try { return format(parseISO(d), "EEE d"); } catch { return d; } }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#9CA3AF" }}
          tickLine={false}
          axisLine={false}
          width={36}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "#F0FDF4" }} />
        <Bar dataKey="predicted" fill="url(#barGrad)" radius={[6, 6, 0, 0]} name="Forecast">
          {enriched[0]?.error && (
            <ErrorBar dataKey="error" width={4} strokeWidth={2} stroke="#14532D" />
          )}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
