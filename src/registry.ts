import type { ProfileConfig, ProfileRegistry } from "../types";
import { DEFAULT_THEME, getActiveProfileVersion, getActiveVersion } from "../types";
import { assertValidSlug, SLUG_MAX_LEN, SLUG_PATTERN } from "./registry-slug";
import { configFromDataProfile } from "./templates/data-profile/toProfileConfig";
import type { DataProfileJson } from "./templates/data-profile/types";

export { assertValidSlug, configFromDataProfile, SLUG_MAX_LEN, SLUG_PATTERN };

type MetaModule = {
  default?: ProfileConfig;
  [exportName: string]: ProfileConfig | undefined;
};

/**
 * Auto-discover React profiles from profiles/<slug>/meta.ts (skip folders starting with "_").
 */
const metaModules = import.meta.glob("../profiles/*/meta.ts", { eager: true }) as Record<
  string,
  MetaModule
>;

/**
 * Auto-discover data-first profiles from profiles/<slug>/profile.json.
 */
const jsonModules = import.meta.glob("../profiles/*/profile.json", {
  eager: true,
  import: "default",
}) as Record<string, DataProfileJson>;

type GuestCspInjector = {
  injectGuestCspExample: (registry: ProfileRegistry, seenSlugs: Map<string, string>) => void;
};

/** Test-only module - omitted from production via dead-code elimination. */
const guestCspModules =
  import.meta.env.VITE_GUEST_CSP_EXAMPLE === "1"
    ? (import.meta.glob("./registry-guest-csp.ts", { eager: true }) as Record<
        string,
        GuestCspInjector
      >)
    : {};

function folderNameFromGlobPath(path: string, fileName: string): string {
  const re = new RegExp(`/profiles/([^/]+)/${fileName.replace(".", "\\.")}$`);
  const match = path.match(re);
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

function buildRegistry(): ProfileRegistry {
  const registry: ProfileRegistry = {};
  const seenSlugs = new Map<string, string>();
  const reactFolders = new Set<string>();

  for (const [path, mod] of Object.entries(metaModules)) {
    const folder = folderNameFromGlobPath(path, "meta.ts");
    if (folder.startsWith("_")) {
      continue;
    }
    reactFolders.add(folder);
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

  for (const [path, data] of Object.entries(jsonModules)) {
    const folder = folderNameFromGlobPath(path, "profile.json");
    if (folder.startsWith("_")) {
      continue;
    }
    if (reactFolders.has(folder)) {
      throw new Error(
        `registry: profiles/${folder}/ has both meta.ts and profile.json - use exactly one`
      );
    }
    const config = configFromDataProfile(folder, data, path);
    const prior = seenSlugs.get(config.slug);
    if (prior) {
      throw new Error(`registry: duplicate slug "${config.slug}" in ${prior} and ${path}`);
    }
    seenSlugs.set(config.slug, path);
    registry[config.slug] = config;
  }

  for (const mod of Object.values(guestCspModules)) {
    mod.injectGuestCspExample(registry, seenSlugs);
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
