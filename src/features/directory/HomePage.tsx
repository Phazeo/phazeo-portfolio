import {
  type ComponentType,
  type FormEvent,
  useCallback,
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
import "./directory.css";
import { DIRECTORY_BY_SLUG, DIRECTORY_INDEX, DIRECTORY_TYPE_COUNTS } from "./directory-data";
import { getExperienceYearsDisplay } from "./experience";
import {
  DIRECTORY_PAGE_SIZE,
  type DirectoryTypeFilter,
  filterDirectory,
  initialsFromName,
  paginate,
  parseParams,
  toParams,
} from "./query";

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
          className="relative z-10 inline-flex min-h-6 min-w-6 items-center justify-center rounded-md p-1.5 text-[color:var(--dir-text-muted)] transition-colors duration-150 hover:text-[color:var(--dir-text-name)] focus-visible:text-[color:var(--dir-text-name)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--dir-focus-ring)]"
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
  const initials = initialsFromName(profile.displayName);
  const gradient = profile.avatarGradient ?? "from-violet-500 to-fuchsia-500";
  const expYears = getExperienceYearsDisplay(profile);
  const role = profile.role ?? "Professional Portfolio";

  return (
    <li className={`group relative mb-6 h-full ${subgridLi}`}>
      <article data-dir-card className={`directory-card p-[1.35rem] ${subgridArticle}`}>
        <div className="directory-card__spot" aria-hidden="true" />
        <div className="directory-card__sheen" aria-hidden="true" />
        <div className="directory-card__specular" aria-hidden="true" />
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3.5">
            <div className="directory-avatar">
              <div
                className={`directory-avatar__glow bg-linear-to-br ${gradient}`}
                aria-hidden="true"
              />
              <div className="directory-avatar__face">
                <span className="directory-avatar__sheen" aria-hidden="true" />
                <span className="relative z-10">{initials}</span>
              </div>
            </div>
            <div className="min-w-0">
              <h3 className="directory-card-name line-clamp-2 break-words">
                <Link
                  to={`/${profile.slug}`}
                  title={profile.displayName}
                  className="text-inherit no-underline after:absolute after:inset-0 after:z-0 after:rounded-[24px] after:content-[''] focus-visible:outline-none"
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

        <div className="mt-2 min-h-[1.5rem] min-w-0">
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

        <div className="mt-3 min-h-[3.6rem]">
          {profile.cardSummary ? (
            <p className="directory-card-summary line-clamp-3">{profile.cardSummary}</p>
          ) : null}
        </div>

        <div className="directory-card-footer">
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

const URL_Q_DEBOUNCE_MS = 300;

export function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const params = useMemo(() => parseParams(searchParams), [searchParams]);
  const [qDraft, setQDraft] = useState(params.q);
  const deferredQ = useDeferredValue(qDraft);
  const searchId = useId();
  const resultsLineRef = useRef<HTMLParagraphElement>(null);
  const listTopRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const lastWrittenQRef = useRef(params.q);
  const qDraftRef = useRef(qDraft);
  const urlWriteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const paramsTypeRef = useRef(params.type);
  paramsTypeRef.current = params.type;

  const clearUrlWriteTimer = useCallback(() => {
    if (urlWriteTimerRef.current != null) {
      clearTimeout(urlWriteTimerRef.current);
      urlWriteTimerRef.current = null;
    }
  }, []);

  const writeQToUrl = useCallback(
    (q: string, opts: { type?: DirectoryTypeFilter; page?: number; replace?: boolean } = {}) => {
      lastWrittenQRef.current = q;
      setSearchParams(
        toParams({
          q,
          type: opts.type ?? paramsTypeRef.current,
          page: opts.page ?? 1,
        }),
        { replace: opts.replace ?? true }
      );
    },
    [setSearchParams]
  );

  const flushQToUrl = useCallback(
    (opts: { type?: DirectoryTypeFilter; page?: number; replace?: boolean } = {}) => {
      clearUrlWriteTimer();
      writeQToUrl(qDraftRef.current, opts);
    },
    [clearUrlWriteTimer, writeQToUrl]
  );

  const scheduleQToUrl = useCallback(
    (q: string) => {
      clearUrlWriteTimer();
      urlWriteTimerRef.current = setTimeout(() => {
        urlWriteTimerRef.current = null;
        if (qDraftRef.current === q) {
          writeQToUrl(q, { page: 1 });
        }
      }, URL_Q_DEBOUNCE_MS);
    },
    [clearUrlWriteTimer, writeQToUrl]
  );

  const listSpotlightRef = useCallback((listEl: HTMLUListElement | null) => {
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
  }, []);

  useEffect(() => {
    qDraftRef.current = qDraft;
  }, [qDraft]);

  useEffect(() => {
    if (params.q !== lastWrittenQRef.current) {
      setQDraft(params.q);
      lastWrittenQRef.current = params.q;
    }
  }, [params.q]);

  useEffect(() => {
    return () => {
      clearUrlWriteTimer();
    };
  }, [clearUrlWriteTimer]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      const editable =
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        target?.isContentEditable === true;

      if (
        event.key === "/" &&
        !editable &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey &&
        !event.isComposing
      ) {
        event.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      if (
        event.key === "Escape" &&
        document.activeElement === searchInputRef.current &&
        searchInputRef.current
      ) {
        clearUrlWriteTimer();
        setQDraft("");
        qDraftRef.current = "";
        writeQToUrl("", { type: paramsTypeRef.current, page: 1 });
        searchInputRef.current.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [clearUrlWriteTimer, writeQToUrl]);

  const typeCounts = DIRECTORY_TYPE_COUNTS;

  const filtered = useMemo(
    () => filterDirectory(DIRECTORY_INDEX, params.type, deferredQ),
    [params.type, deferredQ]
  );

  const qAheadOfUrl = qDraft !== params.q;
  const pageForDisplay = qAheadOfUrl ? 1 : params.page;

  const { items, page, pageCount } = useMemo(
    () => paginate(filtered, pageForDisplay, DIRECTORY_PAGE_SIZE),
    [filtered, pageForDisplay]
  );

  useEffect(() => {
    if (urlWriteTimerRef.current != null) {
      return;
    }
    if (qDraft !== params.q) {
      return;
    }
    if (params.page !== page) {
      setSearchParams(toParams({ q: params.q, type: params.type, page }), { replace: true });
    }
  }, [page, params.page, params.q, params.type, qDraft, setSearchParams]);

  const pageProfiles = items
    .map((e) => DIRECTORY_BY_SLUG.get(e.slug))
    .filter((p): p is ProfileConfig => Boolean(p));

  const hasActiveFilters = Boolean(qDraft.trim()) || params.type !== "all";
  const rangeStart = filtered.length === 0 ? 0 : (page - 1) * DIRECTORY_PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * DIRECTORY_PAGE_SIZE, filtered.length);

  let resultsLabel: string;
  if (hasActiveFilters && pageCount > 1) {
    resultsLabel = `Showing ${rangeStart} to ${rangeEnd} of ${filtered.length} matches`;
  } else if (hasActiveFilters) {
    resultsLabel = `${filtered.length} of ${DIRECTORY_INDEX.length} match`;
  } else if (pageCount > 1 && filtered.length > 0) {
    resultsLabel = `Showing ${rangeStart} to ${rangeEnd} of ${filtered.length}`;
  } else {
    resultsLabel = `${DIRECTORY_INDEX.length} ${DIRECTORY_INDEX.length === 1 ? "person" : "people"}`;
  }

  function setQuery(next: string) {
    setQDraft(next);
    qDraftRef.current = next;
    scheduleQToUrl(next);
  }

  function clearSearchImmediate() {
    clearUrlWriteTimer();
    setQDraft("");
    qDraftRef.current = "";
    writeQToUrl("", { type: paramsTypeRef.current, page: 1 });
    searchInputRef.current?.focus();
  }

  function setType(type: DirectoryTypeFilter) {
    flushQToUrl({ type, page: 1 });
  }

  function goPage(n: number) {
    flushQToUrl({ page: n, replace: false });
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    listTopRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    window.requestAnimationFrame(() => {
      resultsLineRef.current?.focus();
    });
  }

  function clearFilters() {
    clearUrlWriteTimer();
    setQDraft("");
    qDraftRef.current = "";
    writeQToUrl("", { type: "all", page: 1 });
  }

  function onSearchSubmit(event: FormEvent) {
    event.preventDefault();
    flushQToUrl({ page: 1 });
  }

  function onSearchBlur() {
    const pending = urlWriteTimerRef.current != null;
    if (!pending && qDraftRef.current === lastWrittenQRef.current) {
      return;
    }
    flushQToUrl({ page: 1 });
  }

  const typeOptions = [
    ["all", "All", typeCounts.all],
    ["team", "Team", typeCounts.team],
    ["guest", "Guest", typeCounts.guest],
  ] as const;

  return (
    <div className="directory-shell">
      <div className="directory-shell__bg" aria-hidden="true">
        <div className="directory-shell__shape directory-shell__shape--violet" />
        <div className="directory-shell__shape directory-shell__shape--fuchsia" />
        <div className="directory-shell__shape directory-shell__shape--cyan" />
        <div className="directory-shell__shape directory-shell__shape--amber" />
        <div className="directory-shell__grain" />
      </div>
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
                      onBlur={onSearchBlur}
                      className="w-full rounded-[16px] py-2.5 pr-16 pl-10 text-[color:var(--dir-text-name)] placeholder:text-[color:var(--dir-text-placeholder)] outline-none"
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
                        onClick={clearSearchImmediate}
                        className="directory-search-clear absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-[color:var(--dir-text-muted)] hover:opacity-100"
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
            <ul ref={listSpotlightRef} className="grid gap-x-6 gap-y-0 sm:grid-cols-2">
              {pageProfiles.map((profile) => (
                <ProfileCard key={profile.slug} profile={profile} />
              ))}
            </ul>
          ) : (
            <div className="space-y-4 py-12 text-center">
              <p className="text-[color:var(--dir-text-muted)]">
                {DIRECTORY_INDEX.length === 0
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
