import { useEffect, useState } from "react";

import { profileAssetUrl } from "../../../_shared/assets";

const PROFILE_PHOTO = profileAssetUrl("sowmipriya-rajendiran", "profile-photo.jpg");
const COVER_PHOTO = profileAssetUrl("sowmipriya-rajendiran", "cover-photo.jpg");

export function Hero() {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [coverImageError, setCoverImageError] = useState(false);
  const [coverImageLoaded, setCoverImageLoaded] = useState(false);

  useEffect(() => {
    const img = new Image();
    img.src = PROFILE_PHOTO;
    img.onload = () => setImageLoaded(true);
    img.onerror = () => setImageError(true);

    const coverImg = new Image();
    coverImg.src = COVER_PHOTO;
    coverImg.onload = () => setCoverImageLoaded(true);
    coverImg.onerror = () => setCoverImageError(true);
  }, []);

  return (
    <section
      id="hero"
      className="min-h-screen flex flex-col bg-(--color-background) relative overflow-hidden"
    >
      {/* Cover Photo Section */}
      <div className="relative w-full h-64 md:h-80 lg:h-96 overflow-hidden">
        {!coverImageError ? (
          <>
            <img
              src={COVER_PHOTO}
              alt="Cover"
              className={`w-full h-full object-cover transition-opacity duration-500 ${
                coverImageLoaded ? "opacity-100" : "opacity-0"
              }`}
              onLoad={() => setCoverImageLoaded(true)}
              onError={() => setCoverImageError(true)}
              loading="eager"
            />
            {!coverImageLoaded && !coverImageError && (
              <div className="absolute inset-0 bg-linear-to-r from-(--color-accent) via-(--color-secondary) to-(--color-primary) flex items-center justify-center animate-pulse">
                <div className="text-center text-white/80">
                  <p className="text-lg font-display">Loading cover photo...</p>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full bg-linear-to-r from-(--color-accent) via-(--color-secondary) to-(--color-primary) flex items-center justify-center">
            <div className="text-center text-white/80">
              <p className="text-lg font-display">Add your cover photo</p>
            </div>
          </div>
        )}
        <div className="absolute inset-0 bg-linear-to-b from-black/30 via-black/10 to-(--color-background)/80" />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center -mt-32 md:-mt-40 relative z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 text-center">
          <div className="flex flex-col md:flex-row items-center justify-center gap-12 mb-12">
            {/* Photo Section */}
            <div className="shrink-0">
              <div className="relative">
                <div className="absolute inset-0 bg-(--color-primary) rounded-full blur-2xl opacity-30 animate-pulse" />
                <div className="relative w-48 h-48 md:w-64 md:h-64 rounded-full overflow-hidden border-4 border-white shadow-2xl">
                  {!imageError ? (
                    <img
                      src={PROFILE_PHOTO}
                      alt="Sowmipriya Rajendiran"
                      className={`w-full h-full object-cover transition-opacity duration-300 ${
                        imageLoaded ? "opacity-100" : "opacity-0"
                      }`}
                      onLoad={() => setImageLoaded(true)}
                      onError={() => setImageError(true)}
                      loading="eager"
                    />
                  ) : (
                    <div className="w-full h-full bg-(--color-accent) flex items-center justify-center text-white text-5xl md:text-6xl font-display font-bold">
                      SR
                    </div>
                  )}
                  {!imageLoaded && !imageError && (
                    <div className="absolute inset-0 bg-(--color-accent) flex items-center justify-center text-white text-5xl md:text-6xl font-display font-bold animate-pulse">
                      SR
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Text Content */}
            <div className="flex-1 max-w-2xl">
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-display font-bold mb-6 bg-linear-to-r from-(--color-primary) via-(--color-secondary) to-(--color-accent) bg-clip-text text-transparent">
                Sowmipriya Rajendiran
              </h1>
              <h2 className="text-2xl md:text-3xl lg:text-4xl text-gray-800 mb-8 font-display font-semibold">
                Data Scientist & Machine Learning Engineer
              </h2>
              <p className="text-lg md:text-xl text-gray-700 max-w-3xl mx-auto mb-12 leading-relaxed font-sans">
                Specializing in{" "}
                <span className="font-semibold text-(--color-primary)">Large Language Models</span>,{" "}
                <span className="font-semibold text-(--color-primary)">NLP</span>, and applied AI
                systems that solve real-world problems at scale. Building intelligent moderation
                systems, classifiers, and data pipelines that drive business impact.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
            <a
              href="#contact"
              className="px-8 py-4 bg-(--color-primary) text-white rounded-xl hover:bg-(--color-primary-hover) transition-all duration-300 font-display font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            >
              Get in Touch
            </a>
            <a
              href="#experience"
              className="px-8 py-4 border-2 border-(--color-primary) text-(--color-primary) rounded-xl hover:bg-(--color-primary) hover:text-white transition-all duration-300 font-display font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            >
              View Experience
            </a>
          </div>

          <div className="flex items-center justify-center gap-2 text-gray-700">
            <svg
              className="w-5 h-5 text-(--color-primary)"
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
            <p className="text-sm font-medium">Paris, France</p>
          </div>
        </div>
      </div>
    </section>
  );
}
