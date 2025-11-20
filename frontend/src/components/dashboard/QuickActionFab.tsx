import { useState } from "react";
import { DollarSign, Plus, ShoppingBag, Wallet } from "lucide-react";

const actions = [
  { label: "Buy", icon: ShoppingBag },
  { label: "Sell", icon: DollarSign },
  { label: "Add Cash", icon: Wallet },
  { label: "Create Portfolio", icon: Plus },
] as const;

export const QuickActionFab = () => {
  const [openAction, setOpenAction] = useState<string | null>(null);
  return (
    <>
      <div className="fixed bottom-8 right-8 z-40 flex flex-col items-end gap-3">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.label}
              onClick={() => setOpenAction(action.label)}
              className="flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-xl transition hover:-translate-y-0.5 dark:bg-primary-500"
            >
              <Icon className="h-4 w-4" />
              {action.label}
            </button>
          );
        })}
      </div>
      {openAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur">
          <div className="w-full max-w-md rounded-3xl border border-slate-200/60 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
              {openAction}
            </h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
              This action opens a workflow modal. Plug in your trading forms
              here to complete the experience.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                className="rounded-full border border-slate-200/80 px-4 py-2 text-sm dark:border-slate-700"
                onClick={() => setOpenAction(null)}
              >
                Cancel
              </button>
              <button className="rounded-full bg-primary-500 px-4 py-2 text-sm font-semibold text-white">
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
