import type { ComponentType, ReactNode } from "react";
import { Link } from "react-router-dom";

import { profileAssetUrl } from "../../../profiles/_shared/assets";
import "../../../profiles/_shared/fonts/outfit-latin.css";
import "../../../profiles/_shared/fonts/playfair-display-latin.css";
import "../../../profiles/_shared/fonts/space-grotesk-latin.css";
import { useTheme } from "../../contexts/ThemeContext";

import type { DataProfileJson } from "./types";

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="fixed top-4 right-4 z-50 p-2 rounded-lg bg-white/80 dark:bg-white/10 backdrop-blur-sm border border-gray-200 dark:border-white/10 text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-white/20 transition-colors"
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

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="scroll-mt-24">
      <h2
        id={`${id}-heading`}
        className="text-sm font-semibold tracking-wide uppercase text-(--color-secondary) mb-4"
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-(--color-primary) hover:text-(--color-primary-hover) underline-offset-2 hover:underline"
    >
      {children}
    </a>
  );
}

export function DataProfileView({ slug, data }: { slug: string; data: DataProfileJson }) {
  const { basics, work, education, projects, skills, certificates, languages, resume } = data;
  const photo = basics.image ? profileAssetUrl(slug, basics.image) : null;
  const resumeHref = resume?.file ? profileAssetUrl(slug, resume.file) : null;

  return (
    <div className="min-h-screen bg-(--color-background) text-gray-900 dark:bg-[#0a0a0f] dark:text-zinc-100 transition-colors">
      <ThemeToggle />
      <header className="border-b border-gray-200/80 dark:border-white/10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <Link
            to="/"
            className="text-sm text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
          >
            ← All portfolios
          </Link>
          {resumeHref ? (
            <a
              href={resumeHref}
              download
              className="inline-flex items-center rounded-lg px-3 py-1.5 text-sm font-medium bg-(--color-primary) text-white hover:bg-(--color-primary-hover) transition-colors"
            >
              Download resume
            </a>
          ) : null}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16 space-y-14">
        <div className="flex flex-col sm:flex-row gap-8 sm:items-start">
          {photo ? (
            <img
              src={photo}
              alt=""
              width={128}
              height={128}
              className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl object-cover shrink-0 bg-gray-200 dark:bg-white/10"
            />
          ) : null}
          <div className="min-w-0 space-y-3">
            <p className="text-sm font-medium text-(--color-accent)">{basics.label}</p>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900 dark:text-white [font-family:var(--font-heading)]">
              {basics.name}
            </h1>
            <p className="text-lg text-gray-600 dark:text-zinc-400 leading-relaxed max-w-2xl">
              {basics.summary}
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
              {basics.email ? (
                <a
                  href={`mailto:${basics.email}`}
                  className="text-(--color-primary) hover:text-(--color-primary-hover)"
                >
                  {basics.email}
                </a>
              ) : null}
              {basics.url ? <ExternalLink href={basics.url}>Website</ExternalLink> : null}
              {(basics.profiles ?? []).map((p, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: text+index keeps duplicate labels unique
                <ExternalLink key={`${i}-${p.network}-${p.url}`} href={p.url}>
                  {p.network}
                </ExternalLink>
              ))}
            </div>
          </div>
        </div>

        {work && work.length > 0 ? (
          <Section id="work" title="Experience">
            <ul className="space-y-8">
              {work.map((job, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: text+index keeps duplicate labels unique
                <li key={`${i}-${job.name}-${job.position}-${job.startDate}`}>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {job.position}
                  </h3>
                  <p className="text-(--color-secondary)">
                    {job.name}
                    <span className="text-gray-400 dark:text-zinc-500">
                      {" "}
                      · {job.startDate}
                      {job.endDate ? ` – ${job.endDate}` : " – Present"}
                    </span>
                  </p>
                  {job.summary ? (
                    <p className="mt-2 text-gray-600 dark:text-zinc-400">{job.summary}</p>
                  ) : null}
                  {job.highlights && job.highlights.length > 0 ? (
                    <ul className="mt-3 list-disc pl-5 space-y-1 text-gray-600 dark:text-zinc-400">
                      {job.highlights.map((h, j) => (
                        // biome-ignore lint/suspicious/noArrayIndexKey: text+index keeps duplicate labels unique
                        <li key={`${i}-${j}-${h}`}>{h}</li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ul>
          </Section>
        ) : null}

        {projects && projects.length > 0 ? (
          <Section id="projects" title="Projects">
            <ul className="space-y-6">
              {projects.map((project, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: text+index keeps duplicate labels unique
                <li key={`${i}-${project.name}`}>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {project.url ? (
                      <ExternalLink href={project.url}>{project.name}</ExternalLink>
                    ) : (
                      project.name
                    )}
                  </h3>
                  {project.description ? (
                    <p className="mt-1 text-gray-600 dark:text-zinc-400">{project.description}</p>
                  ) : null}
                  {project.highlights && project.highlights.length > 0 ? (
                    <ul className="mt-2 list-disc pl-5 space-y-1 text-gray-600 dark:text-zinc-400">
                      {project.highlights.map((h, j) => (
                        // biome-ignore lint/suspicious/noArrayIndexKey: text+index keeps duplicate labels unique
                        <li key={`${i}-${j}-${h}`}>{h}</li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ul>
          </Section>
        ) : null}

        {education && education.length > 0 ? (
          <Section id="education" title="Education">
            <ul className="space-y-4">
              {education.map((ed, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: text+index keeps duplicate labels unique
                <li key={`${i}-${ed.institution}-${ed.startDate ?? ""}`}>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{ed.institution}</h3>
                  <p className="text-gray-600 dark:text-zinc-400">
                    {[ed.studyType, ed.area].filter(Boolean).join(" · ")}
                    {ed.startDate || ed.endDate
                      ? ` · ${ed.startDate ?? "?"}${ed.endDate ? ` – ${ed.endDate}` : ""}`
                      : ""}
                  </p>
                </li>
              ))}
            </ul>
          </Section>
        ) : null}

        {skills && skills.length > 0 ? (
          <Section id="skills" title="Skills">
            <ul className="space-y-3">
              {skills.map((skill, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: text+index keeps duplicate labels unique
                <li key={`${i}-${skill.name}`}>
                  <span className="font-medium text-gray-900 dark:text-white">{skill.name}</span>
                  {skill.keywords && skill.keywords.length > 0 ? (
                    <span className="text-gray-600 dark:text-zinc-400">
                      {" "}
                      — {skill.keywords.join(", ")}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </Section>
        ) : null}

        {certificates && certificates.length > 0 ? (
          <Section id="certificates" title="Certificates">
            <ul className="space-y-3">
              {certificates.map((cert, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: text+index keeps duplicate labels unique
                <li key={`${i}-${cert.name}`}>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {cert.url ? (
                      <ExternalLink href={cert.url}>{cert.name}</ExternalLink>
                    ) : (
                      cert.name
                    )}
                  </span>
                  <span className="text-gray-600 dark:text-zinc-400">
                    {[cert.issuer, cert.date].filter(Boolean).length > 0
                      ? ` — ${[cert.issuer, cert.date].filter(Boolean).join(" · ")}`
                      : ""}
                  </span>
                </li>
              ))}
            </ul>
          </Section>
        ) : null}

        {languages && languages.length > 0 ? (
          <Section id="languages" title="Languages">
            <ul className="space-y-2">
              {languages.map((lang, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: text+index keeps duplicate labels unique
                <li key={`${i}-${lang.language}`} className="text-gray-700 dark:text-zinc-300">
                  <span className="font-medium">{lang.language}</span>
                  {lang.fluency ? (
                    <span className="text-gray-500 dark:text-zinc-500"> — {lang.fluency}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </Section>
        ) : null}
      </main>
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
