import type { ProfileConfig } from "#kit";

import { profileVersion as v1 } from "./v1";

export const yokeshwarConfig: ProfileConfig = {
  slug: "yokeshwar-vs",
  displayName: "Yokeshwar",
  role: "Aspiring Electrical Engineer & IoT Enthusiast",
  owner: { githubId: 56721895, githubLogin: "dinesh-ad" },
  affiliation: "team",
  listed: true,
  status: "available",
  avatarGradient: "from-blue-500 to-cyan-500",
  skills: [{ name: "Python" }, { name: "C" }, { name: "Arduino" }, { name: "SQL" }],
  cardSummary: "Specializes in embedded systems, IoT, and electrical design.",
  versions: {
    v1,
  },
};

export default yokeshwarConfig;
