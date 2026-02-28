const BASE_URL = import.meta.env.BASE_URL ?? "/";
const RESUME_PDF = `${BASE_URL}profiles/kayalvizhi/resume.pdf`;

export function Hero() {
  return (
    <section
      id="hero"
      className="min-h-screen flex items-center justify-center bg-[var(--color-background)] relative overflow-hidden"
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-20 w-96 h-96 bg-[var(--color-primary)] rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob" />
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-[var(--color-accent)] rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-2000" />
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 relative z-10">
        <div className="flex flex-col md:flex-row items-center gap-12">
          <div className="flex-shrink-0">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] rounded-full blur-2xl opacity-30 animate-pulse" />
              <div className="relative w-48 h-48 md:w-56 md:h-56 rounded-full overflow-hidden border-4 border-white shadow-2xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)] flex items-center justify-center text-white text-6xl font-display font-bold">
                KS
              </div>
            </div>
          </div>

          <div className="flex-1 text-center md:text-left">
            <div className="inline-block px-4 py-1.5 bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded-full text-sm font-semibold mb-4">
              3+ Years | Healthcare & GenAI
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold mb-4 text-gray-900 tracking-tight">
              Kayalvizhi S M
            </h1>
            <h2 className="text-xl md:text-2xl text-gray-600 mb-6 font-display font-medium">
              AI-Enabled Application Engineer | TCS
            </h2>
            <p className="text-lg text-gray-600 max-w-xl mb-8 leading-relaxed">
              Bridging production support excellence with AI adoption. 3+ years in healthcare
              applications-incident management, ServiceNow, Splunk-now building expertise in Python,
              GenAI, and RAG for intelligent, data-driven solutions.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start mb-8">
              <a
                href="#contact"
                className="px-8 py-4 bg-[var(--color-primary)] text-white rounded-xl hover:bg-[var(--color-primary-hover)] transition-all duration-300 font-display font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                Get in Touch
              </a>
              <a
                href={RESUME_PDF}
                target="_blank"
                rel="noopener noreferrer"
                className="px-8 py-4 border-2 border-[var(--color-primary)] text-[var(--color-primary)] rounded-xl hover:bg-[var(--color-primary)] hover:text-white transition-all duration-300 font-display font-semibold"
              >
                Download Resume
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
