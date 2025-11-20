import { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "../../components/dashboard/DashboardLayout";
import { connectSocket, socket } from "../../lib/socketClient";
import { deleteJson, getJson, postJson } from "../../utils/api";
import { getStoredUserProfile } from "../../utils/userProfile";
import {
  getDefaultPortfolioId,
  setDefaultPortfolioId,
} from "../../utils/portfolioPrefs";
import type { PortfolioSummary } from "../../stores/usePortfolioStore";

type PendingOrder = {
  id: number;
  symbol: string;
  side: string;
  type: string;
  quantity: number;
  limitPrice?: number | null;
  stopPrice?: number | null;
  status: string;
  createdAt?: string;
};

type HistoryOrder = PendingOrder & {
  priceAtExecution?: number | null;
  executedAt?: string | null;
};

type PortfolioListResponse = { portfolios: PortfolioSummary[] };

type AnalyticsResponse = {
  cashBalance: number;
  totalValue: number;
  gainLoss: number;
  gainLossPercentage: number;
};

const formatCurrency = (value?: number | null) =>
  typeof value === "number"
    ? value.toLocaleString(undefined, { style: "currency", currency: "USD" })
    : "--";

const orderTypes = ["market", "limit", "stop"] as const;
const sides = [
  { key: "buy", label: "Buy" },
  { key: "sell", label: "Sell" },
] as const;

export const TradesPage = () => {
  const storedProfile = useMemo(() => getStoredUserProfile(), []);
  const [portfolios, setPortfolios] = useState<PortfolioSummary[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(
    getDefaultPortfolioId()
  );
  const [balance, setBalance] = useState<{ cash?: number; buyingPower?: number; total?: number }>(
    {}
  );
  const [pending, setPending] = useState<PendingOrder[]>([]);
  const [history, setHistory] = useState<HistoryOrder[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [livePrice, setLivePrice] = useState<number | null>(null);
  const [watchSymbol, setWatchSymbol] = useState<string>("");
  const [form, setForm] = useState({
    symbol: "",
    side: "buy",
    type: "market",
    quantity: "",
    limitPrice: "",
    stopPrice: "",
  });

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

  const loadAnalytics = async (portfolioId: number) => {
    try {
      const res = await getJson<AnalyticsResponse>(`/analytics/get/${portfolioId}`);
      setBalance({
        cash: res.cashBalance,
        total: res.totalValue,
        buyingPower: res.cashBalance * 2,
      });
    } catch {
      setBalance({});
    }
  };

  const loadOrders = async (portfolioId: number) => {
    try {
      const [pendingRes, historyRes] = await Promise.all([
        getJson<{ orders: PendingOrder[] }>(`/order/pending/${portfolioId}`),
        getJson<{ orders: HistoryOrder[] }>(`/order/history/${portfolioId}`),
      ]);
      setPending(pendingRes.orders ?? []);
      setHistory(historyRes.orders ?? []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load orders."
      );
    }
  };

  useEffect(() => {
    loadPortfolios();
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    loadAnalytics(selectedId);
    loadOrders(selectedId);
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    connectSocket();
    socket.emit("subscribe-portfolio", selectedId);
    const handleFilled = () => {
      loadOrders(selectedId);
      loadAnalytics(selectedId);
    };
    const handleUpdated = () => loadOrders(selectedId);
    socket.off("order-filled").on("order-filled", handleFilled);
    socket.off("order-updated").on("order-updated", handleUpdated);
    return () => {
      socket.emit("unsubscribe-portfolio", selectedId);
      socket.off("order-filled", handleFilled);
      socket.off("order-updated", handleUpdated);
    };
  }, [selectedId]);

  useEffect(() => {
    const symbol = form.symbol.trim().toUpperCase();
    if (!symbol) return;
    connectSocket();
    socket.emit("subscribe", [symbol]);
    const handler = (payload: { symbol: string; price: number }) => {
      if (payload.symbol.toUpperCase() === symbol) {
        setLivePrice(payload.price);
      }
    };
    socket.off("price-update").on("price-update", handler);
    setWatchSymbol(symbol);
    return () => {
      socket.emit("unsubscribe", [symbol]);
      socket.off("price-update", handler);
    };
  }, [form.symbol]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedId) {
      setError("Select a portfolio first.");
      return;
    }
    setStatus(null);
    setError(null);
    const qty = Number(form.quantity);
    if (!form.symbol.trim() || !Number.isFinite(qty) || qty <= 0) {
      setError("Enter a symbol and a positive quantity.");
      return;
    }
    const payload: Record<string, unknown> = {
      portfolioId: selectedId,
      symbol: form.symbol.trim().toUpperCase(),
      side: form.side,
      type: form.type,
      quantity: qty,
    };
    if (form.type === "limit") payload.limitPrice = Number(form.limitPrice);
    if (form.type === "stop") payload.stopPrice = Number(form.stopPrice);
    try {
      await postJson("/order/place", payload);
      setStatus("Order submitted.");
      setForm((prev) => ({
        ...prev,
        quantity: "",
        limitPrice: "",
        stopPrice: "",
      }));
      await loadOrders(selectedId);
      await loadAnalytics(selectedId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to place order.");
    }
  };

  const handleCancel = async (orderId: number) => {
    try {
      await deleteJson(`/order/${orderId}`);
      setStatus("Order cancelled.");
      if (selectedId) {
        await loadOrders(selectedId);
        await loadAnalytics(selectedId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to cancel order.");
    }
  };

  return (
    <DashboardLayout
      userName={storedProfile.name}
      userEmail={storedProfile.email}
    >
      <div className="space-y-6 pb-16">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-primary-500">
              Trades
            </p>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
              Place and manage orders with live updates
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Send market, limit, and stop orders. Monitor open and filled orders—no charts or holdings here.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200/70 bg-white px-4 py-3 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <p className="font-semibold text-slate-900 dark:text-white">
              Cash: {formatCurrency(balance.cash)}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Buying power: {formatCurrency(balance.buyingPower)}
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

        <section className="grid gap-4 rounded-3xl border border-slate-200/70 bg-white/95 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white px-3 py-2 shadow-sm dark:border-slate-700 dark:bg-slate-950/60">
              <span className="text-sm font-semibold text-slate-500">
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
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white px-3 py-2 shadow-sm dark:border-slate-700 dark:bg-slate-950/60">
              <span className="text-sm font-semibold text-slate-500">
                Ticker
              </span>
              <input
                type="text"
                className="w-32 bg-transparent text-sm font-semibold text-slate-900 outline-none dark:text-white"
                placeholder="AAPL"
                value={form.symbol}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, symbol: e.target.value }))
                }
              />
              {watchSymbol && (
                <span className="text-xs text-slate-400">
                  Live: {livePrice ? `$${livePrice.toFixed(2)}` : "--"}
                </span>
              )}
            </div>
            <div className="rounded-2xl border border-slate-200/70 bg-white px-4 py-2 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-950/60">
              Balance: {formatCurrency(balance.total)}
            </div>
          </div>

          <form
            className="grid gap-4 md:grid-cols-4"
            onSubmit={handleSubmit}
          >
            <div className="md:col-span-1 flex items-center gap-2">
              {sides.map((side) => (
                <button
                  key={side.key}
                  type="button"
                  className={`flex-1 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                    form.side === side.key
                      ? "border-primary-300 bg-primary-50 text-primary-700 dark:border-primary-500/40 dark:bg-primary-500/10 dark:text-primary-200"
                      : "border-slate-200 text-slate-600 hover:border-primary-200 dark:border-slate-700 dark:text-slate-300"
                  }`}
                  onClick={() => setForm((prev) => ({ ...prev, side: side.key }))}
                >
                  {side.label}
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-slate-500">
                Order type
              </label>
              <select
                className="rounded-xl border border-slate-200/70 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm outline-none focus:border-primary-300 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                value={form.type}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, type: e.target.value }))
                }
              >
                {orderTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-slate-500">
                Quantity
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.quantity}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, quantity: e.target.value }))
                }
                className="rounded-xl border border-slate-200/70 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none focus:border-primary-300 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                placeholder="10"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-slate-500">
                Limit price
              </label>
              <input
                type="number"
                step="0.01"
                value={form.limitPrice}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, limitPrice: e.target.value }))
                }
                disabled={form.type !== "limit"}
                className="rounded-xl border border-slate-200/70 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none focus:border-primary-300 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                placeholder="182.40"
              />
            </div>
            <div className="flex flex-col gap-2 md:col-span-2">
              <label className="text-xs font-semibold text-slate-500">
                Stop price
              </label>
              <input
                type="number"
                step="0.01"
                value={form.stopPrice}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, stopPrice: e.target.value }))
                }
                disabled={form.type !== "stop"}
                className="rounded-xl border border-slate-200/70 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none focus:border-primary-300 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                placeholder="175.00"
              />
            </div>
            <div className="md:col-span-2 flex items-end">
              <button
                type="submit"
                className="w-full rounded-2xl bg-primary-500 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-primary-900/30 transition hover:brightness-110"
              >
                Submit order
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-3xl border border-slate-200/70 bg-white/95 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Open / Pending Orders
            </h2>
          </div>
          {pending.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No pending orders.
            </p>
          ) : (
            <div className="overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="text-xs uppercase text-slate-400">
                  <tr>
                    <th className="px-3 py-2 text-left">Symbol</th>
                    <th className="px-3 py-2 text-left">Qty</th>
                    <th className="px-3 py-2 text-left">Type</th>
                    <th className="px-3 py-2 text-left">Trigger</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-right">Cancel</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {pending.map((o) => (
                    <tr key={o.id} className="text-slate-800 dark:text-slate-100">
                      <td className="px-3 py-2 font-semibold">{o.symbol}</td>
                      <td className="px-3 py-2">{o.quantity}</td>
                      <td className="px-3 py-2 capitalize">{o.type}</td>
                      <td className="px-3 py-2 text-slate-500 dark:text-slate-400">
                        {o.type === "limit" && o.limitPrice
                          ? `Limit @ $${o.limitPrice}`
                          : o.type === "stop" && o.stopPrice
                            ? `Stop @ $${o.stopPrice}`
                            : "--"}
                      </td>
                      <td className="px-3 py-2 capitalize">{o.status}</td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          className="rounded-xl border border-rose-200/70 px-3 py-1 text-xs font-semibold text-rose-600 transition hover:-translate-y-0.5 hover:border-rose-300 dark:border-rose-500/40 dark:text-rose-200"
                          onClick={() => handleCancel(o.id)}
                        >
                          Cancel
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-slate-200/70 bg-white/95 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Order History (Executed)
            </h2>
          </div>
          {history.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No executed orders yet.
            </p>
          ) : (
            <div className="overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="text-xs uppercase text-slate-400">
                  <tr>
                    <th className="px-3 py-2 text-left">Date</th>
                    <th className="px-3 py-2 text-left">Symbol</th>
                    <th className="px-3 py-2 text-left">Side</th>
                    <th className="px-3 py-2 text-left">Qty</th>
                    <th className="px-3 py-2 text-left">Filled</th>
                    <th className="px-3 py-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {history.map((o) => (
                    <tr key={o.id} className="text-slate-800 dark:text-slate-100">
                      <td className="px-3 py-2">
                        {o.executedAt
                          ? new Date(o.executedAt).toLocaleString()
                          : "--"}
                      </td>
                      <td className="px-3 py-2 font-semibold">{o.symbol}</td>
                      <td className="px-3 py-2 capitalize">{o.side}</td>
                      <td className="px-3 py-2">{o.quantity}</td>
                      <td className="px-3 py-2">
                        {formatCurrency(o.priceAtExecution)}
                      </td>
                      <td className="px-3 py-2 capitalize">{o.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
};

export default TradesPage;
