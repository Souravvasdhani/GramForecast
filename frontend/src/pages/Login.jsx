/**
 * Login page — JWT auth form.
 * DESIGN.md §5.1 — split layout: illustration left, form right.
 */
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Leaf, Eye, EyeOff, AlertCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const [mobile,   setMobile]   = useState("+919876543210");
  const [password, setPassword] = useState("Demo@12345");
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(mobile, password);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.detail || "Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* ── Left panel — illustration + value props ── */}
      <div
        className="hidden lg:flex lg:flex-col lg:w-1/2 p-12 justify-between"
        style={{ background: "linear-gradient(160deg, #0F3D2E 0%, #14532D 60%, #16A34A 100%)" }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <Leaf className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-lg leading-tight">RuralDemand AI</p>
            <p className="text-green-300/80 text-xs">Smarter Forecasts. Stronger Rural Businesses.</p>
          </div>
        </div>

        {/* Hero text */}
        <div>
          <h2 className="text-white font-bold text-4xl leading-tight mb-6">
            Know what to stock<br />before demand peaks.
          </h2>
          <ul className="space-y-4">
            {[
              { icon: "🎯", title: "AI-Powered Forecasts", desc: "7-day demand prediction per product — no guesswork." },
              { icon: "📦", title: "Smart Inventory Planning", desc: "Recommended production & reorder quantities, daily." },
              { icon: "📈", title: "Data-Driven Growth", desc: "Turn 90 days of sales history into an unfair advantage." },
            ].map((item) => (
              <li key={item.title} className="flex items-start gap-3">
                <span className="text-2xl">{item.icon}</span>
                <div>
                  <p className="text-white font-semibold text-sm">{item.title}</p>
                  <p className="text-green-200/70 text-xs leading-relaxed">{item.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Trust badge */}
        <div className="flex items-center gap-2 bg-white/10 rounded-xl px-4 py-3 border border-white/10">
          <span className="text-xl">🔒</span>
          <div>
            <p className="text-white text-xs font-semibold">Secure & Trusted</p>
            <p className="text-green-300/70 text-[10px]">Your business data is private and encrypted.</p>
          </div>
        </div>
      </div>

      {/* ── Right panel — form ── */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-9 h-9 rounded-xl bg-brand-mid flex items-center justify-center">
              <Leaf className="w-5 h-5 text-white" />
            </div>
            <p className="text-gray-900 font-bold text-lg">RuralDemand AI</p>
          </div>

          <h1 className="text-gray-900 font-bold text-2xl mb-1">Welcome back</h1>
          <p className="text-gray-500 text-sm mb-6">Sign in to your business account.</p>

          {error && (
            <div className="mb-4 flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Demo credentials notice */}
          <div className="mb-4 bg-brand-lighter border border-brand-light rounded-xl px-4 py-3 text-brand-dark text-xs">
            <strong>Demo credentials pre-filled</strong> — click Sign In to explore.
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-gray-700 text-xs font-semibold mb-1.5">Mobile Number</label>
              <input
                id="login-mobile"
                type="tel"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="+91 9876543210"
                required
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-mid bg-white"
              />
            </div>
            <div>
              <label className="block text-gray-700 text-xs font-semibold mb-1.5">Password</label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your password"
                  required
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-brand-mid bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              id="login-submit-btn"
              type="submit"
              disabled={loading}
              className="w-full bg-brand-mid hover:bg-brand-dark text-white font-semibold py-3 rounded-xl text-sm transition-colors disabled:opacity-60"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <p className="text-center text-gray-400 text-xs mt-6">
            Don't have an account?{" "}
            <Link to="/signup" className="text-brand-mid font-semibold hover:underline">Sign up free</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
