import { ArrowDownRight, ArrowUpRight, RefreshCcw } from "lucide-react";

interface PortfolioSummaryHeaderProps {
  value?: number;
  gainLoss?: number;
  gainLossPct?: number;
  updatedAt?: string;
  loading?: boolean;
  error?: string | null;
}

const formatCurrency = (value?: number) =>
  typeof value === "number"
    ? value.toLocaleString(undefined, {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      })
    : "--";

const formatPercent = (value?: number) =>
  typeof value === "number"
    ? `${value > 0 ? "+" : ""}${value.toFixed(2)}%`
    : "--";

export const PortfolioSummaryHeader = ({
  value,
  gainLoss,
  gainLossPct,
  updatedAt,
  loading,
  error,
}: PortfolioSummaryHeaderProps) => {
  const isPositive = (gainLoss ?? 0) >= 0;
  const Icon = isPositive ? ArrowUpRight : ArrowDownRight;

  return (
    <section className="rounded-3xl border border-slate-200/70 bg-white/90 px-8 py-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.4em] text-primary-500">
            Portfolio Value
          </p>
          <div className="mt-2 flex items-center gap-3">
            <span className="text-4xl font-semibold text-slate-900 dark:text-white">
              {loading ? "—" : formatCurrency(value)}
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold ${
                isPositive
                  ? "bg-emerald-500/15 text-emerald-300"
                  : "bg-rose-500/15 text-rose-200"
              }`}
            >
              <Icon className="h-4 w-4" />
              {loading ? "—" : formatCurrency(gainLoss)}{" "}
              <span className="opacity-80">
                ({loading ? "--" : formatPercent(gainLossPct)})
              </span>
            </span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
            Last updated
          </p>
          <p className="mt-1 flex items-center justify-end gap-2 text-sm text-slate-500 dark:text-slate-300">
            <RefreshCcw className="h-4 w-4 animate-spin text-primary-400" />
            {updatedAt
              ? new Date(updatedAt).toLocaleTimeString(undefined, {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "--"}
          </p>
          {error && (
            <p className="mt-2 text-xs text-rose-400">
              {error}. Live updates may be delayed.
            </p>
          )}
        </div>
      </div>
    </section>
  );
};
