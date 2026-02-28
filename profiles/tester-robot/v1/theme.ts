import type { ProfileSeo, ProfileTheme } from "../../../types";

export const theme: ProfileTheme = {
  cssVariables: {
    "--color-primary": "#64748b",
    "--color-primary-hover": "#475569",
    "--color-secondary": "#94a3b8",
    "--color-accent": "#71717a",
    "--color-background": "#f8fafc",
    "--font-heading": "'Inter', sans-serif",
    "--font-body": "'Inter', system-ui, sans-serif",
  },
  fontUrl: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
};

export const seo: ProfileSeo = {
  title: "Tester Robot | QA Automation Profile",
  description: "Test profile for validating portfolio deploy pipeline.",
};
