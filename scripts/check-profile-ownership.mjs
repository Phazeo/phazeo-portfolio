#!/usr/bin/env node
/**
 * CI entry: verify PR author may change the listed paths.
 * Env: PR_AUTHOR_ID, PR_AUTHOR_LOGIN, CHANGED_FILES (newline-separated).
 * Never prints PII beyond GitHub login/id already in the event.
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { decideProfileOwnership, parseApprovedOwners } from "./profile-ownership.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadOwnersBySlug() {
  const profilesDir = join(ROOT, "profiles");
  /** @type {Record<string, { githubId: number, githubLogin: string }>} */
  const map = {};
  for (const ent of readdirSync(profilesDir, { withFileTypes: true })) {
    if (!ent.isDirectory() || ent.name.startsWith("_")) continue;
    const metaPath = join(profilesDir, ent.name, "meta.ts");
    if (!existsSync(metaPath)) continue;
    const text = readFileSync(metaPath, "utf8");
    const idMatch = text.match(/githubId:\s*(\d+)/);
    const loginMatch = text.match(/githubLogin:\s*"([^"]+)"/);
    if (!idMatch || !loginMatch) {
      console.error(`check-profile-ownership: missing owner in profiles/${ent.name}/meta.ts`);
      process.exit(1);
    }
    map[ent.name] = {
      githubId: Number(idMatch[1]),
      githubLogin: loginMatch[1],
    };
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

  const result = decideProfileOwnership({
    authorId,
    authorLogin,
    changedPaths: changed,
    ownersBySlug: loadOwnersBySlug(),
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
