const education = [
  {
    id: "be-eee",
    degree: "Bachelor of Engineering in Electrical and Electronics",
    institution: "Sona College of Technology",
    location: "Salem, TN, India",
    period: "2022 - 2026",
    icon: "🎓",
    gradient: "var(--color-primary)",
    current: true,
  },
  {
    id: "12th",
    degree: "12th Higher Secondary School",
    institution: "M.A.M Matric Hr. Sec School",
    location: "Salem, TN, India",
    period: "2020 - 2022",
    icon: "📚",
    gradient: "var(--color-secondary)",
  },
  {
    id: "10th",
    degree: "10th Secondary School",
    institution: "M.A.M Matric Hr. Sec School",
    location: "Salem, TN, India",
    period: "2018 - 2020",
    icon: "📖",
    gradient: "var(--color-accent)",
  },
];

const certifications = [
  {
    id: "nptel-iot",
    title: "Industrial IoT 4.0",
    issuer: "NPTEL",
    icon: "🏆",
  },
  {
    id: "dca",
    title: "Diploma in Computer Application (DCA)",
    issuer: "Certification Program",
    icon: "💻",
  },
];

export function Education() {
  return (
    <section id="education" className="bg-[var(--color-background)] py-16 md:py-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="inline-block mb-4">
            <div className="w-16 h-16 bg-[var(--color-primary)] rounded-2xl flex items-center justify-center text-3xl shadow-lg">
              🎓
            </div>
          </div>
          <h2 className="text-3xl md:text-4xl font-display font-bold bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] bg-clip-text text-transparent">
            Education
          </h2>
        </div>

        <div className="space-y-6 mb-12">
          {education.map((edu) => (
            <div
              key={edu.id}
              className="bg-white rounded-xl p-6 md:p-8 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 relative overflow-hidden"
            >
              {edu.current && (
                <div className="absolute top-4 right-4 px-3 py-1 bg-[var(--color-primary)] text-white text-xs font-semibold rounded-full">
                  Current
                </div>
              )}
              <div className="flex items-start gap-4">
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl shadow-lg flex-shrink-0"
                  style={{ backgroundColor: edu.gradient }}
                >
                  {edu.icon}
                </div>
                <div>
                  <h3 className="text-xl font-display font-bold text-gray-900 mb-1">
                    {edu.degree}
                  </h3>
                  <p className="font-display font-semibold mb-2" style={{ color: edu.gradient }}>
                    {edu.institution}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
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
                      {edu.location}
                    </span>
                    <span>•</span>
                    <span>{edu.period}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Certifications */}
        <h3 className="text-2xl font-display font-bold text-gray-900 mb-6 text-center">
          Certifications
        </h3>
        <div className="grid sm:grid-cols-2 gap-6">
          {certifications.map((cert) => (
            <div
              key={cert.id}
              className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 flex items-center gap-4"
            >
              <div className="w-12 h-12 bg-[var(--color-accent)]/20 rounded-xl flex items-center justify-center text-2xl">
                {cert.icon}
              </div>
              <div>
                <h4 className="font-display font-bold text-gray-900">{cert.title}</h4>
                <p className="text-[var(--color-primary)] text-sm font-medium">{cert.issuer}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
