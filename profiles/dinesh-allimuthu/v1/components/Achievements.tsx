const achievements = [
  {
    id: "best-employee",
    title: "Best Employee Award",
    organization: "Tata Consultancy Services",
    description: "Won Best Employee of the Quarter & Star Team Award (2x)",
    icon: "🏆",
    gradient: "var(--color-primary)",
  },
  {
    id: "client-appreciation",
    title: "Client Appreciation",
    organization: "Multiple Clients",
    description: "Recognized for excellence in project delivery and production support",
    icon: "⭐",
    gradient: "var(--color-secondary)",
  },
  {
    id: "web-design",
    title: "Web Design Winner",
    organization: "CSE Association",
    description: "Winner of Web Design contest",
    icon: "🎨",
    gradient: "var(--color-accent)",
  },
];

export function Achievements() {
  return (
    <section
      id="achievements"
      className="py-16 md:py-24 bg-(--color-background) relative overflow-hidden border-t border-slate-200"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-12">
          <div className="inline-block mb-4">
            <div className="w-16 h-16 bg-(--color-primary) rounded-2xl flex items-center justify-center text-3xl shadow-lg">
              🏅
            </div>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-8 md:mb-12 bg-linear-to-r from-(--color-primary) via-(--color-secondary) to-(--color-accent) bg-clip-text text-transparent">
            Achievements
          </h2>
          <div className="flex items-center justify-center gap-2 mt-6">
            <div className="h-1 w-12 bg-(--color-primary) rounded-full" />
            <div className="h-1 w-8 bg-(--color-secondary) rounded-full" />
            <div className="h-1 w-12 bg-(--color-accent) rounded-full" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {achievements.map((a) => (
            <div
              key={a.id}
              className="bg-white border border-slate-200 rounded-xl p-6 md:p-8 shadow-xs hover:shadow-md transition-all duration-300 text-center"
            >
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl mx-auto mb-4"
                style={{ backgroundColor: a.gradient }}
              >
                {a.icon}
              </div>
              <h3 className="text-lg font-display font-bold text-slate-900 mb-2">{a.title}</h3>
              <p className="text-sm font-semibold mb-2" style={{ color: a.gradient }}>
                {a.organization}
              </p>
              <p className="text-sm text-slate-600">{a.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
