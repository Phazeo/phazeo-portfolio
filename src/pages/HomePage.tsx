import type { ComponentType } from "react";
import { Link } from "react-router-dom";

import { GitHubIcon, LinkedInIcon, WebsiteIcon, XIcon } from "../components/SocialIcons";
import { useTheme } from "../contexts/ThemeContext";
import { getExperienceYearsDisplay, getListedProfiles } from "../registry";

function StatusDot({ status }: { status: "available" | "building" | "away" }) {
  const styles = {
    available: "bg-emerald-500",
    building: "bg-amber-500",
    away: "bg-zinc-500",
  };
  const labels = {
    available: "Available",
    building: "Building",
    away: "Away",
  };
  return (
    <span
      role="img"
      className={`inline-block w-2.5 h-2.5 rounded-full ${styles[status]} ring-2 ring-white dark:ring-[#0a0a0f]`}
      title={labels[status]}
      aria-label={labels[status]}
    />
  );
}

function SocialLinks({
  socials,
}: {
  socials?: { linkedin?: string; github?: string; twitter?: string; website?: string };
}) {
  if (!socials) {
    return null;
  }
  const links: { href: string; label: string; Icon: ComponentType<{ className?: string }> }[] = [];
  if (socials.linkedin) {
    links.push({ href: socials.linkedin, label: "LinkedIn", Icon: LinkedInIcon });
  }
  if (socials.github) {
    links.push({ href: socials.github, label: "GitHub", Icon: GitHubIcon });
  }
  if (socials.twitter) {
    links.push({ href: socials.twitter, label: "X", Icon: XIcon });
  }
  if (socials.website) {
    links.push({ href: socials.website, label: "Website", Icon: WebsiteIcon });
  }
  if (links.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-3">
      {links.map((link) => (
        <a
          key={link.label}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-600 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white transition-colors"
          title={link.label}
          aria-label={link.label}
          onClick={(event) => event.stopPropagation()}
        >
          <link.Icon className="inline-block" />
          <span className="sr-only">{link.label}</span>
        </a>
      ))}
    </div>
  );
}

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

function sortProfiles(
  list: ReturnType<typeof getListedProfiles>
): ReturnType<typeof getListedProfiles> {
  return [...list].sort((a, b) =>
    (a.displayName ?? "").localeCompare(b.displayName ?? "", undefined, { sensitivity: "base" })
  );
}

function ProfileCard({ profile }: { profile: ReturnType<typeof getListedProfiles>[number] }) {
  const initials = profile.displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);
  const gradient = profile.avatarGradient ?? "from-violet-500 to-fuchsia-500";
  const expYears = getExperienceYearsDisplay(profile);

  return (
    <Link to={`/${profile.slug}`} className="group relative block rounded-2xl overflow-hidden">
      <div
        className="absolute -inset-[2px] rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 group-hover:[animation:gradient-border-sweep_3s_linear_infinite]"
        style={{
          background: "conic-gradient(from 0deg, #06b6d4, #a855f7, #ec4899, #06b6d4)",
        }}
        aria-hidden="true"
      />

      <div className="relative m-[2px] rounded-2xl bg-white/90 dark:bg-white/6 backdrop-blur-xl border border-gray-200 dark:border-white/8 shadow-lg p-6 transition-colors">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div
              className={`w-14 h-14 shrink-0 rounded-xl bg-linear-to-br ${gradient} flex items-center justify-center text-white text-xl font-bold shadow-lg group-hover:scale-105 transition-transform`}
            >
              {initials}
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white truncate group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                {profile.displayName}
              </h2>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm text-gray-500 dark:text-zinc-400 truncate">
                  {profile.role ?? "Professional Portfolio"}
                </p>
                {expYears && (
                  <span
                    className="inline-flex items-center justify-center min-w-8 h-5 px-2 rounded-full text-xs font-semibold bg-cyan-500/15 text-cyan-700 dark:bg-cyan-400/20 dark:text-cyan-300"
                    title={`${expYears.replace("+", "")} years of experience`}
                  >
                    {expYears}
                  </span>
                )}
              </div>
            </div>
          </div>
          {profile.status && (
            <div className="shrink-0 pt-1.5">
              <StatusDot status={profile.status} />
            </div>
          )}
        </div>

        {profile.cardSummary ? (
          <p className="mt-4 text-sm text-gray-600 dark:text-zinc-400 line-clamp-2">
            {profile.cardSummary}
          </p>
        ) : null}

        <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-100 dark:border-white/8">
          <SocialLinks socials={profile.socials} />
          <span className="text-gray-400 dark:text-zinc-500 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all inline-flex">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </span>
        </div>
      </div>
    </Link>
  );
}

function ProfileGroup({
  title,
  profiles,
}: {
  title: string;
  profiles: ReturnType<typeof getListedProfiles>;
}) {
  if (profiles.length === 0) {
    return null;
  }
  return (
    <section className="mb-14">
      <h2 className="text-sm font-semibold tracking-wide uppercase text-gray-500 dark:text-zinc-500 mb-6">
        {title}
      </h2>
      <div className="grid gap-6 sm:grid-cols-2">
        {profiles.map((profile) => (
          <ProfileCard key={profile.slug} profile={profile} />
        ))}
      </div>
    </section>
  );
}

export function HomePage() {
  const profiles = getListedProfiles();
  const team = sortProfiles(profiles.filter((p) => p.affiliation === "team"));
  const guests = sortProfiles(profiles.filter((p) => p.affiliation === "guest"));

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0f] text-gray-900 dark:text-white transition-colors">
      <ThemeToggle />

      <div className="max-w-4xl mx-auto px-4 py-16 sm:py-24">
        <div className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Phazeo Portfolios
          </h1>
          <p className="text-lg text-gray-600 dark:text-zinc-400 max-w-2xl mx-auto">
            Professional portfolios showcasing talented individuals and their work.
          </p>
        </div>

        <ProfileGroup title="Team" profiles={team} />
        <ProfileGroup title="Guests" profiles={guests} />

        {profiles.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-zinc-500">No portfolios available yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
