import {
  type ComponentType,
  type FormEvent,
  useDeferredValue,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link, useSearchParams } from "react-router-dom";
import type { ProfileConfig } from "#kit";
import { useTheme } from "../../app/providers/ThemeProvider";
import { GitHubIcon, LinkedInIcon, WebsiteIcon, XIcon } from "../../components/SocialIcons";
import { getListedProfiles } from "../../registry";
import "./directory.css";
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

function StatusLabel({ status }: { status: "available" | "building" | "away" }) {
  const labels = {
    available: "Available",
    building: "Building",
    away: "Away",
  } as const;
  return (
    <span className="directory-card-status">
      <span className="directory-card-status__dot" data-status={status} aria-hidden="true" />
      {labels[status]}
    </span>
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
          className="relative z-10 inline-flex min-h-6 min-w-6 items-center justify-center rounded-md p-1.5 text-[color:var(--dir-text-muted)] transition-[opacity] duration-150 hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--dir-focus-ring)]"
          style={{ opacity: 0.85 }}
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
      className="directory-glass-btn fixed top-4 right-4 z-50 p-2.5 text-[color:var(--dir-text-muted)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--dir-focus-ring)]"
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? (
        <svg
          className="h-5 w-5"
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
          className="h-5 w-5"
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

const subgridLi =
  "[@supports(grid-template-rows:subgrid)]:row-span-4 [@supports(grid-template-rows:subgrid)]:grid [@supports(grid-template-rows:subgrid)]:grid-rows-subgrid [@supports(grid-template-rows:subgrid)]:gap-0";
const subgridArticle =
  "[@supports(grid-template-rows:subgrid)]:row-span-4 [@supports(grid-template-rows:subgrid)]:grid [@supports(grid-template-rows:subgrid)]:grid-rows-subgrid [@supports(grid-template-rows:subgrid)]:gap-0";

function ProfileCard({ profile }: { profile: ProfileConfig }) {
  const initials = profile.displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);
  const gradient = profile.avatarGradient ?? "from-violet-500 to-fuchsia-500";
  const expYears = getExperienceYearsDisplay(profile);
  const role = profile.role ?? "Professional Portfolio";

  return (
    <li className={`group relative mb-6 h-full ${subgridLi}`}>
      <article data-dir-card className={`directory-card p-[1.35rem] ${subgridArticle}`}>
        <div className="directory-card__spot" aria-hidden="true" />
        <div className="relative z-10 flex min-w-0 items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3.5">
            <div className="directory-avatar">
              <div
                className={`directory-avatar__glow bg-linear-to-br ${gradient}`}
                aria-hidden="true"
              />
              <div className="directory-avatar__face">{initials}</div>
            </div>
            <div className="min-w-0">
              <h3 className="directory-card-name line-clamp-2 break-words">
                <Link
                  to={`/${profile.slug}`}
                  title={profile.displayName}
                  className="text-inherit no-underline after:absolute after:inset-0 after:z-0 after:rounded-[20px] after:content-[''] focus-visible:outline-none"
                >
                  <span className="relative z-10">{profile.displayName}</span>
                </Link>
              </h3>
            </div>
          </div>
          {profile.status ? (
            <div className="relative z-10 shrink-0 pt-1">
              <StatusLabel status={profile.status} />
            </div>
          ) : null}
        </div>

        <div className="relative z-10 mt-2 min-h-[1.5rem] min-w-0">
          <p className="directory-card-role flex flex-wrap items-baseline gap-x-1.5">
            <span className="min-w-0">{role}</span>
            {expYears ? (
              <span
                className="directory-card-exp shrink-0"
                title={`${expYears.replace("+", "")} years of experience`}
              >
                <span aria-hidden="true">· </span>
                {expYears} yrs
              </span>
            ) : null}
          </p>
        </div>

        <div className="relative z-10 mt-3 min-h-[3.6rem]">
          {profile.cardSummary ? (
            <p className="directory-card-summary line-clamp-3">{profile.cardSummary}</p>
          ) : null}
        </div>

        <div className="directory-card-footer relative z-10">
          <SocialLinks socials={profile.socials} />
          <span className="directory-card-arrow pointer-events-none" aria-hidden="true">
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
        className="directory-glass-btn px-3 py-1.5 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--dir-focus-ring)]"
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
            className="px-1 text-[color:var(--dir-text-muted)]"
            aria-hidden="true"
          >
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            aria-current={item === page ? "page" : undefined}
            className="directory-glass-btn min-w-9 px-3 py-1.5 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--dir-focus-ring)]"
            onClick={() => onPage(item)}
          >
            {item}
          </button>
        )
      )}
      <button
        type="button"
        className="directory-glass-btn px-3 py-1.5 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--dir-focus-ring)]"
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
  const [qDraft, setQDraft] = useState(params.q);
  const deferredQ = useDeferredValue(qDraft);
  const searchId = useId();
  const resultsLineRef = useRef<HTMLParagraphElement>(null);
  const listTopRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    setQDraft(params.q);
  }, [params.q]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      const editable =
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        target?.isContentEditable === true;

      if (event.key === "/" && !editable) {
        event.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      if (
        event.key === "Escape" &&
        document.activeElement === searchInputRef.current &&
        searchInputRef.current
      ) {
        setQDraft("");
        setSearchParams(toParams({ q: "", type: params.type, page: 1 }), { replace: true });
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [params.type, setSearchParams]);

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
      setSearchParams(toParams({ q: qDraft, type: params.type, page }), { replace: true });
    }
  }, [page, params.page, params.type, qDraft, setSearchParams]);

  const pageProfiles = items
    .map((e) => bySlug.get(e.slug))
    .filter((p): p is ProfileConfig => Boolean(p));

  useEffect(() => {
    const listEl = listRef.current;
    if (!listEl) {
      return;
    }
    let raf = 0;
    let lastCard: HTMLElement | null = null;

    const onPointerMove = (event: PointerEvent) => {
      const card = (event.target as Element | null)?.closest?.(
        "[data-dir-card]"
      ) as HTMLElement | null;
      if (!card || !listEl.contains(card)) {
        return;
      }
      const { clientX, clientY } = event;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const rect = card.getBoundingClientRect();
        card.style.setProperty("--x", `${clientX - rect.left}px`);
        card.style.setProperty("--y", `${clientY - rect.top}px`);
        lastCard = card;
      });
    };

    const onPointerLeave = () => {
      if (lastCard) {
        lastCard.style.removeProperty("--x");
        lastCard.style.removeProperty("--y");
        lastCard = null;
      }
    };

    listEl.addEventListener("pointermove", onPointerMove, { passive: true });
    listEl.addEventListener("pointerleave", onPointerLeave);
    return () => {
      cancelAnimationFrame(raf);
      listEl.removeEventListener("pointermove", onPointerMove);
      listEl.removeEventListener("pointerleave", onPointerLeave);
    };
    // biome-ignore lint/correctness/useExhaustiveDependencies: re-bind when the list remounts after empty results
  }, [pageProfiles.length]);

  const hasActiveFilters = Boolean(qDraft.trim()) || params.type !== "all";
  const rangeStart = filtered.length === 0 ? 0 : (page - 1) * DIRECTORY_PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * DIRECTORY_PAGE_SIZE, filtered.length);

  let resultsLabel: string;
  if (hasActiveFilters) {
    resultsLabel = `${filtered.length} of ${entries.length} match`;
  } else if (pageCount > 1 && filtered.length > 0) {
    resultsLabel = `Showing ${rangeStart} to ${rangeEnd} of ${filtered.length}`;
  } else {
    resultsLabel = `${entries.length} ${entries.length === 1 ? "person" : "people"}`;
  }

  function setQuery(next: string) {
    setQDraft(next);
    setSearchParams(toParams({ q: next, type: params.type, page: 1 }), { replace: true });
  }

  function setType(type: DirectoryTypeFilter) {
    setSearchParams(toParams({ q: qDraft, type, page: 1 }), { replace: true });
  }

  function goPage(n: number) {
    setSearchParams(toParams({ q: qDraft, type: params.type, page: n }), { replace: false });
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    listTopRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    window.requestAnimationFrame(() => {
      resultsLineRef.current?.focus();
    });
  }

  function clearFilters() {
    setQDraft("");
    setSearchParams(toParams({ q: "", type: "all", page: 1 }), { replace: true });
  }

  function onSearchSubmit(event: FormEvent) {
    event.preventDefault();
  }

  const typeOptions = [
    ["all", "All", typeCounts.all],
    ["team", "Team", typeCounts.team],
    ["guest", "Guest", typeCounts.guest],
  ] as const;

  return (
    <div className="directory-shell">
      <div className="directory-shell__bg" aria-hidden="true" />
      <div className="directory-shell__content">
        <ThemeToggle />

        <div className="mx-auto max-w-4xl px-4 py-16 sm:py-24">
          <div className="mb-12 text-center">
            <h1 className="directory-hero-title mb-4 text-4xl font-bold sm:text-5xl">
              Phazeo Portfolios
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-[color:var(--dir-text-muted)]">
              Professional portfolios showcasing talented individuals and their work.
            </p>
          </div>

          <div ref={listTopRef} className="mb-8 scroll-mt-8 space-y-3">
            <search className="block">
              <form
                onSubmit={onSearchSubmit}
                className="flex flex-col gap-3 sm:flex-row sm:items-stretch"
              >
                <div className="min-w-0 flex-1">
                  <label htmlFor={searchId} className="sr-only">
                    Search name, role or skill
                  </label>
                  <div className="directory-toolbar-field relative flex items-center">
                    <span
                      className="pointer-events-none absolute left-3 text-[color:var(--dir-text-muted)]"
                      aria-hidden="true"
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15z"
                        />
                      </svg>
                    </span>
                    <input
                      ref={searchInputRef}
                      id={searchId}
                      type="search"
                      value={qDraft}
                      onChange={(e) => setQuery(e.target.value)}
                      className="w-full rounded-[14px] py-2.5 pr-16 pl-10 text-[color:var(--dir-text-name)] placeholder:text-[color:var(--dir-text-placeholder)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--dir-focus-ring)]"
                      placeholder="Search name, role or skill"
                      autoComplete="off"
                    />
                    {!qDraft ? (
                      <span
                        className="directory-keyhint pointer-events-none absolute right-3 items-center rounded-md border border-[color:var(--dir-card-border)] px-1.5 py-0.5 text-[10px] font-medium text-[color:var(--dir-text-muted)]"
                        aria-hidden="true"
                      >
                        /
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setQuery("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-[color:var(--dir-text-muted)] hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--dir-focus-ring)]"
                        aria-label="Clear search"
                      >
                        <svg
                          className="h-4 w-4"
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
                    )}
                  </div>
                </div>

                <fieldset className="m-0 min-w-0 border-0 p-0">
                  <legend className="sr-only">Filter by type</legend>
                  <div className="directory-segment">
                    {typeOptions.map(([value, label, count]) => (
                      <button
                        key={value}
                        type="button"
                        aria-pressed={params.type === value}
                        disabled={count === 0}
                        onClick={() => setType(value)}
                        className="focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--dir-focus-ring)]"
                      >
                        {label}
                        <span className="ml-1.5 tabular-nums opacity-80">{count}</span>
                      </button>
                    ))}
                  </div>
                </fieldset>
              </form>
            </search>

            <p
              ref={resultsLineRef}
              tabIndex={-1}
              className="directory-results outline-none sm:text-right"
              aria-live="polite"
            >
              {resultsLabel}
            </p>
          </div>

          <h2 className="sr-only">People</h2>

          {pageProfiles.length > 0 ? (
            <ul ref={listRef} className="grid gap-x-6 gap-y-0 sm:grid-cols-2">
              {pageProfiles.map((profile) => (
                <ProfileCard key={profile.slug} profile={profile} />
              ))}
            </ul>
          ) : (
            <div className="space-y-4 py-12 text-center">
              <p className="text-[color:var(--dir-text-muted)]">
                {entries.length === 0
                  ? "No portfolios available yet."
                  : "No people match these filters."}
              </p>
              {hasActiveFilters ? (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="directory-glass-btn inline-flex px-4 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--dir-focus-ring)]"
                >
                  Clear filters
                </button>
              ) : null}
            </div>
          )}

          <Pagination page={page} pageCount={pageCount} onPage={goPage} />
        </div>
      </div>
    </div>
  );
}
