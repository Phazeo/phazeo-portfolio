import type { ProfileConfig } from "../../types";

import { profileVersion as v1 } from "./v1";

export const kayalvizhiConfig: ProfileConfig = {
  slug: "kayalvizhi",
  displayName: "Kayalvizhi S M",
  role: "AI-Enabled Application Engineer",
  listed: true,
  status: "available",
  avatarGradient: "from-teal-600 to-rose-600",
  skills: [
    { name: "Python", deviconClass: "python-plain", colored: true },
    { name: "Azure", deviconClass: "azure-plain", colored: true },
    { name: "SQL", deviconClass: "postgresql-plain", colored: true },
  ],
  cardSummary: "3+ years healthcare apps. GenAI PoC, ServiceNow, Splunk. PL-300, AZ-900.",
  experienceStartYear: 2022,
  socials: {
    linkedin: "https://linkedin.com/in/kayalvizhi-sm",
  },
  versions: {
    v1,
  },
};

export default kayalvizhiConfig;
