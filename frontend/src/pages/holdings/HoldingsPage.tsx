import { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "../../components/dashboard/DashboardLayout";
import { HoldingsTable } from "../../components/dashboard/HoldingsTable";
import { getJson } from "../../utils/api";
import {
  getDefaultPortfolioId,
  setDefaultPortfolioId,
} from "../../utils/portfolioPrefs";
import { getStoredUserProfile } from "../../utils/userProfile";
import { usePortfolioStore, type HoldingRow, type PortfolioSummary } from "../../stores/usePortfolioStore";
import { useLivePriceFeed } from "../../hooks/useLivePriceFeed";

type HoldingsResponse = {
  portfolioId: number;
  portfolioName: string;
  balance: number;
  holdings: HoldingRow[];
};

type PortfolioListResponse = { portfolios: PortfolioSummary[] };

const formatCurrency = (value?: number | null) =>
  typeof value === "number"
    ? value.toLocaleString(undefined, { style: "currency", currency: "USD" })
    : "--";

export const HoldingsPage = () => {
  const storedProfile = useMemo(() => getStoredUserProfile(), []);
  const [portfolios, setPortfolios] = useState<PortfolioSummary[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(
    getDefaultPortfolioId()
  );
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const holdings = usePortfolioStore((state) => state.holdings);
  const setHoldings = usePortfolioStore((state) => state.setHoldings);
  const symbols = useMemo(
    () => holdings.map((h) => h.symbol).filter(Boolean),
    [holdings]
  );
  useLivePriceFeed(symbols);

  const loadPortfolios = async () => {
    try {
      const res = await getJson<PortfolioListResponse>("/portfolio/get");
      const list = res.portfolios ?? [];
      setPortfolios(list);
      if (!selectedId && list.length) {
        setSelectedId(list[0].id);
        setDefaultPortfolioId(list[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load portfolios.");
    }
  };

  const loadHoldings = async (portfolioId: number) => {
    setLoading(true);
    setError(null);
    setStatus(null);
    try {
      const res = await getJson<HoldingsResponse>(
        `/portfolio/holdings/${portfolioId}`
      );
      setHoldings(res.holdings ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load holdings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPortfolios();
  }, []);

  useEffect(() => {
    if (selectedId) {
      loadHoldings(selectedId);
    }
  }, [selectedId]);

  type Totals = {
    totalValue: number;
    totalCost: number;
    unrealized: number;
    best: { symbol: string; pct: number } | null;
    worst: { symbol: string; pct: number } | null;
    count: number;
  };

  const totals: Totals = useMemo(() => {
    const totalValue = holdings.reduce((sum, h) => {
      const positionValue =
        typeof h.totalValue === "number"
          ? h.totalValue
          : h.quantity * (h.livePrice ?? h.avgCost);
      return sum + positionValue;
    }, 0);
    const totalCost = holdings.reduce(
      (sum, h) => sum + h.quantity * h.avgCost,
      0
    );
    const unrealized = totalValue - totalCost;

    let best: Totals["best"] = null;
    let worst: Totals["worst"] = null;
    holdings.forEach((h) => {
      const pct = h.gainLossPct ?? 0;
      if (best === null || pct > best.pct) best = { symbol: h.symbol, pct };
      if (worst === null || pct < worst.pct) worst = { symbol: h.symbol, pct };
    });

    return {
      totalValue,
      totalCost,
      unrealized,
      best,
      worst,
      count: holdings.length,
    };
  }, [holdings]);

  return (
    <DashboardLayout
      userName={storedProfile.name}
      userEmail={storedProfile.email}
    >
      <div className="space-y-6 pb-16">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-primary-500">
              Holdings
            </p>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
              Current positions with real-time pricing
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              See quantities, cost basis, live prices, and portfolio allocation. No transactions or orders here.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white px-3 py-2 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <span className="text-xs font-semibold text-slate-500">Portfolio</span>
            <select
              className="bg-transparent text-sm font-semibold text-slate-900 outline-none dark:text-white"
              value={selectedId ?? ""}
              onChange={(e) => {
                const id = Number(e.target.value);
                setSelectedId(Number.isFinite(id) ? id : null);
                if (Number.isFinite(id)) setDefaultPortfolioId(id);
              }}
            >
              {portfolios.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (#{p.id})
                </option>
              ))}
            </select>
          </div>
        </header>

        {(error || status) && (
          <div
            className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
              error
                ? "border-rose-200/70 bg-rose-50 text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-100"
                : "border-emerald-200/70 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-100"
            }`}
          >
            {error ?? status}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-3xl border border-slate-200/70 bg-white/90 px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Total holdings value
            </p>
            <p className="text-lg font-semibold text-slate-900 dark:text-white">
              {formatCurrency(totals.totalValue)}
            </p>
          </div>
          <div className="rounded-3xl border border-slate-200/70 bg-white/90 px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Total cost basis
            </p>
            <p className="text-lg font-semibold text-slate-900 dark:text-white">
              {formatCurrency(totals.totalCost)}
            </p>
          </div>
          <div className="rounded-3xl border border-slate-200/70 bg-white/90 px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Unrealized gain
            </p>
            <p
              className={`text-lg font-semibold ${
                (totals.unrealized ?? 0) >= 0 ? "text-emerald-500" : "text-rose-400"
              }`}
            >
              {formatCurrency(totals.unrealized)}
            </p>
          </div>
          <div className="rounded-3xl border border-slate-200/70 bg-white/90 px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Best performer
            </p>
            <p className="text-lg font-semibold text-slate-900 dark:text-white">
              {totals.best
                ? `${totals.best?.symbol ?? ""} ${totals.best?.pct?.toFixed(2) ?? ""}%`
                : "--"}
            </p>
          </div>
          <div className="rounded-3xl border border-slate-200/70 bg-white/90 px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Worst performer
            </p>
            <p className="text-lg font-semibold text-slate-900 dark:text-white">
              {totals.worst
                ? `${totals.worst?.symbol ?? ""} ${totals.worst?.pct?.toFixed(2) ?? ""}%`
                : "--"}
            </p>
          </div>
          <div className="rounded-3xl border border-slate-200/70 bg-white/90 px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 md:col-span-2 lg:col-span-5">
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Assets held
            </p>
            <p className="text-lg font-semibold text-slate-900 dark:text-white">
              {totals.count}
            </p>
          </div>
        </div>

        <HoldingsTable loading={loading} portfolioValue={totals.totalValue} />
      </div>
    </DashboardLayout>
  );
};

export default HoldingsPage;
