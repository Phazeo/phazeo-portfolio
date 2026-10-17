import { useEffect, useState } from "react";

const BASE_URL = import.meta.env.BASE_URL ?? "/";
const PROFILE_PHOTO = `${BASE_URL}profiles/_public/yokeshwar/profile-photo.jpg`;

export function Hero() {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    const img = new Image();
    img.src = PROFILE_PHOTO;
    img.onload = () => setImageLoaded(true);
    img.onerror = () => setImageError(true);
  }, []);

  return (
    <section
      id="hero"
      className="min-h-screen flex items-center justify-center bg-[var(--color-background)] relative overflow-hidden"
    >
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-20 w-96 h-96 bg-[var(--color-primary)] rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob" />
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-[var(--color-accent)] rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-2000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[var(--color-secondary)] rounded-full mix-blend-multiply filter blur-3xl opacity-5" />
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 relative z-10">
        <div className="flex flex-col md:flex-row items-center gap-12">
          {/* Photo */}
          <div className="flex-shrink-0">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] rounded-full blur-2xl opacity-30 animate-pulse" />
              <div className="relative w-48 h-48 md:w-56 md:h-56 rounded-full overflow-hidden border-4 border-white shadow-2xl">
                {!imageError ? (
                  <img
                    src={PROFILE_PHOTO}
                    alt="Yokeshwar"
                    className={`w-full h-full object-cover object-[center_5%] transition-opacity duration-300 ${
                      imageLoaded ? "opacity-100" : "opacity-0"
                    }`}
                    onLoad={() => setImageLoaded(true)}
                    onError={() => setImageError(true)}
                    loading="eager"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] flex items-center justify-center text-white text-5xl font-display font-bold">
                    Y
                  </div>
                )}
                {!imageLoaded && !imageError && (
                  <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] flex items-center justify-center text-white text-5xl font-display font-bold animate-pulse">
                    Y
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 text-center md:text-left">
            <div className="inline-block px-4 py-1.5 bg-[var(--color-accent)]/10 text-[var(--color-accent)] rounded-full text-sm font-semibold mb-4">
              B.E. Electrical & Electronics (2022-2026)
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold mb-4 bg-gradient-to-r from-[var(--color-primary)] via-[var(--color-secondary)] to-[var(--color-accent)] bg-clip-text text-transparent">
              Yokeshwar
            </h1>
            <h2 className="text-xl md:text-2xl text-gray-700 mb-6 font-display font-medium">
              Aspiring Electrical Engineer & IoT Enthusiast
            </h2>
            <p className="text-lg text-gray-600 max-w-xl mb-8 leading-relaxed">
              Motivated and results-oriented student with strong analytical and problem-solving
              skills. Passionate about{" "}
              <span className="font-semibold text-[var(--color-primary)]">Electric Vehicles</span>,{" "}
              <span className="font-semibold text-[var(--color-primary)]">IoT Systems</span>, and{" "}
              <span className="font-semibold text-[var(--color-primary)]">Embedded Technology</span>
              .
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start mb-8">
              <a
                href="#contact"
                className="px-8 py-4 bg-[var(--color-primary)] text-white rounded-xl hover:bg-[var(--color-primary-hover)] transition-all duration-300 font-display font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                Get in Touch
              </a>
              <a
                href="#projects"
                className="px-8 py-4 border-2 border-[var(--color-primary)] text-[var(--color-primary)] rounded-xl hover:bg-[var(--color-primary)] hover:text-white transition-all duration-300 font-display font-semibold"
              >
                View Projects
              </a>
            </div>

            <div className="flex items-center justify-center md:justify-start gap-2 text-gray-600">
              <svg
                className="w-5 h-5 text-[var(--color-primary)]"
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
              <span className="font-medium">Salem, India</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
