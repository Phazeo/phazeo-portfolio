const achievements = [
  {
    id: "azure-ai",
    title: "Microsoft Certified: Azure AI Engineer Associate (AI-102)",
    organization: "Microsoft",
    description:
      "Focused on AI solution design, machine learning workflows, and responsible AI concepts.",
    icon: "🏅",
    gradient: "var(--color-primary)",
  },
  {
    id: "genai-internal",
    title: "Internal Certifications in Generative AI & Python",
    organization: "TCS",
    description:
      "Enterprise training covering Generative AI fundamentals, prompt engineering and Python-based AI development.",
    icon: "📜",
    gradient: "var(--color-secondary)",
  },
  {
    id: "hackathon",
    title: "AI Hackathon Participant",
    organization: "TCS",
    description:
      "Built and prototyped Generative AI solutions within a time-bound hackathon environment.",
    icon: "🚀",
    gradient: "var(--color-accent)",
  },
  {
    id: "young-intrapreneur",
    title: "Young Intrapreneur Award",
    organization: "TCS",
    description: "Recognized for outstanding contribution and innovation.",
    icon: "🏆",
    gradient: "var(--color-primary)",
  },
  {
    id: "cert-appreciation",
    title: "Certificate of Appreciation",
    organization: "TCS",
    description: "Acknowledged for consistent performance and commitment.",
    icon: "⭐",
    gradient: "var(--color-accent)",
  },
];

export function Achievements() {
  return (
    <section
      id="achievements"
      className="py-16 md:py-24 bg-white relative overflow-hidden border-t border-gray-200"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-12">
          <div className="inline-block mb-4">
            <div className="w-16 h-16 bg-[var(--color-primary)] rounded-2xl flex items-center justify-center text-3xl shadow-lg">
              🏅
            </div>
          </div>
          <h2 className="text-3xl md:text-4xl font-display font-bold bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] bg-clip-text text-transparent">
            Certifications & Awards
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {achievements.map((a) => (
            <div
              key={a.id}
              className="bg-gray-50 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1"
            >
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl mb-4"
                style={{ backgroundColor: a.gradient }}
              >
                {a.icon}
              </div>
              <h3 className="text-lg font-display font-bold text-gray-900 mb-2">{a.title}</h3>
              <p className="text-sm font-semibold mb-2" style={{ color: a.gradient }}>
                {a.organization}
              </p>
              <p className="text-sm text-gray-700">{a.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
