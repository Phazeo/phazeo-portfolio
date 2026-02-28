const education = [
  {
    id: "delf-french",
    degree: "Diplôme d'études en langue française",
    institution: "Exatice",
    location: "Paris, France",
    period: "June '2024 - Dec '2024",
    icon: "🇫🇷",
    gradient: "var(--color-primary)",
  },
  {
    id: "masters-big-data",
    degree: "Master in Big Data and Data Science",
    institution: "CY Cergy Paris University",
    location: "France",
    period: "2019 - 2021",
    icon: "🎓",
    gradient: "var(--color-secondary)",
  },
  {
    id: "bachelors-cse",
    degree: "Bachelor of Computer Science and Engineering",
    institution: "VRSCET, Anna University",
    location: "India",
    period: "2011 - 2015",
    icon: "💻",
    gradient: "var(--color-primary)",
  },
];

export function Education() {
  return (
    <section id="education" className="bg-[var(--color-background)] relative overflow-hidden">
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
            <div className="w-16 h-16 bg-[var(--color-primary)] rounded-2xl flex items-center justify-center text-3xl shadow-lg">
              🎓
            </div>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-8 md:mb-12 bg-gradient-to-r from-[var(--color-primary)] via-[var(--color-secondary)] to-[var(--color-accent)] bg-clip-text text-transparent">
            Education
          </h2>
          <div className="flex items-center justify-center gap-2 mt-6">
            <div className="h-1 w-12 bg-[var(--color-primary)] rounded-full" />
            <div className="h-1 w-8 bg-[var(--color-secondary)] rounded-full" />
            <div className="h-1 w-12 bg-[var(--color-accent)] rounded-full" />
          </div>
        </div>
        <div className="space-y-6 max-w-4xl">
          {education.map((edu) => (
            <div
              key={edu.id}
              className="bg-white border border-gray-200 rounded-xl p-6 md:p-8 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 border-[var(--color-primary)]/30 relative overflow-hidden"
            >
              <div
                className="absolute top-0 right-0 w-32 h-32 opacity-10 rounded-full blur-3xl"
                style={{ backgroundColor: edu.gradient }}
              />
              <div className="relative z-10">
                <div className="flex items-start gap-4">
                  <div
                    className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl shadow-lg flex-shrink-0"
                    style={{ backgroundColor: edu.gradient }}
                  >
                    {edu.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl md:text-2xl font-display font-bold text-gray-900 mb-2">
                      {edu.degree}
                    </h3>
                    <p
                      className="text-lg font-display font-semibold mb-2"
                      style={{ color: edu.gradient }}
                    >
                      {edu.institution}
                    </p>
                    <div className="flex items-center gap-2 text-gray-700">
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
                      <span>{edu.location}</span>
                      <span>•</span>
                      <span>{edu.period}</span>
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
