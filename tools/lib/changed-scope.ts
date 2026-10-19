/**
 * Compute which profiles a PR touches, and whether shared (non-profile) code changed.
 * Fail closed: if the diff cannot be computed, treat everything as changed.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

export type ChangedScope = {
  /** Profile slugs touched under profiles/<slug>/ or public/profiles/<slug>/. */
  changedSlugs: string[];
  /**
   * True when anything outside profile trees changed (src/, config/, package files,
   * vite/index.html, tools/, schemas/, or other non-profile paths).
   */
  sharedChanged: boolean;
  /** True when the git diff could not be computed (fail-closed). */
  failClosed: boolean;
  /** Paths from the diff (empty when fail-closed without a usable list). */
  changedPaths: string[];
};

const SHARED_PREFIXES = [
  "src/",
  "config/",
  "tools/",
  "schemas/",
  "package.json",
  "pnpm-lock.yaml",
  "vite.config.ts",
  "index.html",
  "tsconfig",
  "biome.json",
  ".nvmrc",
] as const;

function isSharedPath(path: string): boolean {
  if (path.startsWith("profiles/") || path.startsWith("public/profiles/")) {
    return false;
  }
  for (const p of SHARED_PREFIXES) {
    if (path === p || path.startsWith(p)) return true;
  }
  // Any other non-profile path (docs, workflows, husky, …) still counts as shared.
  return true;
}

function slugFromPath(path: string): string | null {
  const m = path.match(/^(?:profiles|public\/profiles)\/([^/]+)\//);
  if (!m?.[1]) return null;
  const slug = m[1];
  if (slug.startsWith("_") || slug.startsWith(".")) return null;
  return slug;
}

function listAllSlugs(root: string): string[] {
  const dir = join(root, "profiles");
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith("_") && !e.name.startsWith("."))
    .map((e) => e.name)
    .sort();
}

/**
 * Run `git diff --name-only base...head` (three-dot) in `cwd`.
 * On any failure, returns a fail-closed scope covering every profile + shared.
 */
export function computeChangedScope(
  cwd: string,
  base: string,
  head: string
): ChangedScope {
  const allSlugs = listAllSlugs(cwd);
  try {
    const out = execFileSync("git", ["diff", "--name-only", `${base}...${head}`], {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    const paths = out
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    const slugs = new Set<string>();
    let sharedChanged = false;
    for (const p of paths) {
      const slug = slugFromPath(p);
      if (slug) slugs.add(slug);
      if (isSharedPath(p)) sharedChanged = true;
    }
    return {
      changedSlugs: [...slugs].sort(),
      sharedChanged,
      failClosed: false,
      changedPaths: paths,
    };
  } catch {
    return {
      changedSlugs: allSlugs,
      sharedChanged: true,
      failClosed: true,
      changedPaths: [],
    };
  }
}

/**
 * Resolve base/head from env (CI) or CLI defaults.
 * GITHUB_BASE_REF / GITHUB_SHA for pull_request; otherwise origin/batch tip … HEAD.
 */
export function resolveScopeRevs(env: NodeJS.ProcessEnv = process.env): {
  base: string;
  head: string;
} {
  const baseRef = env["GITHUB_BASE_REF"];
  const headSha = env["GITHUB_SHA"];
  if (baseRef && headSha) {
    return { base: `origin/${baseRef}`, head: headSha };
  }
  const explicitBase = env["SCOPE_BASE"];
  const explicitHead = env["SCOPE_HEAD"];
  if (explicitBase && explicitHead) {
    return { base: explicitBase, head: explicitHead };
  }
  return { base: "origin/batch/merge-private-into-public", head: "HEAD" };
}

export function loadScopeFromEnv(
  cwd: string,
  env: NodeJS.ProcessEnv = process.env
): ChangedScope {
  const { base, head } = resolveScopeRevs(env);
  return computeChangedScope(cwd, base, head);
}

/** True when running in a pull request context (CI event or an explicit SCOPE_BASE). */
export function isPullRequestScope(env: NodeJS.ProcessEnv = process.env): boolean {
  return env["GITHUB_EVENT_NAME"] === "pull_request" || Boolean(env["SCOPE_BASE"]);
}

/** True when the caller asked for a full sweep (SCOPE_FULL=1). */
export function isFullSweep(env: NodeJS.ProcessEnv = process.env): boolean {
  return env["SCOPE_FULL"] === "1";
}

/**
 * True when per-slug work may be limited to `scope.changedSlugs`:
 * a pull request scope, a computed diff, and no full-sweep override.
 */
export function isNarrowScope(
  scope: ChangedScope,
  env: NodeJS.ProcessEnv = process.env
): boolean {
  return isPullRequestScope(env) && !scope.failClosed && !isFullSweep(env);
}
