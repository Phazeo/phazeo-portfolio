export function Hero() {
  return (
    <section
      id="hero"
      className="min-h-screen flex items-center justify-center bg-[var(--color-background)]"
    >
      <div className="max-w-2xl mx-auto px-4 text-center">
        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-4xl text-white font-bold">
          TR
        </div>
        <h1 className="text-3xl font-display font-bold text-gray-900 mb-2">Tester Robot</h1>
        <p className="text-lg text-gray-600">
          QA Automation Profile — used for validating deploy hooks and CI/CD.
        </p>
      </div>
    </section>
  );
}
