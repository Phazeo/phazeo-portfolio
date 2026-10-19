import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  createThemeSession,
  STORAGE_KEY,
  THEME_COLOR_DARK,
  THEME_COLOR_LIGHT,
  type Theme,
  type ThemeSessionEnv,
} from "./theme-session";

export type { Theme } from "./theme-session";
export {
  createThemeSession,
  STORAGE_KEY,
  THEME_COLOR_DARK,
  THEME_COLOR_LIGHT,
} from "./theme-session";

export function readStoredTheme(): Theme | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") {
      return stored;
    }
  } catch {
    /* storage blocked or unavailable */
  }
  return null;
}

export function writeStoredTheme(theme: Theme): void {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* storage blocked or unavailable */
  }
}

/** Read the class already applied by the index.html inline script (before paint). */
export function readDomTheme(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    metaTheme.setAttribute("content", theme === "dark" ? THEME_COLOR_DARK : THEME_COLOR_LIGHT);
  }
}

function browserSessionEnv(): ThemeSessionEnv {
  return {
    getStored: readStoredTheme,
    setStored: writeStoredTheme,
    getDomTheme: readDomTheme,
    apply: applyTheme,
    subscribeSystem(onChange) {
      let mq: MediaQueryList;
      try {
        mq = window.matchMedia("(prefers-color-scheme: dark)");
      } catch {
        return () => {
          /* no media query support */
        };
      }
      const handler = (event: MediaQueryListEvent) => {
        onChange(event.matches);
      };
      mq.addEventListener("change", handler);
      return () => {
        mq.removeEventListener("change", handler);
      };
    },
  };
}

const ThemeContext = createContext<{
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
} | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const sessionRef = useRef<ReturnType<typeof createThemeSession> | null>(null);
  if (!sessionRef.current) {
    sessionRef.current = createThemeSession(browserSessionEnv());
  }
  const session = sessionRef.current;

  const [theme, setThemeState] = useState<Theme>(() => session.getTheme());

  useEffect(() => {
    const unmount = session.mount();
    const unsub = session.subscribe(setThemeState);
    setThemeState(session.getTheme());
    return () => {
      unsub();
      unmount();
    };
  }, [session]);

  const setTheme = useCallback(
    (newTheme: Theme) => {
      session.setTheme(newTheme);
      setThemeState(session.getTheme());
    },
    [session]
  );

  const toggleTheme = useCallback(() => {
    session.toggle();
    setThemeState(session.getTheme());
  }, [session]);

  const value = useMemo(() => ({ theme, setTheme, toggleTheme }), [theme, setTheme, toggleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
