/** Shape of profiles/<slug>/profile.json after schema validation. */
export interface DataProfileOwner {
  githubId: number;
  githubLogin: string;
}

export interface DataProfileJson {
  $schema?: string;
  meta: {
    owner: DataProfileOwner;
    affiliation: "team" | "guest";
    theme: "slate" | "ocean" | "editorial" | "tech";
  };
  basics: {
    name: string;
    label: string;
    summary: string;
    image?: string;
    email?: string;
    url?: string;
    profiles?: { network: string; username: string; url: string }[];
  };
  work?: {
    name: string;
    position: string;
    startDate: string;
    endDate?: string;
    summary?: string;
    highlights?: string[];
  }[];
  education?: {
    institution: string;
    area?: string;
    studyType?: string;
    startDate?: string;
    endDate?: string;
  }[];
  projects?: {
    name: string;
    description?: string;
    url?: string;
    highlights?: string[];
  }[];
  skills?: { name: string; keywords?: string[] }[];
  certificates?: {
    name: string;
    issuer?: string;
    date?: string;
    url?: string;
  }[];
  languages?: { language: string; fluency?: string }[];
  resume?: { file: "resume.pdf" };
}
