import type { ProfileConfig } from "../../types";

import { profileVersion as v1 } from "./v1";

export const sriramConfig: ProfileConfig = {
  slug: "sriram",
  displayName: "Sriram S M",
  role: "Generative AI Developer",
  listed: true,
  status: "available",
  avatarGradient: "from-indigo-500 to-violet-600",
  skills: [
    { name: "Python", deviconClass: "python-plain", colored: true },
    { name: "LangChain", deviconClass: "python-plain", colored: true },
    { name: "Azure", deviconClass: "azure-plain", colored: true },
    { name: "SQL", deviconClass: "postgresql-plain", colored: true },
  ],
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
