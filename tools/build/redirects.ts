/**
 * Single parser and matcher for the static-host `_redirects` subset:
 * `from to [status]` per line, `#` comments, trailing `/*` splat on `from`,
 * and an optional `:splat` token in `to`. Status defaults to 301.
 *
 * Shared by vite.config.ts (dev and preview) and tools/build/serve-dist.ts.
 */
import { existsSync, readFileSync } from "node:fs";

export type RedirectRule = {
  from: string;
  to: string;
  status: number;
  splat: boolean;
};

export type RedirectMatch = {
  location: string;
  status: number;
};

const DEFAULT_STATUS = 301;

export function parseRedirects(text: string): RedirectRule[] {
  const rules: RedirectRule[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const parts = line.split(/\s+/);
    if (parts.length < 2) continue;
    const [from, to, statusStr] = parts;
    if (!from || !to) continue;
    const status = statusStr ? Number(statusStr) : DEFAULT_STATUS;
    if (!Number.isInteger(status)) continue;
    rules.push({ from, to, status, splat: from.endsWith("/*") });
  }
  return rules;
}

/** Read and parse a `_redirects` file. A missing file yields no rules. */
export function loadRedirects(filePath: string): RedirectRule[] {
  if (!existsSync(filePath)) return [];
  return parseRedirects(readFileSync(filePath, "utf8"));
}

/** First matching rule wins. The query string, if any, is ignored. */
export function matchRedirect(path: string, rules: readonly RedirectRule[]): RedirectMatch | null {
  const pathname = path.split("?")[0] || "/";
  for (const rule of rules) {
    if (rule.splat) {
      const prefix = rule.from.slice(0, -1); // keep trailing slash, e.g. /dinesh/
      const base = rule.from.slice(0, -2); // e.g. /dinesh
      if (pathname === base || pathname.startsWith(prefix)) {
        const rest = pathname === base ? "" : pathname.slice(prefix.length);
        const location = rule.to.includes(":splat") ? rule.to.replace(":splat", rest) : rule.to;
        return { location, status: rule.status };
      }
    } else if (pathname === rule.from) {
      return { location: rule.to, status: rule.status };
    }
  }
  return null;
}
