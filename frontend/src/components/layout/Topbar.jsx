/**
 * Topbar — fixed header with page title, date range, notification bell, avatar.
 * DESIGN.md §3 — top bar specification.
 */
import { Bell, ChevronDown, LogOut, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function Topbar({ title, description }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  });

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <header className="topbar">
      {/* ── Page Title ── */}
      <div className="flex-1 min-w-0">
        <h1 className="text-gray-900 font-bold text-lg leading-tight truncate">{title}</h1>
        {description && (
          <p className="text-gray-400 text-xs truncate">{description}</p>
        )}
      </div>

      {/* ── Right Controls ── */}
      <div className="flex items-center gap-4 ml-4">
        {/* Date */}
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
          <Calendar className="w-3.5 h-3.5" />
          <span>{today}</span>
        </div>

        {/* Notification bell */}
        <button
          id="topbar-notification-btn"
          className="relative w-9 h-9 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors"
        >
          <Bell className="w-4.5 h-4.5 text-gray-500" />
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-danger text-white text-[9px] font-bold flex items-center justify-center">
            3
          </span>
        </button>

        {/* User avatar */}
        <div className="flex items-center gap-2 cursor-pointer group">
          <div className="w-9 h-9 rounded-xl bg-brand-mid flex items-center justify-center text-white font-bold text-sm">
            {(user?.name || "R").charAt(0).toUpperCase()}
          </div>
          <div className="hidden md:block">
            <p className="text-gray-800 font-semibold text-xs leading-tight">{user?.name || "Ramesh Yadav"}</p>
            <p className="text-gray-400 text-[10px]">Kirana Store</p>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600 transition-colors" />
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-2 text-[11px] font-medium text-gray-700 hover:bg-gray-100 transition-colors"
          aria-label="Logout"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}
