const skillCategories = [
  {
    id: "technical",
    category: "Technical Skills",
    icon: "💻",
    gradient: "var(--color-primary)",
    skills: ["Python", "SQL", "AutoCAD", "Revit Architecture", "Embedded Systems", "Arduino"],
  },
  {
    id: "domain",
    category: "Domain Knowledge",
    icon: "⚡",
    gradient: "var(--color-secondary)",
    skills: [
      "Electric Vehicle Systems",
      "IoT & Sensors",
      "Analog Electronics",
      "Circuit Design",
      "Industrial Automation",
    ],
  },
  {
    id: "soft",
    category: "Soft Skills",
    icon: "🎯",
    gradient: "var(--color-accent)",
    skills: [
      "Leadership",
      "Communication",
      "Decision Making",
      "Problem Solving",
      "Team Management",
    ],
  },
];

const languages = [
  { name: "English", level: "Fluent", flag: "🇬🇧" },
  { name: "Tamil", level: "Fluent", flag: "🇮🇳" },
  { name: "Japanese", level: "Beginner", flag: "🇯🇵" },
];

const interests = ["Volunteering", "Sports", "Music", "Traveling"];

export function Skills() {
  return (
    <section id="skills" className="bg-white py-16 md:py-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="inline-block mb-4">
            <div className="w-16 h-16 bg-(--color-primary) rounded-2xl flex items-center justify-center text-3xl shadow-lg">
              ⚡
            </div>
          </div>
          <h2 className="text-3xl md:text-4xl font-display font-bold bg-linear-to-r from-(--color-primary) to-(--color-accent) bg-clip-text text-transparent">
            Skills & Interests
          </h2>
        </div>

        {/* Skill Categories */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {skillCategories.map((category) => (
            <div
              key={category.id}
              className="bg-gray-50 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1"
            >
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-lg"
                  style={{ backgroundColor: category.gradient }}
                >
                  {category.icon}
                </div>
                <h3 className="font-display font-bold" style={{ color: category.gradient }}>
                  {category.category}
                </h3>
              </div>
              <ul className="space-y-2">
                {category.skills.map((skill) => (
                  <li key={skill} className="text-gray-700 flex items-start text-sm">
                    <span className="mr-2 font-bold" style={{ color: category.gradient }}>
                      ▸
                    </span>
                    {skill}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Languages & Interests */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-linear-to-r from-(--color-primary)/10 to-(--color-secondary)/10 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-(--color-primary) rounded-lg flex items-center justify-center text-xl">
                🌍
              </div>
              <h3 className="font-display font-bold text-gray-900">Languages</h3>
            </div>
            <div className="flex flex-wrap gap-3">
              {languages.map((lang) => (
                <span
                  key={lang.name}
                  className="px-4 py-2 bg-white text-gray-700 rounded-lg text-sm font-medium shadow-xs"
                >
                  {lang.flag} {lang.name} - {lang.level}
                </span>
              ))}
            </div>
          </div>

          <div className="bg-linear-to-r from-(--color-accent)/10 to-(--color-secondary)/10 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-(--color-accent) rounded-lg flex items-center justify-center text-xl">
                ❤️
              </div>
              <h3 className="font-display font-bold text-gray-900">Personal Interests</h3>
            </div>
            <div className="flex flex-wrap gap-3">
              {interests.map((interest) => (
                <span
                  key={interest}
                  className="px-4 py-2 bg-white text-gray-700 rounded-lg text-sm font-medium shadow-xs"
                >
                  {interest}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
