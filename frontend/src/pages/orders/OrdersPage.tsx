import { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "../../components/dashboard/DashboardLayout";
import { getJson, deleteJson } from "../../utils/api";
import {
  getDefaultPortfolioId,
  setDefaultPortfolioId,
} from "../../utils/portfolioPrefs";
import { getStoredUserProfile } from "../../utils/userProfile";
import { connectSocket, socket } from "../../lib/socketClient";
import type { PortfolioSummary } from "../../stores/usePortfolioStore";

type OrderRow = {
  id: number;
  symbol: string;
  side: string;
  type: string;
  quantity: number;
  limitPrice?: number | null;
  stopPrice?: number | null;
  priceAtExecution?: number | null;
  status: string;
  createdAt?: string;
  executedAt?: string | null;
};

type PendingResponse = { orders: OrderRow[] };
type HistoryResponse = { orders: OrderRow[] };
type PortfolioListResponse = { portfolios: PortfolioSummary[] };

type TabKey = "pending" | "filled" | "cancelled";

const formatCurrency = (value?: number | null) =>
  typeof value === "number"
    ? value.toLocaleString(undefined, { style: "currency", currency: "USD" })
    : "--";

const formatDate = (value?: string | null) =>
  value ? new Date(value).toLocaleString() : "--";

const buildTrigger = (order: OrderRow) => {
  if (order.type === "limit" && order.limitPrice) {
    return `Limit @ ${formatCurrency(order.limitPrice)}`;
  }
  if (order.type === "stop" && order.stopPrice) {
    return `Stop @ ${formatCurrency(order.stopPrice)}`;
  }
  return "Market";
};

export const OrdersPage = () => {
  const storedProfile = useMemo(() => getStoredUserProfile(), []);
  const [portfolios, setPortfolios] = useState<PortfolioSummary[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(
    getDefaultPortfolioId()
  );
  const [pending, setPending] = useState<OrderRow[]>([]);
  const [history, setHistory] = useState<OrderRow[]>([]);
  const [livePrices, setLivePrices] = useState<Record<string, number>>({});
  const [tab, setTab] = useState<TabKey>("pending");
  const [symbolFilter, setSymbolFilter] = useState("all");
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
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

  const loadOrders = async (portfolioId: number) => {
    setLoading(true);
    setError(null);
    setStatusMsg(null);
    try {
      const [pendingRes, historyRes] = await Promise.all([
        getJson<PendingResponse>(`/order/pending/${portfolioId}`),
        getJson<HistoryResponse>(`/order/history/${portfolioId}`),
      ]);
      setPending(pendingRes.orders ?? []);
      setHistory(historyRes.orders ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load orders.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPortfolios();
  }, []);

  useEffect(() => {
    if (selectedId) {
      loadOrders(selectedId);
    }
  }, [selectedId]);

  useEffect(() => {
    const symbols = pending.map((o) => o.symbol.toUpperCase());
    if (!symbols.length) return;
    connectSocket();
    socket.emit("subscribe", symbols);
    const handler = (payload: { symbol: string; price: number }) => {
      setLivePrices((prev) => ({
        ...prev,
        [payload.symbol.toUpperCase()]: payload.price,
      }));
    };
    socket.on("price-update", handler);
    return () => {
      socket.emit("unsubscribe", symbols);
      socket.off("price-update", handler);
    };
  }, [pending]);

  useEffect(() => {
    if (!selectedId) return;
    const refresh = () => loadOrders(selectedId);
    socket.off("order-filled").on("order-filled", refresh);
    socket.off("order-updated").on("order-updated", refresh);
    socket.off("order-cancelled").on("order-cancelled", refresh);
    return () => {
      socket.off("order-filled", refresh);
      socket.off("order-updated", refresh);
      socket.off("order-cancelled", refresh);
    };
  }, [selectedId]);

  const handleCancel = async (orderId: number) => {
    try {
      await deleteJson(`/order/${orderId}`);
      setStatusMsg("Order cancelled.");
      if (selectedId) {
        loadOrders(selectedId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to cancel order.");
    }
  };

  const filteredPending = useMemo(
    () =>
      pending.filter((o) =>
        symbolFilter === "all"
          ? true
          : o.symbol.toUpperCase() === symbolFilter
      ),
    [pending, symbolFilter]
  );

  const filled = useMemo(
    () => history.filter((o) => o.status === "filled"),
    [history]
  );
  const cancelled = useMemo(
    () => history.filter((o) => o.status === "cancelled"),
    [history]
  );

  const symbols = useMemo(
    () => Array.from(new Set(pending.concat(history).map((o) => o.symbol.toUpperCase()))),
    [pending, history]
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
              Orders
            </p>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
              Manage pending, filled, and cancelled orders
            </h1>
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

        {(error || statusMsg) && (
          <div
            className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
              error
                ? "border-rose-200/70 bg-rose-50 text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-100"
                : "border-emerald-200/70 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-100"
            }`}
          >
            {error ?? statusMsg}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 rounded-3xl border border-slate-200/70 bg-white/90 px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
          {(["pending", "filled", "cancelled"] as TabKey[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                tab === key
                  ? "bg-primary-500 text-white shadow-sm shadow-primary-900/30"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/70"
              }`}
            >
              {key.toUpperCase()}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2 text-sm">
            <span className="text-xs font-semibold text-slate-500">Symbol</span>
            <select
              className="rounded-xl border border-slate-200/70 bg-white px-2 py-1 text-sm font-semibold text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
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
        </div>

        {loading ? (
          <div className="rounded-3xl border border-slate-200/70 bg-white/90 p-10 text-center text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300">
            Loading orders...
          </div>
        ) : tab === "pending" ? (
          <section className="rounded-3xl border border-slate-200/70 bg-white/90 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Pending Orders
            </h2>
            {filteredPending.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                No pending orders.
              </p>
            ) : (
              <div className="mt-3 overflow-auto">
                <table className="min-w-full text-sm">
                  <thead className="text-xs uppercase text-slate-400">
                    <tr>
                      <th className="px-3 py-2 text-left">Symbol</th>
                      <th className="px-3 py-2 text-left">Type</th>
                      <th className="px-3 py-2 text-left">Trigger</th>
                      <th className="px-3 py-2 text-left">Qty</th>
                      <th className="px-3 py-2 text-left">Current Price</th>
                      <th className="px-3 py-2 text-left">Status</th>
                      <th className="px-3 py-2 text-left">Created</th>
                      <th className="px-3 py-2 text-right">Cancel</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredPending.map((o) => (
                      <tr key={o.id} className="text-slate-800 dark:text-slate-100">
                        <td className="px-3 py-2 font-semibold">{o.symbol}</td>
                        <td className="px-3 py-2 capitalize">
                          {o.type} {o.side}
                        </td>
                        <td className="px-3 py-2 text-slate-500 dark:text-slate-400">
                          {buildTrigger(o)}
                        </td>
                        <td className="px-3 py-2">{o.quantity}</td>
                        <td className="px-3 py-2">
                          {formatCurrency(
                            livePrices[o.symbol.toUpperCase()] ?? null
                          )}
                        </td>
                        <td className="px-3 py-2 capitalize">{o.status}</td>
                        <td className="px-3 py-2">{formatDate(o.createdAt)}</td>
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
        ) : tab === "filled" ? (
          <section className="rounded-3xl border border-slate-200/70 bg-white/90 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Filled Orders
            </h2>
            {filled.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                No filled orders yet.
              </p>
            ) : (
              <div className="mt-3 overflow-auto">
                <table className="min-w-full text-sm">
                  <thead className="text-xs uppercase text-slate-400">
                    <tr>
                      <th className="px-3 py-2 text-left">Symbol</th>
                      <th className="px-3 py-2 text-left">Action</th>
                      <th className="px-3 py-2 text-left">Qty</th>
                      <th className="px-3 py-2 text-left">Trigger</th>
                      <th className="px-3 py-2 text-left">Filled Price</th>
                      <th className="px-3 py-2 text-left">Filled Time</th>
                      <th className="px-3 py-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filled.map((o) => (
                      <tr key={o.id} className="text-slate-800 dark:text-slate-100">
                        <td className="px-3 py-2 font-semibold">{o.symbol}</td>
                        <td className="px-3 py-2 capitalize">{o.side}</td>
                        <td className="px-3 py-2">{o.quantity}</td>
                        <td className="px-3 py-2 text-slate-500 dark:text-slate-400">
                          {buildTrigger(o)}
                        </td>
                        <td className="px-3 py-2">
                          {formatCurrency(o.priceAtExecution)}
                        </td>
                        <td className="px-3 py-2">{formatDate(o.executedAt)}</td>
                        <td className="px-3 py-2 capitalize">{o.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ) : (
          <section className="rounded-3xl border border-slate-200/70 bg-white/90 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Cancelled Orders
            </h2>
            {cancelled.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                No cancelled orders.
              </p>
            ) : (
              <div className="mt-3 overflow-auto">
                <table className="min-w-full text-sm">
                  <thead className="text-xs uppercase text-slate-400">
                    <tr>
                      <th className="px-3 py-2 text-left">Symbol</th>
                      <th className="px-3 py-2 text-left">Action</th>
                      <th className="px-3 py-2 text-left">Qty</th>
                      <th className="px-3 py-2 text-left">Trigger</th>
                      <th className="px-3 py-2 text-left">Cancelled At</th>
                      <th className="px-3 py-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {cancelled.map((o) => (
                      <tr key={o.id} className="text-slate-800 dark:text-slate-100">
                        <td className="px-3 py-2 font-semibold">{o.symbol}</td>
                        <td className="px-3 py-2 capitalize">{o.side}</td>
                        <td className="px-3 py-2">{o.quantity}</td>
                        <td className="px-3 py-2 text-slate-500 dark:text-slate-400">
                          {buildTrigger(o)}
                        </td>
                        <td className="px-3 py-2">{formatDate(o.executedAt)}</td>
                        <td className="px-3 py-2 capitalize">{o.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </div>
    </DashboardLayout>
  );
};

export default OrdersPage;
