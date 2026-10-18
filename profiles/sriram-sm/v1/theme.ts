import type { ProfileSeo, ProfileTheme } from "../../../types";

export const theme: ProfileTheme = {
  cssVariables: {
    "--color-primary": "#2563eb",
    "--color-primary-hover": "#1d4ed8",
    "--color-secondary": "#7c3aed",
    "--color-accent": "#0891b2",
    "--color-background": "#f8fafc",
    "--font-heading": "'Outfit Variable', sans-serif",
    "--font-body": "'Inter Variable', system-ui, sans-serif",
  },
};

export const seo: ProfileSeo = {
  title: "Sriram S M | Generative AI Developer | TCS",
  description:
    "Sriram S M - Generative AI Developer with 2 years experience. Agentic AI, RAG, LLMs. Designing end-to-end GenAI solutions at Tata Consultancy Services.",
  // No profile-photo.jpg in public/profiles/sriram-sm/ — ogImage omitted.
};
