import type { ProfileConfig, ProfileRegistry } from "#kit";
import { assertValidSlug } from "./slug-lists";

type MetaModule = {
  default?: ProfileConfig;
  [exportName: string]: ProfileConfig | undefined;
};

/** Auto-discover React profiles from profiles/<slug>/meta.ts. */
const metaModules = import.meta.glob("../../profiles/*/meta.ts", { eager: true }) as Record<
  string,
  MetaModule
>;

function folderFromPath(path: string): string {
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

export type ReactProfiles = {
  registry: ProfileRegistry;
  /** slug -> source path, for duplicate detection. */
  sources: Map<string, string>;
};

export function loadReactProfiles(): ReactProfiles {
  const registry: ProfileRegistry = {};
  const sources = new Map<string, string>();

  for (const [path, mod] of Object.entries(metaModules)) {
    const folder = folderFromPath(path);
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
    const prior = sources.get(config.slug);
    if (prior) {
      throw new Error(`registry: duplicate slug "${config.slug}" in ${prior} and ${path}`);
    }
    sources.set(config.slug, path);
    registry[config.slug] = config;
  }

  return { registry, sources };
}
