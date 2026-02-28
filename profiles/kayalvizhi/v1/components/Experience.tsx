const experiences = [
  {
    id: "tcs",
    title: "Application Support Engineer – Healthcare Domain",
    company: "Tata Consultancy Services (TCS)",
    location: "India",
    period: "Feb 2022 – Present",
    icon: "🏥",
    gradient: "var(--color-primary)",
    description: [
      "Provided end-to-end L2 support for critical healthcare applications, handling incidents escalated from L1 and ensuring timely resolution within SLAs.",
      "Performed detailed incident analysis and RCA, validated logs, assessed business impact and coordinated with L3 / Engineering teams to implement permanent fixes.",
      "Created and maintained ServiceNow dashboards for incident tracking, performance monitoring, and client reporting.",
      "Utilized Quantum Metric to understand user behavior, analyze application journeys and identify recurring issues to improve usability and performance.",
      "Proposed enhancements and improvements by identifying frequent failure patterns and customer pain points.",
      "Collaborated closely with L1 Support, Production Support, Product Teams, and Onshore stakeholders, ensuring smooth communication and faster resolution cycles.",
      "Conducted daily standups and weekly review meetings with US onshore teams, presenting incident status, risks and improvement actions.",
      "Prepared daily and weekly incident trend reports, improving visibility for management decision-making.",
      "Delivered proactive value additions by identifying risks, patterns, and automation opportunities.",
      "Created comprehensive SOPs and Knowledge Transfer documents, supporting faster onboarding and consistent process adherence.",
      "Extensively used Splunk for log analysis and troubleshooting customer-specific and production-related issues.",
    ],
  },
];

export function Experience() {
  return (
    <section id="experience" className="bg-white py-16 md:py-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="inline-block mb-4">
            <div className="w-16 h-16 bg-[var(--color-primary)] rounded-2xl flex items-center justify-center text-3xl shadow-lg">
              💼
            </div>
          </div>
          <h2 className="text-3xl md:text-4xl font-display font-bold bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] bg-clip-text text-transparent">
            Work Experience
          </h2>
        </div>

        <div className="space-y-6">
          {experiences.map((exp) => (
            <div
              key={exp.id}
              className="bg-gray-50 rounded-xl p-6 md:p-8 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 relative overflow-hidden"
            >
              <div
                className="absolute top-0 right-0 w-32 h-32 opacity-10 rounded-full blur-3xl"
                style={{ backgroundColor: exp.gradient }}
              />
              <div className="relative z-10">
                <div className="flex flex-col md:flex-row md:items-start gap-4">
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl shadow-lg flex-shrink-0"
                    style={{ backgroundColor: exp.gradient }}
                  >
                    {exp.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-2">
                      <h3 className="text-xl font-display font-bold text-gray-900">{exp.title}</h3>
                      <span className="text-sm text-gray-500 font-medium">{exp.period}</span>
                    </div>
                    <p className="font-display font-semibold mb-1" style={{ color: exp.gradient }}>
                      {exp.company}
                    </p>
                    <div className="flex items-center gap-1 text-sm text-gray-500 mb-4">
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
                    </div>
                    <ul className="space-y-2">
                      {exp.description.map((item) => (
                        <li key={item} className="text-gray-700 flex items-start">
                          <span className="mr-2 font-bold" style={{ color: exp.gradient }}>
                            ▸
                          </span>
                          {item}
                        </li>
                      ))}
                    </ul>
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
