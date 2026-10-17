const skillCategories = [
  {
    id: "ai",
    category: "AI & GenAI",
    icon: "🤖",
    gradient: "var(--color-primary)",
    skills: ["Generative AI", "LLMs", "RAG", "Prompt Engineering", "Embeddings", "Vector Search"],
  },
  {
    id: "programming",
    category: "Programming",
    icon: "💻",
    gradient: "var(--color-secondary)",
    skills: ["Python", "SQL", "Django REST"],
  },
  {
    id: "operations",
    category: "Operations & Tools",
    icon: "⚙️",
    gradient: "var(--color-accent)",
    skills: ["ServiceNow", "Splunk", "Salesforce", "Quantum Metric", "Power BI", "Azure"],
  },
  {
    id: "domain",
    category: "Domain & Delivery",
    icon: "🏥",
    gradient: "var(--color-secondary)",
    skills: ["Healthcare Apps", "L2 Support", "Incident Mgmt", "RCA", "ITIL", "Agile"],
  },
];

export function Skills() {
  return (
    <section id="skills" className="bg-white py-16 md:py-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="inline-block mb-4">
            <div className="w-16 h-16 bg-[var(--color-primary)] rounded-2xl flex items-center justify-center text-3xl shadow-lg">
              ⚡
            </div>
          </div>
          <h2 className="text-3xl md:text-4xl font-display font-bold text-gray-900">Skills</h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {skillCategories.map((category) => (
            <div
              key={category.id}
              className="bg-gray-50 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1"
            >
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-xl shadow-md flex-shrink-0"
                  style={{ backgroundColor: category.gradient }}
                >
                  {category.icon}
                </div>
                <h3 className="font-display font-bold text-gray-900 text-sm">
                  {category.category}
                </h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {category.skills.map((skill) => (
                  <span
                    key={skill}
                    className="px-3 py-1.5 bg-white rounded-lg text-xs font-medium text-gray-700 border border-gray-200 shadow-sm"
                  >
                    {skill}
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
