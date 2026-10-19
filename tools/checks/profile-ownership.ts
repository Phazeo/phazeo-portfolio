/**
 * Pure ownership decision for profile PRs (no network).
 * Used by CI and unit tests.
 */

export type Owner = { githubId: number; githubLogin: string };

export type DecisionInput = {
  authorId: number;
  authorLogin: string;
  changedPaths: string[];
  ownersBySlug: Record<string, Owner>;
  baseOwnersBySlug?: Record<string, Owner> | undefined;
  approvedOwners: Map<number, string>;
  exceptionIds: Set<number>;
};

export type Decision = { ok: boolean; reason: string };

export function decideProfileOwnership(input: DecisionInput): Decision {
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
      if (slug === undefined) continue;
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

export function parseApprovedOwners(text: string): Map<number, string> {
  const map = new Map<number, string>();
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const [idStr, login] = t.split(/\s+/);
    const id = Number(idStr);
    if (!Number.isInteger(id) || !login) {
      throw new Error(`approved owners: bad line`);
    }
    map.set(id, login);
  }
  return map;
}

/**
 * Parse owner from meta.ts source text.
 */
export function parseOwnerFromMetaTs(text: string): Owner | null {
  const idMatch = text.match(/githubId:\s*(\d+)/);
  const loginMatch = text.match(/githubLogin:\s*"([^"]+)"/);
  if (!idMatch || !loginMatch) return null;
  const login = loginMatch[1];
  if (login === undefined) return null;
  return { githubId: Number(idMatch[1]), githubLogin: login };
}

/**
 * Parse owner from profile.json source text.
 */
export function parseOwnerFromProfileJson(text: string): Owner | null {
  try {
    const data: unknown = JSON.parse(text);
    const owner = readOwnerField(data);
    if (!owner) return null;
    const { githubId: id, githubLogin: login } = owner;
    if (typeof id !== "number" || !Number.isInteger(id) || typeof login !== "string" || !login) {
      return null;
    }
    return { githubId: id, githubLogin: login };
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readOwnerField(data: unknown): Record<string, unknown> | null {
  if (!isRecord(data)) return null;
  const meta = data["meta"];
  if (!isRecord(meta)) return null;
  const owner = meta["owner"];
  return isRecord(owner) ? owner : null;
}
