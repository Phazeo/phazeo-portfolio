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
    id: "ai-doc",
    title: "AI Document Analysis for Summarization & Q&A",
    type: "Proof of Concept",
    icon: "📄",
    gradient: "var(--color-primary)",
    description:
      "Built a personal AI PoC for document summarization and numeric insight extraction. Implemented multi-format document ingestion with an interactive analysis and export UI. Enabled context-based question answering from document content.",
    technologies: ["Python", "GenAI", "RAG", "Embeddings", "Document Processing"],
  },
];

export function Projects() {
  if (projects.length === 0) {
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
          <div className="bg-white rounded-xl p-8 text-center text-gray-600">
            <p>Projects to be added. Check the resume for full details.</p>
          </div>
        </div>
      </section>
    );
  }

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
