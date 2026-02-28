import type { ProfileSeo, ProfileTheme } from "../../types";

export const theme: ProfileTheme = {
  cssVariables: {
    "--color-primary": "#73C7C7",
    "--color-primary-hover": "#5fb3b3",
    "--color-secondary": "#A6F1E0",
    "--color-accent": "#F7CFD8",
    "--color-background": "#F4F8D3",
    "--font-heading": "'Playfair Display', serif",
    "--font-body": "'Inter', system-ui, sans-serif",
  },
  fontUrl:
    "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Playfair+Display:wght@400;500;600;700&display=swap",
};

export const seo: ProfileSeo = {
  title: "Sowmipriya Rajendiran | Data Scientist & ML Engineer",
  description:
    "Sowmipriya Rajendiran - Experienced Data Scientist & Machine Learning Engineer specializing in LLM, NLP, and applied AI",
  ogImage: "profiles/sowmipriya/profile-photo.jpg",
};
