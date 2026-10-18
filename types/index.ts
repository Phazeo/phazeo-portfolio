import type { ComponentType } from "react";

/**
 * Theme configuration for a profile version.
 * CSS variables are applied to :root when the profile is active.
 */
export interface ProfileTheme {
  cssVariables: Record<string, string>;
}

/**
 * SEO metadata for a profile version.
 */
export interface ProfileSeo {
  title: string;
  description: string;
  /**
   * Path to OG image relative to public folder (e.g., "profiles/sowmipriya-rajendiran/og-image.png").
   * Used for social sharing on LinkedIn, Discord, X (Twitter), Facebook, etc.
   * If not provided, falls back to site-wide og-image.png.
   */
  ogImage?: string;
}

/**
 * Lazy loader for a profile component. Used for code splitting so each profile
 * is loaded only when visited (e.g. /sriram loads only Sriram's chunk).
 */
export type ProfileComponentLoader = () => Promise<{ default: ComponentType }>;

/**
 * A single version of a profile (v1, v2, etc.)
 * Each version exports a lazy component loader, theme, and optional SEO.
 * Prefer componentLoader for code splitting; Component is legacy for merged profiles.
 */
export interface ProfileVersion {
  /**
   * Lazy loader for the React component (enables per-profile code splitting).
   * Prefer this over Component for new profiles.
   */
  componentLoader?: ProfileComponentLoader;
  /**
   * Legacy: direct component. Use componentLoader when possible for code splitting.
   */
  Component?: ComponentType;
  /** Theme configuration (CSS variables, fonts) */
  theme: ProfileTheme;
  /** Optional SEO metadata */
  seo?: ProfileSeo;
}

/**
 * Version identifier type for type safety.
 */
export type VersionId = `v${number}`;

/**
 * Optional skill metadata on a profile.
 * Not rendered on directory cards today (cards show cardSummary / socials instead).
 * `deviconClass` is retained for future use; the Devicon stylesheet is not loaded.
 */
export interface ProfileCardSkill {
  name: string;
  /** Legacy Devicon class suffix (unused on cards while no Devicon CSS is loaded). */
  deviconClass?: string;
  colored?: boolean;
}

/**
 * Social links shown on directory card footer.
 */
export interface ProfileCardSocials {
  linkedin?: string;
  github?: string;
  twitter?: string;
  website?: string;
}

/**
 * Profile metadata and version registry.
 */
export interface ProfileOwner {
  /** GitHub numeric user id (authoritative). */
  githubId: number;
  /** GitHub login at the time of recording (may change; id does not). */
  githubLogin: string;
}

export type ProfileAffiliation = "team" | "guest";

export interface ProfileConfig {
  /** URL slug (e.g., "sowmipriya-rajendiran") — full name as written; see CONTRIBUTING. */
  slug: string;
  /** Display name (e.g., "Sowmipriya Rajendiran") */
  displayName: string;
  /** Professional role/title (e.g., "Data Scientist & ML Engineer") */
  role?: string;
  /** GitHub owner who may change this profile (invite-only). */
  owner: ProfileOwner;
  /** Directory grouping on the home page. */
  affiliation: ProfileAffiliation;
  /**
   * Whether this profile appears in public listings.
   * Unlisted profiles (false) are still accessible via direct URL.
   * @default true
   */
  listed?: boolean;
  /** Available versions mapped by version ID */
  versions: Record<VersionId, ProfileVersion>;
  /**
   * Active version to display.
   * If undefined, uses the highest version number.
   */
  activeVersion?: VersionId;
  /**
   * Optional skills metadata. Not shown on directory cards today.
   */
  skills?: ProfileCardSkill[];
  /**
   * Optional summary line shown on the directory card when present.
   */
  cardSummary?: string;
  /** Optional status for directory card. */
  status?: "available" | "building" | "away";
  /** Optional social links for directory card footer. */
  socials?: ProfileCardSocials;
  /** Optional gradient for card avatar (e.g. "from-blue-500 to-purple-600"). Defaults to primary→accent. */
  avatarGradient?: string;
  /**
   * Work periods for accurate experience calculation (excludes gaps like masters).
   * Format: "YYYY-MM". end: null = present.
   * Takes precedence over experienceStartYear and experienceYears.
   */
  workPeriods?: { start: string; end: string | null }[];
  /**
   * Career start year for simple auto-updating (no gaps).
   * Displayed as "N+ years". Used when workPeriods is not set.
   */
  experienceStartYear?: number;
  /**
   * Manual override for years of experience (e.g., 2 → "2+").
   * Used when neither workPeriods nor experienceStartYear is set.
   */
  experienceYears?: number;
}

/**
 * Registry mapping slugs to profile configs.
 */
export type ProfileRegistry = Record<string, ProfileConfig>;

/**
 * Default theme values used when a profile doesn't specify them.
 */
export const DEFAULT_THEME: ProfileTheme = {
  cssVariables: {
    "--color-primary": "#3b82f6",
    "--color-primary-hover": "#2563eb",
    "--color-secondary": "#8b5cf6",
    "--color-accent": "#ec4899",
    "--color-background": "#ffffff",
    "--font-heading": "'Inter Variable', sans-serif",
    "--font-body": "'Inter Variable', sans-serif",
  },
};

/**
 * Parse version ID to extract numeric value.
 * Returns NaN if format is invalid.
 */
function parseVersionNumber(versionId: VersionId): number {
  const match = versionId.match(/^v(\d+)$/);
  if (!match) {
    return Number.NaN;
  }
  const numStr = match[1];
  if (numStr === undefined) {
    return Number.NaN;
  }
  return Number.parseInt(numStr, 10);
}

/**
 * Get the active version for a profile.
 * Uses activeVersion if set, otherwise returns the highest version number.
 *
 * Version comparison uses numeric ordering (v1 < v2 < v10), not string ordering.
 * @throws Error if profile has no versions
 */
export function getActiveVersion(config: ProfileConfig): VersionId {
  if (config.activeVersion && config.versions[config.activeVersion]) {
    return config.activeVersion;
  }

  const versions = Object.keys(config.versions) as VersionId[];
  if (versions.length === 0) {
    throw new Error(`Profile ${config.slug} has no versions`);
  }

  const sorted = versions
    .map((v) => ({ id: v, num: parseVersionNumber(v) }))
    .filter((v) => !Number.isNaN(v.num))
    .sort((a, b) => b.num - a.num);

  const highestVersion = sorted[0];
  if (!highestVersion) {
    const firstVersion = versions[0];
    if (!firstVersion) {
      throw new Error(`Profile ${config.slug} has no versions`);
    }
    return firstVersion;
  }

  return highestVersion.id;
}

/**
 * Get the active ProfileVersion for a profile.
 * @throws Error if version not found (should not happen with valid config)
 */
export function getActiveProfileVersion(config: ProfileConfig): ProfileVersion {
  const versionId = getActiveVersion(config);
  const version = config.versions[versionId];
  if (!version) {
    throw new Error(`Version ${versionId} not found in profile ${config.slug}`);
  }
  return version;
}
