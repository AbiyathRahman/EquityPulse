import { useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { DashboardLayout } from "../../components/dashboard/DashboardLayout";
import { PortfolioSummaryHeader } from "../../components/dashboard/PortfolioSummaryHeader";
import { PortfolioChart } from "../../components/dashboard/PortfolioChart";
import { MetricCards } from "../../components/dashboard/MetricCards";
import { RealTimeGainTicker } from "../../components/dashboard/RealTimeGainTicker";
import { SnapshotHistory } from "../../components/dashboard/SnapshotHistory";
import { usePortfolioData } from "../../hooks/usePortfolioData";
import { useLivePortfolioFeed } from "../../hooks/useLivePortfolioFeed";
import { usePortfolioStore } from "../../stores/usePortfolioStore";
import { getStoredUserProfile } from "../../utils/userProfile";

const DashboardPage = () => {
  const { portfolioId } = useParams();
  const parsedPortfolioId = portfolioId ? Number(portfolioId) : null;
  const selectedId = Number.isFinite(parsedPortfolioId ?? NaN)
    ? parsedPortfolioId
    : null;

  usePortfolioData(selectedId ?? undefined);
  const portfolio = usePortfolioStore((state) => state.portfolio);
  const analytics = usePortfolioStore((state) => state.analytics);
  const isLoading = usePortfolioStore((state) => state.isLoading);
  const error = usePortfolioStore((state) => state.error);

  const { connect, disconnect } = useLivePortfolioFeed(portfolio?.id);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  const storedProfile = useMemo(() => getStoredUserProfile(), []);
  const userName = storedProfile.name ?? portfolio?.ownerName ?? null;
  const userEmail = storedProfile.email ?? portfolio?.ownerEmail ?? null;

  if (isLoading) {
    return (
      <DashboardLayout userName={userName} userEmail={userEmail}>
        <div className="rounded-3xl border border-slate-200/70 bg-white/90 p-12 text-center text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300">
          Loading your portfolio workspace...
        </div>
      </DashboardLayout>
    );
  }

  if (!portfolio) {
    return (
      <DashboardLayout userName={userName} userEmail={userEmail}>
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white/80 p-16 text-center dark:border-slate-700 dark:bg-slate-900/60">
          <p className="text-2xl font-semibold text-slate-900 dark:text-white">
            No portfolios available
          </p>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
            Create a portfolio to start tracking live performance, gain/loss, and historical snapshots.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userName={userName} userEmail={userEmail}>
      <div className="space-y-6 pb-16">
        <header className="flex flex-col gap-2">
          <p className="text-sm uppercase tracking-[0.35em] text-primary-500">
            Portfolio Overview
          </p>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
            Live portfolio health across value, gain/loss, and history
          </h1>
        </header>

        <PortfolioSummaryHeader
          value={analytics?.totalValue}
          gainLoss={analytics?.gainLoss}
          gainLossPct={analytics?.gainLossPercentage}
          updatedAt={analytics?.lastUpdated}
          loading={isLoading}
          error={error}
        />

        <RealTimeGainTicker />

        <PortfolioChart portfolioId={portfolio.id} />

        <MetricCards analytics={analytics ?? null} loading={isLoading} />

        <SnapshotHistory />
      </div>
    </DashboardLayout>
  );
};

export default DashboardPage;
