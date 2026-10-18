import type { ProfileTheme } from "../../../types";

/** Preset names allowed in profile.json meta.theme */
export const DATA_PROFILE_THEMES = ["slate", "ocean", "editorial", "tech"] as const;
export type DataProfileThemeName = (typeof DATA_PROFILE_THEMES)[number];

export const dataProfileThemes: Record<DataProfileThemeName, ProfileTheme> = {
  slate: {
    cssVariables: {
      "--color-primary": "#334155",
      "--color-primary-hover": "#1e293b",
      "--color-secondary": "#64748b",
      "--color-accent": "#0f766e",
      "--color-background": "#f8fafc",
      "--font-heading": "'Inter Variable', sans-serif",
      "--font-body": "'Inter Variable', sans-serif",
    },
  },
  ocean: {
    cssVariables: {
      "--color-primary": "#0369a1",
      "--color-primary-hover": "#075985",
      "--color-secondary": "#0e7490",
      "--color-accent": "#0891b2",
      "--color-background": "#f0f9ff",
      "--font-heading": "'Outfit Variable', sans-serif",
      "--font-body": "'Inter Variable', sans-serif",
    },
  },
  editorial: {
    cssVariables: {
      "--color-primary": "#44403c",
      "--color-primary-hover": "#292524",
      "--color-secondary": "#78716c",
      "--color-accent": "#a16207",
      "--color-background": "#fafaf9",
      "--font-heading": "'Playfair Display Variable', serif",
      "--font-body": "'Inter Variable', sans-serif",
    },
  },
  tech: {
    cssVariables: {
      "--color-primary": "#4338ca",
      "--color-primary-hover": "#3730a3",
      "--color-secondary": "#6366f1",
      "--color-accent": "#0d9488",
      "--color-background": "#fafafa",
      "--font-heading": "'Space Grotesk Variable', sans-serif",
      "--font-body": "'Inter Variable', sans-serif",
    },
  },
};
