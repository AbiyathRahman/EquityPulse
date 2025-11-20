import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { DashboardLayout } from "../../components/dashboard/DashboardLayout";
import {
  deleteJson,
  getJson,
  patchJson,
  postJson,
} from "../../utils/api";
import {
  getDefaultPortfolioId,
  clearDefaultPortfolioId,
  setDefaultPortfolioId,
} from "../../utils/portfolioPrefs";
import { getStoredUserProfile } from "../../utils/userProfile";
import type {
  HoldingRow,
  PortfolioAnalytics,
  PortfolioSummary,
} from "../../stores/usePortfolioStore";

type PortfolioListResponse = {
  portfolios: Array<{
    id: number;
    name: string;
    balance: number;
    createdAt?: string;
  }>;
};

type HoldingsResponse = {
  holdings: HoldingRow[];
};

type PortfolioDetailResponse = PortfolioSummary & { createdAt?: string };

type PortfolioCard = {
  base: {
    id: number;
    name: string;
    balance: number;
    createdAt?: string;
    ownerName?: string | null;
    ownerEmail?: string | null;
  };
  stats: {
    totalValue?: number;
    gainLossPct?: number;
    gainLoss?: number;
    cash?: number;
    riskScore?: number;
    topStock?: string | null;
    dailyChangePct?: number;
    winRate?: number | null;
  };
  holdingsCount: number;
  holdingsValue: number;
};

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

const buildPortfolioCard = async (row: {
  id: number;
  name: string;
  balance: number;
  createdAt?: string;
}): Promise<PortfolioCard> => {
  const [analyticsRes, holdingsRes, detailRes] = await Promise.all([
    getJson<PortfolioAnalytics>(`/analytics/get/${row.id}`).catch(() => null),
    getJson<HoldingsResponse>(`/portfolio/holdings/${row.id}`).catch(() => ({
      holdings: [],
    })),
    getJson<PortfolioDetailResponse>(`/portfolio/${row.id}`).catch(() => null),
  ]);

  const holdings = holdingsRes?.holdings ?? [];
  const topHolding = holdings
    .map((h) => ({
      ...h,
      total: (h.livePrice ?? h.avgCost) * h.quantity,
    }))
    .sort((a, b) => b.total - a.total)[0];

  const holdingsValue =
    holdings.reduce(
      (sum, h) => sum + (h.livePrice ?? h.avgCost) * h.quantity,
      0
    ) ?? 0;

  return {
    base: {
      id: row.id,
      name: detailRes?.name ?? row.name,
      balance: detailRes?.balance ?? row.balance,
      createdAt: detailRes?.createdAt ?? row.createdAt,
      ownerName: detailRes?.ownerName ?? null,
      ownerEmail: detailRes?.ownerEmail ?? null,
    },
    stats: {
      totalValue: analyticsRes?.totalValue ?? holdingsValue + row.balance,
      gainLossPct: analyticsRes?.gainLossPercentage ?? 0,
      gainLoss: analyticsRes?.gainLoss ?? 0,
      cash: analyticsRes?.cashBalance ?? row.balance,
      riskScore: analyticsRes?.riskScore ?? undefined,
      topStock: topHolding ? topHolding.symbol : null,
      dailyChangePct: analyticsRes?.dailyChangePct ?? undefined,
      winRate: null,
    },
    holdingsCount: holdings.length,
    holdingsValue,
  };
};

