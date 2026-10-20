const education = [
  {
    id: "cy-cergy",
    degree: "Master of Science",
    field: "Big Data & Data Science",
    institution: "CY Cergy Paris University",
    location: "Cergy, France",
    period: "2019 - 2021",
    icon: "🎓",
    gradient: "var(--color-primary)",
    achievement: null,
  },
  {
    id: "tce",
    degree: "Bachelor of Engineering",
    field: "Computer Science",
    institution: "Thiagarajar College of Engineering (TCE), Anna University",
    location: "India",
    period: "2009 - 2013",
    icon: "🎓",
    gradient: "var(--color-secondary)",
    achievement: null,
  },
];

export function Education() {
  return (
    <section
      id="education"
      className="py-16 md:py-24 bg-slate-50/80 relative overflow-hidden border-t border-slate-200"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-12">
          <div className="inline-block mb-4">
            <div className="w-16 h-16 bg-(--color-primary) rounded-2xl flex items-center justify-center text-3xl shadow-lg">
              🎓
            </div>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-8 md:mb-12 bg-linear-to-r from-(--color-primary) via-(--color-secondary) to-(--color-accent) bg-clip-text text-transparent">
            Education
          </h2>
          <div className="flex items-center justify-center gap-2 mt-6">
            <div className="h-1 w-12 bg-(--color-primary) rounded-full" />
            <div className="h-1 w-8 bg-(--color-secondary) rounded-full" />
            <div className="h-1 w-12 bg-(--color-accent) rounded-full" />
          </div>
        </div>
        <div className="space-y-6 max-w-4xl mx-auto">
          {education.map((edu) => (
            <div
              key={edu.id}
              className="bg-white border border-slate-200 rounded-xl p-6 md:p-8 shadow-xs hover:shadow-md transition-all duration-300 relative overflow-hidden"
            >
              <div
                className="absolute top-0 right-0 w-32 h-32 opacity-10 rounded-full blur-3xl"
                style={{ backgroundColor: edu.gradient }}
              />
              <div className="relative z-10">
                <div className="flex items-start gap-4">
                  <div
                    className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl shadow-lg shrink-0"
                    style={{ backgroundColor: edu.gradient }}
                  >
                    {edu.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl md:text-2xl font-display font-bold text-slate-900 mb-2">
                      {edu.degree} - {edu.field}
                    </h3>
                    <p
                      className="text-lg font-display font-semibold mb-2"
                      style={{ color: edu.gradient }}
                    >
                      {edu.institution}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-slate-600">
                      <span>{edu.location}</span>
                      <span>•</span>
                      <span>{edu.period}</span>
                    </div>
                    {edu.achievement && (
                      <p className="mt-2 text-sm font-semibold text-(--color-accent)">
                        {edu.achievement}
                      </p>
                    )}
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
