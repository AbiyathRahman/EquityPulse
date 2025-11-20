const DEFAULT_KEY = "equitypulse-default-portfolio";

export const setDefaultPortfolioId = (id: number) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DEFAULT_KEY, String(id));
};

export const getDefaultPortfolioId = (): number | null => {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(DEFAULT_KEY);
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const clearDefaultPortfolioId = () => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(DEFAULT_KEY);
};
