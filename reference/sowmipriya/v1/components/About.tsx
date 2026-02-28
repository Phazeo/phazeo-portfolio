export function About() {
  return (
    <section id="about" className="bg-[var(--color-background)] relative overflow-hidden">
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
              👤
            </div>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-8 md:mb-12 bg-gradient-to-r from-[var(--color-primary)] via-[var(--color-secondary)] to-[var(--color-accent)] bg-clip-text text-transparent">
            About Me
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-8 items-start">
          <div className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-xl p-6 md:p-8 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 border-[var(--color-primary)]/30 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--color-primary)] rounded-full blur-3xl opacity-20 group-hover:opacity-30 transition-opacity" />
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-14 h-14 bg-[var(--color-primary)] rounded-xl flex items-center justify-center text-2xl shadow-lg">
                    🤖
                  </div>
                  <h3 className="text-xl font-display font-bold text-gray-900">
                    AI & ML Expertise
                  </h3>
                </div>
                <p className="text-gray-700 leading-relaxed">
                  I'm an experienced Data Scientist and Machine Learning Engineer with a strong
                  focus on Large Language Models, Natural Language Processing, and applied AI
                  systems. My work spans from developing production-grade AI moderation systems to
                  building end-to-end classification pipelines that process millions of data points.
                </p>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6 md:p-8 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 border-[var(--color-secondary)]/30 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--color-secondary)] rounded-full blur-3xl opacity-20 group-hover:opacity-30 transition-opacity" />
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-14 h-14 bg-[var(--color-secondary)] rounded-xl flex items-center justify-center text-2xl shadow-lg">
                    ⚡
                  </div>
                  <h3 className="text-xl font-display font-bold text-gray-900">
                    Real-World Impact
                  </h3>
                </div>
                <p className="text-gray-700 leading-relaxed">
                  With expertise in prompt engineering, model evaluation, and data curation, I've
                  contributed to training large language models and developed systems that
                  automatically detect and moderate content at scale. My background includes
                  building predictive models for enterprise clients, creating real-time data
                  processing algorithms, and ensuring high-quality data annotation for ML training
                  pipelines.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-xl p-6 md:p-8 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 border-[var(--color-primary)] relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--color-primary)] rounded-full blur-3xl opacity-30 group-hover:opacity-50 transition-opacity" />
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-14 h-14 bg-[var(--color-accent)] rounded-xl flex items-center justify-center text-2xl shadow-lg">
                    🎓
                  </div>
                  <h3 className="text-xl font-display font-bold text-gray-900">
                    Education & Passion
                  </h3>
                </div>
                <p className="text-gray-700 leading-relaxed mb-4">
                  I hold a Master's in Big Data and Data Science from CY Cergy Paris University and
                  am passionate about bridging the gap between research and production-ready AI
                  solutions.
                </p>
                <div className="flex flex-wrap gap-2 mt-4">
                  <span className="px-4 py-2 bg-[var(--color-secondary)]/30 text-[var(--color-primary)] rounded-lg text-sm font-display font-semibold border border-[var(--color-secondary)]">
                    LLM
                  </span>
                  <span className="px-4 py-2 bg-[var(--color-accent)]/30 text-[var(--color-primary)] rounded-lg text-sm font-display font-semibold border border-[var(--color-accent)]">
                    NLP
                  </span>
                  <span className="px-4 py-2 bg-[var(--color-secondary)]/30 text-[var(--color-primary)] rounded-lg text-sm font-display font-semibold border border-[var(--color-secondary)]">
                    ML Engineering
                  </span>
                  <span className="px-4 py-2 bg-[var(--color-accent)]/30 text-[var(--color-primary)] rounded-lg text-sm font-display font-semibold border border-[var(--color-accent)]">
                    Data Science
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6 md:p-8 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 border-[var(--color-accent)] relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--color-accent)] rounded-full blur-3xl opacity-30 group-hover:opacity-50 transition-opacity" />
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-14 h-14 bg-[var(--color-primary)] rounded-xl flex items-center justify-center text-2xl shadow-lg">
                    📈
                  </div>
                  <h3 className="text-xl font-display font-bold text-gray-900">Key Achievements</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-[var(--color-secondary)]/20 rounded-lg">
                    <div className="text-2xl font-display font-bold text-[var(--color-primary)]">
                      5+
                    </div>
                    <div className="text-xs text-gray-600 mt-1">Years Experience</div>
                  </div>
                  <div className="text-center p-3 bg-[var(--color-accent)]/20 rounded-lg">
                    <div className="text-2xl font-display font-bold text-[var(--color-primary)]">
                      10+
                    </div>
                    <div className="text-xs text-gray-600 mt-1">Projects</div>
                  </div>
                  <div className="text-center p-3 bg-[var(--color-secondary)]/20 rounded-lg">
                    <div className="text-2xl font-display font-bold text-[var(--color-primary)]">
                      2
                    </div>
                    <div className="text-xs text-gray-600 mt-1">Publications</div>
                  </div>
                  <div className="text-center p-3 bg-[var(--color-accent)]/20 rounded-lg">
                    <div className="text-2xl font-display font-bold text-[var(--color-primary)]">
                      100%
                    </div>
                    <div className="text-xs text-gray-600 mt-1">Dedicated</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
