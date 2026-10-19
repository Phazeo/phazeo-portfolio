import type { ProfileConfig } from "#kit";

import { profileVersion as v1 } from "./v1";

export const sriramConfig: ProfileConfig = {
  slug: "sriram-sm",
  displayName: "Sriram S M",
  role: "Generative AI Developer",
  owner: { githubId: 56721895, githubLogin: "dinesh-ad" },
  affiliation: "team",
  listed: true,
  status: "available",
  avatarGradient: "from-indigo-500 to-violet-600",
  skills: [{ name: "Python" }, { name: "LangChain" }, { name: "Azure" }, { name: "SQL" }],
  cardSummary: "GenAI Developer at TCS. Agentic AI, RAG, LLMs. Azure AI Engineer Associate.",
  experienceStartYear: 2024,
  socials: {
    linkedin: "https://linkedin.com/in/sriram-s-m-183299238",
  },
  versions: {
    v1,
  },
};

export default sriramConfig;
