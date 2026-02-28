import type { ProfileConfig } from "../../types";

import { profileVersion as v1 } from "./v1";

export const yokeshwarConfig: ProfileConfig = {
  slug: "yokeshwar",
  displayName: "Yokeshwar",
  role: "Aspiring Electrical Engineer & IoT Enthusiast",
  listed: true,
  status: "available",
  avatarGradient: "from-blue-500 to-cyan-500",
  skills: [
    { name: "Python", deviconClass: "python-plain", colored: true },
    { name: "C", deviconClass: "c-plain", colored: true },
    { name: "Arduino", deviconClass: "arduino-plain", colored: true },
    { name: "SQL", deviconClass: "postgresql-plain", colored: true },
  ],
  cardSummary: "Specializes in embedded systems, IoT, and electrical design.",
  versions: {
    v1,
  },
};

export default yokeshwarConfig;
