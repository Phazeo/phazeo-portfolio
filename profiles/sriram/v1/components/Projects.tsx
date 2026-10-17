const projects: {
  id: string;
  title: string;
  type: string;
  icon: string;
  gradient: string;
  description: string;
  technologies: string[];
}[] = [
  {
    id: "agentic-incident",
    title: "Agentic AI Orchestration - Incident to Resolution Automation",
    type: "Enterprise GenAI PoC",
    icon: "🤖",
    gradient: "var(--color-primary)",
    description:
      "Designed an end-to-end multi-agent AI system to automate incident handling from detection to resolution. Built agents for orchestration, ticketing, analysis, and remediation with RAG-based contextual reasoning. Integrated ITSM workflows and automated remediation within an enterprise GenAI PoC.",
    technologies: ["Agentic AI", "RAG", "CrewAI", "LangChain", "ITSM"],
  },
  {
    id: "anomaly-detection",
    title: "Network & Infrastructure Anomaly Detection System",
    type: "ML Solution",
    icon: "📊",
    gradient: "var(--color-secondary)",
    description:
      "Evaluated rule-based, unsupervised, hybrid, and supervised ML approaches for anomaly detection. Implemented Isolation Forest and KNN; finalized XGBoost based on performance and stability.",
    technologies: ["XGBoost", "Isolation Forest", "KNN", "Machine Learning"],
  },
];

export function Projects() {
  return (
    <section id="projects" className="bg-[var(--color-background)] py-16 md:py-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="inline-block mb-4">
            <div className="w-16 h-16 bg-[var(--color-primary)] rounded-2xl flex items-center justify-center text-3xl shadow-lg">
              🚀
            </div>
          </div>
          <h2 className="text-3xl md:text-4xl font-display font-bold bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] bg-clip-text text-transparent">
            Projects
          </h2>
        </div>

        <div className="space-y-6">
          {projects.map((project) => (
            <div
              key={project.id}
              className="bg-white rounded-2xl p-8 shadow-lg border-2 border-[var(--color-primary)]/20 hover:shadow-xl transition-all"
            >
              <div className="flex items-start gap-4 mb-6">
                <div
                  className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl shadow-lg flex-shrink-0"
                  style={{ backgroundColor: project.gradient }}
                >
                  {project.icon}
                </div>
                <div>
                  <span className="inline-block px-3 py-1 bg-[var(--color-accent)]/10 text-[var(--color-accent)] rounded-full text-xs font-semibold mb-2">
                    {project.type}
                  </span>
                  <h3 className="text-2xl font-display font-bold text-gray-900">{project.title}</h3>
                </div>
              </div>
              <p className="text-gray-700 leading-relaxed mb-6">{project.description}</p>
              <div className="flex flex-wrap gap-2">
                {project.technologies.map((tech) => (
                  <span
                    key={tech}
                    className="px-3 py-1.5 bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded-lg text-sm font-medium"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
