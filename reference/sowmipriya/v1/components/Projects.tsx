const projects = [
  {
    id: "ai-moderation-system",
    title: "AI Moderation System",
    context: "Work Project - Adyoulike (OPENWEB)",
    icon: "🛡️",
    gradient: "var(--color-primary)",
    description:
      "Developed production-grade AI moderation systems using state-of-the-art language models for automated content moderation at scale. The system includes automated message interception, restricted word detection, and intelligent blocking based on ML model scores.",
    technologies: ["LLM", "NLP", "Python", "Machine Learning"],
    impact: "Enabled real-time content moderation for large-scale web platforms",
  },
  {
    id: "iab-content-classifier",
    title: "IAB Content Classifier",
    context: "Work Project - Adyoulike (OPENWEB)",
    icon: "🏷️",
    gradient: "var(--color-secondary)",
    description:
      "Built an end-to-end IAB classifier from scratch capable of accurately categorizing web pages. The system includes web crawling, data processing, feature extraction, and classification scoring, enabling precise content categorization.",
    technologies: ["Python", "Web Scraping", "NLP", "Classification", "Data Pipelines"],
    impact: "Automated content classification for millions of web pages",
  },
  {
    id: "cyber-bullying-detection",
    title: "Cyber Bullying Detection System",
    context: "Work Project - KaisensData",
    icon: "🔍",
    gradient: "var(--color-primary)",
    description:
      "Developed a machine learning system using NLP techniques to detect and track cyber bullying and harassment in social media. The system processes text data in real-time to identify harmful content patterns.",
    technologies: ["NLP", "Machine Learning", "Python", "Text Classification"],
    impact: "Contributed to safer online environments through automated detection",
  },
  {
    id: "predictive-vehicle-maintenance",
    title: "Predictive Vehicle Maintenance Model",
    context: "Work Project - Latentview Analytics (BMW)",
    icon: "🚗",
    gradient: "var(--color-secondary)",
    description:
      "Built predictive models to forecast vehicle defect and breakdown patterns by analyzing and comparing vehicle operational data with warranty data. Created interactive visualizations integrating multiple data sources.",
    technologies: ["Predictive Modeling", "Data Visualization", "Tableau", "R", "Python"],
    impact: "Enabled proactive maintenance strategies for vehicle fleet management",
  },
  {
    id: "realtime-price-update",
    title: "Real-Time Price Update Algorithm",
    context: "Work Project - 91digital Web Private Ltd",
    icon: "⚡",
    gradient: "var(--color-primary)",
    description:
      "Developed an algorithm capable of automatically refreshing product prices every 2-5 minutes in real-time, ensuring accurate and up-to-date pricing information across e-commerce platforms.",
    technologies: ["Python", "Algorithms", "Real-time Systems"],
    impact: "Maintained accurate pricing data for e-commerce operations",
  },
];

export function Projects() {
  return (
    <section id="projects" className="bg-[var(--color-background)] relative overflow-hidden">
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-20 right-10 w-96 h-96 bg-[var(--color-secondary)] rounded-full mix-blend-multiply filter blur-3xl" />
        <div className="absolute bottom-20 left-10 w-96 h-96 bg-[var(--color-accent)] rounded-full mix-blend-multiply filter blur-3xl" />
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 relative z-10">
        <div className="text-center mb-12">
          <div className="inline-block mb-4">
            <div className="w-16 h-16 bg-[var(--color-primary)] rounded-2xl flex items-center justify-center text-3xl shadow-lg">
              🚀
            </div>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-8 md:mb-12 bg-gradient-to-r from-[var(--color-primary)] via-[var(--color-secondary)] to-[var(--color-accent)] bg-clip-text text-transparent">
            Selected Work
          </h2>
          <p className="text-gray-700 mb-4 max-w-3xl mx-auto text-lg">
            The following projects are derived from my professional experience, showcasing
            real-world applications of AI, ML, and data science solutions.
          </p>
          <div className="flex items-center justify-center gap-2 mt-6">
            <div className="h-1 w-12 bg-[var(--color-primary)] rounded-full" />
            <div className="h-1 w-8 bg-[var(--color-secondary)] rounded-full" />
            <div className="h-1 w-12 bg-[var(--color-accent)] rounded-full" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {projects.map((project) => (
            <div
              key={project.id}
              className="bg-white border border-gray-200 rounded-xl p-6 md:p-8 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 border-[var(--color-primary)]/30 relative overflow-hidden"
            >
              <div
                className="absolute top-0 right-0 w-32 h-32 opacity-10 rounded-full blur-3xl"
                style={{ backgroundColor: project.gradient }}
              />

              <div className="relative z-10">
                <div className="flex items-start gap-4 mb-4">
                  <div
                    className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl shadow-lg flex-shrink-0"
                    style={{ backgroundColor: project.gradient }}
                  >
                    {project.icon}
                  </div>
                  <div className="flex-1">
                    <span
                      className="text-xs font-display font-semibold uppercase tracking-wide"
                      style={{ color: project.gradient }}
                    >
                      {project.context}
                    </span>
                    <h3 className="text-xl md:text-2xl font-display font-bold text-gray-900 mt-2 mb-3">
                      {project.title}
                    </h3>
                  </div>
                </div>
                <p className="text-gray-700 leading-relaxed mb-6">{project.description}</p>
                <div className="mb-6">
                  <p className="text-sm font-semibold text-gray-900 mb-3">Technologies:</p>
                  <div className="flex flex-wrap gap-2">
                    {project.technologies.map((tech) => (
                      <span
                        key={tech}
                        className="px-3 py-1.5 bg-white/70 backdrop-blur-sm text-gray-800 rounded-lg text-xs font-semibold border border-gray-200 shadow-sm"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="pt-4 border-t border-gray-200/50">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">✨</span>
                    <p className="text-sm text-gray-700">
                      <span className="font-semibold">Impact:</span> {project.impact}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
