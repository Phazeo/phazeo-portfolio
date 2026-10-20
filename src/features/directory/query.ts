/**
 * Pure directory list helpers (no React). Search, filter, sort, paginate, URL params.
 */

export type DirectoryTypeFilter = "all" | "team" | "guest";

export type DirectoryEntry = {
  slug: string;
  displayName: string;
  role?: string;
  affiliation: "team" | "guest";
  /** Skill names used for search. */
  skills?: string[];
};

/** Entry with precomputed normalized search text for fast matching. */
export type IndexedDirectoryEntry = DirectoryEntry & {
  searchText: string;
};

export type DirectoryParams = {
  q: string;
  type: DirectoryTypeFilter;
  page: number;
};

export type PageResult<T> = {
  items: T[];
  page: number;
  pageCount: number;
};

export type DirectoryTypeCounts = {
  all: number;
  team: number;
  guest: number;
};

const PAGE_SIZE = 20;

const collator = new Intl.Collator("en", { sensitivity: "base", numeric: true });

/** NFKD, strip combining marks, lowercase, trim. */
export function normalize(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase()
    .trim();
}

/** Build the normalized haystack for an entry (name, role, skills). */
export function searchTextFor(entry: DirectoryEntry): string {
  const parts = [entry.displayName, entry.role ?? "", ...(entry.skills ?? [])];
  return normalize(parts.join(" "));
}

export function indexEntry(entry: DirectoryEntry): IndexedDirectoryEntry {
  return { ...entry, searchText: searchTextFor(entry) };
}

/**
 * Index entries once: attach searchText and sort with the shared Collator.
 * Filtering later preserves this order.
 */
export function buildDirectoryIndex(entries: readonly DirectoryEntry[]): IndexedDirectoryEntry[] {
  return sortByDisplayName(entries.map(indexEntry));
}

export function typeCountsFor(index: readonly IndexedDirectoryEntry[]): DirectoryTypeCounts {
  let team = 0;
  let guest = 0;
  for (const e of index) {
    if (e.affiliation === "team") {
      team++;
    } else {
      guest++;
    }
  }
  return { all: index.length, team, guest };
}

/** Every whitespace-separated word of q must appear in the precomputed search text. */
export function matches(entry: IndexedDirectoryEntry, q: string): boolean {
  const query = normalize(q);
  if (!query) {
    return true;
  }
  const words = query.split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return true;
  }
  return words.every((w) => entry.searchText.includes(w));
}

/**
 * Filter by type then query. Preserves the input order (callers pass a
 * presorted index so there is no sort per keystroke).
 */
export function filterDirectory(
  index: readonly IndexedDirectoryEntry[],
  type: DirectoryTypeFilter,
  q: string
): IndexedDirectoryEntry[] {
  const typed = filterByType(index, type);
  const query = normalize(q);
  if (!query) {
    return typed;
  }
  return typed.filter((e) => matches(e, q));
}

export function sortByDisplayName<T extends { displayName: string }>(list: readonly T[]): T[] {
  return [...list].sort((a, b) => collator.compare(a.displayName, b.displayName));
}

export function filterByType<T extends { affiliation: "team" | "guest" }>(
  list: readonly T[],
  type: DirectoryTypeFilter
): T[] {
  if (type === "all") {
    return [...list];
  }
  return list.filter((e) => e.affiliation === type);
}

export function paginate<T>(list: readonly T[], page: number, pageSize = PAGE_SIZE): PageResult<T> {
  const pageCount = Math.max(1, Math.ceil(list.length / pageSize) || 1);
  const safePage = list.length === 0 ? 1 : Math.min(Math.max(1, Math.trunc(page) || 1), pageCount);
  const start = (safePage - 1) * pageSize;
  return {
    items: list.slice(start, start + pageSize),
    page: safePage,
    pageCount: list.length === 0 ? 1 : pageCount,
  };
}

export function parseParams(search: URLSearchParams | Record<string, string>): DirectoryParams {
  const get = (key: string): string => {
    if (search instanceof URLSearchParams) {
      return search.get(key) ?? "";
    }
    return search[key] ?? "";
  };

  const rawQ = get("q");
  const q = typeof rawQ === "string" ? rawQ : "";

  const rawType = get("type");
  let type: DirectoryTypeFilter = "all";
  if (rawType === "team" || rawType === "guest" || rawType === "all") {
    type = rawType;
  }

  const rawPage = get("page");
  const parsed = Number.parseInt(rawPage, 10);
  const page = Number.isFinite(parsed) && parsed >= 1 ? parsed : 1;

  return { q, type, page };
}

/**
 * Serialize params; omit defaults (blank q after trim, type=all, page=1).
 * Write q untrimmed so spaces while typing are preserved in the URL.
 */
export function toParams(params: DirectoryParams): URLSearchParams {
  const out = new URLSearchParams();
  if (params.q.trim()) {
    out.set("q", params.q);
  }
  if (params.type !== "all") {
    out.set("type", params.type);
  }
  if (params.page > 1) {
    out.set("page", String(params.page));
  }
  return out;
}

/** Initials from a display name: first code point of up to two whitespace parts. */
export function initialsFromName(displayName: string): string {
  return displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => {
      const cp = Array.from(part)[0];
      return cp ? cp.toUpperCase() : "";
    })
    .join("");
}

export const DIRECTORY_PAGE_SIZE = PAGE_SIZE;
