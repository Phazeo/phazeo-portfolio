export function Contact() {
  return (
    <section id="contact" className="bg-[var(--color-background)] relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-[var(--color-secondary)] rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob" />
        <div className="absolute bottom-20 right-10 w-72 h-72 bg-[var(--color-accent)] rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000" />
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 relative z-10">
        <h2 className="text-3xl md:text-4xl font-bold mb-8 md:mb-12 bg-gradient-to-r from-[var(--color-primary)] via-[var(--color-secondary)] to-[var(--color-accent)] bg-clip-text text-transparent text-center">
          Get in Touch
        </h2>
        <div className="max-w-3xl mx-auto">
          <p className="text-lg md:text-xl text-gray-700 text-center mb-12 leading-relaxed">
            I'm always open to discussing opportunities in AI, ML, and data science. Whether you're
            working on LLM applications, NLP systems, or building data-driven products, let's
            connect.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white border border-gray-200 rounded-xl p-6 md:p-8 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 border-[var(--color-primary)]/30 text-center hover:scale-105">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-3xl shadow-lg">
                ✉️
              </div>
              <h3 className="text-sm font-display font-semibold text-gray-600 uppercase tracking-wide mb-3">
                Email
              </h3>
              <a
                href="mailto:priyasowmi94@gmail.com"
                className="text-base md:text-lg text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] transition-all font-display font-semibold break-all"
              >
                priyasowmi94@gmail.com
              </a>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6 md:p-8 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 border-[var(--color-secondary)]/30 text-center hover:scale-105">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--color-secondary)] flex items-center justify-center text-3xl shadow-lg">
                📍
              </div>
              <h3 className="text-sm font-display font-semibold text-gray-600 uppercase tracking-wide mb-3">
                Location
              </h3>
              <p className="text-base md:text-lg text-gray-900 font-display font-semibold">
                Paris, France
              </p>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6 md:p-8 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 border-[var(--color-accent)]/30 text-center hover:scale-105">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--color-accent)] flex items-center justify-center text-3xl shadow-lg">
                📞
              </div>
              <h3 className="text-sm font-display font-semibold text-gray-600 uppercase tracking-wide mb-3">
                Phone
              </h3>
              <p className="text-base md:text-lg text-gray-500 font-display font-semibold">
                Available on request
              </p>
            </div>
          </div>
        </div>
      </div>
      <footer className="bg-[var(--color-primary)] text-white py-8 mt-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-300">
            © {new Date().getFullYear()} Sowmipriya Rajendiran. All rights reserved.
          </p>
        </div>
      </footer>
    </section>
  );
}
