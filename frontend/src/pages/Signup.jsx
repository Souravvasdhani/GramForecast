/**
 * Signup page — simple business onboarding form for the demo.
 */
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Leaf, Eye, EyeOff, AlertCircle, CheckCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";

const initialForm = {
  business_name: "Ramesh Kirana & Oil Mill",
  owner_name: "Ramesh Yadav",
  mobile: "9876543210",
  email: "ramesh.yadav@example.com",
  password: "Demo@12345",
  business_category: "kirana_store",
  location: "Rampur Village, Bijnor, Uttar Pradesh",
};

export default function Signup() {
  const { signup } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const validate = (values) => {
    const nextErrors = {};
    if (!values.business_name.trim()) nextErrors.business_name = "Business name is required.";
    if (!values.owner_name.trim()) nextErrors.owner_name = "Owner name is required.";
    if (!/^[6-9]\d{9}$/.test(values.mobile.trim())) nextErrors.mobile = "Enter a valid 10-digit Indian mobile number starting with 6-9.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) nextErrors.email = "Enter a valid email address.";
    if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(values.password)) nextErrors.password = "Password must be at least 8 characters with at least 1 letter and 1 number.";
    if (!values.business_category.trim()) nextErrors.business_category = "Business category is required.";
    if (!values.location.trim()) nextErrors.location = "Location is required.";
    return nextErrors;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const nextForm = { ...form, [name]: value };
    setForm(nextForm);
    setFieldErrors((current) => ({ ...current, [name]: validate(nextForm)[name] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate(form);
    setFieldErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;
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
              <input name="business_name" value={form.business_name} onChange={handleChange} required aria-invalid={!!fieldErrors.business_name} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-mid bg-white" />
              {fieldErrors.business_name && <p className="mt-1 text-xs text-red-600">{t(fieldErrors.business_name)}</p>}
            </div>
            <div>
              <label className="block text-gray-700 text-xs font-semibold mb-1.5">Owner Name</label>
              <input name="owner_name" value={form.owner_name} onChange={handleChange} required aria-invalid={!!fieldErrors.owner_name} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-mid bg-white" />
              {fieldErrors.owner_name && <p className="mt-1 text-xs text-red-600">{t(fieldErrors.owner_name)}</p>}
            </div>
            <div>
              <label className="block text-gray-700 text-xs font-semibold mb-1.5">Mobile Number</label>
              <input name="mobile" value={form.mobile.replace(/^\+91/, "")} onChange={(e) => handleChange({ target: { name: "mobile", value: e.target.value.replace(/\D/g, "") } })} required inputMode="numeric" maxLength={10} aria-invalid={!!fieldErrors.mobile} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-mid bg-white" />
              {fieldErrors.mobile && <p className="mt-1 text-xs text-red-600">{t(fieldErrors.mobile)}</p>}
            </div>
            <div>
              <label className="block text-gray-700 text-xs font-semibold mb-1.5">Email</label>
              <input type="email" name="email" value={form.email} onChange={handleChange} required aria-invalid={!!fieldErrors.email} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-mid bg-white" />
              {fieldErrors.email && <p className="mt-1 text-xs text-red-600">{t(fieldErrors.email)}</p>}
            </div>
            <div>
              <label className="block text-gray-700 text-xs font-semibold mb-1.5">Business Category</label>
              <select name="business_category" value={form.business_category} onChange={handleChange} aria-invalid={!!fieldErrors.business_category} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-mid bg-white">
                <option value="kirana_store">Kirana Store</option>
                <option value="oil_mill">Oil Mill</option>
                <option value="flour_mill">Flour Mill</option>
                <option value="spice_trader">Spice Trader</option>
                <option value="dairy">Dairy</option>
                <option value="handicraft">Handicraft</option>
              </select>
              {fieldErrors.business_category && <p className="mt-1 text-xs text-red-600">{t(fieldErrors.business_category)}</p>}
            </div>
            <div>
              <label className="block text-gray-700 text-xs font-semibold mb-1.5">Location</label>
              <input name="location" value={form.location} onChange={handleChange} required aria-invalid={!!fieldErrors.location} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-mid bg-white" />
              {fieldErrors.location && <p className="mt-1 text-xs text-red-600">{t(fieldErrors.location)}</p>}
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
                aria-invalid={!!fieldErrors.password}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-brand-mid bg-white"
              />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {fieldErrors.password && <p className="mt-1 text-xs text-red-600">{t(fieldErrors.password)}</p>}
          </div>

          <button type="submit" disabled={loading || Object.keys(validate(form)).length > 0} className="w-full bg-brand-mid hover:bg-brand-dark text-white font-semibold py-3 rounded-xl text-sm transition-colors disabled:opacity-60">
            {loading ? t("Creating account...") : t("Create Account")}
          </button>

          <p className="text-center text-gray-400 text-xs">
            Already have an account? <Link to="/login" className="text-brand-mid font-semibold hover:underline">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
