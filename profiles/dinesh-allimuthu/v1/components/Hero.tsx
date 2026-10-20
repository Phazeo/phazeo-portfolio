import { motion } from "motion/react";

import { profileAssetUrl } from "#kit";
import { FlipWords } from "../ui/flip-words";
import { LampContainer } from "../ui/lamp";

const PROFILE_PHOTO = profileAssetUrl("dinesh-allimuthu", "profile-photo-3.png");

const personalInfo = {
  name: "Dinesh Allimuthu",
  tagline: "Transforming data into actionable insights with years of AI/ML expertise",
  location: "Paris, France",
  linkedin: "https://linkedin.com/in/dinesha07",
  github: "https://github.com/dinesh-ad",
};

const roles = ["Data Scientist", "AI/ML Engineer", "NLP Specialist", "Big Data Expert"];

const heroStats = [
  { label: "Years in IT", value: "11+" },
  { label: "AI Projects Delivered", value: "10+" },
  { label: "LLM Systems Built", value: "100+" },
  { label: "TB+ Data Processed", value: "2+" },
];

export function Hero() {
  const scrollToSection = (sectionId: string) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <section id="hero" className="relative">
      {/* Lamp Effect - Aceternity-inspired dramatic section opener */}
      <LampContainer>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8, ease: "easeOut" }}
          className="text-center"
        >
          {/* Profile Photo */}
          <div className="mb-6">
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-(--color-primary) rounded-full blur-2xl opacity-30 animate-pulse" />
              <div className="relative w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden border-4 border-white/20 shadow-2xl mx-auto ring-4 ring-(--color-primary)/20">
                <img
                  src={PROFILE_PHOTO}
                  alt={personalInfo.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = "none";
                    const parent = target.parentElement;
                    if (parent && !parent.querySelector("[data-initials-fallback]")) {
                      const fallback = document.createElement("div");
                      fallback.setAttribute("data-initials-fallback", "1");
                      fallback.className =
                        "w-full h-full bg-(--color-primary) flex items-center justify-center text-white text-5xl font-bold";
                      fallback.textContent = "DA";
                      parent.appendChild(fallback);
                    }
                  }}
                />
              </div>
            </div>
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-7xl font-display font-bold mb-4 bg-linear-to-r from-white via-slate-200 to-white bg-clip-text text-transparent">
            {personalInfo.name}
          </h1>

          {/* FlipWords - Aceternity-inspired role cycling */}
          <h2 className="text-xl md:text-2xl text-slate-300 mb-4 font-display font-medium h-8">
            <FlipWords words={roles} duration={2500} className="text-(--color-primary)" />
          </h2>

          <p className="text-base md:text-lg text-slate-400 max-w-2xl mx-auto mb-4 leading-relaxed">
            {personalInfo.tagline}
          </p>
          <p className="text-sm text-slate-500 mb-8">{personalInfo.location}</p>

          {/* Stats row */}
          <div className="flex flex-wrap justify-center gap-8 mb-8">
            {heroStats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-(--color-primary)">
                  {stat.value}
                </div>
                <div className="text-xs md:text-sm text-slate-500">{stat.label}</div>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              type="button"
              onClick={() => scrollToSection("contact")}
              className="px-8 py-4 bg-(--color-primary) text-white rounded-xl hover:bg-(--color-primary-hover) transition-all duration-300 font-display font-semibold shadow-lg hover:shadow-xl hover:-translate-y-0.5"
            >
              Get in Touch
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("about")}
              className="px-8 py-4 border-2 border-slate-600 text-slate-300 rounded-xl hover:border-(--color-primary) hover:text-(--color-primary) transition-all duration-300 font-display font-semibold"
            >
              Learn More
            </button>
          </div>
        </motion.div>
      </LampContainer>
    </section>
  );
}
