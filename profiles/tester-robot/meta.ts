import type { ProfileConfig } from "../../types";

import { profileVersion as v1 } from "./v1";

export const testerRobotConfig: ProfileConfig = {
  slug: "tester-robot",
  displayName: "Tester Robot",
  role: "QA Automation Profile",
  listed: false,
  status: "available",
  avatarGradient: "from-slate-500 to-zinc-600",
  skills: [
    { name: "Testing", deviconClass: "python-plain", colored: true },
    { name: "Automation", deviconClass: "python-plain", colored: true },
  ],
  cardSummary: "Test profile for CI/CD and deploy hook validation.",
  experienceStartYear: 2025,
  versions: {
    v1,
  },
};

export default testerRobotConfig;
