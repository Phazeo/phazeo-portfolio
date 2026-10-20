/**
 * Pure slug rules shared by the app registry and tools/checks.
 * No Vite-only imports here: Node runs this file directly.
 */

/** At least two hyphen-separated parts; max 40 chars. */
export const SLUG_PATTERN = /^[a-z][a-z0-9]*(-[a-z0-9]+)+$/;
export const SLUG_MAX_LEN = 40;

export type SlugLists = {
  reserved: ReadonlySet<string>;
  retired: ReadonlySet<string>;
};

/** Parse a config/slugs/*.txt file body (one slug per line, # comments). */
export function parseSlugList(text: string): Set<string> {
  const set = new Set<string>();
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) {
      continue;
    }
    set.add(t);
  }
  return set;
}

/**
 * Validate a slug. Returns human-readable problems (empty when valid).
 * Callers add their own prefix (for example "registry:" or "check-profiles:").
 */
export function validateSlug(slug: string, lists: SlugLists, pathHint?: string): string[] {
  const where = pathHint ? ` (${pathHint})` : "";
  const errors: string[] = [];
  if (slug.length > SLUG_MAX_LEN) {
    errors.push(`slug "${slug}" exceeds ${SLUG_MAX_LEN} characters${where}`);
  }
  if (lists.retired.has(slug)) {
    errors.push(`slug "${slug}" is retired${where}`);
  }
  if (lists.reserved.has(slug)) {
    errors.push(`slug "${slug}" is reserved${where}`);
  }
  if (slug.split("-").length < 2) {
    errors.push(`slug "${slug}" must have at least two hyphen-separated parts${where}`);
  } else if (!SLUG_PATTERN.test(slug)) {
    errors.push(`slug "${slug}" must match ${SLUG_PATTERN}${where}`);
  }
  return errors;
}
