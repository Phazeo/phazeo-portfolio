import type { ProfileTheme } from "#kit";

export function applyTheme(theme: ProfileTheme): () => void {
  const root = document.documentElement;
  const appliedVariables: string[] = [];
  for (const [key, value] of Object.entries(theme.cssVariables)) {
    root.style.setProperty(key, value);
    appliedVariables.push(key);
  }
  return () => {
    for (const key of appliedVariables) {
      root.style.removeProperty(key);
    }
  };
}
