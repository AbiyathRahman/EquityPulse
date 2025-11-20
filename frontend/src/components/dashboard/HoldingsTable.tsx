import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePortfolioStore, type HoldingRow } from "../../stores/usePortfolioStore";
import { useLivePriceFeed } from "../../hooks/useLivePriceFeed";

type SortKey = keyof Pick<
  HoldingRow,
  | "symbol"
  | "quantity"
  | "avgCost"
  | "livePrice"
  | "totalValue"
  | "gainLoss"
  | "gainLossPct"
>;

const headers: { label: string; key: SortKey; align?: "left" | "right" }[] = [
  { label: "Symbol", key: "symbol" },
  { label: "Qty", key: "quantity" },
  { label: "Avg Buy Price", key: "avgCost" },
  { label: "Live Price", key: "livePrice" },
  { label: "Total Value", key: "totalValue" },
  { label: "Unrealized P/L", key: "gainLoss" },
  { label: "% Change", key: "gainLossPct" },
  { label: "Portfolio %", key: "totalValue" },
];

const formatCurrency = (value?: number) =>
  typeof value === "number"
    ? value.toLocaleString(undefined, {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 2,
      })
    : "--";

const formatNumber = (value?: number) =>
  typeof value === "number"
    ? value.toLocaleString(undefined, { maximumFractionDigits: 2 })
    : "--";

export const HoldingsTable = ({
  loading,
  portfolioValue,
}: {
  loading?: boolean;
  portfolioValue?: number | null;
}) => {
  const holdings = usePortfolioStore((state) => state.holdings);
  const [sort, setSort] = useState<{ key: SortKey; direction: "asc" | "desc" }>({
    key: "totalValue",
    direction: "desc",
  });
  const navigate = useNavigate();

  const symbols = useMemo(
    () => holdings.map((holding) => holding.symbol).filter(Boolean),
    [holdings]
  );
  useLivePriceFeed(symbols);

  const sortedHoldings = useMemo(() => {
    const sorted = [...holdings].sort((a, b) => {
      const aValue = (a[sort.key] ?? 0) as number | string;
      const bValue = (b[sort.key] ?? 0) as number | string;
      if (typeof aValue === "string" && typeof bValue === "string") {
        return sort.direction === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      const numericA = Number(aValue) || 0;
      const numericB = Number(bValue) || 0;
      return sort.direction === "asc" ? numericA - numericB : numericB - numericA;
    });
    return sorted;
  }, [holdings, sort]);

  const handleSort = (key: SortKey) => {
    setSort((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "desc" }
    );
  };

  return (
    <section className="rounded-3xl border border-slate-200/70 bg-white/90 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-lg font-semibold text-slate-900 dark:text-white">Holdings</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Live positions with real-time prices
          </p>
        </div>
        <button className="rounded-2xl border border-slate-200/70 px-3 py-1 text-xs text-slate-500 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300">
          Export CSV
        </button>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-slate-400">
              {headers.map((header) => (
                <th
                  key={header.key}
                  className={`cursor-pointer px-3 py-2 font-semibold ${
                    header.align === "right" ? "text-right" : "text-left"
                  }`}
                  onClick={() => handleSort(header.key)}
                >
                  {header.label}
                  {sort.key === header.key ? (
                    <span className="ml-1 text-primary-400">
                      {sort.direction === "asc" ? "▲" : "▼"}
                    </span>
                  ) : null}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={headers.length}
                  className="px-3 py-8 text-center text-slate-400"
                >
                  Loading holdings...
                </td>
              </tr>
            ) : sortedHoldings.length ? (
              sortedHoldings.map((holding) => {
                const gainPositive = (holding.gainLoss ?? 0) >= 0;
                const portfolioPct =
                  portfolioValue && portfolioValue > 0
                    ? ((holding.totalValue ?? 0) / portfolioValue) * 100
                    : null;
                return (
                  <tr
                    key={holding.symbol}
                    className="cursor-pointer border-t border-slate-100 transition hover:bg-primary-500/5 dark:border-slate-800"
                    onClick={() => navigate(`/symbol/${holding.symbol}`)}
                  >
                    <td className="px-3 py-3 font-semibold text-slate-900 dark:text-white">
                      {holding.symbol}
                    </td>
                    <td className="px-3 py-3 text-slate-500 dark:text-slate-300">
                      {formatNumber(holding.quantity)}
                    </td>
                    <td className="px-3 py-3 text-slate-500 dark:text-slate-300">
                      {formatCurrency(holding.avgCost)}
                    </td>
                    <td className="px-3 py-3 text-slate-900 dark:text-white">
                      {formatCurrency(holding.livePrice)}
                    </td>
                    <td className="px-3 py-3 text-slate-900 dark:text-white">
                      {formatCurrency(holding.totalValue)}
                    </td>
                    <td
                      className={`px-3 py-3 font-semibold ${
                        gainPositive ? "text-emerald-400" : "text-rose-300"
                      }`}
                    >
                      {formatCurrency(holding.gainLoss)}
                    </td>
                    <td
                      className={`px-3 py-3 font-semibold ${
                        gainPositive ? "text-emerald-400" : "text-rose-300"
                      }`}
                    >
                      {typeof holding.gainLossPct === "number"
                        ? `${holding.gainLossPct.toFixed(2)}%`
                        : "--"}
                    </td>
                    <td className="px-3 py-3 text-slate-500 dark:text-slate-300">
                      {portfolioPct !== null ? `${portfolioPct.toFixed(2)}%` : "--"}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan={headers.length}
                  className="px-3 py-8 text-center text-slate-400"
                >
                  No holdings available.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};
