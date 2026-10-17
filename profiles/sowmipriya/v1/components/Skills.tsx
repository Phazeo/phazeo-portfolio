const skillCategories = [
  {
    id: "ai-llm",
    category: "Artificial Intelligence & LLM",
    icon: "🤖",
    gradient: "var(--color-primary)",
    skills: [
      "Large Language Models (LLM)",
      "RAG (Retrieval-Augmented Generation)",
      "Prompt Engineering",
      "Langchain",
      "Transformers",
      "NLP & Text Classification",
      "Neural Networks",
      "PyTorch",
    ],
  },
  {
    id: "machine-learning",
    category: "Machine Learning",
    icon: "🧠",
    gradient: "var(--color-secondary)",
    skills: [
      "Classification & Regression",
      "Clustering",
      "Model Evaluation",
      "Feature Engineering",
      "Predictive Modeling",
    ],
  },
  {
    id: "programming-languages",
    category: "Programming Languages",
    icon: "💻",
    gradient: "var(--color-primary)",
    skills: ["Python", "R", "Scala", "JavaScript", "HTML", "CSS"],
  },
  {
    id: "data-engineering",
    category: "Data Engineering",
    icon: "⚙️",
    gradient: "var(--color-secondary)",
    skills: [
      "Data Pipelines",
      "Apache Spark",
      "Kafka",
      "RabbitMQ",
      "Apache Airflow",
      "DBT",
      "Data Scraping (Scrapy, Selenium, Beautiful Soup)",
    ],
  },
  {
    id: "databases",
    category: "Databases",
    icon: "🗄️",
    gradient: "var(--color-primary)",
    skills: ["MySQL", "BigQuery", "PostgreSQL"],
  },
  {
    id: "data-visualization",
    category: "Data Visualization",
    icon: "📊",
    gradient: "var(--color-primary)",
    skills: ["Tableau", "Qlik Sense", "Matplotlib", "Apache Superset", "Looker", "Power BI"],
  },
  {
    id: "cloud-platforms",
    category: "Cloud Platforms",
    icon: "☁️",
    gradient: "var(--color-secondary)",
    skills: ["AWS", "Databricks", "Google Cloud", "Azure"],
  },
  {
    id: "web-frameworks",
    category: "Web Frameworks",
    icon: "🌐",
    gradient: "var(--color-primary)",
    skills: ["Django", "Flask"],
  },
  {
    id: "devops-deployment",
    category: "DevOps & Deployment",
    icon: "🚀",
    gradient: "var(--color-primary)",
    skills: ["GitLab CI/CD", "Unit Testing", "Integration Testing"],
  },
];

export function Skills() {
  return (
    <section id="skills" className="bg-(--color-background) relative overflow-hidden">
      <div className="absolute inset-0 opacity-5">
        <div
          className="absolute top-0 left-0 w-full h-full"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 relative z-10">
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
          {skillCategories.map((category) => (
            <div
              key={category.id}
              className="bg-white border border-gray-200 rounded-xl p-6 md:p-8 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 border-(--color-primary)/30"
            >
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl shadow-lg"
                  style={{ backgroundColor: category.gradient }}
                >
                  {category.icon}
                </div>
                <h3 className="text-lg font-display font-bold" style={{ color: category.gradient }}>
                  {category.category}
                </h3>
              </div>
              <ul className="space-y-2">
                {category.skills.map((skill) => (
                  <li key={skill} className="text-gray-700 text-sm flex items-start">
                    <span className="mr-2 mt-1 font-bold" style={{ color: category.gradient }}>
                      ▸
                    </span>
                    <span>{skill}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 bg-white border border-gray-200 rounded-xl p-6 md:p-8 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 border-(--color-secondary)">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-lg bg-(--color-secondary) flex items-center justify-center text-2xl shadow-lg">
              🌍
            </div>
            <h3 className="text-xl font-display font-bold text-(--color-primary)">Languages</h3>
          </div>
          <div className="flex flex-wrap gap-3">
            <span className="px-4 py-2 bg-(--color-accent)/30 text-(--color-primary) rounded-lg text-sm font-display font-semibold border border-(--color-accent)">
              🇫🇷 French - Intermediate (DELF B1)
            </span>
            <span className="px-4 py-2 bg-(--color-secondary)/30 text-(--color-primary) rounded-lg text-sm font-display font-semibold border border-(--color-secondary)">
              🇬🇧 English - Fluent
            </span>
            <span className="px-4 py-2 bg-(--color-accent)/30 text-(--color-primary) rounded-lg text-sm font-display font-semibold border border-(--color-accent)">
              🇮🇳 Tamil - Native
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
