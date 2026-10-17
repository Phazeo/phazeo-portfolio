import { SpotlightCard } from "../ui/spotlight-card";

const skillCategories = [
  {
    id: "languages-tools",
    category: "Languages & Tools",
    icon: "💻",
    gradient: "var(--color-primary)",
    skills: ["Python", "R", "Rust", "SQL", "PL/SQL", "Unix", "PySpark"],
  },
  {
    id: "ml-frameworks",
    category: "ML/AI Frameworks",
    icon: "🧠",
    gradient: "var(--color-secondary)",
    skills: ["TensorFlow", "PyTorch", "Keras", "Scikit-learn", "NLTK", "Spacy", "Gensim"],
  },
  {
    id: "llm-agents",
    category: "LLM & Agent Systems",
    icon: "🤖",
    gradient: "var(--color-primary)",
    skills: [
      "LangChain",
      "LangGraph",
      "Vertex AI (Gemini)",
      "Vector Databases",
      "RAG Pipelines",
      "Agent Orchestration",
    ],
  },
  {
    id: "big-data-cloud",
    category: "Big Data & Cloud",
    icon: "☁️",
    gradient: "var(--color-secondary)",
    skills: ["Spark", "Hadoop", "Databricks", "Kafka", "AWS", "GCP", "Snowflake"],
  },
  {
    id: "viz-bi",
    category: "Visualization & BI",
    icon: "📊",
    gradient: "var(--color-primary)",
    skills: ["Tableau", "Power BI", "Streamlit", "R Shiny", "Qlik Sense"],
  },
  {
    id: "databases",
    category: "Databases",
    icon: "🗄️",
    gradient: "var(--color-secondary)",
    skills: ["MongoDB", "Cassandra", "Oracle", "PostgreSQL"],
  },
  {
    id: "specializations",
    category: "Specializations",
    icon: "⚡",
    gradient: "var(--color-accent)",
    skills: [
      "NLP/NLU",
      "Computer Vision",
      "Time Series",
      "Deep Learning",
      "MLOps",
      "LLM Orchestration",
    ],
  },
];

export function Skills() {
  return (
    <section
      id="skills"
      className="py-16 md:py-24 bg-slate-50/80 relative overflow-hidden border-t border-slate-200"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-12">
          <div className="inline-block mb-4">
            <div className="w-16 h-16 bg-(--color-primary) rounded-2xl flex items-center justify-center text-3xl shadow-lg">
              ⚡
            </div>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-8 md:mb-12 bg-linear-to-r from-(--color-primary) via-(--color-secondary) to-(--color-accent) bg-clip-text text-transparent">
            Technical Skills
          </h2>
          <div className="flex items-center justify-center gap-2 mt-6">
            <div className="h-1 w-12 bg-(--color-primary) rounded-full" />
            <div className="h-1 w-8 bg-(--color-secondary) rounded-full" />
            <div className="h-1 w-12 bg-(--color-accent) rounded-full" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {skillCategories.map((cat) => {
            const spotlightColor =
              cat.gradient === "var(--color-secondary)"
                ? "rgba(124, 58, 237, 0.08)"
                : cat.gradient === "var(--color-accent)"
                  ? "rgba(8, 145, 178, 0.08)"
                  : "rgba(37, 99, 235, 0.08)";

            return (
              <SpotlightCard
                key={cat.id}
                className="bg-white border border-slate-200 rounded-xl p-6 md:p-8 shadow-xs hover:shadow-md transition-all duration-300"
                spotlightColor={spotlightColor}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl shadow-lg"
                    style={{ backgroundColor: cat.gradient }}
                  >
                    {cat.icon}
                  </div>
                  <h3 className="text-lg font-display font-bold" style={{ color: cat.gradient }}>
                    {cat.category}
                  </h3>
                </div>
                <ul className="space-y-2">
                  {cat.skills.map((skill) => (
                    <li key={skill} className="text-slate-700 text-sm flex items-start">
                      <span
                        className="mr-2 mt-1 font-bold shrink-0"
                        style={{ color: cat.gradient }}
                      >
                        ▸
                      </span>
                      <span>{skill}</span>
                    </li>
                  ))}
                </ul>
              </SpotlightCard>
            );
          })}
        </div>
      </div>
    </section>
  );
}
