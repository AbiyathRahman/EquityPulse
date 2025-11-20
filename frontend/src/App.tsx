import { Navigate, Route, Routes } from "react-router-dom";
import type { ReactElement } from "react";
import { RegisterPage } from "./pages/RegisterPage";
import { LoginPage } from "./pages/LoginPage";
import DashboardPage from "./pages/dashboard/page";
import { getToken } from "./utils/api";
import PortfolioHubPage from "./pages/portfolio/PortfolioHubPage";
import TradesPage from "./pages/trades/TradesPage";
import TransactionsPage from "./pages/transactions/TransactionsPage";
import HoldingsPage from "./pages/holdings/HoldingsPage";
import AssetPage from "./pages/asset/AssetPage";
import OrdersPage from "./pages/orders/OrdersPage";
import SummaryPage from "./pages/summary/SummaryPage";
import SettingsPage from "./pages/settings/SettingsPage";

const RequireAuth = ({ children }: { children: ReactElement }) => {
  const token = getToken();
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route
        path="/dashboard"
        element={
          <RequireAuth>
            <DashboardPage />
          </RequireAuth>
        }
      />
      <Route
        path="/dashboard/:portfolioId"
        element={
          <RequireAuth>
            <DashboardPage />
          </RequireAuth>
        }
      />
      <Route
        path="/portfolio"
        element={
          <RequireAuth>
            <PortfolioHubPage />
          </RequireAuth>
        }
      />
      <Route
        path="/portfolio/create"
        element={
          <RequireAuth>
            <PortfolioHubPage />
          </RequireAuth>
        }
      />
      <Route
        path="/trades"
        element={
          <RequireAuth>
            <TradesPage />
          </RequireAuth>
        }
      />
      <Route
        path="/transactions"
        element={
          <RequireAuth>
            <TransactionsPage />
          </RequireAuth>
        }
      />
      <Route
        path="/holdings"
        element={
          <RequireAuth>
            <HoldingsPage />
          </RequireAuth>
        }
      />
      <Route
        path="/asset/:symbol?"
        element={
          <RequireAuth>
            <AssetPage />
          </RequireAuth>
        }
      />
      <Route
        path="/orders"
        element={
          <RequireAuth>
            <OrdersPage />
          </RequireAuth>
        }
      />
      <Route
        path="/summary"
        element={
          <RequireAuth>
            <SummaryPage />
          </RequireAuth>
        }
      />
      <Route
        path="/settings"
        element={
          <RequireAuth>
            <SettingsPage />
          </RequireAuth>
        }
      />
      <Route path="/analytics" element={<Navigate to="/holdings" replace />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
