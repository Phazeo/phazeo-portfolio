import type { ProfileSeo, ProfileTheme } from "../../../types";
import { profileAssetPath } from "../../_shared/assets";

export const theme: ProfileTheme = {
  cssVariables: {
    "--color-primary": "#2563EB",
    "--color-primary-hover": "#1D4ED8",
    "--color-secondary": "#7C3AED",
    "--color-accent": "#0891B2",
    "--color-background": "#FFFFFF",
    "--color-text": "#0F172A",
    "--font-heading": "'Space Grotesk Variable', sans-serif",
    "--font-body": "'Inter Variable', sans-serif",
  },
};

export const seo: ProfileSeo = {
  title: "Dinesh Allimuthu | Data Scientist & ML Engineer",
  description:
    "Data Scientist with 6+ years of experience in ML, NLP, and Big Data. Specialized in transforming complex data into actionable insights for global enterprises.",
  ogImage: profileAssetPath("dinesh-allimuthu", "profile-photo.jpg"),
};
