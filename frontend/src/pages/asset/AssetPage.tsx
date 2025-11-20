import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { DashboardLayout } from "../../components/dashboard/DashboardLayout";
import { getJson } from "../../utils/api";
import { getStoredUserProfile } from "../../utils/userProfile";
import { connectSocket, socket } from "../../lib/socketClient";

type AssetResponse = {
  symbol: string;
  price: number;
  previousClose: number | null;
  change: number | null;
  changePct: number | null;
  marketStatus: "open" | "closed" | string;
  asOf?: string;
};

const formatCurrency = (value?: number | null) =>
  typeof value === "number"
    ? value.toLocaleString(undefined, { style: "currency", currency: "USD" })
    : "--";

const formatPercent = (value?: number | null) =>
  typeof value === "number"
    ? `${value > 0 ? "+" : ""}${value.toFixed(2)}%`
    : "--";

export const AssetPage = () => {
  const navigate = useNavigate();
  const params = useParams();
  const defaultSymbol = useMemo(
    () => (params.symbol ? params.symbol.toUpperCase() : "AAPL"),
    [params.symbol]
  );
  const [symbol, setSymbol] = useState(defaultSymbol);
  const [asset, setAsset] = useState<AssetResponse | null>(null);
  const [livePrice, setLivePrice] = useState<number | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const storedProfile = useMemo(() => getStoredUserProfile(), []);

  const loadAsset = async (sym: string) => {
    setLoading(true);
    setError(null);
    setStatus(null);
    try {
      const res = await getJson<AssetResponse>(`/asset/${sym}`);
      setAsset(res);
      setLivePrice(res.price);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load asset data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const normalized = symbol.trim().toUpperCase();
    if (!normalized) return;
    loadAsset(normalized);
    navigate(`/asset/${normalized}`, { replace: true });
  }, [symbol, navigate]);

  useEffect(() => {
    if (!symbol) return;
    const sub = symbol.toUpperCase();
    connectSocket();
    socket.emit("subscribe", [sub]);

    const handler = (payload: { symbol: string; price: number; timeStamp: string }) => {
      if (payload.symbol.toUpperCase() !== sub) return;
      setLivePrice(payload.price);
      setAsset((prev) => {
        if (!prev) return prev;
        const previousClose = prev.previousClose;
        const change = previousClose !== null ? payload.price - previousClose : null;
        const changePct =
          previousClose && previousClose !== 0
            ? ((payload.price - previousClose) / previousClose) * 100
            : null;
        return {
          ...prev,
          price: payload.price,
          change,
          changePct,
          asOf: payload.timeStamp,
        };
      });
    };
    socket.on("price-update", handler);
    return () => {
      socket.emit("unsubscribe", [sub]);
      socket.off("price-update", handler);
    };
  }, [symbol]);

  const change = asset?.change ?? null;
  const changePct = asset?.changePct ?? null;
  const isUp = (change ?? 0) >= 0;

  return (
    <DashboardLayout
      userName={storedProfile.name}
      userEmail={storedProfile.email}
    >
      <div className="space-y-6 pb-16">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
                {asset?.symbol ?? symbol} — Asset Overview
              </h1>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  asset?.marketStatus === "open"
                    ? "bg-emerald-500/15 text-emerald-500"
                    : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                }`}
              >
                {asset?.marketStatus ?? "unknown"}
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Live price with day change and quick actions.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white px-3 py-2 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <span className="text-xs font-semibold text-slate-500">Symbol</span>
            <input
              className="w-28 bg-transparent text-sm font-semibold uppercase text-slate-900 outline-none dark:text-white"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              placeholder="AAPL"
            />
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
        {loading && (
          <div className="rounded-2xl border border-slate-200/70 bg-white/90 px-4 py-3 text-sm text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300">
            Loading asset...
          </div>
        )}

        <section className="rounded-3xl border border-slate-200/70 bg-white/90 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">
                Live Price
              </p>
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-semibold text-slate-900 dark:text-white">
                  {formatCurrency(livePrice ?? asset?.price)}
                </span>
                <span
                  className={`rounded-full px-3 py-1 text-sm font-semibold ${
                    isUp ? "bg-emerald-500/15 text-emerald-500" : "bg-rose-500/15 text-rose-400"
                  }`}
                >
                  {formatCurrency(change)} ({formatPercent(changePct)})
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Prev close: {formatCurrency(asset?.previousClose)} • Updated at{" "}
                {asset?.asOf
                  ? new Date(asset.asOf).toLocaleTimeString()
                  : "--"}
              </p>
            </div>
            <div className="flex gap-2">
              <Link
                to="/trades"
                className="rounded-2xl border border-primary-200/70 px-4 py-2 text-sm font-semibold text-primary-600 transition hover:-translate-y-0.5 hover:border-primary-300 dark:border-primary-500/40 dark:text-primary-200"
              >
                Buy / Sell
              </Link>
              <Link
                to="/transactions"
                className="rounded-2xl border border-slate-200/70 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:-translate-y-0.5 hover:border-primary-200 dark:border-slate-700 dark:text-slate-200"
              >
                View history
              </Link>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200/70 bg-white/90 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Snapshot
          </h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200/70 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-950/60">
              <p className="text-xs uppercase tracking-wide text-slate-400">
                Symbol
              </p>
              <p className="text-lg font-semibold text-slate-900 dark:text-white">
                {asset?.symbol ?? symbol}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200/70 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-950/60">
              <p className="text-xs uppercase tracking-wide text-slate-400">
                Market status
              </p>
              <p className="text-lg font-semibold text-slate-900 dark:text-white">
                {asset?.marketStatus ?? "--"}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200/70 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-950/60">
              <p className="text-xs uppercase tracking-wide text-slate-400">
                Day change
              </p>
              <p
                className={`text-lg font-semibold ${
                  isUp ? "text-emerald-500" : "text-rose-400"
                }`}
              >
                {formatCurrency(change)} ({formatPercent(changePct)})
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200/70 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-950/60">
              <p className="text-xs uppercase tracking-wide text-slate-400">
                Previous close
              </p>
              <p className="text-lg font-semibold text-slate-900 dark:text-white">
                {formatCurrency(asset?.previousClose)}
              </p>
            </div>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
};

export default AssetPage;
