/**
 * DonutChart — center label + legend list with category, value, %.
 * DESIGN.md §4.3 donut spec.
 */
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";

const DEFAULT_COLORS = ["#22C55E", "#F59E0B", "#EF4444", "#8B5CF6", "#3B82F6"];

function CustomLegend({ payload }) {
  return (
    <ul className="space-y-1.5 mt-3">
      {payload.map((entry, i) => (
        <li key={i} className="flex items-center gap-2 text-xs">
          <span
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ background: entry.color }}
          />
          <span className="text-gray-600 truncate flex-1">{entry.value}</span>
          <span className="font-semibold text-gray-800 tabular-nums ml-auto">
            {entry.payload.value}
          </span>
          <span className="text-gray-400">
            ({((entry.payload.value / (entry.payload.total || 1)) * 100).toFixed(0)}%)
          </span>
        </li>
      ))}
    </ul>
  );
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-xs">
      <p className="font-semibold text-gray-800">{entry.name}</p>
      <p className="text-gray-600 mt-0.5">
        Count: <span className="font-bold text-gray-900">{entry.value}</span>
      </p>
    </div>
  );
}

export default function DonutChart({
  data = [],     // [{ name, value }]
  colors = DEFAULT_COLORS,
  centerLabel,   // big number in center
  centerSub,     // sub-label in center
  height = 160,
  showLegend = true,
}) {
  const total = data.reduce((s, d) => s + (d.value || 0), 0);
  const enriched = data.map((d) => ({ ...d, total }));

  return (
    <div>
      <div style={{ height }} className="relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={enriched}
              cx="50%"
              cy="50%"
              innerRadius="58%"
              outerRadius="80%"
              paddingAngle={3}
              dataKey="value"
              startAngle={90}
              endAngle={-270}
            >
              {enriched.map((_, i) => (
                <Cell key={i} fill={colors[i % colors.length]} stroke="none" />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        {/* Center label */}
        {(centerLabel || centerSub) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            {centerLabel && (
              <p className="text-gray-900 font-bold text-xl tabular-nums">{centerLabel}</p>
            )}
            {centerSub && (
              <p className="text-gray-400 text-xs text-center">{centerSub}</p>
            )}
          </div>
        )}
      </div>
      {showLegend && (
        <CustomLegend
          payload={enriched.map((d, i) => ({
            value: d.name,
            color: colors[i % colors.length],
            payload: d,
          }))}
        />
      )}
    </div>
  );
}
