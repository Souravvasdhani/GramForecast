/**
 * AIBanner — full-width AI recommendation strip.
 * DESIGN.md §4.3 — "light green background strip, robot/bulb icon,
 * bold one-line takeaway + supporting sentence, always last on page."
 */
import { Bot, AlertTriangle, Info, CheckCircle } from "lucide-react";
import { clsx } from "clsx";
import { useLanguage } from "../../context/LanguageContext";

const PRIORITY_CONFIG = {
  high:   { icon: AlertTriangle, border: "border-red-200",   bg: "from-red-50 to-orange-50",  iconCls: "text-red-500",   label: "Urgent Action Needed" },
  medium: { icon: AlertTriangle, border: "border-amber-200", bg: "from-amber-50 to-yellow-50", iconCls: "text-amber-500", label: "Action Recommended" },
  low:    { icon: Info,          border: "border-green-200", bg: "from-[#DCFCE7] to-[#F0FDF4]",iconCls: "text-brand-mid", label: "AI Recommendation" },
  default:{ icon: Bot,           border: "border-green-200", bg: "from-[#DCFCE7] to-[#F0FDF4]",iconCls: "text-brand-mid", label: "AI Recommendation" },
};

export default function AIBanner({ headline, detail, priority = "default", loading = false }) {
  const { t } = useLanguage();
  if (loading) {
    return (
      <div className="rounded-2xl p-5 border border-gray-100 bg-gray-50">
        <div className="flex gap-4">
          <div className="skeleton w-11 h-11 rounded-xl flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-3.5 w-32" />
            <div className="skeleton h-4 w-3/4" />
            <div className="skeleton h-3 w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  const cfg = PRIORITY_CONFIG[priority] ?? PRIORITY_CONFIG.default;
  const IconComp = cfg.icon;

  return (
    <div className={clsx("rounded-2xl p-5 flex items-start gap-4 border", cfg.border)}
         style={{ background: `linear-gradient(135deg, var(--tw-gradient-from) 0%, var(--tw-gradient-to) 100%)` }}>
      <div className={clsx("ai-banner", "w-full")}
           style={{ background: `linear-gradient(135deg, #DCFCE7 0%, #F0FDF4 100%)`, border: "none", padding: 0 }}>
        <div
          className={clsx("rounded-2xl p-5 flex items-start gap-4 border", cfg.border)}
          style={{ background: `linear-gradient(135deg, ${priority === "high" ? "#FEF2F2, #FFF7ED" : priority === "medium" ? "#FFFBEB, #FEFCE8" : "#DCFCE7, #F0FDF4"})` }}
        >
          {/* Icon */}
          <div className="w-11 h-11 rounded-xl bg-white/70 flex items-center justify-center flex-shrink-0 shadow-sm">
            <Bot className={clsx("w-6 h-6", cfg.iconCls)} />
          </div>
          {/* Text */}
          <div className="flex-1 min-w-0">
            <p className={clsx("text-xs font-semibold uppercase tracking-wider mb-1", cfg.iconCls)}>
              🤖 {t(cfg.label)}
            </p>
            <p className="text-gray-900 font-semibold text-sm leading-snug mb-1">{headline}</p>
            {detail && <p className="text-gray-500 text-xs leading-relaxed">{detail}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
