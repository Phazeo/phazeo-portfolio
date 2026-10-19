/**
 * Directory list built once at module load (not per render).
 */
import type { ProfileConfig } from "#kit";
import { getListedProfiles } from "../../registry";
import {
  buildDirectoryIndex,
  type DirectoryEntry,
  type DirectoryTypeCounts,
  type IndexedDirectoryEntry,
  typeCountsFor,
} from "./query";

function toEntry(profile: ProfileConfig): DirectoryEntry {
  return {
    slug: profile.slug,
    displayName: profile.displayName,
    role: profile.role,
    affiliation: profile.affiliation,
    skills: profile.skills?.map((s) => s.name),
  };
}

const listedProfiles: ProfileConfig[] = getListedProfiles();

export const DIRECTORY_PROFILES: readonly ProfileConfig[] = listedProfiles;

export const DIRECTORY_BY_SLUG: ReadonlyMap<string, ProfileConfig> = new Map(
  listedProfiles.map((p) => [p.slug, p])
);

export const DIRECTORY_INDEX: readonly IndexedDirectoryEntry[] = buildDirectoryIndex(
  listedProfiles.map(toEntry)
);

export const DIRECTORY_TYPE_COUNTS: DirectoryTypeCounts = typeCountsFor(DIRECTORY_INDEX);
