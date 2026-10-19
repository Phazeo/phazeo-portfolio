export type Theme = "light" | "dark";

export const STORAGE_KEY = "phazeo-portfolio-theme";

export const THEME_COLOR_LIGHT = "#c7d2fe";
export const THEME_COLOR_DARK = "#0c0a24";

export type ThemeSessionEnv = {
  getStored: () => Theme | null;
  setStored: (theme: Theme) => void;
  getDomTheme: () => Theme;
  apply: (theme: Theme) => void;
  subscribeSystem: (onChange: (isDark: boolean) => void) => () => void;
};

/**
 * Theme session used by ThemeProvider. Exported for unit tests:
 * no storage write on mount, write on toggle, follow system only when unset.
 */
export function createThemeSession(env: ThemeSessionEnv) {
  let theme = env.getDomTheme();
  let explicit = env.getStored() !== null;
  let unsubSystem: (() => void) | null = null;
  const listeners = new Set<(theme: Theme) => void>();

  function emit() {
    for (const listener of listeners) {
      listener(theme);
    }
  }

  return {
    getTheme: () => theme,
    hasExplicitChoice: () => explicit,
    subscribe(listener: (theme: Theme) => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    mount() {
      env.apply(theme);
      if (!explicit) {
        unsubSystem = env.subscribeSystem((isDark) => {
          if (explicit) {
            return;
          }
          theme = isDark ? "dark" : "light";
          env.apply(theme);
          emit();
        });
      }
      return () => {
        unsubSystem?.();
        unsubSystem = null;
      };
    },
    toggle() {
      theme = theme === "light" ? "dark" : "light";
      explicit = true;
      env.setStored(theme);
      env.apply(theme);
      emit();
    },
    setTheme(next: Theme) {
      theme = next;
      explicit = true;
      env.setStored(next);
      env.apply(next);
      emit();
    },
  };
}
