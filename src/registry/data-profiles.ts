import type { ProfileRegistry } from "#kit";
import { configFromDataProfile } from "../features/data-profile/toProfileConfig";
import type { DataProfileJson } from "../features/data-profile/types";

/** Auto-discover data-first profiles from profiles/<slug>/profile.json. */
const jsonModules = import.meta.glob("../../profiles/*/profile.json", {
  eager: true,
  import: "default",
}) as Record<string, DataProfileJson>;

function folderFromPath(path: string): string {
  const match = path.match(/\/profiles\/([^/]+)\/profile\.json$/);
  if (!match?.[1]) {
    throw new Error(`registry: cannot parse profile folder from path: ${path}`);
  }
  return match[1];
}

/**
 * Add data-first profiles to `registry`. `sources` carries slug -> path from React profiles
 * and is extended here so duplicates across both kinds are caught.
 */
export function addDataProfiles(registry: ProfileRegistry, sources: Map<string, string>): void {
  const reactFolders = new Set(sources.keys());

  for (const [path, data] of Object.entries(jsonModules)) {
    const folder = folderFromPath(path);
    if (folder.startsWith("_")) {
      continue;
    }
    if (reactFolders.has(folder)) {
      throw new Error(
        `registry: profiles/${folder}/ has both meta.ts and profile.json - use exactly one`
      );
    }
    const config = configFromDataProfile(folder, data, path);
    const prior = sources.get(config.slug);
    if (prior) {
      throw new Error(`registry: duplicate slug "${config.slug}" in ${prior} and ${path}`);
    }
    sources.set(config.slug, path);
    registry[config.slug] = config;
  }
}
