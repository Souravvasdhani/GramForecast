/**
 * DemandChart — Actual vs Predicted line chart with confidence band.
 * Used on Dashboard (overview) and Demand Prediction (detail).
 */
import {
  ResponsiveContainer, ComposedChart, Line, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ReferenceLine,
} from "recharts";
import { format, parseISO } from "date-fns";

const COLORS = {
  actual:    "#16A34A",
  predicted: "#3B82F6",
  band:      "#BFDBFE",
};

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-xs">
      <p className="font-semibold text-gray-700 mb-2">
        {label ? format(parseISO(label), "dd MMM yyyy") : ""}
      </p>
      {payload.map((entry) => {
        if (entry.name === "band") return null;
        return (
          <div key={entry.name} className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: entry.color }} />
            <span className="text-gray-600 capitalize">{entry.name}:</span>
            <span className="font-bold text-gray-900 tabular-nums">
              {entry.value != null ? Number(entry.value).toFixed(1) : "—"}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function DemandChart({ data = [], height = 280, showLegend = true }) {
  // Find the split point between historical and future
  const today = new Date().toISOString().split("T")[0];
  const splitDate = data.find((d) => d.date >= today)?.date;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={COLORS.actual}  stopOpacity={0.15} />
            <stop offset="95%" stopColor={COLORS.actual}  stopOpacity={0.01} />
          </linearGradient>
        </defs>

        <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: "#9CA3AF" }}
          tickFormatter={(d) => { try { return format(parseISO(d), "d MMM"); } catch { return d; } }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#9CA3AF" }}
          tickLine={false}
          axisLine={false}
          width={40}
          tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(1)}k` : v}
        />
        <Tooltip content={<CustomTooltip />} />
        {showLegend && (
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            formatter={(value) => <span className="text-gray-600 capitalize">{value}</span>}
          />
        )}

        {/* Confidence band */}
        <Area
          dataKey="upper"
          fill={COLORS.band}
          stroke="none"
          name="band"
          legendType="none"
          dot={false}
          activeDot={false}
          connectNulls
        />
        <Area
          dataKey="lower"
          fill="#FFFFFF"
          stroke="none"
          name="band"
          legendType="none"
          dot={false}
          activeDot={false}
          connectNulls
        />

        {/* Actual line */}
        <Line
          type="monotone"
          dataKey="actual"
          stroke={COLORS.actual}
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 5, fill: COLORS.actual, strokeWidth: 2, stroke: "#fff" }}
          name="actual"
          connectNulls={false}
        />

        {/* Predicted line (dashed for future) */}
        <Line
          type="monotone"
          dataKey="predicted"
          stroke={COLORS.predicted}
          strokeWidth={2.5}
          strokeDasharray="6 3"
          dot={false}
          activeDot={{ r: 5, fill: COLORS.predicted, strokeWidth: 2, stroke: "#fff" }}
          name="predicted"
          connectNulls
        />

        {/* Today reference line */}
        {splitDate && (
          <ReferenceLine
            x={splitDate}
            stroke="#D1D5DB"
            strokeDasharray="4 4"
            label={{ value: "Today", position: "insideTopRight", fontSize: 10, fill: "#9CA3AF" }}
          />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
