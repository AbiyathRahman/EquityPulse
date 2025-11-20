import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getJson } from "../../utils/api";
import { usePortfolioStore } from "../../stores/usePortfolioStore";

type RangeKey = "1D" | "1W" | "1M" | "6M" | "1Y" | "MAX";

const ranges: RangeKey[] = ["1D", "1W", "1M", "6M", "1Y", "MAX"];

interface HistoryPoint {
  timeStamp: string;
  totalValue: number;
}

interface PortfolioChartProps {
  portfolioId: number;
}

export const PortfolioChart = ({ portfolioId }: PortfolioChartProps) => {
  const intraday = usePortfolioStore((state) => state.intradaySeries);
  const [range, setRange] = useState<RangeKey>("1D");
  const [historical, setHistorical] = useState<HistoryPoint[]>([]);
  const [loading, setLoading] = useState(false);

  const data = useMemo(
    () =>
      (range === "1D" ? intraday : historical).map((point) => ({
        time: new Date(point.timeStamp).toLocaleTimeString(undefined, {
          hour: "2-digit",
          minute: "2-digit",
        }),
        dateLabel: new Date(point.timeStamp).toLocaleString(),
        value: point.totalValue,
      })),
    [range, intraday, historical]
  );

  useEffect(() => {
    if (range === "1D") return;
    let ignore = false;
    const loadHistory = async () => {
      setLoading(true);
      try {
        const response = await getJson<{ points: HistoryPoint[] }>(
          `/portfolio/history/${portfolioId}?range=${range}`
        );
        if (!ignore) setHistorical(response.points ?? []);
      } catch {
        if (!ignore) setHistorical([]);
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    loadHistory();
    return () => {
      ignore = true;
    };
  }, [range, portfolioId]);

  return (
    <section className="rounded-3xl border border-slate-200/70 bg-white/90 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-lg font-semibold text-slate-900 dark:text-white">
            Portfolio Performance
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {range === "1D"
              ? "Live intraday performance"
              : `Historical performance (${range})`}
          </p>
        </div>
        <div className="flex gap-2 rounded-2xl border border-slate-200/70 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-950/60">
          {ranges.map((item) => (
            <button
              key={item}
              className={`rounded-xl px-3 py-1 font-medium transition ${
                range === item
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
              onClick={() => setRange(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-6 h-80">
        {loading && range !== "1D" ? (
          <div className="flex h-full items-center justify-center text-slate-400">
            Loading range…
          </div>
        ) : data.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ left: 0, right: 0 }}>
              <defs>
                <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="time"
                stroke="currentColor"
                className="text-xs text-slate-400"
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="currentColor"
                className="text-xs text-slate-400"
                tickFormatter={(value) =>
                  `$${(value / 1_000_000).toFixed(1)}M`.replace(".0", "")
                }
                tickLine={false}
                axisLine={false}
                width={60}
              />
              <Tooltip
                cursor={{ stroke: "#94a3b8", strokeDasharray: 4 }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const point = payload[0].payload;
                  return (
                    <div className="rounded-2xl border border-slate-200/70 bg-white/95 px-4 py-3 text-sm shadow dark:border-slate-700 dark:bg-slate-900/90">
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {point.dateLabel}
                      </p>
                      <p className="text-primary-500">
                        {point.value.toLocaleString(undefined, {
                          style: "currency",
                          currency: "USD",
                        })}
                      </p>
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#3b82f6"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#portfolioGradient)"
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-slate-400">
            No data available for this range.
          </div>
        )}
      </div>
    </section>
  );
};
