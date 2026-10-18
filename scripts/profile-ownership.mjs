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
 *   baseOwnersBySlug?: Record<string, Owner>,
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
    baseOwnersBySlug,
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
      // Prefer base-branch owner for existing slugs so stealing meta.owner fails closed.
      const baseOwner = baseOwnersBySlug?.[slug];
      const headOwner = ownersBySlug[slug];
      const owner = baseOwner ?? headOwner;
      if (!owner) {
        return { ok: false, reason: "unknown-profile-slug" };
      }
      if (owner.githubId !== authorId) {
        return { ok: false, reason: "not-profile-owner" };
      }
      // New data profile: head meta.owner must match the PR author.
      if (!baseOwner && headOwner && headOwner.githubId !== authorId) {
        return { ok: false, reason: "not-profile-owner" };
      }
      continue;
    }

    // Non-profile paths: only exception authors (handled above) may change them.
    if (
      norm.startsWith("profiles/") ||
      norm.startsWith("public/profiles/")
    ) {
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

/**
 * Parse owner from meta.ts source text.
 * @param {string} text
 * @returns {Owner | null}
 */
export function parseOwnerFromMetaTs(text) {
  const idMatch = text.match(/githubId:\s*(\d+)/);
  const loginMatch = text.match(/githubLogin:\s*"([^"]+)"/);
  if (!idMatch || !loginMatch) return null;
  return { githubId: Number(idMatch[1]), githubLogin: loginMatch[1] };
}

/**
 * Parse owner from profile.json source text.
 * @param {string} text
 * @returns {Owner | null}
 */
export function parseOwnerFromProfileJson(text) {
  try {
    const data = JSON.parse(text);
    const id = data?.meta?.owner?.githubId;
    const login = data?.meta?.owner?.githubLogin;
    if (!Number.isInteger(id) || typeof login !== "string" || !login) return null;
    return { githubId: id, githubLogin: login };
  } catch {
    return null;
  }
}
