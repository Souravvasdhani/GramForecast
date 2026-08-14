/**
 * Signup page — simple business onboarding form for the demo.
 */
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Leaf, Eye, EyeOff, AlertCircle, CheckCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const initialForm = {
  business_name: "Ramesh Kirana & Oil Mill",
  owner_name: "Ramesh Yadav",
  mobile: "+919876543210",
  email: "ramesh.yadav@example.com",
  password: "Demo@12345",
  business_category: "kirana_store",
  location: "Rampur Village, Bijnor, Uttar Pradesh",
};

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await signup({
        business_name: form.business_name,
        owner_name: form.owner_name,
        mobile: form.mobile,
        email: form.email,
        password: form.password,
        business_category: form.business_category,
        location: form.location,
      });
      setSuccess(true);
      setTimeout(() => navigate("/"), 500);
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to create your account right now.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-card border border-gray-100 overflow-hidden">
        <div className="bg-brand-mid px-6 py-5 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
              <Leaf className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-lg">Create your RuralDemand AI account</p>
              <p className="text-green-100 text-xs">Set up your business profile in under a minute.</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-5">
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-green-700 text-sm">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              Account created. Redirecting to dashboard...
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 text-xs font-semibold mb-1.5">Business Name</label>
              <input name="business_name" value={form.business_name} onChange={handleChange} required className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-mid bg-white" />
            </div>
            <div>
              <label className="block text-gray-700 text-xs font-semibold mb-1.5">Owner Name</label>
              <input name="owner_name" value={form.owner_name} onChange={handleChange} required className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-mid bg-white" />
            </div>
            <div>
              <label className="block text-gray-700 text-xs font-semibold mb-1.5">Mobile Number</label>
              <input name="mobile" value={form.mobile} onChange={handleChange} required className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-mid bg-white" />
            </div>
            <div>
              <label className="block text-gray-700 text-xs font-semibold mb-1.5">Email</label>
              <input type="email" name="email" value={form.email} onChange={handleChange} required className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-mid bg-white" />
            </div>
            <div>
              <label className="block text-gray-700 text-xs font-semibold mb-1.5">Business Category</label>
              <select name="business_category" value={form.business_category} onChange={handleChange} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-mid bg-white">
                <option value="kirana_store">Kirana Store</option>
                <option value="oil_mill">Oil Mill</option>
                <option value="flour_mill">Flour Mill</option>
                <option value="spice_trader">Spice Trader</option>
                <option value="dairy">Dairy</option>
                <option value="handicraft">Handicraft</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-700 text-xs font-semibold mb-1.5">Location</label>
              <input name="location" value={form.location} onChange={handleChange} required className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-mid bg-white" />
            </div>
          </div>

          <div>
            <label className="block text-gray-700 text-xs font-semibold mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                name="password"
                value={form.password}
                onChange={handleChange}
                required
                className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-brand-mid bg-white"
              />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full bg-brand-mid hover:bg-brand-dark text-white font-semibold py-3 rounded-xl text-sm transition-colors disabled:opacity-60">
            {loading ? "Creating account..." : "Create Account"}
          </button>

          <p className="text-center text-gray-400 text-xs">
            Already have an account? <Link to="/login" className="text-brand-mid font-semibold hover:underline">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
