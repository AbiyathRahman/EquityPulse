import { useEffect } from "react";
import { DashboardLayout } from "../../components/dashboard/DashboardLayout";
import { PortfolioSummaryHeader } from "../../components/dashboard/PortfolioSummaryHeader";
import { PortfolioChart } from "../../components/dashboard/PortfolioChart";
import { MetricCards } from "../../components/dashboard/MetricCards";
import { HoldingsTable } from "../../components/dashboard/HoldingsTable";
import { TransactionsList } from "../../components/dashboard/TransactionsList";
import { OpenOrdersWidget } from "../../components/dashboard/OpenOrdersWidget";
import { QuickActionFab } from "../../components/dashboard/QuickActionFab";
import { usePortfolioData } from "../../hooks/usePortfolioData";
import { useLivePortfolioFeed } from "../../hooks/useLivePortfolioFeed";
import { usePortfolioStore } from "../../stores/usePortfolioStore";

const DashboardPage = () => {
  usePortfolioData();
  const { portfolio, analytics, transactions, orders, isLoading, error } =
    usePortfolioStore((state) => ({
      portfolio: state.portfolio,
      analytics: state.analytics,
      transactions: state.transactions,
      orders: state.orders,
      isLoading: state.isLoading,
      error: state.error,
    }));
  const { connect, disconnect } = useLivePortfolioFeed(portfolio?.id);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="rounded-3xl border border-slate-200/70 bg-white/90 p-12 text-center text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300">
          Loading your portfolio workspace…
        </div>
      </DashboardLayout>
    );
  }

  if (!portfolio && !isLoading) {
    return (
      <DashboardLayout>
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white/70 p-16 text-center dark:border-slate-700 dark:bg-slate-900/50">
          <p className="text-2xl font-semibold text-slate-900 dark:text-white">
            No portfolios available
          </p>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
            Once you create a portfolio, we will stream live performance,
            holdings, and orders here in real time.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      userName={portfolio?.ownerName}
      userEmail={portfolio?.ownerEmail}
    >
      {portfolio && (
        <div className="space-y-8 pb-20">
          <PortfolioSummaryHeader
            value={analytics?.totalValue}
            gainLoss={analytics?.gainLoss}
            gainLossPct={analytics?.gainLossPercentage}
            updatedAt={analytics?.lastUpdated}
            loading={isLoading}
            error={error}
          />
          <PortfolioChart portfolioId={portfolio.id} />
          <MetricCards analytics={analytics ?? null} loading={isLoading} />
          <HoldingsTable loading={isLoading} />
          <div className="grid gap-6 lg:grid-cols-2">
            <TransactionsList transactions={transactions} />
            <OpenOrdersWidget orders={orders} />
          </div>
        </div>
      )}
      <QuickActionFab />
    </DashboardLayout>
  );
};

export default DashboardPage;
