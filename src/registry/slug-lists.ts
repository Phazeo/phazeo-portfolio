import reservedSlugsText from "../../config/slugs/reserved.txt?raw";
import retiredSlugsText from "../../config/slugs/retired.txt?raw";
import { parseSlugList, type SlugLists, validateSlug } from "./slug";

export const SLUG_LISTS: SlugLists = {
  reserved: parseSlugList(reservedSlugsText),
  retired: parseSlugList(retiredSlugsText),
};

/** Throws on the first problem (app/registry wrapper around the pure validator). */
export function assertValidSlug(slug: string, pathHint = slug): void {
  const [first] = validateSlug(slug, SLUG_LISTS, pathHint);
  if (first) {
    throw new Error(`registry: ${first}`);
  }
}
