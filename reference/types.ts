import type { ComponentType } from "react";

/**
 * Theme configuration for a profile version.
 * CSS variables are applied to :root when the profile is active.
 */
export interface ProfileTheme {
  cssVariables: Record<string, string>;
  /** Optional Google Fonts URL to load */
  fontUrl?: string;
}

/**
 * SEO metadata for a profile version.
 */
export interface ProfileSeo {
  title: string;
  description: string;
  /**
   * Path to OG image relative to public folder (e.g., "profiles/sowmipriya/og-image.png").
   * Used for social sharing on LinkedIn, Discord, X (Twitter), Facebook, etc.
   * If not provided, falls back to site-wide og-image.png.
   */
  ogImage?: string;
}

/**
 * A single version of a profile (v1, v2, etc.)
 * Each version exports a React component, theme, and optional SEO.
 */
export interface ProfileVersion {
  /** The React component that renders the full portfolio */
  Component: ComponentType;
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
 * Skill for directory card: Devicon icon or display name.
 * deviconClass is the Devicon class suffix (e.g. "python-plain") - full class becomes "devicon-{deviconClass} colored".
 */
export interface ProfileCardSkill {
  name: string;
  /** Devicon class suffix, e.g. "python-plain", "react-original". Omit for fallback summary only. */
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
export interface ProfileConfig {
  /** URL slug (e.g., "sowmipriya") */
  slug: string;
  /** Display name (e.g., "Sowmipriya Rajendiran") */
  displayName: string;
  /** Professional role/title (e.g., "Data Scientist & ML Engineer") */
  role?: string;
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
   * Optional directory card: skills as Devicon icons (max 5 shown, +N overflow).
   * Skills with deviconClass show as icons; if none, cardSummary is used instead.
   */
  skills?: ProfileCardSkill[];
  /**
   * Optional single line for directory card when skills have no icons (Option C fallback).
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
    "--font-heading": "'Inter', sans-serif",
    "--font-body": "'Inter', sans-serif",
  },
};

/**
 * Parse version ID to extract numeric value.
 * Returns NaN if format is invalid.
 */
function parseVersionNumber(versionId: VersionId): number {
  const match = versionId.match(/^v(\d+)$/);
  if (!match) {
    console.warn(
      `Invalid version format: "${versionId}". Expected "v<number>" (e.g., v1, v2, v10).`
    );
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

  // Sort versions by numeric value (descending) and return highest
  const sorted = versions
    .map((v) => ({ id: v, num: parseVersionNumber(v) }))
    .filter((v) => !Number.isNaN(v.num))
    .sort((a, b) => b.num - a.num);

  const highestVersion = sorted[0];
  if (!highestVersion) {
    // Fallback: if all versions have invalid format, return first one
    console.warn(`No valid version IDs found for profile ${config.slug}. Using first available.`);
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
