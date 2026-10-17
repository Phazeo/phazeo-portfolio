import type { ProfileSeo, ProfileTheme } from "../../../types";

export const theme: ProfileTheme = {
  cssVariables: {
    "--color-primary": "#0ea5e9",
    "--color-primary-hover": "#0284c7",
    "--color-secondary": "#38bdf8",
    "--color-accent": "#f97316",
    "--color-background": "#f8fafc",
    "--font-heading": "'Outfit', sans-serif",
    "--font-body": "'Inter', system-ui, sans-serif",
  },
  fontUrl:
    "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@400;500;600;700&display=swap",
};

export const seo: ProfileSeo = {
  title: "Yokeshwar | Electrical & Electronics Engineering Student",
  description:
    "Yokeshwar - Motivated EEE student with hands-on experience in Electric Vehicles, IoT, and Embedded Systems. Building real-world solutions through innovation.",
  ogImage: "profiles/_public/yokeshwar/profile-photo.jpg",
};
