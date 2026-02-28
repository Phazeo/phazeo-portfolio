const experiences = [
  {
    id: "pareto-ai",
    title: "Expert Data",
    company: "Pareto.AI",
    location: "Remote",
    period: "Oct '25 - Present",
    icon: "🤖",
    gradient: "var(--color-primary)",
    description: [
      "Collaborating with the Pareto AI team on training large language models, focusing on crafting open-ended prompts and evaluating model performance and response quality.",
      "Contributing to LLM training pipelines and quality assessment frameworks.",
    ],
  },
  {
    id: "adyoulike-openweb",
    title: "NLP Machine Learning Engineer",
    company: "Adyoulike (OPENWEB)",
    location: "Paris, France",
    period: "Mar '22 - Feb '24 (24 months)",
    icon: "🧠",
    gradient: "var(--color-secondary)",
    description: [
      "Developed in-house AI moderation systems using state-of-the-art language models (LLM), focusing on automated message interception, restricted word detection, and blocking based on ML model scores.",
      "Built an IAB classifier from scratch capable of accurately categorizing various web pages (crawling to scoring), enabling precise content classification at scale.",
      "Performed high-precision data labeling and annotation for NLP and document-centric datasets, including entity tagging, field extraction, and structured/unstructured text classification.",
    ],
  },
  {
    id: "kaisens-data",
    title: "Data Scientist (Intern)",
    company: "KaisensData",
    location: "Paris, France",
    period: "May '21 - Nov '21",
    icon: "🔬",
    gradient: "var(--color-primary)",
    description: [
      "Built a machine learning system using NLP that detects and tracks cyber bullying and harassment in social media, contributing to safer online environments.",
      "Ensured annotation quality and consistency by following strict labeling guidelines, supporting OCR-based document intelligence and downstream machine learning model training.",
    ],
  },
  {
    id: "latentview-analytics",
    title: "Data Analyst",
    company: "Latentview Analytics",
    location: "India",
    period: "Nov '17 - Jul '19 (20 months)",
    note: "Consultant for BMW and Bisnode",
    icon: "📊",
    gradient: "var(--color-secondary)",
    description: [
      "Created and maintained rich interactive visualizations through data interpretation and analysis, integrating various reporting components from multiple data sources.",
      "Built predictive models to forecast defect and breakdown patterns by comparing vehicle data to warranty data, enabling proactive maintenance strategies.",
    ],
  },
  {
    id: "91digital",
    title: "Software Developer",
    company: "91digital Web Private Ltd",
    location: "India",
    period: "June '15 - Aug '17 (26 months)",
    icon: "💻",
    gradient: "var(--color-primary)",
    description: [
      "Developed real-time price changes algorithm capable of refreshing product prices every 2-5 minutes automatically, ensuring accurate and up-to-date pricing information.",
    ],
  },
];

export function Experience() {
  return (
    <section id="experience" className="bg-[var(--color-background)] relative overflow-hidden">
      <div className="absolute inset-0 opacity-5">
        <div
          className="absolute top-0 left-0 w-full h-full"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%239C92AC' fill-opacity='0.4'%3E%3Cpath d='M20 20.5V18H0v-2h20v-2H0v-2h20v-2H0V8h20V6H0V4h20V2H0V0h22v20h2V0h2v20h2V0h2v20h2V0h2v20h2V0h2v22H20v-1.5zM0 20h2v20H0V20zm4 0h2v20H4V20zm4 0h2v20H8V20zm4 0h2v20h-2V20zm4 0h2v20h-2V20zm4 4h20v2H20v-2zm0 4h20v2H20v-2zm0 4h20v2H20v-2zm0 4h20v2H20v-2z'/%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 relative z-10">
        <div className="text-center mb-12">
          <div className="inline-block mb-4">
            <div className="w-16 h-16 bg-[var(--color-primary)] rounded-2xl flex items-center justify-center text-3xl shadow-lg">
              💼
            </div>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-8 md:mb-12 bg-gradient-to-r from-[var(--color-primary)] via-[var(--color-secondary)] to-[var(--color-accent)] bg-clip-text text-transparent">
            Experience
          </h2>
          <div className="flex items-center justify-center gap-2 mt-6">
            <div className="h-1 w-12 bg-[var(--color-primary)] rounded-full" />
            <div className="h-1 w-8 bg-[var(--color-secondary)] rounded-full" />
            <div className="h-1 w-12 bg-[var(--color-accent)] rounded-full" />
          </div>
        </div>
        <div className="relative">
          <div className="hidden md:block absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-[var(--color-primary)] via-[var(--color-secondary)] to-[var(--color-accent)]" />

          <div className="space-y-8">
            {experiences.map((exp) => (
              <div key={exp.id} className="relative">
                <div className="hidden md:block absolute left-0 top-6 w-16 h-16 flex items-center justify-center">
                  <div
                    className="w-12 h-12 rounded-full shadow-lg flex items-center justify-center text-2xl z-10"
                    style={{ backgroundColor: exp.gradient }}
                  >
                    {exp.icon}
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl p-6 md:p-8 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 ml-0 md:ml-20 border-[var(--color-primary)]/30">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-3xl md:hidden">{exp.icon}</span>
                        <h3 className="text-xl md:text-2xl font-display font-bold text-gray-900">
                          {exp.title}
                        </h3>
                      </div>
                      <p
                        className="text-lg font-display font-semibold mb-1"
                        style={{ color: exp.gradient }}
                      >
                        {exp.company}
                      </p>
                      {exp.note && <p className="text-sm text-gray-600 italic mb-2">{exp.note}</p>}
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                        <span>{exp.location}</span>
                        <span>•</span>
                        <span>{exp.period}</span>
                      </div>
                    </div>
                  </div>
                  <ul className="space-y-3 mt-6">
                    {exp.description.map((item) => (
                      <li key={item} className="text-gray-700 leading-relaxed flex items-start">
                        <span
                          className="mr-3 mt-1 text-xl font-bold"
                          style={{ color: exp.gradient }}
                        >
                          ▸
                        </span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
