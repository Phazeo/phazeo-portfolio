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

function haystack(entry: DirectoryEntry): string {
  const parts = [entry.displayName, entry.role ?? "", ...(entry.skills ?? [])];
  return normalize(parts.join(" "));
}

/** Every whitespace-separated word of q must appear in name, role or skills. */
export function matches(entry: DirectoryEntry, q: string): boolean {
  const query = normalize(q);
  if (!query) {
    return true;
  }
  const words = query.split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return true;
  }
  const hay = haystack(entry);
  return words.every((w) => hay.includes(w));
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

/** Serialize params; omit defaults (empty q, type=all, page=1). */
export function toParams(params: DirectoryParams): URLSearchParams {
  const out = new URLSearchParams();
  const q = params.q.trim();
  if (q) {
    out.set("q", q);
  }
  if (params.type !== "all") {
    out.set("type", params.type);
  }
  if (params.page > 1) {
    out.set("page", String(params.page));
  }
  return out;
}

export const DIRECTORY_PAGE_SIZE = PAGE_SIZE;
