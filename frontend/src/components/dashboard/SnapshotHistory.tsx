import { Clock3 } from "lucide-react";
import { useMemo } from "react";
import { usePortfolioStore } from "../../stores/usePortfolioStore";

export const SnapshotHistory = () => {
  const snapshots = usePortfolioStore((state) => state.intradaySeries);

  const recent = useMemo(
    () => [...snapshots].slice(-8).reverse(),
    [snapshots]
  );

  return (
    <section className="rounded-3xl border border-slate-200/70 bg-white/90 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">
            Snapshot History
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Latest recorded rollups from your portfolio feed.
          </p>
        </div>
        <Clock3 className="h-5 w-5 text-primary-400" />
      </div>
      {recent.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No snapshots captured yet. Live updates will appear here.
        </p>
      ) : (
        <div className="space-y-2">
          {recent.map((item) => (
            <div
              key={item.timeStamp}
              className="flex items-center justify-between rounded-2xl border border-slate-200/70 bg-white px-3 py-2 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-950/60"
            >
              <span className="font-medium text-slate-900 dark:text-white">
                {new Date(item.timeStamp).toLocaleString()}
              </span>
              <span className="font-semibold text-primary-500">
                {item.totalValue.toLocaleString(undefined, {
                  style: "currency",
                  currency: "USD",
                  maximumFractionDigits: 0,
                })}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
