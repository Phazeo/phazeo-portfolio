import { existsSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  isFullSweep,
  isNarrowScope,
  isPullRequestScope,
  loadScopeFromEnv,
} from "../../../tools/lib/changed-scope.ts";

const ROOT = resolve(fileURLToPath(new URL("../../..", import.meta.url)));

export function listProfileSlugs(): string[] {
  const dir = join(ROOT, "profiles");
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith("_") && !e.name.startsWith("."))
    .map((e) => e.name)
    .sort();
}

/** Profile slugs the site project should visit (plus home and 404 always). */
export function siteProfileSlugs(): string[] {
  const all = listProfileSlugs();
  if (isFullSweep() || !isPullRequestScope()) {
    return all;
  }
  const scope = loadScopeFromEnv(ROOT);
  if (!isNarrowScope(scope)) {
    return all;
  }
  return scope.changedSlugs.filter((slug) => all.includes(slug));
}

export function directoryWidths(): number[] {
  const full = [360, 390, 768, 1024, 1280, 1440, 1920];
  const pr = [390, 1024, 1440];
  if (isFullSweep() || process.env["PW_FULL_WIDTHS"] === "1") {
    return full;
  }
  return pr;
}

export { ROOT };
