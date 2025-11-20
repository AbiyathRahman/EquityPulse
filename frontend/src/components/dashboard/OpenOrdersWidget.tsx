import type { OrderRow } from "../../stores/usePortfolioStore";

interface OpenOrdersWidgetProps {
  orders: OrderRow[];
}

export const OpenOrdersWidget = ({ orders }: OpenOrdersWidgetProps) => (
  <section className="rounded-3xl border border-slate-200/70 bg-white/90 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
    <div className="mb-4 flex items-center justify-between">
      <div>
        <p className="text-lg font-semibold text-slate-900 dark:text-white">
          Open Orders
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Pending limits and stops
        </p>
      </div>
      <span className="rounded-full bg-primary-500/15 px-3 py-1 text-xs font-semibold text-primary-400">
        {orders.length} pending
      </span>
    </div>
    <div className="space-y-3 text-sm">
      {orders.length ? (
        orders.map((order) => (
          <article
            key={order.id}
            className="rounded-2xl border border-slate-200/70 px-4 py-3 dark:border-slate-800"
          >
            <div className="flex items-center justify-between">
              <p className="text-base font-semibold text-slate-900 dark:text-white">
                {order.symbol}
              </p>
              <p className="text-xs uppercase tracking-wider text-slate-400">
                {order.status}
              </p>
            </div>
            <div className="mt-2 flex items-center justify-between text-slate-500 dark:text-slate-300">
              <span>{order.condition}</span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {order.triggerPrice.toLocaleString(undefined, {
                  style: "currency",
                  currency: "USD",
                })}
              </span>
            </div>
          </article>
        ))
      ) : (
        <p className="text-center text-slate-400">
          No pending limit or stop orders.
        </p>
      )}
    </div>
  </section>
);
