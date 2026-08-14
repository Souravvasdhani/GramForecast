/**
 * App.jsx — React Router routes + auth guard.
 */
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";

import Login           from "./pages/Login";
import Signup          from "./pages/Signup";
import Dashboard       from "./pages/Dashboard";
import DemandPrediction from "./pages/DemandPrediction";
import {
  SalesAnalytics, InventoryPage, PlanningPage, MarketTrends,
  ForecastReports, AlertsPage, SettingsPage, HelpPage,
} from "./pages/StubPages";

// Auth guard
function PrivateRoute({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login"  element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/"        element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/demand"  element={<PrivateRoute><DemandPrediction /></PrivateRoute>} />
      <Route path="/sales"   element={<PrivateRoute><SalesAnalytics /></PrivateRoute>} />
      <Route path="/inventory" element={<PrivateRoute><InventoryPage /></PrivateRoute>} />
      <Route path="/planning"  element={<PrivateRoute><PlanningPage /></PrivateRoute>} />
      <Route path="/market"    element={<PrivateRoute><MarketTrends /></PrivateRoute>} />
      <Route path="/reports"   element={<PrivateRoute><ForecastReports /></PrivateRoute>} />
      <Route path="/alerts"    element={<PrivateRoute><AlertsPage /></PrivateRoute>} />
      <Route path="/settings"  element={<PrivateRoute><SettingsPage /></PrivateRoute>} />
      <Route path="/help"      element={<PrivateRoute><HelpPage /></PrivateRoute>} />
      <Route path="*"          element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
