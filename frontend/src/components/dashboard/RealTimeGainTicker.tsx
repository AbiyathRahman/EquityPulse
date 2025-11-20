import { Activity, ArrowDownRight, ArrowUpRight } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePortfolioStore } from "../../stores/usePortfolioStore";

const formatCurrency = (value?: number) =>
  typeof value === "number"
    ? value.toLocaleString(undefined, {
        style: "currency",
        currency: "USD",
      })
    : "--";

const formatPercent = (value?: number) =>
  typeof value === "number"
    ? `${value > 0 ? "+" : ""}${value.toFixed(2)}%`
    : "--";

export const RealTimeGainTicker = () => {
  const gainLoss = usePortfolioStore((state) => state.analytics?.gainLoss);
  const gainLossPct = usePortfolioStore(
    (state) => state.analytics?.gainLossPercentage
  );
  const totalValue = usePortfolioStore((state) => state.analytics?.totalValue);
  const updatedAt = usePortfolioStore((state) => state.analytics?.lastUpdated);
  const intraday = usePortfolioStore((state) => state.intradaySeries);

  const [flash, setFlash] = useState<"up" | "down" | null>(null);
  const previous = useRef<number | null>(null);

  useEffect(() => {
    if (typeof gainLoss !== "number") return;
    if (previous.current === null) {
      previous.current = gainLoss;
      return;
    }
    if (gainLoss > previous.current) {
      setFlash("up");
    } else if (gainLoss < previous.current) {
      setFlash("down");
    }
    previous.current = gainLoss;
    const timer = setTimeout(() => setFlash(null), 900);
    return () => clearTimeout(timer);
  }, [gainLoss]);

  const lastUpdatedAt = useMemo(() => {
    const ts = updatedAt ?? intraday[intraday.length - 1]?.timeStamp;
    return ts
      ? new Date(ts).toLocaleTimeString(undefined, {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      : "--";
  }, [updatedAt, intraday]);

  const isPositive = (gainLoss ?? 0) >= 0;
  const Icon = isPositive ? ArrowUpRight : ArrowDownRight;

  const flashClass =
    flash === "up"
      ? "bg-emerald-500/15 text-emerald-400"
      : flash === "down"
        ? "bg-rose-500/15 text-rose-300"
        : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300";

  return (
    <section className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-200/70 bg-white/90 px-5 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-emerald-400">
          <Activity className="h-3.5 w-3.5" />
          Live
        </span>
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-slate-400">
            Real-time Gain/Loss
          </p>
          <p className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
            <Icon className="h-4 w-4" />
            {formatCurrency(gainLoss)}
            <span className="text-sm font-semibold text-slate-500 dark:text-slate-300">
              ({formatPercent(gainLossPct)})
            </span>
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500 dark:text-slate-300">
        <div className={`rounded-2xl px-3 py-2 font-semibold ${flashClass}`}>
          Total value: {formatCurrency(totalValue)}
        </div>
        <div className="rounded-2xl border border-slate-200/70 bg-white px-3 py-2 shadow-sm dark:border-slate-700 dark:bg-slate-800/70">
          Updated at {lastUpdatedAt}
        </div>
      </div>
    </section>
  );
};
