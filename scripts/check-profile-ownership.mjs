#!/usr/bin/env node
/**
 * CI entry: verify PR author may change the listed paths.
 * Env: PR_AUTHOR_ID, PR_AUTHOR_LOGIN, CHANGED_FILES (newline-separated).
 * Optional: BASE_SHA — when set, owners on the base ref are authoritative for existing slugs.
 * Never prints PII beyond GitHub login/id already in the event.
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import {
  decideProfileOwnership,
  parseApprovedOwners,
  parseOwnerFromMetaTs,
  parseOwnerFromProfileJson,
} from "./profile-ownership.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * @param {string} profilesDir
 * @returns {Record<string, { githubId: number, githubLogin: string }>}
 */
function loadOwnersFromDir(profilesDir) {
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
        console.error(`check-profile-ownership: missing owner in profiles/${ent.name}/meta.ts`);
        process.exit(1);
      }
      map[ent.name] = owner;
      continue;
    }
    if (existsSync(jsonPath)) {
      const owner = parseOwnerFromProfileJson(readFileSync(jsonPath, "utf8"));
      if (!owner) {
        console.error(`check-profile-ownership: missing owner in profiles/${ent.name}/profile.json`);
        process.exit(1);
      }
      map[ent.name] = owner;
    }
  }
  return map;
}

/**
 * @param {string} sha
 * @returns {Record<string, { githubId: number, githubLogin: string }>}
 */
function loadOwnersFromGit(sha) {
  /** @type {Record<string, { githubId: number, githubLogin: string }>} */
  const map = {};
  let listing = "";
  try {
    listing = execFileSync("git", ["-C", ROOT, "ls-tree", "-r", "--name-only", sha, "profiles"], {
      encoding: "utf8",
    });
  } catch {
    return map;
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
      text = execFileSync("git", ["-C", ROOT, "show", `${sha}:${t}`], { encoding: "utf8" });
    } catch {
      continue;
    }
    const owner = metaMatch ? parseOwnerFromMetaTs(text) : parseOwnerFromProfileJson(text);
    if (owner) map[slug] = owner;
  }
  return map;
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

  const approved = parseApprovedOwners(
    readFileSync(join(ROOT, ".github", "approved-profile-owners.txt"), "utf8")
  );
  // dinesh-ad + phazeo-ci-bot (verified via API when this file was authored)
  const exceptionIds = new Set([56721895, 334465155]);

  const ownersBySlug = loadOwnersFromDir(join(ROOT, "profiles"));
  const baseSha = process.env.BASE_SHA || "";
  const baseOwnersBySlug = baseSha ? loadOwnersFromGit(baseSha) : undefined;

  const result = decideProfileOwnership({
    authorId,
    authorLogin,
    changedPaths: changed,
    ownersBySlug,
    baseOwnersBySlug,
    approvedOwners: approved,
    exceptionIds,
  });

  if (!result.ok) {
    console.error(`check-profile-ownership: FAIL (${result.reason})`);
    process.exit(1);
  }
  console.log(`check-profile-ownership: OK (${result.reason})`);
}

main();
