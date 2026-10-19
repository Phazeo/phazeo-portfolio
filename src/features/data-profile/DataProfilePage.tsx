import { motion, useReducedMotion } from "motion/react";
import type { ComponentType, ReactNode } from "react";
import { Link } from "react-router-dom";

import { type ProfileNavItem, ProfileNavigation, profileAssetUrl } from "#kit";
import "#kit/fonts/outfit-latin.css";
import "#kit/fonts/playfair-display-latin.css";
import "#kit/fonts/space-grotesk-latin.css";
import { useTheme } from "../../app/providers/ThemeProvider";

import type { DataProfileJson } from "./types";

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="fixed bottom-5 right-4 z-[60] p-2.5 rounded-xl bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm border border-gray-200 dark:border-white/15 text-gray-700 dark:text-zinc-200 shadow-lg hover:bg-gray-50 dark:hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-primary) transition-colors"
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <title>Light mode</title>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      ) : (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <title>Dark mode</title>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
          />
        </svg>
      )}
    </button>
  );
}

function ExternalLink({
  href,
  children,
  className = "",
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-primary) ${className}`}
    >
      {children}
    </a>
  );
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "?";
  }
  if (parts.length === 1) {
    return (parts[0]?.[0] ?? "?").toUpperCase();
  }
  return `${parts[0]?.[0] ?? ""}${parts[parts.length - 1]?.[0] ?? ""}`.toUpperCase();
}

function formatRange(start?: string, end?: string, ongoingLabel = "Present"): string {
  if (!start && !end) {
    return "";
  }
  if (start && !end) {
    return ongoingLabel ? `${start} to ${ongoingLabel}` : start;
  }
  if (!start && end) {
    return end;
  }
  return `${start} to ${end}`;
}

function SectionHeading({ id, title }: { id: string; title: string }) {
  return (
    <div className="mb-8 md:mb-10">
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-10 h-10 rounded-xl bg-linear-to-br from-(--color-primary) to-(--color-accent) shadow-md shrink-0"
          aria-hidden="true"
        />
        <h2
          id={`${id}-heading`}
          className="text-2xl sm:text-3xl font-bold font-display tracking-tight bg-linear-to-r from-(--color-primary) via-(--color-secondary) to-(--color-accent) bg-clip-text text-transparent"
        >
          {title}
        </h2>
      </div>
      <div className="flex gap-1.5" aria-hidden="true">
        <span className="h-1 w-10 rounded-full bg-(--color-primary)" />
        <span className="h-1 w-6 rounded-full bg-(--color-secondary)" />
        <span className="h-1 w-4 rounded-full bg-(--color-accent)" />
      </div>
    </div>
  );
}

function Reveal({ children, className = "" }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  if (reduce) {
    return <div className={className}>{children}</div>;
  }
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-48px" }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

function CtaButton({
  href,
  children,
  variant,
  download,
}: {
  href: string;
  children: ReactNode;
  variant: "primary" | "secondary";
  download?: boolean;
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-primary)";
  const styles =
    variant === "primary"
      ? "bg-(--color-primary) text-white hover:bg-(--color-primary-hover) shadow-md hover:shadow-lg hover:-translate-y-0.5 motion-reduce:hover:translate-y-0"
      : "border border-(--color-secondary)/40 bg-white/70 dark:bg-white/5 text-(--color-primary) dark:text-zinc-100 hover:border-(--color-accent) hover:bg-(--color-accent)/10";
  return (
    <a href={href} download={download || undefined} className={`${base} ${styles}`}>
      {children}
    </a>
  );
}

export function DataProfileView({ slug, data }: { slug: string; data: DataProfileJson }) {
  const { basics, work, education, projects, skills, certificates, languages, resume } = data;
  const photo = basics.image ? profileAssetUrl(slug, basics.image) : null;
  const resumeHref = resume?.file ? profileAssetUrl(slug, resume.file) : null;
  const brandInitial = initialsOf(basics.name);
  const reduce = useReducedMotion();

  const navItems: ProfileNavItem[] = [];
  if (work && work.length > 0) {
    navItems.push({ label: "Experience", href: "#work" });
  }
  if (projects && projects.length > 0) {
    navItems.push({ label: "Projects", href: "#projects" });
  }
  if (skills && skills.length > 0) {
    navItems.push({ label: "Skills", href: "#skills" });
  }
  if (education && education.length > 0) {
    navItems.push({ label: "Education", href: "#education" });
  }
  if (certificates && certificates.length > 0) {
    navItems.push({ label: "Certificates", href: "#certificates" });
  }
  if (languages && languages.length > 0) {
    navItems.push({ label: "Languages", href: "#languages" });
  }

  const profileLinks = basics.profiles ?? [];
  // Avoid duplicate Website CTAs when basics.url already covers the site.
  const heroProfileLinks = profileLinks.filter((p) => {
    if (!basics.url) {
      return true;
    }
    return p.url !== basics.url && p.network.toLowerCase() !== "website";
  });

  return (
    <div className="min-h-screen bg-(--color-background) text-gray-900 dark:bg-[#0a0a0f] dark:text-zinc-100 transition-colors">
      <ProfileNavigation
        brandInitial={brandInitial}
        brandLabel={basics.name.split(/\s+/)[0] ?? "Portfolio"}
        items={navItems}
        adaptToColorScheme
      />
      <ThemeToggle />

      <main className="pt-16 md:pt-20">
        {/* Hero */}
        <section
          id="hero"
          aria-labelledby="hero-heading"
          className="relative overflow-hidden scroll-mt-24"
        >
          <div
            className="absolute inset-0 bg-linear-to-br from-(--color-primary)/10 via-(--color-secondary)/5 to-(--color-accent)/15 dark:from-(--color-primary)/25 dark:via-transparent dark:to-(--color-accent)/20"
            aria-hidden="true"
          />
          <div
            className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-(--color-accent)/20 blur-3xl dark:bg-(--color-accent)/10"
            aria-hidden="true"
          />
          <div
            className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full bg-(--color-secondary)/15 blur-3xl dark:bg-(--color-secondary)/10"
            aria-hidden="true"
          />

          <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20 lg:py-24">
            <div className="mb-6">
              <Link
                to="/"
                className="inline-flex text-sm text-gray-600 dark:text-zinc-400 hover:text-(--color-primary) dark:hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-primary) rounded"
              >
                All portfolios
              </Link>
            </div>

            <div className="flex flex-col md:flex-row gap-8 md:gap-12 md:items-center">
              <motion.div
                className="shrink-0"
                initial={reduce ? false : { opacity: 0, scale: 0.94 }}
                animate={reduce ? undefined : { opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
              >
                {photo ? (
                  <div className="relative w-32 h-32 sm:w-40 sm:h-40">
                    <div
                      className="absolute inset-0 rounded-full bg-(--color-primary)/30 blur-2xl"
                      aria-hidden="true"
                    />
                    <img
                      src={photo}
                      alt={`Portrait of ${basics.name}`}
                      width={160}
                      height={160}
                      className="relative w-full h-full rounded-full object-cover ring-4 ring-white dark:ring-white/10 shadow-xl"
                    />
                  </div>
                ) : (
                  <div
                    className="w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-linear-to-br from-(--color-primary) to-(--color-accent) flex items-center justify-center text-white text-3xl sm:text-4xl font-bold font-display shadow-xl ring-4 ring-white dark:ring-white/10"
                    aria-hidden="true"
                  >
                    {brandInitial}
                  </div>
                )}
              </motion.div>

              <div className="min-w-0 space-y-4">
                <p className="text-sm font-semibold tracking-wide uppercase text-(--color-accent)">
                  {basics.label}
                </p>
                <h1
                  id="hero-heading"
                  className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight font-display bg-linear-to-r from-(--color-primary) via-(--color-secondary) to-(--color-accent) bg-clip-text text-transparent"
                >
                  {basics.name}
                </h1>
                <p className="text-lg sm:text-xl text-gray-700 dark:text-zinc-300 leading-relaxed max-w-2xl">
                  {basics.summary}
                </p>
                <div className="flex flex-wrap gap-3 pt-2">
                  {basics.email ? (
                    <CtaButton href={`mailto:${basics.email}`} variant="primary">
                      Contact
                    </CtaButton>
                  ) : null}
                  {resumeHref ? (
                    <CtaButton href={resumeHref} variant="secondary" download>
                      Resume
                    </CtaButton>
                  ) : null}
                  {basics.url ? (
                    <CtaButton href={basics.url} variant="secondary">
                      Website
                    </CtaButton>
                  ) : null}
                  {heroProfileLinks.slice(0, 3).map((p, i) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: network+url+index
                    <CtaButton key={`${i}-${p.network}-${p.url}`} href={p.url} variant="secondary">
                      {p.network}
                    </CtaButton>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-20">
          {/* Experience timeline */}
          {work && work.length > 0 ? (
            <section id="work" aria-labelledby="work-heading" className="scroll-mt-24">
              <Reveal>
                <SectionHeading id="work" title="Experience" />
              </Reveal>
              <div className="relative">
                <div
                  className="hidden md:block absolute left-8 top-2 bottom-2 w-0.5 bg-linear-to-b from-(--color-primary) via-(--color-secondary) to-(--color-accent)"
                  aria-hidden="true"
                />
                <ul className="space-y-6 md:space-y-8">
                  {work.map((job, i) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: text+index
                    <li key={`${i}-${job.name}-${job.position}-${job.startDate}`}>
                      <Reveal>
                        <article className="relative md:ml-20 rounded-2xl border border-gray-200/80 dark:border-white/10 bg-white dark:bg-white/[0.03] p-5 sm:p-7 shadow-sm hover:shadow-md hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 transition-all duration-200">
                          <div
                            className="hidden md:flex absolute -left-[3.35rem] top-7 w-8 h-8 rounded-full bg-linear-to-br from-(--color-primary) to-(--color-accent) items-center justify-center text-white text-xs font-bold shadow ring-4 ring-(--color-background) dark:ring-[#0a0a0f]"
                            aria-hidden="true"
                          >
                            {i + 1}
                          </div>
                          <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white font-display">
                            {job.position}
                          </h3>
                          <p className="mt-1 text-sm sm:text-base text-(--color-secondary) dark:text-teal-300/90">
                            {job.name}
                            <span className="text-gray-500 dark:text-zinc-500">
                              {" "}
                              · {formatRange(job.startDate, job.endDate)}
                            </span>
                          </p>
                          {job.summary ? (
                            <p className="mt-3 text-gray-700 dark:text-zinc-300 leading-relaxed">
                              {job.summary}
                            </p>
                          ) : null}
                          {job.highlights && job.highlights.length > 0 ? (
                            <ul className="mt-4 space-y-2">
                              {job.highlights.map((h) => (
                                <li
                                  key={h}
                                  className="flex gap-2 text-sm text-gray-700 dark:text-zinc-300"
                                >
                                  <span
                                    className="mt-1.5 w-1.5 h-1.5 rounded-full bg-(--color-accent) shrink-0"
                                    aria-hidden="true"
                                  />
                                  <span>{h}</span>
                                </li>
                              ))}
                            </ul>
                          ) : null}
                        </article>
                      </Reveal>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          ) : null}

          {/* Projects grid */}
          {projects && projects.length > 0 ? (
            <section id="projects" aria-labelledby="projects-heading" className="scroll-mt-24">
              <Reveal>
                <SectionHeading id="projects" title="Projects" />
              </Reveal>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-5 md:gap-6">
                {projects.map((project, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: text+index
                  <li key={`${i}-${project.name}`}>
                    <Reveal>
                      <article className="group h-full rounded-2xl border border-gray-200/80 dark:border-white/10 bg-white dark:bg-white/[0.03] p-5 sm:p-6 shadow-sm hover:shadow-lg hover:-translate-y-1 motion-reduce:hover:translate-y-0 transition-all duration-200 overflow-hidden">
                        <div
                          className="h-1 w-full rounded-full bg-linear-to-r from-(--color-primary) via-(--color-secondary) to-(--color-accent) mb-5"
                          aria-hidden="true"
                        />
                        <h3 className="text-lg font-semibold font-display text-gray-900 dark:text-white">
                          {project.url ? (
                            <ExternalLink
                              href={project.url}
                              className="text-(--color-primary) dark:text-sky-300 hover:underline underline-offset-2"
                            >
                              {project.name}
                            </ExternalLink>
                          ) : (
                            project.name
                          )}
                        </h3>
                        {project.description ? (
                          <p className="mt-2 text-sm text-gray-700 dark:text-zinc-300 leading-relaxed">
                            {project.description}
                          </p>
                        ) : null}
                        {project.highlights && project.highlights.length > 0 ? (
                          <ul className="mt-4 flex flex-wrap gap-2">
                            {project.highlights.map((h) => (
                              <li
                                key={h}
                                className="px-2.5 py-1 rounded-lg text-xs font-medium bg-(--color-secondary)/10 dark:bg-white/10 text-gray-800 dark:text-zinc-200 border border-(--color-secondary)/20 dark:border-white/10"
                              >
                                {h}
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </article>
                    </Reveal>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {/* Skills chips */}
          {skills && skills.length > 0 ? (
            <section id="skills" aria-labelledby="skills-heading" className="scroll-mt-24">
              <Reveal>
                <SectionHeading id="skills" title="Skills" />
              </Reveal>
              <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {skills.map((skill, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: text+index
                  <li key={`${i}-${skill.name}`}>
                    <Reveal>
                      <div className="h-full rounded-2xl border border-gray-200/80 dark:border-white/10 bg-white dark:bg-white/[0.03] p-5 shadow-sm">
                        <h3 className="font-semibold font-display text-gray-900 dark:text-white mb-3">
                          {skill.name}
                        </h3>
                        {skill.keywords && skill.keywords.length > 0 ? (
                          <ul className="flex flex-wrap gap-2">
                            {skill.keywords.map((kw) => (
                              <li
                                key={kw}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-(--color-accent)/15 dark:bg-(--color-accent)/25 text-gray-900 dark:text-zinc-100 border border-(--color-accent)/30"
                              >
                                {kw}
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    </Reveal>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {/* Education */}
          {education && education.length > 0 ? (
            <section id="education" aria-labelledby="education-heading" className="scroll-mt-24">
              <Reveal>
                <SectionHeading id="education" title="Education" />
              </Reveal>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {education.map((ed, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: text+index
                  <li key={`${i}-${ed.institution}-${ed.startDate ?? ""}`}>
                    <Reveal>
                      <div className="rounded-xl border border-gray-200/80 dark:border-white/10 bg-white dark:bg-white/[0.03] p-4 sm:p-5">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {ed.institution}
                        </h3>
                        <p className="mt-1 text-sm text-gray-600 dark:text-zinc-400">
                          {[ed.studyType, ed.area].filter(Boolean).join(" · ")}
                          {ed.startDate || ed.endDate
                            ? ` · ${formatRange(ed.startDate, ed.endDate, "")}`
                            : ""}
                        </p>
                      </div>
                    </Reveal>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {/* Certificates */}
          {certificates && certificates.length > 0 ? (
            <section
              id="certificates"
              aria-labelledby="certificates-heading"
              className="scroll-mt-24"
            >
              <Reveal>
                <SectionHeading id="certificates" title="Certificates" />
              </Reveal>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {certificates.map((cert, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: text+index
                  <li key={`${i}-${cert.name}`}>
                    <Reveal>
                      <div className="rounded-xl border border-gray-200/80 dark:border-white/10 bg-white dark:bg-white/[0.03] p-4 sm:p-5">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {cert.url ? (
                            <ExternalLink
                              href={cert.url}
                              className="text-(--color-primary) dark:text-sky-300 hover:underline underline-offset-2"
                            >
                              {cert.name}
                            </ExternalLink>
                          ) : (
                            cert.name
                          )}
                        </h3>
                        {[cert.issuer, cert.date].filter(Boolean).length > 0 ? (
                          <p className="mt-1 text-sm text-gray-600 dark:text-zinc-400">
                            {[cert.issuer, cert.date].filter(Boolean).join(" · ")}
                          </p>
                        ) : null}
                      </div>
                    </Reveal>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {/* Languages */}
          {languages && languages.length > 0 ? (
            <section id="languages" aria-labelledby="languages-heading" className="scroll-mt-24">
              <Reveal>
                <SectionHeading id="languages" title="Languages" />
              </Reveal>
              <Reveal>
                <ul className="flex flex-wrap gap-3">
                  {languages.map((lang) => (
                    <li
                      key={lang.language}
                      className="px-4 py-2 rounded-xl text-sm font-semibold bg-(--color-secondary)/15 dark:bg-white/10 text-gray-900 dark:text-zinc-100 border border-(--color-secondary)/25 dark:border-white/10"
                    >
                      {lang.language}
                      {lang.fluency ? (
                        <span className="font-normal text-gray-600 dark:text-zinc-400">
                          {" "}
                          · {lang.fluency}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </Reveal>
            </section>
          ) : null}
        </div>
      </main>

      <footer className="border-t border-gray-200/80 dark:border-white/10 mt-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <p className="text-sm text-gray-600 dark:text-zinc-400">
            <span className="font-semibold text-gray-900 dark:text-white font-display">
              {basics.name}
            </span>
            <span className="mx-2 text-gray-300 dark:text-zinc-600" aria-hidden="true">
              ·
            </span>
            {basics.label}
          </p>
          <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
            {basics.email ? (
              <li>
                <a
                  href={`mailto:${basics.email}`}
                  className="text-(--color-primary) dark:text-sky-300 hover:underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-primary) rounded"
                >
                  Contact
                </a>
              </li>
            ) : null}
            {basics.url ? (
              <li>
                <ExternalLink
                  href={basics.url}
                  className="text-(--color-primary) dark:text-sky-300 hover:underline underline-offset-2"
                >
                  Website
                </ExternalLink>
              </li>
            ) : null}
            {profileLinks.map((p, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: network+url+index
              <li key={`foot-${i}-${p.network}-${p.url}`}>
                <ExternalLink
                  href={p.url}
                  className="text-(--color-primary) dark:text-sky-300 hover:underline underline-offset-2"
                >
                  {p.network}
                </ExternalLink>
              </li>
            ))}
            {resumeHref ? (
              <li>
                <a
                  href={resumeHref}
                  download
                  className="text-(--color-primary) dark:text-sky-300 hover:underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-primary) rounded"
                >
                  Resume
                </a>
              </li>
            ) : null}
          </ul>
        </div>
      </footer>
    </div>
  );
}

/**
 * Factory used by the registry lazy loader so each data profile gets its own chunk entry.
 */
export function createDataProfilePage(slug: string, data: DataProfileJson): ComponentType {
  function DataProfilePage() {
    return <DataProfileView slug={slug} data={data} />;
  }
  DataProfilePage.displayName = `DataProfile(${slug})`;
  return DataProfilePage;
}
