const projects = [
  {
    id: "ev-conversion",
    title: "Electric Vehicle Conversion with IoT Safety System",
    type: "Current Project",
    icon: "🔋",
    gradient: "var(--color-primary)",
    description:
      "Converted an old TVS two-wheeler into a fully functional Electric Vehicle (EV), integrating an IoT-based accident detection and rescue system that uses sensors to detect crashes and automatically sends real-time location data to emergency services.",
    technologies: ["Electric Motors", "IoT Sensors", "GPS Module", "Arduino", "Battery Systems"],
    highlights: [
      "Full EV conversion from petrol to electric",
      "Real-time crash detection using accelerometers",
      "Automatic emergency alert system",
      "GPS-based location tracking",
    ],
  },
];

const workshops = [
  {
    id: "ti-analog",
    title: "Analog Electronics Workshop",
    organization: "Texas Instruments, NIT",
    icon: "📡",
    description:
      "Hands-on workshop on analog circuit fundamentals, instrumentation, and real-time applications.",
  },
  {
    id: "transistor",
    title: "Transistor Biasing, Amplifiers & Oscillators",
    organization: "Sona College of Technology",
    icon: "🔌",
    description:
      "Practical exposure to transistor biasing, amplifier design, and oscillator circuits.",
  },
  {
    id: "arduino-organizer",
    title: "Basics of Arduino",
    organization: "Organizer",
    icon: "🎛️",
    description:
      "Organized and conducted a workshop for juniors covering Arduino basics, sensors, and simple automation projects.",
  },
  {
    id: "revit-organizer",
    title: "Revit Architecture",
    organization: "Organizer",
    icon: "🏗️",
    description:
      "Organized a design-focused workshop for students from other colleges, introducing Revit modeling and building layout design.",
  },
];

export function Projects() {
  return (
    <section id="projects" className="bg-[var(--color-background)] py-16 md:py-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="inline-block mb-4">
            <div className="w-16 h-16 bg-[var(--color-primary)] rounded-2xl flex items-center justify-center text-3xl shadow-lg">
              🚀
            </div>
          </div>
          <h2 className="text-3xl md:text-4xl font-display font-bold bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] bg-clip-text text-transparent">
            Projects & Workshops
          </h2>
        </div>

        {/* Featured Project */}
        {projects.map((project) => (
          <div
            key={project.id}
            className="bg-white rounded-2xl p-8 shadow-lg mb-12 border-2 border-[var(--color-primary)]/20 hover:shadow-xl transition-all"
          >
            <div className="flex items-start gap-4 mb-6">
              <div
                className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl shadow-lg flex-shrink-0"
                style={{ backgroundColor: project.gradient }}
              >
                {project.icon}
              </div>
              <div>
                <span className="inline-block px-3 py-1 bg-[var(--color-accent)]/10 text-[var(--color-accent)] rounded-full text-xs font-semibold mb-2">
                  {project.type}
                </span>
                <h3 className="text-2xl font-display font-bold text-gray-900">{project.title}</h3>
              </div>
            </div>

            <p className="text-gray-700 leading-relaxed mb-6">{project.description}</p>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-display font-semibold text-gray-900 mb-3">Key Highlights</h4>
                <ul className="space-y-2">
                  {project.highlights.map((highlight) => (
                    <li key={highlight} className="flex items-start text-gray-700">
                      <span className="text-[var(--color-primary)] mr-2 font-bold">▸</span>
                      {highlight}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="font-display font-semibold text-gray-900 mb-3">Technologies</h4>
                <div className="flex flex-wrap gap-2">
                  {project.technologies.map((tech) => (
                    <span
                      key={tech}
                      className="px-3 py-1.5 bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded-lg text-sm font-medium"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Workshops */}
        <h3 className="text-2xl font-display font-bold text-gray-900 mb-6 text-center">
          Workshops & Training
        </h3>
        <div className="grid md:grid-cols-2 gap-6">
          {workshops.map((workshop) => (
            <div
              key={workshop.id}
              className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-[var(--color-secondary)]/20 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
                  {workshop.icon}
                </div>
                <div>
                  <h4 className="font-display font-bold text-gray-900 mb-1">{workshop.title}</h4>
                  <p className="text-[var(--color-primary)] text-sm font-semibold mb-2">
                    {workshop.organization}
                  </p>
                  <p className="text-gray-600 text-sm">{workshop.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
