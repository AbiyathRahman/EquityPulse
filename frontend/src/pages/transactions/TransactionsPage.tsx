import { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "../../components/dashboard/DashboardLayout";
import { getJson } from "../../utils/api";
import {
  getDefaultPortfolioId,
  setDefaultPortfolioId,
} from "../../utils/portfolioPrefs";
import { getStoredUserProfile } from "../../utils/userProfile";
import type { TransactionRow, PortfolioSummary } from "../../stores/usePortfolioStore";

type TransactionsResponse = {
  balance: number;
  transactions: TransactionRow[];
};

type PortfolioListResponse = { portfolios: PortfolioSummary[] };

type SortKey = "date-desc" | "date-asc" | "value-desc" | "value-asc" | "symbol";
type DateFilter = "30d" | "1y" | "all";

const pageSize = 10;

const formatCurrency = (value?: number | null) =>
  typeof value === "number"
    ? value.toLocaleString(undefined, { style: "currency", currency: "USD" })
    : "--";

const formatDate = (value?: string) =>
  value ? new Date(value).toLocaleString() : "--";

const computeRealizedByRow = (rows: TransactionRow[]) => {
  // FIFO cost basis approximation per symbol
  const basis: Record<
    string,
    { qty: number; costBasis: number } // avg cost
  > = {};
  const realized: Record<
    number,
    { pnl: number; returnPct: number | null }
  > = {};

  const ordered = [...rows].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  ordered.forEach((tx) => {
    const symbol = tx.symbol.toUpperCase();
    const price = tx.priceAtExecution ?? 0;
    const qty = tx.amount ?? 0;
    const entry = basis[symbol] ?? { qty: 0, costBasis: 0 };

    if (tx.type === "buy") {
      const totalCostBefore = entry.costBasis * entry.qty;
      const totalCostAfter = totalCostBefore + qty * price;
      const qtyAfter = entry.qty + qty;
      basis[symbol] = {
        qty: qtyAfter,
        costBasis: qtyAfter > 0 ? totalCostAfter / qtyAfter : 0,
      };
      realized[tx.id] = { pnl: 0, returnPct: null };
    } else if (tx.type === "sell") {
      const avgCost = entry.costBasis || 0;
      const pnl = (price - avgCost) * qty;
      const returnPct = avgCost === 0 ? null : ((price - avgCost) / avgCost) * 100;
      realized[tx.id] = { pnl, returnPct };
      const qtyAfter = entry.qty - qty;
      basis[symbol] = {
        qty: Math.max(0, qtyAfter),
        costBasis: entry.costBasis,
      };
    }
  });

  return realized;
};

export const TransactionsPage = () => {
  const storedProfile = useMemo(() => getStoredUserProfile(), []);
  const [portfolios, setPortfolios] = useState<PortfolioSummary[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(
    getDefaultPortfolioId()
  );
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [balance, setBalance] = useState<number | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [symbolFilter, setSymbolFilter] = useState<string>("all");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("date-desc");
  const [page, setPage] = useState(1);

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

  const loadTransactions = async (portfolioId: number) => {
    try {
      const res = await getJson<TransactionsResponse>(
        `/transaction/get/${portfolioId}`
      );
      setBalance(res.balance ?? null);
      setTransactions(res.transactions ?? []);
      setStatus(null);
      setError(null);
      setPage(1);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load transactions."
      );
    }
  };

  useEffect(() => {
    loadPortfolios();
  }, []);

  useEffect(() => {
    if (selectedId) {
      loadTransactions(selectedId);
    }
  }, [selectedId]);

  const realizedMap = useMemo(
    () => computeRealizedByRow(transactions),
    [transactions]
  );

  const filtered = useMemo(() => {
    const now = new Date();
    const since =
      dateFilter === "30d"
        ? new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        : dateFilter === "1y"
          ? new Date(new Date().setFullYear(now.getFullYear() - 1))
          : null;

    return transactions
      .filter((tx) => {
        if (symbolFilter !== "all" && tx.symbol.toUpperCase() !== symbolFilter)
          return false;
        if (actionFilter !== "all" && tx.type !== actionFilter) return false;
        if (since && new Date(tx.createdAt) < since) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortKey === "date-desc") {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        if (sortKey === "date-asc") {
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        }
        const valA = (a.amount ?? 0) * (a.priceAtExecution ?? 0);
        const valB = (b.amount ?? 0) * (b.priceAtExecution ?? 0);
        if (sortKey === "value-desc") return valB - valA;
        if (sortKey === "value-asc") return valA - valB;
        return a.symbol.localeCompare(b.symbol);
      });
  }, [transactions, symbolFilter, actionFilter, dateFilter, sortKey]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  const summary = useMemo(() => {
    const buys = filtered.filter((t) => t.type === "buy");
    const sells = filtered.filter((t) => t.type === "sell");
    const invested = buys.reduce(
      (sum, t) => sum + (t.amount ?? 0) * (t.priceAtExecution ?? 0),
      0
    );
    const realizedPnL = sells.reduce((sum, t) => {
      const pnl = realizedMap[t.id]?.pnl ?? 0;
      return sum + pnl;
    }, 0);
    const totalTrades = filtered.length;
    const sellReturns = sells
      .map((t) => realizedMap[t.id]?.returnPct)
      .filter((v): v is number => typeof v === "number");
    const avgSellReturn =
      sellReturns.length > 0
        ? sellReturns.reduce((a, b) => a + b, 0) / sellReturns.length
        : null;
    const wins = sells.filter((t) => (realizedMap[t.id]?.pnl ?? 0) > 0).length;
    const winRate =
      sells.length > 0 ? Math.round((wins / sells.length) * 100) : null;

    return {
      invested,
      realizedPnL,
      totalTrades,
      avgSellReturn,
      winRate,
    };
  }, [filtered, realizedMap]);

  const symbols = useMemo(
    () => Array.from(new Set(transactions.map((t) => t.symbol.toUpperCase()))),
    [transactions]
  );

  return (
    <DashboardLayout
      userName={storedProfile.name}
      userEmail={storedProfile.email}
    >
      <div className="space-y-6 pb-16">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-primary-500">
              Transactions
            </p>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
              Executed trades ledger by portfolio
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Filter by symbol, action, date, and sort. This table only shows executed transactions (no open orders).
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200/70 bg-white px-4 py-3 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <p className="font-semibold text-slate-900 dark:text-white">
              Balance: {formatCurrency(balance)}
            </p>
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

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-3xl border border-slate-200/70 bg-white/90 px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Total invested (filtered)
            </p>
            <p className="text-lg font-semibold text-slate-900 dark:text-white">
              {formatCurrency(summary.invested)}
            </p>
          </div>
          <div className="rounded-3xl border border-slate-200/70 bg-white/90 px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Realized P/L
            </p>
            <p
              className={`text-lg font-semibold ${
                (summary.realizedPnL ?? 0) >= 0
                  ? "text-emerald-500"
                  : "text-rose-400"
              }`}
            >
              {formatCurrency(summary.realizedPnL)}
            </p>
          </div>
          <div className="rounded-3xl border border-slate-200/70 bg-white/90 px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Total trades
            </p>
            <p className="text-lg font-semibold text-slate-900 dark:text-white">
              {summary.totalTrades}
            </p>
          </div>
          <div className="rounded-3xl border border-slate-200/70 bg-white/90 px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Avg sell return / Win rate
            </p>
            <p className="text-lg font-semibold text-slate-900 dark:text-white">
              {summary.avgSellReturn !== null
                ? `${summary.avgSellReturn.toFixed(2)}%`
                : "--"}{" "}
              <span className="text-sm text-slate-500 dark:text-slate-400">
                | {summary.winRate !== null ? `${summary.winRate}%` : "--"} win rate
              </span>
            </p>
          </div>
        </div>

        <section className="rounded-3xl border border-slate-200/70 bg-white/95 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white px-3 py-2 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-950/60">
              <span className="text-xs font-semibold text-slate-500">
                Portfolio
              </span>
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
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white px-3 py-2 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-950/60">
              <span className="text-xs font-semibold text-slate-500">Symbol</span>
              <select
                className="bg-transparent text-sm font-semibold text-slate-900 outline-none dark:text-white"
                value={symbolFilter}
                onChange={(e) => setSymbolFilter(e.target.value)}
              >
                <option value="all">All</option>
                {symbols.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white px-3 py-2 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-950/60">
              <span className="text-xs font-semibold text-slate-500">Action</span>
              <select
                className="bg-transparent text-sm font-semibold text-slate-900 outline-none dark:text-white"
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
              >
                <option value="all">All</option>
                <option value="buy">Buy</option>
                <option value="sell">Sell</option>
              </select>
            </div>
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white px-3 py-2 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-950/60">
              <span className="text-xs font-semibold text-slate-500">Date</span>
              <select
                className="bg-transparent text-sm font-semibold text-slate-900 outline-none dark:text-white"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as DateFilter)}
              >
                <option value="all">All time</option>
                <option value="30d">Last 30 days</option>
                <option value="1y">Last year</option>
              </select>
            </div>
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white px-3 py-2 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-950/60">
              <span className="text-xs font-semibold text-slate-500">Sort</span>
              <select
                className="bg-transparent text-sm font-semibold text-slate-900 outline-none dark:text-white"
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
              >
                <option value="date-desc">Date (newest)</option>
                <option value="date-asc">Date (oldest)</option>
                <option value="value-desc">Value (high)</option>
                <option value="value-asc">Value (low)</option>
                <option value="symbol">Symbol</option>
              </select>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200/70 bg-white/95 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
          {filtered.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No transactions found for the selected filters.
            </p>
          ) : (
            <div className="overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="text-xs uppercase text-slate-400">
                  <tr>
                    <th className="px-3 py-2 text-left">Date</th>
                    <th className="px-3 py-2 text-left">Symbol</th>
                    <th className="px-3 py-2 text-left">Action</th>
                    <th className="px-3 py-2 text-left">Qty</th>
                    <th className="px-3 py-2 text-left">Price</th>
                    <th className="px-3 py-2 text-left">Value</th>
                    <th className="px-3 py-2 text-left">Result (Realized)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paged.map((tx) => {
                    const value = (tx.amount ?? 0) * (tx.priceAtExecution ?? 0);
                    const realized = realizedMap[tx.id];
                    return (
                      <tr key={tx.id} className="text-slate-800 dark:text-slate-100">
                        <td className="px-3 py-2">{formatDate(tx.createdAt)}</td>
                        <td className="px-3 py-2 font-semibold">{tx.symbol}</td>
                        <td className="px-3 py-2 uppercase">{tx.type}</td>
                        <td className="px-3 py-2">{tx.amount}</td>
                        <td className="px-3 py-2">{formatCurrency(tx.priceAtExecution)}</td>
                        <td className="px-3 py-2">{formatCurrency(value)}</td>
                        <td className="px-3 py-2">
                          {tx.type === "sell" ? (
                            <span
                              className={
                                (realized?.pnl ?? 0) >= 0
                                  ? "text-emerald-500 font-semibold"
                                  : "text-rose-400 font-semibold"
                              }
                            >
                              {formatCurrency(realized?.pnl ?? 0)}
                              {realized?.returnPct !== null &&
                                ` (${realized.returnPct?.toFixed(2)}%)`}
                            </span>
                          ) : (
                            "--"
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4 flex items-center justify-between text-sm">
            <button
              type="button"
              className="rounded-xl border border-slate-200/70 px-3 py-2 font-semibold text-slate-600 transition hover:-translate-y-0.5 hover:border-primary-200 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Prev
            </button>
            <span className="text-slate-500 dark:text-slate-400">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              className="rounded-xl border border-slate-200/70 px-3 py-2 font-semibold text-slate-600 transition hover:-translate-y-0.5 hover:border-primary-200 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Next
            </button>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
};

export default TransactionsPage;
