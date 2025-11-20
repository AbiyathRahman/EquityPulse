import { Banknote, Coins, LineChart, Percent, Shield } from "lucide-react";
import type { ComponentType } from "react";
import type { PortfolioAnalytics } from "../../stores/usePortfolioStore";

interface MetricCardsProps {
  analytics: PortfolioAnalytics | null;
  loading?: boolean;
}

type MetricConfig = {
  key:
    | "totalInvested"
    | "unrealizedGainLoss"
    | "cashBalance"
    | "dailyChangePct"
    | "riskScore";
  label: string;
  icon: ComponentType<{ className?: string }>;
  isChange?: boolean;
  isPercent?: boolean;
};

const metricConfig: MetricConfig[] = [
  {
    key: "totalInvested",
    label: "Total Invested",
    icon: Coins,
  },
  {
    key: "unrealizedGainLoss",
    label: "Unrealized Gain/Loss",
    icon: LineChart,
    isChange: true,
  },
  {
    key: "cashBalance",
    label: "Cash Balance",
    icon: Banknote,
  },
  {
    key: "dailyChangePct",
    label: "Daily Change",
    icon: Percent,
    isPercent: true,
    isChange: true,
  },
  {
    key: "riskScore",
    label: "Risk Score",
    icon: Shield,
  },
];

const formatValue = (value?: number, options?: { percent?: boolean }) => {
  if (typeof value !== "number") return "--";
  if (options?.percent) {
    return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
  }
  return value.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
};

export const MetricCards = ({ analytics, loading }: MetricCardsProps) => (
  <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
    {metricConfig.map((metric) => {
      const Icon = metric.icon;
      const value = analytics ? (analytics as any)[metric.key] : undefined;
      const formatted = metric.isPercent
        ? formatValue(value, { percent: true })
        : formatValue(value);
      const isPositive =
        typeof value === "number" ? value >= 0 : metric.key !== "riskScore";
      return (
        <article
          key={metric.key}
          className="rounded-3xl border border-slate-200/70 bg-white/90 px-5 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-500/15 text-primary-400">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-slate-400">
                {metric.label}
              </p>
              <p
                className={`text-lg font-semibold ${
                  metric.isChange
                    ? isPositive
                      ? "text-emerald-400"
                      : "text-rose-300"
                    : "text-slate-900 dark:text-white"
                }`}
              >
                {loading ? "..." : formatted}
              </p>
            </div>
          </div>
        </article>
      );
    })}
  </section>
);
