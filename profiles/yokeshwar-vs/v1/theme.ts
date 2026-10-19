import type { ProfileSeo, ProfileTheme } from "#kit";
import { profileAssetPath } from "#kit";

export const theme: ProfileTheme = {
  cssVariables: {
    "--color-primary": "#0ea5e9",
    "--color-primary-hover": "#0284c7",
    "--color-secondary": "#38bdf8",
    "--color-accent": "#f97316",
    "--color-background": "#f8fafc",
    "--font-heading": "'Outfit Variable', sans-serif",
    "--font-body": "'Inter Variable', system-ui, sans-serif",
  },
};

export const seo: ProfileSeo = {
  title: "Yokeshwar | Electrical & Electronics Engineering Student",
  description:
    "Yokeshwar - Motivated EEE student with hands-on experience in Electric Vehicles, IoT, and Embedded Systems. Building real-world solutions through innovation.",
  ogImage: profileAssetPath("yokeshwar-vs", "profile-photo.jpg"),
};
