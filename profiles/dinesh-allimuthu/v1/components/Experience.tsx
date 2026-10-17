import { useState } from "react";

import { profileAssetUrl } from "../../../_shared/assets";

/* ------------------------------------------------------------------ */
/* Logo: local self-hosted file → initials badge (no external hosts)  */
/* ------------------------------------------------------------------ */

function logoPath(file: string): string {
  return profileAssetUrl("dinesh-allimuthu", `logos/${file}`);
}

function CompanyLogo({
  localLogo,
  initials,
  color,
}: {
  localLogo: string | null;
  initials: string;
  color: string;
}) {
  const [failed, setFailed] = useState(!localLogo);
  if (failed || !localLogo) {
    return (
      <span className="fi text-lg font-bold" style={{ color }} aria-hidden="true">
        {initials}
      </span>
    );
  }
  return (
    <img
      src={logoPath(localLogo)}
      alt=""
      className="w-full h-full object-contain p-1"
      onError={() => setFailed(true)}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Experience data                                                     */
/* ------------------------------------------------------------------ */

interface Experience {
  id: string;
  title: string;
  company: string;
  location: string;
  period: string;
  localLogo: string | null;
  gradient: string;
  note: string | null;
  progression: string[] | null;
  description: string[];
  technologies: string[];
}

const experiences: Experience[] = [
  /* ---------------------------------------------------------------- */
  /* Omnicom - 2026-present (post-acquisition of IPG/Mediabrands)     */
  /* ---------------------------------------------------------------- */
  {
    id: "omnicom",
    title: "Data Scientist / AI Engineer",
    company: "Omnicom (Mediabrands)",
    location: "France",
    period: "January 2026 - Present",
    localLogo: "omnicom.png",
    gradient: "var(--color-primary)",
    note: "Continuation of Kinesso role post Omnicom-IPG acquisition",
    progression: null,
    description: [
      "Building an LLM-powered Media Agent - a multi-agent AI system for conversational media plan creation, channel allocation, and budget optimization using LangGraph, LangChain, and Vertex AI (Gemini)",
      "Designed Copilot-style conversational interface with stateful agent orchestration, tool-augmented LLM routing, and real-time WebSocket streaming to React frontend",
      "Implemented AI-driven channel allocation integrating a Budget Allocation Math Engine for reach/revenue optimization with natural-language scenario modification",
      "Built partner selection, brief analysis, and client knowledge-base (RAG) capabilities within the multi-agent architecture",
      "Ensured production reliability through validation layers, fallback paths, LangGraph PostgreSQL checkpointing, and LLM evaluation pipelines (Deepeval + Gemini as judge)",
    ],
    technologies: [
      "LangGraph",
      "LangChain",
      "Vertex AI (Gemini)",
      "FastAPI",
      "Python",
      "PostgreSQL",
      "WebSockets",
      "React/TypeScript",
      "Deepeval",
    ],
  },

  /* ---------------------------------------------------------------- */
  /* Kinesso - Oct 2021 to Dec 2025 (IPG/Mediabrands)                 */
  /* ---------------------------------------------------------------- */
  {
    id: "kinesso",
    title: "Data Scientist",
    company: "Kinesso (IPG/Mediabrands)",
    location: "France",
    period: "October 2021 - December 2025",
    localLogo: "kinesso.png",
    gradient: "var(--color-secondary)",
    note: null,
    progression: null,
    description: [
      "Architected FuseProcess - a production-grade data fusion engine performing individual-level statistical matching (MILP, Hungarian, heuristic algorithms) across 800M+ records for audience decisioning platforms",
      "Designed pluggable task orchestration backend with auto-discovery, Pydantic-typed contracts, and R + Python hybrid execution for fusion, verification, reporting, and Snowflake export",
      "Leveraged Meta Robyn for marketing mix modeling, quantifying media spend ROI across multi-country campaigns",
      "Conducted statistical profiling and NLP with BERT models for automated media planning insights",
      "Built Streamlit-based internal tools for demographic imputation, clustering analysis, and campaign reporting",
      "Managed audience data pipelines across US, UK, Germany, France, Japan, and Australia",
    ],
    technologies: [
      "Python",
      "R",
      "GCP",
      "Spark",
      "Snowflake",
      "BERT",
      "XGBoost",
      "Meta Robyn",
      "Streamlit",
      "scipy",
    ],
  },

  /* ---------------------------------------------------------------- */
  /* AFD - 2021                                                        */
  /* ---------------------------------------------------------------- */
  {
    id: "afd",
    title: "Data Scientist Consultant",
    company: "Agence Française de Développement",
    location: "France",
    period: "2021 (1 month)",
    localLogo: "afd.jpg",
    gradient: "var(--color-primary)",
    note: null,
    progression: null,
    description: [
      "Automated regulatory document analysis using NLP and ML pipelines",
      "Extracted key data points via SQL databases and OCR workflows",
      "Created interactive reports and dashboards using Rconnect (RShiny)",
      "Developed custom NLP models for document classification",
    ],
    technologies: ["Python", "NLP", "SQL", "OCR", "RShiny", "Document Classification"],
  },

  /* ---------------------------------------------------------------- */
  /* BNP Paribas - Oct 2018 to Aug 2019                                */
  /* ---------------------------------------------------------------- */
  {
    id: "bnp",
    title: "Senior Analyst (Machine Learning)",
    company: "BNP Paribas",
    location: "Chennai, India",
    period: "October 2018 - August 2019",
    localLogo: "bnp.png",
    gradient: "var(--color-secondary)",
    note: "Bank of the West, United States",
    progression: null,
    description: [
      "Reduced technical debt costs by 12% through targeted system modernization",
      "Built Power BI dashboards for customer spending insights, contributing to a 9% profit uplift",
      "Detected fraudulent transaction patterns using ML-based anomaly detection models",
      "Led data warehousing, mining, and cleansing initiatives for downstream analytics",
    ],
    technologies: ["Python", "Power BI", "Hadoop", "PL/SQL", "ML Models"],
  },

  /* ---------------------------------------------------------------- */
  /* PayPal - Sep 2018                                                 */
  /* ---------------------------------------------------------------- */
  {
    id: "paypal",
    title: "ETL Developer",
    company: "PayPal",
    location: "Chennai, India",
    period: "September 2018 (1 month)",
    localLogo: "paypal.png",
    gradient: "var(--color-accent)",
    note: null,
    progression: null,
    description: [
      "Developed and optimized ETL workflows for payment transaction data processing",
      "Managed data extraction, transformation, and loading across enterprise data sources",
      "Collaborated with cross-functional teams on data pipeline reliability and quality assurance",
    ],
    technologies: ["Informatica ETL", "SQL", "Data Warehousing", "Data Quality"],
  },

  /* ---------------------------------------------------------------- */
  /* TCS - Jul 2013 to Aug 2018                                        */
  /* ---------------------------------------------------------------- */
  {
    id: "tcs",
    title: "IT Analyst (Business Intelligence)",
    company: "Tata Consultancy Services",
    location: "Chennai, India",
    period: "July 2013 - August 2018",
    localLogo: "tcs.png",
    gradient: "var(--color-primary)",
    note: "Rogers Communications (Canada), British Airways",
    progression: ["Assistant System Engineer", "System Engineer", "IT Analyst"],
    description: [
      "Designed and supported large-scale data warehouse and ETL platforms within telecom and airline environments",
      "Built and maintained enterprise data pipelines integrating heterogeneous data sources and platforms",
      "Contributed to customer experience analytics (NPS, EBU Relationship, BCB, DQ)",
      "Supported high-availability production systems with incident resolution and root-cause analysis",
      "Delivered data solutions under strict SLA, reliability, and compliance constraints",
      "Performed performance tuning across data workflows, queries, and system resources",
      "Implemented automation and scheduling for recurring data processes and operational tasks",
      "Operated in AWS cloud environment with cross-functional delivery teams",
    ],
    technologies: [
      "Informatica ETL",
      "SQL",
      "PL/SQL",
      "AWS",
      "CRM",
      "Data Warehousing",
      "Production Support",
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function getInitials(company: string): string {
  return company
    .split(/[\s/()]+/)
    .filter((w) => w.length > 0)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export function Experience() {
  return (
    <section
      id="experience"
      className="py-16 md:py-24 bg-(--color-background) relative overflow-hidden border-t border-slate-200"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-12">
          <div className="inline-block mb-4">
            <div className="w-16 h-16 bg-(--color-primary) rounded-2xl flex items-center justify-center text-3xl shadow-lg">
              💼
            </div>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-8 md:mb-12 bg-linear-to-r from-(--color-primary) via-(--color-secondary) to-(--color-accent) bg-clip-text text-transparent">
            Experience
          </h2>
          <div className="flex items-center justify-center gap-2 mt-6">
            <div className="h-1 w-12 bg-(--color-primary) rounded-full" />
            <div className="h-1 w-8 bg-(--color-secondary) rounded-full" />
            <div className="h-1 w-12 bg-(--color-accent) rounded-full" />
          </div>
        </div>

        <div className="relative">
          <div className="hidden md:block absolute left-8 top-0 bottom-0 w-0.5 bg-linear-to-b from-(--color-primary) via-(--color-secondary) to-(--color-accent)" />

          <div className="space-y-8">
            {experiences.map((exp) => {
              const initials = getInitials(exp.company);
              return (
                <div key={exp.id} className="relative">
                  {/* Desktop timeline logo */}
                  <div className="hidden md:flex absolute left-0 top-6 w-16 h-16 items-center justify-center">
                    <div
                      className="w-14 h-14 rounded-xl shadow-md flex items-center justify-center z-10 bg-white border border-slate-200 overflow-hidden"
                      style={{ color: exp.gradient }}
                      data-initials={initials}
                    >
                      <CompanyLogo
                        localLogo={exp.localLogo}
                        initials={initials}
                        color={exp.gradient}
                      />
                    </div>
                  </div>

                  {/* Card */}
                  <div className="bg-white border border-slate-200 rounded-xl p-6 md:p-8 shadow-xs hover:shadow-md transition-all duration-300 ml-0 md:ml-20">
                    <div className="mb-4">
                      {/* Mobile: inline badge + title */}
                      <div className="flex items-center gap-3 mb-2 md:hidden">
                        <span
                          className="w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold shrink-0"
                          style={{ backgroundColor: exp.gradient, color: "white" }}
                        >
                          {initials}
                        </span>
                        <h3 className="text-xl font-display font-bold text-slate-900">
                          {exp.title}
                        </h3>
                      </div>

                      {/* Desktop: title */}
                      <h3 className="text-xl md:text-2xl font-display font-bold text-slate-900 hidden md:block mb-2">
                        {exp.title}
                      </h3>

                      <p
                        className="text-lg font-display font-semibold mb-1"
                        style={{ color: exp.gradient }}
                      >
                        {exp.company}
                      </p>

                      {/* Role progression */}
                      {exp.progression && (
                        <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 mb-2">
                          {exp.progression.map((role, i, arr) => (
                            <span key={role} className="flex items-center gap-1.5">
                              <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-600 font-medium">
                                {role}
                              </span>
                              {i < arr.length - 1 && <span className="text-slate-400">→</span>}
                            </span>
                          ))}
                        </div>
                      )}

                      {exp.note && <p className="text-sm text-slate-600 italic mb-2">{exp.note}</p>}

                      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                        <span>{exp.location}</span>
                        <span>•</span>
                        <span>{exp.period}</span>
                      </div>
                    </div>

                    <ul className="space-y-3 mt-6">
                      {exp.description.map((item) => (
                        <li key={item} className="text-slate-700 leading-relaxed flex items-start">
                          <span
                            className="mr-3 mt-1 text-xl font-bold shrink-0"
                            style={{ color: exp.gradient }}
                          >
                            ▸
                          </span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {exp.technologies.map((tech) => (
                        <span
                          key={tech}
                          className="px-3 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
