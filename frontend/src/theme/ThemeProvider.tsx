import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const getPreferredTheme = (): Theme => {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem("equitypulse-theme");
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
};

const applyThemeClass = (theme: Theme) => {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.classList.toggle("light", theme === "light");
  document.documentElement.setAttribute("data-theme", theme);
  document.documentElement.style.setProperty(
    "color-scheme",
    theme === "dark" ? "dark" : "light"
  );
};

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setThemeState] = useState<Theme>(getPreferredTheme);

  useEffect(() => {
    applyThemeClass(theme);
    window.localStorage.setItem("equitypulse-theme", theme);
  }, [theme]);

  useEffect(() => {
    const handler = (event: MediaQueryListEvent) => {
      setThemeState(event.matches ? "dark" : "light");
    };
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, []);

  const value = useMemo(
    () => ({
      theme,
      toggleTheme: () =>
        setThemeState((prev) => (prev === "light" ? "dark" : "light")),
      setTheme: (nextTheme: Theme) => setThemeState(nextTheme),
    }),
    [theme]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
