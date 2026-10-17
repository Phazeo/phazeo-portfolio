export function About() {
  return (
    <section id="about" className="bg-white py-16 md:py-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="inline-block mb-4">
            <div className="w-16 h-16 bg-[var(--color-primary)] rounded-2xl flex items-center justify-center text-3xl shadow-lg">
              👤
            </div>
          </div>
          <h2 className="text-3xl md:text-4xl font-display font-bold bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] bg-clip-text text-transparent">
            Professional Summary
          </h2>
        </div>

        <div className="bg-gray-50 rounded-2xl p-8 shadow-lg">
          <p className="text-gray-700 leading-relaxed text-lg">
            Results-driven professional with 3+ years in healthcare applications-specializing in
            production support, incident management, RCA, and stakeholder communication. Proven
            track record managing critical incidents, enhancing application stability, and
            collaborating with cross-functional and US onshore teams. Building strong expertise in
            Python, GenAI, and RAG-with a focus on automation, data-driven workflows, and
            intelligent problem-solving for next-generation enterprise solutions.
          </p>
        </div>
      </div>
    </section>
  );
}
