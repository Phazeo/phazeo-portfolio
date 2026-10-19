import {
  type ComponentType,
  type FormEvent,
  useDeferredValue,
  useEffect,
  useId,
  useMemo,
  useRef,
} from "react";
import { Link, useSearchParams } from "react-router-dom";
import type { ProfileConfig } from "#kit";
import { useTheme } from "../../app/providers/ThemeProvider";
import { GitHubIcon, LinkedInIcon, WebsiteIcon, XIcon } from "../../components/SocialIcons";
import { getListedProfiles } from "../../registry";
import { getExperienceYearsDisplay } from "./experience";
import {
  DIRECTORY_PAGE_SIZE,
  type DirectoryEntry,
  type DirectoryTypeFilter,
  filterByType,
  matches,
  paginate,
  parseParams,
  sortByDisplayName,
  toParams,
} from "./query";

function toEntry(profile: ProfileConfig): DirectoryEntry {
  return {
    slug: profile.slug,
    displayName: profile.displayName,
    role: profile.role,
    affiliation: profile.affiliation,
    skills: profile.skills?.map((s) => s.name),
  };
}

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
    <div className="relative z-10 flex items-center gap-1">
      {links.map((link) => (
        <a
          key={link.label}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          className="relative z-10 inline-flex items-center justify-center min-w-6 min-h-6 p-1.5 text-gray-600 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white transition-colors rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500"
          title={link.label}
          aria-label={link.label}
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

function ProfileCard({ profile }: { profile: ProfileConfig }) {
  const initials = profile.displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);
  const gradient = profile.avatarGradient ?? "from-violet-500 to-fuchsia-500";
  const expYears = getExperienceYearsDisplay(profile);

  return (
    <li className="group relative h-full rounded-2xl [@supports(grid-template-rows:subgrid)]:row-span-4 [@supports(grid-template-rows:subgrid)]:grid [@supports(grid-template-rows:subgrid)]:grid-rows-subgrid">
      <div
        className="pointer-events-none absolute -inset-[2px] rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-hover:[animation:gradient-border-sweep_3s_linear_infinite]"
        style={{
          background: "conic-gradient(from 0deg, #06b6d4, #a855f7, #ec4899, #06b6d4)",
        }}
        aria-hidden="true"
      />

      <article className="relative m-[2px] flex h-full flex-col rounded-2xl border border-gray-200 bg-white/90 p-6 shadow-lg backdrop-blur-xl transition-colors focus-within:ring-2 focus-within:ring-cyan-500 focus-within:ring-offset-2 focus-within:ring-offset-white dark:border-white/8 dark:bg-white/6 dark:focus-within:ring-offset-[#0a0a0f] [@supports(grid-template-rows:subgrid)]:col-span-full [@supports(grid-template-rows:subgrid)]:row-span-4 [@supports(grid-template-rows:subgrid)]:grid [@supports(grid-template-rows:subgrid)]:grid-rows-subgrid [@supports(grid-template-rows:subgrid)]:gap-0">
        {/* Header: avatar, name, badge */}
        <div className="flex min-w-0 items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <div
              className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-linear-to-br text-xl font-bold text-white shadow-lg transition-transform group-hover:scale-105 ${gradient}`}
            >
              {initials}
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-xl font-semibold text-gray-900 dark:text-white">
                <Link
                  to={`/${profile.slug}`}
                  className="text-inherit no-underline transition-colors after:absolute after:inset-0 after:z-0 after:rounded-2xl after:content-[''] group-hover:text-cyan-600 focus-visible:outline-none dark:group-hover:text-cyan-400"
                >
                  <span className="relative z-10">{profile.displayName}</span>
                </Link>
              </h2>
            </div>
          </div>
          {profile.status ? (
            <div className="relative z-10 shrink-0 pt-1.5">
              <StatusDot status={profile.status} />
            </div>
          ) : (
            <span className="w-2.5 shrink-0" aria-hidden="true" />
          )}
        </div>

        {/* Role */}
        <div className="mt-2 min-h-[2.5rem] min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="line-clamp-2 text-sm text-gray-500 dark:text-zinc-400">
              {profile.role ?? "Professional Portfolio"}
            </p>
            {expYears ? (
              <span
                className="inline-flex h-5 min-w-8 items-center justify-center rounded-full bg-cyan-500/15 px-2 text-xs font-semibold text-cyan-700 dark:bg-cyan-400/20 dark:text-cyan-300"
                title={`${expYears.replace("+", "")} years of experience`}
              >
                {expYears}
              </span>
            ) : null}
          </div>
        </div>

        {/* Summary (empty row keeps alignment when missing) */}
        <div className="mt-4 min-h-[3.75rem]">
          {profile.cardSummary ? (
            <p className="line-clamp-3 text-sm text-gray-600 dark:text-zinc-400">
              {profile.cardSummary}
            </p>
          ) : null}
        </div>

        {/* Footer */}
        <div className="mt-auto flex items-center justify-between border-t border-gray-100 pt-4 dark:border-white/8">
          <SocialLinks socials={profile.socials} />
          <span
            className="pointer-events-none relative z-10 inline-flex text-gray-400 transition-all group-hover:translate-x-0.5 group-hover:text-cyan-600 dark:text-zinc-500 dark:group-hover:text-cyan-400"
            aria-hidden="true"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </span>
        </div>
      </article>
    </li>
  );
}

function pageWindow(current: number, pageCount: number): (number | "ellipsis")[] {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, i) => i + 1);
  }
  const pages = new Set<number>();
  pages.add(1);
  pages.add(pageCount);
  for (let p = current - 1; p <= current + 1; p++) {
    if (p >= 1 && p <= pageCount) {
      pages.add(p);
    }
  }
  const sorted = [...pages].sort((a, b) => a - b);
  const out: (number | "ellipsis")[] = [];
  let prev = 0;
  for (const n of sorted) {
    if (prev > 0 && n - prev > 1) {
      out.push("ellipsis");
    }
    out.push(n);
    prev = n;
  }
  return out;
}

function Pagination({
  page,
  pageCount,
  onPage,
}: {
  page: number;
  pageCount: number;
  onPage: (n: number) => void;
}) {
  if (pageCount <= 1) {
    return null;
  }
  const items = pageWindow(page, pageCount);
  return (
    <nav aria-label="Pagination" className="mt-10 flex flex-wrap items-center justify-center gap-2">
      <button
        type="button"
        className="px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-200 dark:border-white/15 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500"
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
      >
        Prev
      </button>
      {items.map((item, i) =>
        item === "ellipsis" ? (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: ellipsis positions are stable in the window
            key={`e-${i}`}
            className="px-1 text-gray-400 dark:text-zinc-500"
            aria-hidden="true"
          >
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            aria-current={item === page ? "page" : undefined}
            className={`min-w-9 px-3 py-1.5 rounded-lg text-sm font-medium border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500 ${
              item === page
                ? "border-cyan-500 bg-cyan-500/15 text-cyan-800 dark:text-cyan-200"
                : "border-gray-200 dark:border-white/15 hover:bg-gray-50 dark:hover:bg-white/5"
            }`}
            onClick={() => onPage(item)}
          >
            {item}
          </button>
        )
      )}
      <button
        type="button"
        className="px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-200 dark:border-white/15 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500"
        disabled={page >= pageCount}
        onClick={() => onPage(page + 1)}
      >
        Next
      </button>
    </nav>
  );
}

export function HomePage() {
  const profiles = getListedProfiles();
  const bySlug = useMemo(() => new Map(profiles.map((p) => [p.slug, p])), [profiles]);
  const entries = useMemo(() => profiles.map(toEntry), [profiles]);

  const [searchParams, setSearchParams] = useSearchParams();
  const params = useMemo(() => parseParams(searchParams), [searchParams]);
  const deferredQ = useDeferredValue(params.q);
  const searchId = useId();
  const resultsHeadingRef = useRef<HTMLHeadingElement>(null);
  const listTopRef = useRef<HTMLDivElement>(null);

  const typeCounts = useMemo(() => {
    const team = entries.filter((e) => e.affiliation === "team").length;
    const guest = entries.filter((e) => e.affiliation === "guest").length;
    return { all: entries.length, team, guest };
  }, [entries]);

  const filtered = useMemo(() => {
    const typed = filterByType(entries, params.type);
    const matched = typed.filter((e) => matches(e, deferredQ));
    return sortByDisplayName(matched);
  }, [entries, params.type, deferredQ]);

  const { items, page, pageCount } = useMemo(
    () => paginate(filtered, params.page, DIRECTORY_PAGE_SIZE),
    [filtered, params.page]
  );

  useEffect(() => {
    if (params.page !== page) {
      setSearchParams(toParams({ ...params, page }), { replace: true });
    }
  }, [page, params, setSearchParams]);

  const pageProfiles = items
    .map((e) => bySlug.get(e.slug))
    .filter((p): p is ProfileConfig => Boolean(p));

  const hasActiveFilters = Boolean(params.q.trim()) || params.type !== "all";
  const countLabel = hasActiveFilters
    ? `${filtered.length} of ${entries.length} match`
    : `${entries.length} ${entries.length === 1 ? "person" : "people"}`;

  function setQuery(next: string) {
    setSearchParams(toParams({ q: next, type: params.type, page: 1 }), { replace: true });
  }

  function setType(type: DirectoryTypeFilter) {
    setSearchParams(toParams({ q: params.q, type, page: 1 }), { replace: true });
  }

  function goPage(n: number) {
    setSearchParams(toParams({ q: params.q, type: params.type, page: n }), { replace: false });
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    listTopRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    window.requestAnimationFrame(() => {
      resultsHeadingRef.current?.focus();
    });
  }

  function clearFilters() {
    setSearchParams(toParams({ q: "", type: "all", page: 1 }), { replace: true });
  }

  function onSearchSubmit(event: FormEvent) {
    event.preventDefault();
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0f] text-gray-900 dark:text-white transition-colors">
      <ThemeToggle />

      <div className="max-w-4xl mx-auto px-4 py-16 sm:py-24">
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Phazeo Portfolios
          </h1>
          <p className="text-lg text-gray-600 dark:text-zinc-400 max-w-2xl mx-auto">
            Professional portfolios showcasing talented individuals and their work.
          </p>
        </div>

        <div ref={listTopRef} className="scroll-mt-8 space-y-6 mb-8">
          <form onSubmit={onSearchSubmit} className="flex flex-col sm:flex-row gap-3 sm:items-end">
            <div className="flex-1 min-w-0">
              <label
                htmlFor={searchId}
                className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1.5"
              >
                Search name, role or skill
              </label>
              <div className="relative">
                <input
                  id={searchId}
                  type="search"
                  value={params.q}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 dark:border-white/15 bg-white dark:bg-white/5 px-4 py-2.5 pr-10 text-gray-900 dark:text-white placeholder:text-gray-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500"
                  placeholder="Search name, role or skill"
                  autoComplete="off"
                />
                {params.q ? (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-gray-500 hover:text-gray-800 dark:hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500"
                    aria-label="Clear search"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                ) : null}
              </div>
            </div>
          </form>

          <fieldset className="m-0 min-w-0 border-0 p-0">
            <legend className="sr-only">Filter by type</legend>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["all", "All", typeCounts.all],
                  ["team", "Team", typeCounts.team],
                  ["guest", "Guest", typeCounts.guest],
                ] as const
              ).map(([value, label, count]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={params.type === value}
                  onClick={() => setType(value)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500 ${
                    params.type === value
                      ? "border-cyan-500 bg-cyan-500/15 text-cyan-800 dark:text-cyan-200"
                      : "border-gray-200 dark:border-white/15 text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-white/5"
                  }`}
                >
                  {label}
                  <span className="ml-1.5 text-gray-500 dark:text-zinc-400 tabular-nums">
                    {count}
                  </span>
                </button>
              ))}
            </div>
          </fieldset>

          <div className="text-sm text-gray-500 dark:text-zinc-500" aria-live="polite">
            {countLabel}
          </div>
        </div>

        <h2
          ref={resultsHeadingRef}
          tabIndex={-1}
          className="sr-only focus:not-sr-only focus:outline-none focus:mb-4 focus:text-lg focus:font-semibold"
        >
          Directory results
        </h2>

        {pageProfiles.length > 0 ? (
          <ul className="grid gap-6 sm:grid-cols-2 [@supports(grid-template-rows:subgrid)]:grid-flow-dense">
            {pageProfiles.map((profile) => (
              <ProfileCard key={profile.slug} profile={profile} />
            ))}
          </ul>
        ) : (
          <div className="text-center py-12 space-y-4">
            <p className="text-gray-500 dark:text-zinc-500">
              {entries.length === 0
                ? "No portfolios available yet."
                : "No people match these filters."}
            </p>
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex px-4 py-2 rounded-xl text-sm font-medium bg-cyan-600 text-white hover:bg-cyan-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500"
              >
                Clear filters
              </button>
            ) : null}
          </div>
        )}

        <Pagination page={page} pageCount={pageCount} onPage={goPage} />
      </div>
    </div>
  );
}
