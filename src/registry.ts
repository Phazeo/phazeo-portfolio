import reservedSlugsText from "../.github/reserved-slugs.txt?raw";
import retiredSlugsText from "../.github/retired-slugs.txt?raw";
import type { ProfileConfig, ProfileRegistry } from "../types";
import { DEFAULT_THEME, getActiveProfileVersion, getActiveVersion } from "../types";

/** At least two hyphen-separated parts; max 40 chars. */
export const SLUG_PATTERN = /^[a-z][a-z0-9]*(-[a-z0-9]+)+$/;
export const SLUG_MAX_LEN = 40;

type MetaModule = {
  default?: ProfileConfig;
  [exportName: string]: ProfileConfig | undefined;
};

/**
 * Auto-discover profiles from profiles/&lt;slug&gt;/meta.ts (skip folders starting with "_").
 * Build fails if folder name does not equal meta.slug, slug is invalid, or a slug is duplicated.
 */
const metaModules = import.meta.glob("../profiles/*/meta.ts", { eager: true }) as Record<
  string,
  MetaModule
>;

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

function folderNameFromGlobPath(path: string): string {
  const match = path.match(/\/profiles\/([^/]+)\/meta\.ts$/);
  if (!match?.[1]) {
    throw new Error(`registry: cannot parse profile folder from path: ${path}`);
  }
  return match[1];
}

function resolveConfig(mod: MetaModule, folder: string): ProfileConfig {
  if (mod.default && typeof mod.default === "object" && "slug" in mod.default) {
    return mod.default;
  }
  for (const value of Object.values(mod)) {
    if (value && typeof value === "object" && "slug" in value && "versions" in value) {
      return value;
    }
  }
  throw new Error(`registry: profiles/${folder}/meta.ts must export a ProfileConfig`);
}

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

function buildRegistry(): ProfileRegistry {
  const registry: ProfileRegistry = {};
  const seenSlugs = new Map<string, string>();

  for (const [path, mod] of Object.entries(metaModules)) {
    const folder = folderNameFromGlobPath(path);
    if (folder.startsWith("_")) {
      continue;
    }
    const config = resolveConfig(mod, folder);
    if (folder !== config.slug) {
      throw new Error(
        `registry: folder "${folder}" must equal meta.slug "${config.slug}" (${path})`
      );
    }
    assertValidSlug(config.slug, path);
    if (!config.owner?.githubId || !config.owner?.githubLogin) {
      throw new Error(`registry: profiles/${folder}/meta.ts missing owner`);
    }
    if (config.affiliation !== "team" && config.affiliation !== "guest") {
      throw new Error(`registry: profiles/${folder}/meta.ts missing affiliation`);
    }
    const prior = seenSlugs.get(config.slug);
    if (prior) {
      throw new Error(`registry: duplicate slug "${config.slug}" in ${prior} and ${path}`);
    }
    seenSlugs.set(config.slug, path);
    registry[config.slug] = config;
  }

  return registry;
}

export const profileRegistry: ProfileRegistry = buildRegistry();

export function getProfile(slug: string): ProfileConfig | undefined {
  return profileRegistry[slug];
}

export function isValidSlug(slug: string): boolean {
  return Object.hasOwn(profileRegistry, slug);
}

export function getAllSlugs(): string[] {
  return Object.keys(profileRegistry);
}

export function getAllProfiles(): ProfileConfig[] {
  return Object.values(profileRegistry);
}

export function getListedProfiles(): ProfileConfig[] {
  return Object.values(profileRegistry).filter((profile) => profile.listed !== false);
}

export function getExperienceYearsDisplay(profile: ProfileConfig): string | undefined {
  if (profile.workPeriods && profile.workPeriods.length > 0) {
    const now = new Date();
    let totalMonths = 0;
    for (const p of profile.workPeriods) {
      const [sy, sm] = p.start.split("-").map(Number);
      const end = p.end ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const [ey, em] = end.split("-").map(Number);
      const startY = sy ?? 0;
      const startM = sm ?? 1;
      const endY = ey ?? now.getFullYear();
      const endM = em ?? now.getMonth() + 1;
      totalMonths += (endY - startY) * 12 + (endM - startM) + 1;
    }
    const years = Math.max(0, Math.floor(totalMonths / 12));
    return `${years}+`;
  }
  if (profile.experienceStartYear != null) {
    const years = Math.max(0, new Date().getFullYear() - profile.experienceStartYear);
    return `${years}+`;
  }
  if (profile.experienceYears != null && profile.experienceYears >= 0) {
    return `${profile.experienceYears}+`;
  }
  return undefined;
}

export { DEFAULT_THEME, getActiveProfileVersion, getActiveVersion };
