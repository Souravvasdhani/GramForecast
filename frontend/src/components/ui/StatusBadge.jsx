/**
 * StatusBadge — color-coded inventory/alert status pill.
 * DESIGN.md §4.3 — "Color is never the only signal; always paired with text."
 */
const STATUS_MAP = {
  optimal:      { label: "Optimal",       cls: "badge-optimal" },
  low_stock:    { label: "Low Stock",     cls: "badge-low_stock" },
  out_of_stock: { label: "Out of Stock",  cls: "badge-out_of_stock" },
  overstock:    { label: "Overstock",     cls: "badge-overstock" },
  high:         { label: "High",          cls: "badge-high" },
  medium:       { label: "Medium",        cls: "badge-medium" },
  low:          { label: "Low",           cls: "badge-low" },
  active:       { label: "Active",        cls: "bg-blue-100 text-blue-700" },
  generated:    { label: "Generated",     cls: "badge-optimal" },
  pending:      { label: "Pending",       cls: "badge-medium" },
  failed:       { label: "Failed",        cls: "badge-high" },
};

export default function StatusBadge({ status }) {
  const entry = STATUS_MAP[status] ?? { label: status, cls: "bg-gray-100 text-gray-600" };
  return <span className={`badge ${entry.cls}`}>{entry.label}</span>;
}
