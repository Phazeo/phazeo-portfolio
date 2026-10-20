import type { ProfileTheme } from "#kit";

/** Preset names allowed in profile.json meta.theme */
export const DATA_PROFILE_THEMES = ["slate", "ocean", "editorial", "tech"] as const;
export type DataProfileThemeName = (typeof DATA_PROFILE_THEMES)[number];

/**
 * Four deliberate palettes. Each pairs a self-hosted display font with Inter body.
 * Tokens are tuned for light surfaces; the page uses dark: utilities for the shell so
 * text stays AA against both light backgrounds and the dark shell.
 */
export const dataProfileThemes: Record<DataProfileThemeName, ProfileTheme> = {
  slate: {
    cssVariables: {
      "--color-primary": "#0f172a",
      "--color-primary-hover": "#020617",
      "--color-secondary": "#475569",
      "--color-accent": "#0d9488",
      "--color-background": "#f8fafc",
      "--font-heading": "'Inter Variable', sans-serif",
      "--font-body": "'Inter Variable', sans-serif",
    },
  },
  ocean: {
    cssVariables: {
      "--color-primary": "#0c4a6e",
      "--color-primary-hover": "#082f49",
      "--color-secondary": "#0369a1",
      "--color-accent": "#0891b2",
      "--color-background": "#f0f9ff",
      "--font-heading": "'Outfit Variable', sans-serif",
      "--font-body": "'Inter Variable', sans-serif",
    },
  },
  editorial: {
    cssVariables: {
      "--color-primary": "#1c1917",
      "--color-primary-hover": "#0c0a09",
      "--color-secondary": "#57534e",
      "--color-accent": "#b45309",
      "--color-background": "#fafaf9",
      "--font-heading": "'Playfair Display Variable', serif",
      "--font-body": "'Inter Variable', sans-serif",
    },
  },
  tech: {
    cssVariables: {
      "--color-primary": "#312e81",
      "--color-primary-hover": "#1e1b4b",
      "--color-secondary": "#4f46e5",
      "--color-accent": "#0f766e",
      "--color-background": "#fafafa",
      "--font-heading": "'Space Grotesk Variable', sans-serif",
      "--font-body": "'Inter Variable', sans-serif",
    },
  },
};
