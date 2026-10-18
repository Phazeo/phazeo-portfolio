import reservedSlugsText from "../.github/reserved-slugs.txt?raw";
import retiredSlugsText from "../.github/retired-slugs.txt?raw";

/** At least two hyphen-separated parts; max 40 chars. */
export const SLUG_PATTERN = /^[a-z][a-z0-9]*(-[a-z0-9]+)+$/;
export const SLUG_MAX_LEN = 40;

function parseSlugList(text: string): Set<string> {
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

const RETIRED_SLUGS = parseSlugList(retiredSlugsText);
const RESERVED_SLUGS = parseSlugList(reservedSlugsText);

export function assertValidSlug(slug: string, pathHint = slug): void {
  if (slug.length > SLUG_MAX_LEN) {
    throw new Error(`registry: slug "${slug}" exceeds ${SLUG_MAX_LEN} characters (${pathHint})`);
  }
  if (RETIRED_SLUGS.has(slug)) {
    throw new Error(`registry: slug "${slug}" is retired (${pathHint})`);
  }
  if (RESERVED_SLUGS.has(slug)) {
    throw new Error(`registry: slug "${slug}" is reserved (${pathHint})`);
  }
  const parts = slug.split("-");
  if (parts.length < 2) {
    throw new Error(
      `registry: slug "${slug}" must have at least two hyphen-separated parts (${pathHint})`
    );
  }
  if (!SLUG_PATTERN.test(slug)) {
    throw new Error(`registry: slug "${slug}" must match ${SLUG_PATTERN} (${pathHint})`);
  }
}
