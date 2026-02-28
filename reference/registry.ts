import type { ProfileConfig, ProfileRegistry } from "./types";
import { getActiveProfileVersion, getActiveVersion } from "./types";

// Import profile configs
import { dineshConfig } from "./dinesh/meta";
import { kayalvizhiConfig } from "./kayalvizhi/meta";
import { sowmipriyaConfig } from "./sowmipriya/meta";
import { sriramConfig } from "./sriram/meta";
import { yokeshwarConfig } from "./yokeshwar/meta";

/**
 * Central registry of all profiles.
 * To add a new profile:
 * 1. Create folder: packages/profiles/src/<slug>/
 * 2. Create meta.ts with ProfileConfig
 * 3. Import and add to this registry
 */
export const profileRegistry: ProfileRegistry = {
  sowmipriya: sowmipriyaConfig,
  dinesh: dineshConfig,
  yokeshwar: yokeshwarConfig,
  sriram: sriramConfig,
  kayalvizhi: kayalvizhiConfig,
};

/**
 * Get a profile config by slug.
 */
export function getProfile(slug: string): ProfileConfig | undefined {
  return profileRegistry[slug];
}

/**
 * Check if a slug is valid.
 */
export function isValidSlug(slug: string): boolean {
  return slug in profileRegistry;
}

/**
 * Get all available profile slugs.
 */
export function getAllSlugs(): string[] {
  return Object.keys(profileRegistry);
}

/**
 * Get all profiles as array.
 */
export function getAllProfiles(): ProfileConfig[] {
  return Object.values(profileRegistry);
}

/**
 * Get only listed profiles (for public display).
 * Profiles with `listed: false` are excluded.
 * Profiles without `listed` field default to listed (true).
 */
export function getListedProfiles(): ProfileConfig[] {
  return Object.values(profileRegistry).filter((profile) => profile.listed !== false);
}

/**
 * Get experience years display for directory card (e.g., "2+", "3+").
 * Uses workPeriods for accurate calculation (excludes gaps), else experienceStartYear, else experienceYears.
 */
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

// Re-export helpers
export { getActiveVersion, getActiveProfileVersion };
