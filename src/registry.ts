import type { ProfileConfig, ProfileRegistry } from "../types";
import { DEFAULT_THEME, getActiveProfileVersion, getActiveVersion } from "../types";

import { kayalvizhiConfig } from "../profiles/kayalvizhi/meta";
import { sriramConfig } from "../profiles/sriram/meta";
import { testerRobotConfig } from "../profiles/tester-robot/meta";

/**
 * Central registry of all profiles in this repo.
 * To add a new profile:
 * 1. Create folder: profiles/<slug>/
 * 2. Create meta.ts with ProfileConfig
 * 3. Import and add to this registry
 */
export const profileRegistry: ProfileRegistry = {
  kayalvizhi: kayalvizhiConfig,
  sriram: sriramConfig,
  "tester-robot": testerRobotConfig,
};

export function getProfile(slug: string): ProfileConfig | undefined {
  return profileRegistry[slug];
}

export function isValidSlug(slug: string): boolean {
  return slug in profileRegistry;
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

export { DEFAULT_THEME, getActiveVersion, getActiveProfileVersion };
