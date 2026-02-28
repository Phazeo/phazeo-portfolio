import type { ProfileConfig } from "../types";

// Import all versions
import { profileVersion as v1 } from "./v1";
// import { profileVersion as v2 } from "./v2"; // Uncomment when v2 exists

export const sowmipriyaConfig: ProfileConfig = {
  slug: "sowmipriya",
  displayName: "Sowmipriya Rajendiran",
  role: "Data Scientist & AI Engineer",
  listed: true,
  status: "available",
  avatarGradient: "from-fuchsia-500 to-pink-600",
  skills: [
    { name: "Python", deviconClass: "python-plain", colored: true },
    { name: "TensorFlow", deviconClass: "tensorflow-original", colored: true },
    { name: "React", deviconClass: "react-original", colored: true },
    { name: "PostgreSQL", deviconClass: "postgresql-plain", colored: true },
    { name: "AWS", deviconClass: "amazonwebservices-original-wordmark", colored: true },
  ],
  workPeriods: [
    { start: "2015-07", end: "2019-08" },
    { start: "2021-09", end: null },
  ],
  socials: {
    linkedin: "https://www.linkedin.com/in/sowmipriya-rajendiran",
    github: "https://github.com/sowmipriya",
  },
  versions: {
    v1,
  },
};

export default sowmipriyaConfig;
