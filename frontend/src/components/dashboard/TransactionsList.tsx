import type { TransactionRow } from "../../stores/usePortfolioStore";

interface TransactionsListProps {
  transactions: TransactionRow[];
}

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

export const TransactionsList = ({ transactions }: TransactionsListProps) => (
  <section className="rounded-3xl border border-slate-200/70 bg-white/90 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
    <div className="mb-4 flex items-center justify-between">
      <div>
        <p className="text-lg font-semibold text-slate-900 dark:text-white">
          Recent Transactions
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Latest trade confirmations
        </p>
      </div>
      <button className="rounded-2xl border border-slate-200/70 px-3 py-1 text-xs text-slate-500 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300">
        View All Transactions
      </button>
    </div>
    <div className="space-y-3">
      {transactions.length ? (
        transactions.map((tx) => (
          <article
            key={tx.id}
            className="flex items-center justify-between rounded-2xl border border-slate-200/70 px-4 py-3 text-sm dark:border-slate-800"
          >
            <div>
              <p className="font-semibold text-slate-900 dark:text-white">
                {tx.symbol}
              </p>
              <p className="text-xs uppercase tracking-widest text-slate-400">
                {tx.type} • {formatDate(tx.createdAt)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-slate-500 dark:text-slate-300">
                Qty {tx.amount}
              </p>
              <p className="text-xs text-slate-400">
                {tx.priceAtExecution
                  ? tx.priceAtExecution.toLocaleString(undefined, {
                      style: "currency",
                      currency: "USD",
                    })
                  : "--"}
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                tx.type === "buy"
                  ? "bg-emerald-500/15 text-emerald-300"
                  : "bg-rose-500/15 text-rose-200"
              }`}
            >
              {tx.type.toUpperCase()}
            </span>
          </article>
        ))
      ) : (
        <p className="text-center text-sm text-slate-400">
          No recent transactions.
        </p>
      )}
    </div>
  </section>
);
