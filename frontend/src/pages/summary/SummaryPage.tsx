import { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "../../components/dashboard/DashboardLayout";
import { getJson } from "../../utils/api";
import {
  getDefaultPortfolioId,
  setDefaultPortfolioId,
} from "../../utils/portfolioPrefs";
import { getStoredUserProfile } from "../../utils/userProfile";
import type { PortfolioSummary, TransactionRow } from "../../stores/usePortfolioStore";

type SummaryResponse = {
  portfolioId: number;
  portfolioName: string;
  balance: number;
  totalBuys: number;
  totalSells: number;
  totalBuysValue: number;
  totalSellsValue: number;
  profitLoss: number;
  recentTransactions: TransactionRow[];
};

type PortfolioListResponse = { portfolios: PortfolioSummary[] };

const formatCurrency = (value?: number | null) =>
  typeof value === "number"
    ? value.toLocaleString(undefined, { style: "currency", currency: "USD" })
    : "--";

const formatDate = (value?: string) =>
  value ? new Date(value).toLocaleString() : "--";

export const SummaryPage = () => {
  const storedProfile = useMemo(() => getStoredUserProfile(), []);
  const [portfolios, setPortfolios] = useState<PortfolioSummary[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(
    getDefaultPortfolioId()
  );
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
      setError(
        err instanceof Error ? err.message : "Unable to load portfolios."
      );
    }
  };

  const loadSummary = async (portfolioId: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getJson<SummaryResponse>(`/summary/${portfolioId}`);
      setSummary(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load summary.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPortfolios();
  }, []);

  useEffect(() => {
    if (selectedId) {
      loadSummary(selectedId);
    }
  }, [selectedId]);

  return (
    <DashboardLayout
      userName={storedProfile.name}
      userEmail={storedProfile.email}
    >
      <div className="space-y-6 pb-16">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-primary-500">
              Summary
            </p>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
              Portfolio activity overview
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              High-level totals for trades and recent activity.
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

        {error && (
          <div className="rounded-2xl border border-rose-200/70 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-100">
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-3xl border border-slate-200/70 bg-white/90 p-10 text-center text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300">
            Loading summary...
          </div>
        ) : summary ? (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-3xl border border-slate-200/70 bg-white/90 px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Balance
                </p>
                <p className="text-lg font-semibold text-slate-900 dark:text-white">
                  {formatCurrency(summary.balance)}
                </p>
              </div>
              <div className="rounded-3xl border border-slate-200/70 bg-white/90 px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Total buys
                </p>
                <p className="text-lg font-semibold text-slate-900 dark:text-white">
                  {summary.totalBuys} ({formatCurrency(summary.totalBuysValue)})
                </p>
              </div>
              <div className="rounded-3xl border border-slate-200/70 bg-white/90 px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Total sells
                </p>
                <p className="text-lg font-semibold text-slate-900 dark:text-white">
                  {summary.totalSells} ({formatCurrency(summary.totalSellsValue)})
                </p>
              </div>
              <div className="rounded-3xl border border-slate-200/70 bg-white/90 px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Profit / Loss
                </p>
                <p
                  className={`text-lg font-semibold ${
                    summary.profitLoss >= 0 ? "text-emerald-500" : "text-rose-400"
                  }`}
                >
                  {formatCurrency(summary.profitLoss)}
                </p>
              </div>
            </div>

            <section className="rounded-3xl border border-slate-200/70 bg-white/90 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                Recent Transactions
              </h2>
              {summary.recentTransactions.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                  No recent transactions.
                </p>
              ) : (
                <div className="mt-3 overflow-auto">
                  <table className="min-w-full text-sm">
                    <thead className="text-xs uppercase text-slate-400">
                      <tr>
                        <th className="px-3 py-2 text-left">Date</th>
                        <th className="px-3 py-2 text-left">Symbol</th>
                        <th className="px-3 py-2 text-left">Type</th>
                        <th className="px-3 py-2 text-left">Qty</th>
                        <th className="px-3 py-2 text-left">Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {summary.recentTransactions.map((tx) => (
                        <tr key={tx.id} className="text-slate-800 dark:text-slate-100">
                          <td className="px-3 py-2">{formatDate(tx.createdAt)}</td>
                          <td className="px-3 py-2 font-semibold">{tx.symbol}</td>
                          <td className="px-3 py-2 uppercase">{tx.type}</td>
                          <td className="px-3 py-2">{tx.amount}</td>
                          <td className="px-3 py-2">
                            {formatCurrency(tx.priceAtExecution)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        ) : (
          <div className="rounded-3xl border border-slate-200/70 bg-white/90 p-10 text-center text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300">
            Select a portfolio to load summary.
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default SummaryPage;
