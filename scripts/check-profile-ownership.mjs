#!/usr/bin/env node
/**
 * CI entry: verify PR author may change the listed paths.
 * Env: PR_AUTHOR_ID, PR_AUTHOR_LOGIN, CHANGED_FILES (newline-separated).
 * Env: BASE_SHA - required when GITHUB_ACTIONS=true; base owners are authoritative.
 * Never prints PII beyond GitHub login/id already in the event.
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { execFileSync as defaultExecFileSync } from "node:child_process";
import {
  decideProfileOwnership,
  parseApprovedOwners,
  parseOwnerFromMetaTs,
  parseOwnerFromProfileJson,
} from "./profile-ownership.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Fail closed in CI when BASE_SHA is missing.
 * @param {{ githubActions?: string, baseSha?: string }} opts
 */
export function assertBaseShaInCi(opts) {
  const inCi = opts.githubActions === "true";
  const baseSha = (opts.baseSha || "").trim();
  if (inCi && !baseSha) {
    throw new Error(
      "check-profile-ownership: BASE_SHA is required when GITHUB_ACTIONS=true (fail closed)"
    );
  }
}

/**
 * @param {string} profilesDir
 * @returns {Record<string, { githubId: number, githubLogin: string }>}
 */
export function loadOwnersFromDir(profilesDir) {
  /** @type {Record<string, { githubId: number, githubLogin: string }>} */
  const map = {};
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
 * @param {string} sha
 * @param {{ root?: string, execFileSync?: typeof defaultExecFileSync }} [opts]
 * @returns {Record<string, { githubId: number, githubLogin: string }>}
 */
export function loadOwnersFromGit(sha, opts = {}) {
  const root = opts.root ?? ROOT;
  const exec = opts.execFileSync ?? defaultExecFileSync;
  /** @type {Record<string, { githubId: number, githubLogin: string }>} */
  const map = {};
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
    if (map[slug]) continue;
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
    if (!owner) {
      throw new Error(
        `check-profile-ownership: missing owner in base ${sha}:${t}`
      );
    }
    map[slug] = owner;
  }
  return map;
}

/**
 * @param {{
 *   authorId: number,
 *   authorLogin: string,
 *   changedPaths: string[],
 *   githubActions?: string,
 *   baseSha?: string,
 *   ownersBySlug?: Record<string, { githubId: number, githubLogin: string }>,
 *   baseOwnersBySlug?: Record<string, { githubId: number, githubLogin: string }>,
 *   loadBaseOwners?: (sha: string) => Record<string, { githubId: number, githubLogin: string }>,
 * }} input
 */
export function runOwnershipCheck(input) {
  assertBaseShaInCi({
    githubActions: input.githubActions,
    baseSha: input.baseSha,
  });

  const approved = parseApprovedOwners(
    readFileSync(join(ROOT, ".github", "approved-profile-owners.txt"), "utf8")
  );
  // dinesh-ad + phazeo-ci-bot (verified via API when this file was authored)
  const exceptionIds = new Set([56721895, 334465155]);

  const ownersBySlug =
    input.ownersBySlug ?? loadOwnersFromDir(join(ROOT, "profiles"));

  let baseOwnersBySlug = input.baseOwnersBySlug;
  const baseSha = (input.baseSha || "").trim();
  if (baseSha && baseOwnersBySlug === undefined) {
    const loader = input.loadBaseOwners ?? ((sha) => loadOwnersFromGit(sha));
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

function main() {
  const authorId = Number(process.env.PR_AUTHOR_ID || "");
  const authorLogin = process.env.PR_AUTHOR_LOGIN || "";
  const changed = (process.env.CHANGED_FILES || "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  if (!Number.isInteger(authorId) || !authorLogin) {
    console.error("check-profile-ownership: PR_AUTHOR_ID and PR_AUTHOR_LOGIN required");
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
      githubActions: process.env.GITHUB_ACTIONS,
      baseSha: process.env.BASE_SHA,
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
