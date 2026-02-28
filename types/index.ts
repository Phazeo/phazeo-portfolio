import type { ComponentType } from "react";

/**
 * Theme configuration for a profile version.
 * CSS variables are applied to :root when the profile is active.
 */
export interface ProfileTheme {
  cssVariables: Record<string, string>;
  fontUrl?: string;
}

/**
 * SEO metadata for a profile version.
 */
export interface ProfileSeo {
  title: string;
  description: string;
  ogImage?: string;
}

/**
 * A single version of a profile (v1, v2, etc.)
 */
export interface ProfileVersion {
  Component: ComponentType;
  theme: ProfileTheme;
  seo?: ProfileSeo;
}

export type VersionId = `v${number}`;

export interface ProfileCardSkill {
  name: string;
  deviconClass?: string;
  colored?: boolean;
}

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
  slug: string;
  displayName: string;
  role?: string;
  listed?: boolean;
  versions: Record<VersionId, ProfileVersion>;
  activeVersion?: VersionId;
  skills?: ProfileCardSkill[];
  cardSummary?: string;
  status?: "available" | "building" | "away";
  socials?: ProfileCardSocials;
  avatarGradient?: string;
  workPeriods?: { start: string; end: string | null }[];
  experienceStartYear?: number;
  experienceYears?: number;
}

export type ProfileRegistry = Record<string, ProfileConfig>;

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

function parseVersionNumber(versionId: VersionId): number {
  const match = versionId.match(/^v(\d+)$/);
  if (!match) {
    return Number.NaN;
  }
  return Number.parseInt(match[1] ?? "0", 10);
}

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
  const fallback = versions[0];
  if (!fallback) {
    throw new Error(`Profile ${config.slug} has no versions`);
  }
  return sorted[0]?.id ?? fallback;
}

export function getActiveProfileVersion(config: ProfileConfig): ProfileVersion {
  const versionId = getActiveVersion(config);
  const version = config.versions[versionId];
  if (!version) {
    throw new Error(`Version ${versionId} not found in profile ${config.slug}`);
  }
  return version;
}
