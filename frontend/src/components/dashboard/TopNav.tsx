import { useNavigate } from "react-router-dom";
import { useTheme } from "../../theme/ThemeProvider";
import { clearStoredUserProfile } from "../../utils/userProfile";

interface TopNavProps {
  userName?: string | null;
  userEmail?: string | null;
}

const getInitials = (name?: string | null, email?: string | null) => {
  if (name && name.trim().length > 0) {
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
  }
  if (email) {
    return email.charAt(0).toUpperCase();
  }
  return "E";
};

export const TopNav = ({ userName, userEmail }: TopNavProps) => {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const initials = getInitials(userName ?? undefined, userEmail ?? undefined);

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("equitypulse-token");
    }
    clearStoredUserProfile();
    navigate("/login", { replace: true });
  };

  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/70 bg-white/80 px-6 py-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/70">
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200/75 bg-white/70 px-4 py-2 text-sm text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <svg
          className="h-4 w-4 text-slate-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="m21 21-4.35-4.35M4 11a7 7 0 1 0 14 0 7 7 0 0 0-14 0Z"
          />
        </svg>
        <input
          type="search"
          placeholder="Search portfolios, tickers, trades..."
          className="w-64 border-none bg-transparent text-sm text-slate-600 placeholder:text-slate-400 focus:outline-none dark:text-slate-200"
        />
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggleTheme}
          className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200/70 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-primary-200 dark:border-slate-700 dark:bg-slate-900"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? (
            <svg
              className="h-5 w-5 text-amber-300"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M6.76 4.84l-1.8-1.79-1.41 1.41 1.79 1.8 1.42-1.42zm10.45 10.45l1.79 1.8 1.41-1.41-1.8-1.79-1.4 1.4zm1.41-10.45l-1.41-1.41-1.8 1.79 1.41 1.42 1.8-1.8zm-12.02 12.02l-1.79 1.8 1.41 1.41 1.8-1.79-1.42-1.42zM12 5.5A6.5 6.5 0 1 0 18.5 12 6.51 6.51 0 0 0 12 5.5z" />
            </svg>
          ) : (
            <svg
              className="h-5 w-5 text-indigo-500"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 3v2m0 14v2m9-9h-2M5 12H3m15.364 6.364-1.414-1.414M7.05 7.05 5.636 5.636M18.364 5.636 16.95 7.05M7.05 16.95l-1.414 1.414M16 12a4 4 0 1 1-4-4"
              />
            </svg>
          )}
        </button>
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200/70 bg-white px-3 py-2 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              {userName ?? "EquityPulse Analyst"}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {userEmail ?? "Add your email"}
            </p>
          </div>
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-primary-500 to-indigo-500 text-center text-lg font-semibold leading-10 text-white">
            {initials}
          </div>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-2 rounded-2xl border border-rose-200/80 bg-white px-4 py-2 text-sm font-semibold text-rose-600 shadow-sm transition hover:-translate-y-0.5 hover:border-rose-300 hover:text-rose-700 dark:border-rose-500/40 dark:bg-slate-900 dark:text-rose-200 dark:hover:border-rose-400"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.6}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6A2.25 2.25 0 0 0 5.25 5.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M9 12h12m0 0-3-3m3 3-3 3"
            />
          </svg>
          Logout
        </button>
      </div>
    </header>
  );
};
