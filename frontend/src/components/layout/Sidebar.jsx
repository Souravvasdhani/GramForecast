/**
 * Sidebar — fixed dark green nav, logo, nav items, bottom tip card.
 * DESIGN.md §3 — left sidebar specification.
 */
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, TrendingUp, BarChart2, Package,
  ClipboardList, LineChart, FileText, Bell, Settings, HelpCircle,
  Leaf, X
} from "lucide-react";

const NAV_ITEMS = [
  { to: "/",                label: "Dashboard",           icon: LayoutDashboard },
  { to: "/demand",          label: "Demand Prediction",   icon: TrendingUp },
  { to: "/sales",           label: "Sales Analytics",     icon: BarChart2 },
  { to: "/inventory",       label: "Inventory",           icon: Package },
  { to: "/planning",        label: "Inventory Planning",  icon: ClipboardList },
  { to: "/market",          label: "Market Trends",       icon: LineChart },
  { to: "/reports",         label: "Forecast Reports",    icon: FileText },
  { to: "/alerts",          label: "Alerts",              icon: Bell },
  { to: "/settings",        label: "Settings",            icon: Settings },
  { to: "/help",            label: "Help & Support",      icon: HelpCircle },
];

export default function Sidebar({ isOpen, onClose }) {
  return (
    <aside id="main-sidebar" className={`sidebar select-none transition-transform duration-300 ease-in-out ${isOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}>
      {/* ── Logo & Close Button ── */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-mid flex items-center justify-center flex-shrink-0">
            <Leaf className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">RuralDemand AI</p>
            <p className="text-green-300/70 text-[10px] leading-tight">Smarter Forecasts.</p>
          </div>
        </div>
        
        {/* Mobile Close Button */}
        <button 
          onClick={onClose}
          className="lg:hidden p-2 -mr-2 text-white/70 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          aria-label="Close Sidebar"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* ── Nav Items ── */}
      <nav className="sidebar-nav flex-1 overflow-y-auto py-3 space-y-0.5">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            onClick={onClose}
            className={({ isActive }) =>
              `sidebar-nav-item ${isActive ? "active" : ""}`
            }
          >
            <Icon className="sidebar-icon" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* ── Bottom Tip Card ── */}
      <div className="m-3 rounded-xl bg-white/10 p-4 border border-white/10">
        <div className="flex items-center gap-2 mb-1.5">
          <TrendingUp className="w-4 h-4 text-green-300" />
          <span className="text-green-200 text-xs font-semibold">Did you know?</span>
        </div>
        <p className="text-green-100/70 text-xs leading-relaxed">
          Businesses using AI forecasting reduce stockouts by up to 30% in the first season.
        </p>
      </div>
    </aside>
  );
}
