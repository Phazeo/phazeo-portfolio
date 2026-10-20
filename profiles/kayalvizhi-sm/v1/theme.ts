import type { ProfileSeo, ProfileTheme } from "#kit";

export const theme: ProfileTheme = {
  cssVariables: {
    "--color-primary": "#0d9488",
    "--color-primary-hover": "#0f766e",
    "--color-secondary": "#7c3aed",
    "--color-accent": "#e11d48",
    "--color-background": "#f8fafc",
    "--font-heading": "'Outfit Variable', sans-serif",
    "--font-body": "'Inter Variable', system-ui, sans-serif",
  },
};

export const seo: ProfileSeo = {
  title: "Kayalvizhi S M | AI-Enabled Application Engineer | Healthcare",
  description:
    "Kayalvizhi S M - AI-Enabled Application Engineer with 3+ years in healthcare. Production support, ServiceNow, Splunk. Building GenAI & RAG expertise. PL-300, AZ-900 certified.",
  // No profile-photo.jpg in public/profiles/kayalvizhi-sm/ — ogImage omitted.
};
