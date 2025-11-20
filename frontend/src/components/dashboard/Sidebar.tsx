import { NavLink } from "react-router-dom";

const navItems = [
  { label: "Overview", path: "/dashboard" },
  { label: "Portfolio", path: "/portfolio" },
  { label: "Trades", path: "/trades" },
  { label: "Holdings", path: "/holdings" },
  { label: "Asset", path: "/asset/AAPL" },
  { label: "Transactions", path: "/transactions" },
  { label: "Orders", path: "/orders" },
  { label: "Summary", path: "/summary" },
  { label: "Settings", path: "/settings" },
];

const IconDot = () => (
  <span className="h-2 w-2 rounded-full bg-primary-400 transition group-hover:scale-125" />
);

export const Sidebar = () => {
  return (
    <aside className="hidden w-64 flex-col border-r border-slate-200/60 bg-white/90 px-6 py-8 dark:border-slate-800 dark:bg-slate-900/70 lg:flex">
      <div className="mb-10 flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-r from-primary-500 to-indigo-500 text-white font-bold">
          EP
        </div>
        <div>
          <p className="text-lg font-semibold text-slate-900 dark:text-white">
            EquityPulse
          </p>
          <p className="text-xs uppercase tracking-widest text-slate-400">
            Dashboard
          </p>
        </div>
      </div>
      <nav className="space-y-1 text-sm font-medium text-slate-500 dark:text-slate-300">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `group flex items-center gap-3 rounded-2xl px-4 py-3 transition ${
                isActive
                  ? "bg-primary-50 text-primary-700 dark:bg-primary-500/10 dark:text-primary-200"
                  : "hover:bg-slate-100 dark:hover:bg-white/5"
              }`
            }
          >
            <IconDot />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto rounded-3xl border border-slate-200/70 bg-gradient-to-br from-primary-500/10 to-indigo-500/10 p-4 text-xs text-slate-600 dark:border-slate-700 dark:text-slate-300">
        <p className="mb-2 font-semibold text-primary-600 dark:text-primary-300">
          Upgrade available
        </p>
        <p className="text-slate-500 dark:text-slate-400">
          Unlock AI-powered execution alerts and premium analytics.
        </p>
      </div>
    </aside>
  );
};
