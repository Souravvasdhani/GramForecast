/**
 * App.jsx — React Router routes + auth guard.
 */
import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { TutorialProvider } from "./context/TutorialContext";
import { LanguageProvider } from "./context/LanguageContext";
import Onboarding from "./components/onboarding/Onboarding";
import KiranaSahayak from "./components/assistant/KiranaSahayak";

const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const DemandPrediction = lazy(() => import("./pages/DemandPrediction"));
const SalesAnalytics = lazy(() => import("./pages/StubPages").then((module) => ({ default: module.SalesAnalytics })));
const InventoryPage = lazy(() => import("./pages/StubPages").then((module) => ({ default: module.InventoryPage })));
const PlanningPage = lazy(() => import("./pages/StubPages").then((module) => ({ default: module.PlanningPage })));
const MarketTrends = lazy(() => import("./pages/StubPages").then((module) => ({ default: module.MarketTrends })));
const ForecastReports = lazy(() => import("./pages/StubPages").then((module) => ({ default: module.ForecastReports })));
const AlertsPage = lazy(() => import("./pages/StubPages").then((module) => ({ default: module.AlertsPage })));
const SettingsPage = lazy(() => import("./pages/StubPages").then((module) => ({ default: module.SettingsPage })));
const HelpPage = lazy(() => import("./pages/StubPages").then((module) => ({ default: module.HelpPage })));
const CreditLedger = lazy(() => import("./pages/CreditLedger"));

// Auth guard
function PrivateRoute({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function AppRoutes() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-500">Loading...</div>}>
      <Routes>
      <Route path="/login"  element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/"        element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/demand"  element={<PrivateRoute><DemandPrediction /></PrivateRoute>} />
      <Route path="/sales"   element={<PrivateRoute><SalesAnalytics /></PrivateRoute>} />
      <Route path="/credit"  element={<PrivateRoute><CreditLedger /></PrivateRoute>} />
      <Route path="/inventory" element={<PrivateRoute><InventoryPage /></PrivateRoute>} />
      <Route path="/planning"  element={<PrivateRoute><PlanningPage /></PrivateRoute>} />
      <Route path="/market"    element={<PrivateRoute><MarketTrends /></PrivateRoute>} />
      <Route path="/reports"   element={<PrivateRoute><ForecastReports /></PrivateRoute>} />
      <Route path="/alerts"    element={<PrivateRoute><AlertsPage /></PrivateRoute>} />
      <Route path="/settings"  element={<PrivateRoute><SettingsPage /></PrivateRoute>} />
      <Route path="/help"      element={<PrivateRoute><HelpPage /></PrivateRoute>} />
      <Route path="*"          element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <TutorialProvider>
        <LanguageProvider>
          <AuthProvider>
            <AppRoutes />
            <Onboarding />
            <KiranaSahayak />
          </AuthProvider>
        </LanguageProvider>
      </TutorialProvider>
    </BrowserRouter>
  );
}
