#!/usr/bin/env node
/**
 * CI entry: verify PR author may change the listed paths.
 * Env: PR_AUTHOR_ID, PR_AUTHOR_LOGIN, CHANGED_FILES (newline-separated).
 * Env: BASE_SHA - required when GITHUB_ACTIONS=true; base owners are authoritative.
 * Never prints PII beyond GitHub login/id already in the event.
 */
import { execFileSync as defaultExecFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { BaseOwnerEntry, Decision, Owner } from "./profile-ownership.ts";
import {
  decideProfileOwnership,
  parseApprovedOwners,
  parseOwnerFromMetaTs,
  parseOwnerFromProfileJson,
} from "./profile-ownership.ts";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));

export type ExecFileSync = (
  file: string,
  args: string[],
  options: { encoding: "utf8" }
) => string;

export type OwnershipCheckInput = {
  authorId: number;
  authorLogin: string;
  changedPaths: string[];
  githubActions?: string | undefined;
  baseSha?: string | undefined;
  ownersBySlug?: Record<string, Owner> | undefined;
  baseOwnersBySlug?: Record<string, BaseOwnerEntry> | undefined;
  loadBaseOwners?: ((sha: string) => Record<string, BaseOwnerEntry>) | undefined;
};

/**
 * Fail closed when the PR actor cannot be determined from the event payload.
 */
export function assertPrActor(opts: {
  authorId: number;
  authorLogin: string;
}): void {
  if (!Number.isInteger(opts.authorId) || opts.authorId <= 0) {
    throw new Error(
      "check-profile-ownership: PR author id missing or invalid (fail closed)"
    );
  }
  if (!opts.authorLogin.trim()) {
    throw new Error(
      "check-profile-ownership: PR author login missing (fail closed)"
    );
  }
}

/**
 * Fail closed in CI when BASE_SHA is missing.
 */
export function assertBaseShaInCi(opts: {
  githubActions?: string | undefined;
  baseSha?: string | undefined;
}): void {
  const inCi = opts.githubActions === "true";
  const baseSha = (opts.baseSha || "").trim();
  if (inCi && !baseSha) {
    throw new Error(
      "check-profile-ownership: BASE_SHA is required when GITHUB_ACTIONS=true (fail closed)"
    );
  }
}

export function loadOwnersFromDir(profilesDir: string): Record<string, Owner> {
  const map: Record<string, Owner> = {};
  if (!existsSync(profilesDir)) return map;
  for (const ent of readdirSync(profilesDir, { withFileTypes: true })) {
    if (!ent.isDirectory() || ent.name.startsWith("_")) continue;
    const metaPath = join(profilesDir, ent.name, "meta.ts");
    const jsonPath = join(profilesDir, ent.name, "profile.json");
    if (existsSync(metaPath)) {
      const owner = parseOwnerFromMetaTs(readFileSync(metaPath, "utf8"));
      if (!owner) {
        throw new Error(`check-profile-ownership: missing owner in profiles/${ent.name}/meta.ts`);
      }
      map[ent.name] = owner;
      continue;
    }
    if (existsSync(jsonPath)) {
      const owner = parseOwnerFromProfileJson(readFileSync(jsonPath, "utf8"));
      if (!owner) {
        throw new Error(
          `check-profile-ownership: missing owner in profiles/${ent.name}/profile.json`
        );
      }
      map[ent.name] = owner;
    }
  }
  return map;
}

/**
 * Load owners from a git tree. Fail closed: any git error throws (never returns partial).
 */
export function loadOwnersFromGit(
  sha: string,
  opts: { root?: string; execFileSync?: ExecFileSync } = {}
): Record<string, BaseOwnerEntry> {
  const root = opts.root ?? ROOT;
  const exec: ExecFileSync = opts.execFileSync ?? defaultExecFileSync;
  const map: Record<string, BaseOwnerEntry> = {};
  let listing = "";
  try {
    listing = exec("git", ["-C", root, "ls-tree", "-r", "--name-only", sha, "profiles"], {
      encoding: "utf8",
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new Error(
      `check-profile-ownership: failed to list base owners (git ls-tree ${sha}): ${detail}`
    );
  }
  for (const path of listing.split("\n")) {
    const t = path.trim();
    if (!t) continue;
    const metaMatch = t.match(/^profiles\/([^/]+)\/meta\.ts$/);
    const jsonMatch = t.match(/^profiles\/([^/]+)\/profile\.json$/);
    const slug = metaMatch?.[1] ?? jsonMatch?.[1];
    if (!slug || slug.startsWith("_")) continue;
    if (Object.hasOwn(map, slug)) continue;
    let text = "";
    try {
      text = exec("git", ["-C", root, "show", `${sha}:${t}`], { encoding: "utf8" });
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      throw new Error(
        `check-profile-ownership: failed to read base owner file (git show ${sha}:${t}): ${detail}`
      );
    }
    const owner = metaMatch ? parseOwnerFromMetaTs(text) : parseOwnerFromProfileJson(text);
    // null = legacy profile on base with no owner field (maintainer exceptions only).
    map[slug] = owner;
  }
  return map;
}

export function runOwnershipCheck(input: OwnershipCheckInput): Decision {
  assertPrActor({ authorId: input.authorId, authorLogin: input.authorLogin });
  assertBaseShaInCi({
    githubActions: input.githubActions,
    baseSha: input.baseSha,
  });

  const approved = parseApprovedOwners(
    readFileSync(join(ROOT, "config", "owners.txt"), "utf8")
  );
  // dinesh-ad, phazeo[bot] and the retired phazeo-ci-bot (ids as GitHub shows them)
  const exceptionIds = new Set([56721895, 350456534, 334465155]);

  const ownersBySlug =
    input.ownersBySlug ?? loadOwnersFromDir(join(ROOT, "profiles"));

  let baseOwnersBySlug = input.baseOwnersBySlug;
  const baseSha = (input.baseSha || "").trim();
  if (baseSha && baseOwnersBySlug === undefined) {
    const loader = input.loadBaseOwners ?? ((sha: string) => loadOwnersFromGit(sha));
    baseOwnersBySlug = loader(baseSha);
  }

  return decideProfileOwnership({
    authorId: input.authorId,
    authorLogin: input.authorLogin,
    changedPaths: input.changedPaths,
    ownersBySlug,
    baseOwnersBySlug,
    approvedOwners: approved,
    exceptionIds,
  });
}

function main(): void {
  const authorId = Number(process.env["PR_AUTHOR_ID"] || "");
  const authorLogin = process.env["PR_AUTHOR_LOGIN"] || "";
  const changed = (process.env["CHANGED_FILES"] || "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  try {
    assertPrActor({ authorId, authorLogin });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(message);
    process.exit(2);
  }
  if (changed.length === 0) {
    console.log("check-profile-ownership: no changed files; OK");
    return;
  }

  try {
    const result = runOwnershipCheck({
      authorId,
      authorLogin,
      changedPaths: changed,
      githubActions: process.env["GITHUB_ACTIONS"],
      baseSha: process.env["BASE_SHA"],
    });
    if (!result.ok) {
      console.error(`check-profile-ownership: FAIL (${result.reason})`);
      process.exit(1);
    }
    console.log(`check-profile-ownership: OK (${result.reason})`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(message);
    process.exit(1);
  }
}

const entry = process.argv[1] ? pathToFileURL(process.argv[1]).href : "";
if (entry && import.meta.url === entry) {
  main();
}
