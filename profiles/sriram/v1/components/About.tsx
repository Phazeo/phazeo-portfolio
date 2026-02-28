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
            About Me
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-gray-50 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-[var(--color-primary)] rounded-xl flex items-center justify-center text-2xl">
                ⚡
              </div>
              <h3 className="text-xl font-display font-bold text-gray-900">Who I Am</h3>
            </div>
            <p className="text-gray-700 leading-relaxed">
              Generative AI Developer with 2 years of industry experience designing and building
              end-to-end GenAI and machine learning solutions. Hands-on experience in developing
              agentic AI workflows with RAG-based contextual reasoning for enterprise use cases.
            </p>
          </div>

          <div className="bg-gray-50 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-[var(--color-accent)] rounded-xl flex items-center justify-center text-2xl">
                🎯
              </div>
              <h3 className="text-xl font-display font-bold text-gray-900">My Approach</h3>
            </div>
            <p className="text-gray-700 leading-relaxed">
              Proven ability to translate business requirements into scalable AI PoCs and
              well-structured solution architectures. Focus on data privacy and cost efficiency for
              on-premise and enterprise-constrained environments.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
