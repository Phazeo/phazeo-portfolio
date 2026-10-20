/**
 * Emulate static-host _headers path matching and header merging.
 * Matching rules join duplicate header names with a comma.
 */

export type HeaderBlock = {
  pattern: string;
  headers: Map<string, string>;
};

/** Parse a _headers file into ordered path blocks. */
export function parseHeadersFile(text: string): HeaderBlock[] {
  const lines = text.split("\n");
  const blocks: HeaderBlock[] = [];
  let current: HeaderBlock | null = null;

  for (const raw of lines) {
    const line = raw.replace(/\r$/, "");
    if (line.trim() === "") {
      continue;
    }
    if (!line.startsWith(" ") && !line.startsWith("\t")) {
      current = { pattern: line.trim(), headers: new Map() };
      blocks.push(current);
      continue;
    }
    if (!current) {
      throw new Error("header line before any path pattern");
    }
    const trimmed = line.trim();
    const colon = trimmed.indexOf(":");
    if (colon < 0) {
      throw new Error(`invalid header line: ${trimmed}`);
    }
    const name = trimmed.slice(0, colon).trim();
    const value = trimmed.slice(colon + 1).trim();
    const prev = current.headers.get(name);
    if (prev != null) {
      current.headers.set(name, `${prev}, ${value}`);
    } else {
      current.headers.set(name, value);
    }
  }
  return blocks;
}

/** True if a static host-style pattern matches a request path. */
export function patternMatches(pattern: string, path: string): boolean {
  if (pattern === "/*" || pattern === "*") {
    return true;
  }
  if (pattern.endsWith("/*")) {
    const prefix = pattern.slice(0, -1); // keep trailing slash: /assets/
    return path === prefix.slice(0, -1) || path.startsWith(prefix);
  }
  if (pattern.endsWith("*")) {
    const prefix = pattern.slice(0, -1);
    return path.startsWith(prefix);
  }
  return path === pattern;
}

/**
 * Merge all matching blocks for a path (document order).
 * Duplicate names are joined with ", " (static host behaviour).
 */
export function mergeHeadersForPath(
  blocks: HeaderBlock[],
  path: string
): Map<string, string> {
  const merged = new Map<string, string>();
  for (const block of blocks) {
    if (!patternMatches(block.pattern, path)) {
      continue;
    }
    for (const [name, value] of block.headers) {
      const prev = merged.get(name);
      if (prev != null) {
        merged.set(name, `${prev}, ${value}`);
      } else {
        merged.set(name, value);
      }
    }
  }
  return merged;
}

export const SECURITY_HEADER_NAMES = [
  "Content-Security-Policy",
  "X-Content-Type-Options",
  "Referrer-Policy",
  "X-Frame-Options",
  "Cross-Origin-Opener-Policy",
  "Permissions-Policy",
  "Strict-Transport-Security",
] as const;

export const ASSETS_CACHE_VALUE = "public, max-age=31536000, immutable";

/** Count how many source blocks contributed a given header name for a path. */
export function headerSourceCount(
  blocks: HeaderBlock[],
  path: string,
  headerName: string
): number {
  let count = 0;
  for (const block of blocks) {
    if (patternMatches(block.pattern, path) && block.headers.has(headerName)) {
      count++;
    }
  }
  return count;
}

export type MergeAssertIssue = string;

/** Assert merged headers for representative paths have no duplicates and correct cache. */
export function assertHeadersMerge(headersText: string): MergeAssertIssue[] {
  const blocks = parseHeadersFile(headersText);
  const issues: MergeAssertIssue[] = [];
  const paths = ["/", "/dinesh-allimuthu", "/assets/example.js", "/index.html"];

  for (const path of paths) {
    const merged = mergeHeadersForPath(blocks, path);
    for (const name of SECURITY_HEADER_NAMES) {
      if (!merged.has(name)) {
        issues.push(`${path}: missing security header ${name}`);
      }
      if (headerSourceCount(blocks, path, name) > 1) {
        issues.push(`${path}: duplicate header name ${name}`);
      }
    }
    const cacheSources = headerSourceCount(blocks, path, "Cache-Control");
    if (cacheSources > 1) {
      issues.push(`${path}: duplicate header name Cache-Control`);
    }
    const cache = merged.get("Cache-Control") ?? "";
    const isAsset = path.startsWith("/assets/");
    if (isAsset) {
      if (!cache.includes("immutable") || !cache.includes("max-age=31536000")) {
        issues.push(`${path}: expected immutable asset Cache-Control`);
      }
    } else if (/immutable/i.test(cache)) {
      issues.push(`${path}: must not use immutable caching`);
    }
  }
  return issues;
}