export const PortfolioHubPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const storedProfile = useMemo(() => getStoredUserProfile(), []);
  const [portfolios, setPortfolios] = useState<PortfolioCard[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({ name: "", balance: "" });
  const [renameId, setRenameId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [defaultId, setDefaultId] = useState<number | null>(
    getDefaultPortfolioId()
  );

  const loadPortfolios = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const list = await getJson<PortfolioListResponse>("/portfolio/get");
      const entries = list.portfolios ?? [];
      const enriched = await Promise.all(
        entries.map((item) => buildPortfolioCard(item))
      );
      setPortfolios(enriched);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to load portfolios.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPortfolios();
  }, [location.pathname]);

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActionMessage(null);
    if (!createForm.name.trim()) {
      setError("Portfolio name is required.");
      return;
    }
    try {
      await postJson("/portfolio/create", {
        name: createForm.name.trim(),
        balance: Number(createForm.balance) || 0,
      });
      setCreateForm({ name: "", balance: "" });
      setActionMessage("Portfolio created.");
      await loadPortfolios();
      navigate("/portfolio", { replace: true });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to create portfolio.";
      setError(message);
    }
  };

  const startRename = (id: number, currentName: string) => {
    setRenameId(id);
    setRenameValue(currentName);
  };

  const handleRename = async (id: number) => {
    if (!renameValue.trim()) {
      setError("New portfolio name is required.");
      return;
    }
    try {
      await patchJson(`/portfolio/${id}`, { name: renameValue.trim() });
      setActionMessage("Portfolio renamed.");
      setRenameId(null);
      setRenameValue("");
      await loadPortfolios();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to rename portfolio.";
      setError(message);
    }
  };

  const handleDelete = async (card: PortfolioCard) => {
    if (card.holdingsCount > 0) {
      setError(
        "This portfolio still contains holdings. Sell assets before deleting."
      );
      return;
    }
    const confirmed = window.confirm(
      `Delete "${card.base.name}"?\nCurrent total value: ${formatCurrency(
        card.stats.totalValue
      )}\nHoldings: ${card.holdingsCount}\nThis action cannot be undone.`
    );
    if (!confirmed) return;
    try {
      await deleteJson(`/portfolio/${card.base.id}`);
      if (defaultId === card.base.id) {
        clearDefaultPortfolioId();
        setDefaultId(null);
      }
      setActionMessage("Portfolio deleted.");
      await loadPortfolios();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to delete portfolio.";
      setError(message);
    }
  };

  const handleSetDefault = (id: number) => {
    setDefaultPortfolioId(id);
    setDefaultId(id);
    setActionMessage("Default portfolio updated.");
  };

  return (
    <DashboardLayout
      userName={storedProfile.name}
      userEmail={storedProfile.email}
    >
      <div className="space-y-6 pb-16">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-primary-500">
              Portfolio Hub
            </p>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
              Manage, create, and route into your portfolios
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No live prices or holdings here—just portfolio controls, stats, and
              quick actions.
            </p>
          </div>
          <Link
            to="/portfolio/create"
            className="rounded-2xl bg-primary-500 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-primary-900/30 transition hover:brightness-110"
          >
            + Create New Portfolio
          </Link>
        </div>

        {error && (
          <div className="rounded-2xl border border-rose-200/70 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-100">
            {error}
          </div>
        )}
        {actionMessage && (
          <div className="rounded-2xl border border-emerald-200/70 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-100">
            {actionMessage}
          </div>
        )}

        {isLoading ? (
          <div className="rounded-3xl border border-slate-200/70 bg-white/90 p-10 text-center text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300">
            Loading portfolios...
          </div>
        ) : portfolios.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white/80 p-12 text-center dark:border-slate-700 dark:bg-slate-900/60">
            <p className="text-xl font-semibold text-slate-900 dark:text-white">
              No portfolios yet
            </p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Create your first portfolio to start tracking.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-3xl border border-slate-200/70 bg-white/95 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
            <div className="grid grid-cols-[1.4fr,1fr,1fr,1fr,1fr,0.8fr] items-center border-b border-slate-200/70 bg-slate-50/80 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-400">
              <span>Name</span>
              <span>Total Value</span>
              <span>Cash</span>
              <span>Gain/Loss</span>
              <span>Risk & Stats</span>
              <span className="text-right">Actions</span>
            </div>
            <div className="divide-y divide-slate-200/70 dark:divide-slate-800">
              {portfolios.map((card) => {
                const isDefault = defaultId === card.base.id;
                return (
                  <div
                    key={card.base.id}
                    className="grid grid-cols-[1.4fr,1fr,1fr,1fr,1fr,0.8fr] items-center px-4 py-3 text-sm text-slate-700 dark:text-slate-200"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-semibold text-slate-900 dark:text-white">
                          {card.base.name}
                        </span>
                        {isDefault && (
                          <span className="rounded-full bg-primary-500/15 px-3 py-1 text-xs font-semibold text-primary-500">
                            Default
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400">
                        Created{" "}
                        {card.base.createdAt
                          ? new Date(card.base.createdAt).toLocaleDateString()
                          : "--"}
                      </p>
                    </div>
                    <div className="font-semibold text-slate-900 dark:text-white">
                      {formatCurrency(card.stats.totalValue)}
                    </div>
                    <div className="text-slate-600 dark:text-slate-300">
                      Cash: {formatCurrency(card.stats.cash)}
                    </div>
                    <div className="flex flex-col gap-1">
                      <span
                        className={`font-semibold ${
                          (card.stats.gainLoss ?? 0) >= 0
                            ? "text-emerald-500"
                            : "text-rose-400"
                        }`}
                      >
                        {formatCurrency(card.stats.gainLoss)} (
                        {formatPercent(card.stats.gainLossPct)})
                      </span>
                      <span className="text-xs text-slate-400">
                        24h: {formatPercent(card.stats.dailyChangePct)}
                      </span>
                    </div>
                    <div className="space-y-1 text-xs text-slate-500 dark:text-slate-300">
                      <div>
                        <span className="font-semibold text-slate-700 dark:text-white">
                          Risk:
                        </span>{" "}
                        {card.stats.riskScore ?? "--"}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-700 dark:text-white">
                          Top stock:
                        </span>{" "}
                        {card.stats.topStock ?? "--"}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-700 dark:text-white">
                          Win rate:
                        </span>{" "}
                        {card.stats.winRate !== null && card.stats.winRate !== undefined
                          ? `${card.stats.winRate}%`
                          : "--"}
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        to={`/dashboard/${card.base.id}`}
                        className="rounded-xl border border-primary-200/70 px-3 py-2 text-xs font-semibold text-primary-600 transition hover:-translate-y-0.5 hover:border-primary-300 dark:border-primary-500/40 dark:text-primary-200"
                      >
                        Open Dashboard
                      </Link>
                      <button
                        type="button"
                        className="rounded-xl border border-slate-200/70 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:-translate-y-0.5 hover:border-primary-200 dark:border-slate-700 dark:text-slate-200"
                        onClick={() => handleSetDefault(card.base.id)}
                        disabled={isDefault}
                      >
                        {isDefault ? "Default" : "Set as Default"}
                      </button>
                      <button
                        type="button"
                        className="rounded-xl border border-slate-200/70 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:-translate-y-0.5 hover:border-primary-200 dark:border-slate-700 dark:text-slate-200"
                        onClick={() => startRename(card.base.id, card.base.name)}
                      >
                        Rename
                      </button>
                      <button
                        type="button"
                        className="rounded-xl border border-rose-200/70 px-3 py-2 text-xs font-semibold text-rose-600 transition hover:-translate-y-0.5 hover:border-rose-300 dark:border-rose-500/40 dark:text-rose-200"
                        onClick={() => handleDelete(card)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div
          id="create-portfolio"
          className="rounded-3xl border border-slate-200/70 bg-white/95 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70"
        >
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
            Create New Portfolio
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Provide a name and optional starting balance. You can set it as
            default later.
          </p>
          <form className="mt-4 grid gap-4 md:grid-cols-2" onSubmit={handleCreate}>
            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Portfolio name
              </span>
              <input
                type="text"
                value={createForm.name}
                onChange={(e) =>
                  setCreateForm((prev) => ({ ...prev, name: e.target.value }))
                }
                className="rounded-2xl border border-slate-200/70 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none transition focus:border-primary-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                placeholder="My Strategy Portfolio"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Starting balance (optional)
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={createForm.balance}
                onChange={(e) =>
                  setCreateForm((prev) => ({ ...prev, balance: e.target.value }))
                }
                className="rounded-2xl border border-slate-200/70 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none transition focus:border-primary-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                placeholder="0.00"
              />
            </label>
            <div className="md:col-span-2 flex items-center gap-3">
              <button
                type="submit"
                className="rounded-2xl bg-primary-500 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-primary-900/30 transition hover:brightness-110"
              >
                Create portfolio
              </button>
              <p className="text-xs text-slate-400">
                Route: POST /portfolio/create
              </p>
            </div>
          </form>
        </div>

        {renameId && (
          <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-900/40 px-4">
            <div className="w-full max-w-md rounded-3xl border border-slate-200/80 bg-white p-6 shadow-lg dark:border-slate-700 dark:bg-slate-900">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Rename Portfolio
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Update the portfolio label.
              </p>
              <input
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                className="mt-4 w-full rounded-2xl border border-slate-200/70 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none focus:border-primary-300 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  className="rounded-xl border border-slate-200/70 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:-translate-y-0.5 hover:border-primary-200 dark:border-slate-700 dark:text-slate-200"
                  onClick={() => {
                    setRenameId(null);
                    setRenameValue("");
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="rounded-xl bg-primary-500 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-primary-900/30 transition hover:brightness-110"
                  onClick={() => handleRename(renameId)}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default PortfolioHubPage;
