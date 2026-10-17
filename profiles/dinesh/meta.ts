import type { ProfileConfig } from "../../types";

import { profileVersion as v1 } from "./v1";

export const dineshConfig: ProfileConfig = {
  slug: "dinesh",
  displayName: "Dinesh Allimuthu",
  role: "AI Data Scientist",
  listed: true,
  status: "available",
  avatarGradient: "from-amber-500 to-orange-600",
  skills: [
    { name: "Python", deviconClass: "python-plain", colored: true },
    { name: "LLM Agents", deviconClass: "python-plain", colored: true },
    { name: "LangChain", deviconClass: "python-plain", colored: true },
  ],
  cardSummary:
    "Data Scientist with 11+ years of experience in IT, currently focused on building LLM-powered AI agents and intelligent data systems.",
  workPeriods: [
    { start: "2013-07", end: "2019-08" },
    { start: "2021-09", end: null },
  ],
  socials: {
    linkedin: "https://linkedin.com/in/dinesha07",
    github: "https://github.com/dinesh-ad",
  },
  versions: { v1 },
  activeVersion: "v1",
};

export default dineshConfig;
