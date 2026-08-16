/**
 * API client — wraps axios with auth header injection.
 * Base URL from VITE_API_BASE_URL env var (defaults to localhost:8000).
 */
import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
});

// Inject JWT on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Redirect to /login on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("user");
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);

// ─── Auth ──────────────────────────────────────────────────────────────────
export const login = (mobile, password) =>
  api.post("/auth/login", { mobile, password }).then((r) => r.data);

export const signup = (data) =>
  api.post("/auth/signup", data).then((r) => r.data);

// ─── Dashboard ─────────────────────────────────────────────────────────────
export const fetchDashboardSummary = () =>
  api.get("/dashboard/summary").then((r) => r.data);

// ─── Forecast ──────────────────────────────────────────────────────────────
export const fetchProductForecast = (productId) =>
  api.get(`/forecast/${productId}`).then((r) => r.data);

export const fetchAllForecasts = () =>
  api.get("/forecast/business/all").then((r) => r.data);

export const triggerForecastRun = (businessId) =>
  api.post(`/forecast/run/${businessId}`).then((r) => r.data);

// ─── Products ──────────────────────────────────────────────────────────────
export const fetchProducts = () =>
  api.get("/products/").then((r) => r.data);

// ─── Sales ─────────────────────────────────────────────────────────────────
export const fetchSales = (days = 30) =>
  api.get(`/sales/?days=${days}`).then((r) => r.data);

export const fetchSalesAnalytics = () =>
  api.get("/sales/analytics").then((r) => r.data);

// ─── Inventory ─────────────────────────────────────────────────────────────
export const fetchInventory = () =>
  api.get("/inventory/").then((r) => r.data);

export const fetchInventoryPlanning = () =>
  api.get("/inventory/planning").then((r) => r.data);

// ─── Alerts ────────────────────────────────────────────────────────────────
export const fetchAlerts = () =>
  api.get("/alerts/").then((r) => r.data);

// ─── Market ────────────────────────────────────────────────────────────────
export const fetchMarketTrends = () =>
  api.get("/market/trends").then((r) => r.data);

export default api;
