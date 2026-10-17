import type { ProfileSeo, ProfileTheme } from "../../../types";

export const theme: ProfileTheme = {
  cssVariables: {
    "--color-primary": "#0d9488",
    "--color-primary-hover": "#0f766e",
    "--color-secondary": "#7c3aed",
    "--color-accent": "#e11d48",
    "--color-background": "#f8fafc",
    "--font-heading": "'Outfit', sans-serif",
    "--font-body": "'Inter', system-ui, sans-serif",
  },
  fontUrl:
    "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@400;500;600;700&display=swap",
};

export const seo: ProfileSeo = {
  title: "Kayalvizhi S M | AI-Enabled Application Engineer | Healthcare",
  description:
    "Kayalvizhi S M - AI-Enabled Application Engineer with 3+ years in healthcare. Production support, ServiceNow, Splunk. Building GenAI & RAG expertise. PL-300, AZ-900 certified.",
  ogImage: "profiles/_public/kayalvizhi/profile-photo.jpg",
};
