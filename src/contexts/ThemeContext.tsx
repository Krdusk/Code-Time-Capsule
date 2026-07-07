import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

type ThemeMode = "light" | "dark";

interface ThemeContextValue {
  theme: ThemeMode;
  dark: boolean;
  toggle: () => void;
  setTheme: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "light",
  dark: false,
  toggle: () => {},
  setTheme: () => {},
});

function getInitialTheme(): ThemeMode {
  try {
    const saved = localStorage.getItem("gitsleuth_theme");
    if (saved === "dark" || saved === "light") return saved;
  } catch {}
  // Check system preference
  if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  return "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(getInitialTheme);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    try {
      localStorage.setItem("gitsleuth_theme", theme);
    } catch {}
  }, [theme]);

  const toggle = useCallback(() => {
    setThemeState((prev) => (prev === "light" ? "dark" : "light"));
  }, []);

  const setTheme = useCallback((mode: ThemeMode) => {
    setThemeState(mode);
  }, []);

  return (
    <ThemeContext.Provider
      value={{ theme, dark: theme === "dark", toggle, setTheme }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}