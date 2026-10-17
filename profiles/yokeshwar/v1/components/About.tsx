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
              I'm a motivated Electrical & Electronics Engineering student at Sona College of
              Technology, passionate about building innovative solutions. With hands-on experience
              in EV technology, IoT systems, and embedded programming, I'm constantly exploring new
              ways to apply technology to real-world problems.
            </p>
          </div>

          <div className="bg-gray-50 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-[var(--color-accent)] rounded-xl flex items-center justify-center text-2xl">
                🎯
              </div>
              <h3 className="text-xl font-display font-bold text-gray-900">My Goals</h3>
            </div>
            <p className="text-gray-700 leading-relaxed">
              Looking for opportunities to learn, contribute, and grow while building real-world
              experience. I'm particularly interested in Electric Vehicle systems, Industrial IoT,
              and sustainable technology solutions that can make a positive impact.
            </p>
          </div>

          <div className="md:col-span-2 bg-gradient-to-r from-[var(--color-primary)]/10 to-[var(--color-accent)]/10 rounded-2xl p-8">
            <h3 className="text-xl font-display font-bold text-gray-900 mb-4">
              Memberships & Activities
            </h3>
            <div className="flex flex-wrap gap-3">
              {[
                "IEEE Member",
                "Circuit Crafters Club",
                "Edison Association",
                "PRAGYAN NIT Trichy",
                "SAMAVESH Conference",
              ].map((item) => (
                <span
                  key={item}
                  className="px-4 py-2 bg-white text-[var(--color-primary)] rounded-lg text-sm font-semibold shadow-sm"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
