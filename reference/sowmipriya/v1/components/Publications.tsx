const publications = [
  {
    id: "social-media-healthcare-risks",
    title:
      "Unprofessional Problems and Potential Healthcare Risks in Individual's Social Media Use",
    publisher: "National Institute of Health",
    date: "January 3, 2021",
    icon: "📄",
    gradient: "var(--color-primary)",
  },
  {
    id: "emergency-response-deep-learning",
    title:
      "An Emergency Response System Created to Combat Injuries During Physical Education Training Using Deep Learning",
    publisher: "Emerald Group Publishing Limited",
    date: "November 26, 2020",
    icon: "📚",
    gradient: "var(--color-secondary)",
  },
];

export function Publications() {
  return (
    <section id="publications" className="bg-[var(--color-background)] relative overflow-hidden">
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
              📚
            </div>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-8 md:mb-12 bg-gradient-to-r from-[var(--color-primary)] via-[var(--color-secondary)] to-[var(--color-accent)] bg-clip-text text-transparent">
            Publications
          </h2>
          <div className="flex items-center justify-center gap-2 mt-6">
            <div className="h-1 w-12 bg-[var(--color-primary)] rounded-full" />
            <div className="h-1 w-8 bg-[var(--color-secondary)] rounded-full" />
            <div className="h-1 w-12 bg-[var(--color-accent)] rounded-full" />
          </div>
        </div>
        <div className="space-y-6 max-w-4xl">
          {publications.map((pub) => (
            <div
              key={pub.id}
              className="bg-white border border-gray-200 rounded-xl p-6 md:p-8 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 border-[var(--color-primary)]/30 relative overflow-hidden"
            >
              <div
                className="absolute top-0 right-0 w-32 h-32 opacity-10 rounded-full blur-3xl"
                style={{ backgroundColor: pub.gradient }}
              />
              <div className="relative z-10">
                <div className="flex items-start gap-4 mb-4">
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl shadow-lg flex-shrink-0"
                    style={{ backgroundColor: pub.gradient }}
                  >
                    {pub.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-display font-bold text-gray-900 mb-4 leading-tight">
                      {pub.title}
                    </h3>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                        <p className="font-display font-semibold" style={{ color: pub.gradient }}>
                          {pub.publisher}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">{pub.date}</p>
                      </div>
                    </div>
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
