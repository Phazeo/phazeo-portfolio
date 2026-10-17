/**
 * Pure ownership decision for profile PRs (no network).
 * Used by CI and unit tests.
 */

/**
 * @typedef {{ githubId: number, githubLogin: string }} Owner
 * @typedef {{
 *   authorId: number,
 *   authorLogin: string,
 *   changedPaths: string[],
 *   ownersBySlug: Record<string, Owner>,
 *   approvedOwners: Map<number, string>,
 *   exceptionIds: Set<number>,
 * }} DecisionInput
 */

/**
 * @param {DecisionInput} input
 * @returns {{ ok: boolean, reason: string }}
 */
export function decideProfileOwnership(input) {
  const {
    authorId,
    changedPaths,
    ownersBySlug,
    approvedOwners,
    exceptionIds,
  } = input;

  if (exceptionIds.has(authorId)) {
    return { ok: true, reason: "exception-author" };
  }

  if (!approvedOwners.has(authorId)) {
    return { ok: false, reason: "author-not-approved" };
  }

  for (const path of changedPaths) {
    const norm = path.replace(/\\/g, "/").replace(/^\.\//, "");
    const profileMatch = norm.match(/^(?:profiles|public\/profiles)\/([^/]+)\//);
    if (profileMatch) {
      const slug = profileMatch[1];
      if (slug.startsWith("_")) {
        return { ok: false, reason: "shared-profile-path" };
      }
      const owner = ownersBySlug[slug];
      if (!owner) {
        return { ok: false, reason: "unknown-profile-slug" };
      }
      if (owner.githubId !== authorId) {
        return { ok: false, reason: "not-profile-owner" };
      }
      continue;
    }

    // Non-profile paths: only exception authors (handled above) may change them.
    if (
      norm.startsWith("profiles/") ||
      norm.startsWith("public/profiles/")
    ) {
      // top-level under profiles without trailing file handled above
      continue;
    }
    return { ok: false, reason: "non-profile-path" };
  }

  return { ok: true, reason: "owner-ok" };
}

/**
 * @param {string} text
 * @returns {Map<number, string>}
 */
export function parseApprovedOwners(text) {
  const map = new Map();
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const [idStr, login] = t.split(/\s+/);
    const id = Number(idStr);
    if (!Number.isInteger(id) || !login) {
      throw new Error(`approved-profile-owners: bad line`);
    }
    map.set(id, login);
  }
  return map;
}
