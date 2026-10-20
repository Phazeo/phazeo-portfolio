import type { ProfileConfig, ProfileRegistry } from "#kit";
import { addDataProfiles } from "./data-profiles";
import type { GuestCspInjector } from "./guest-csp-example";
import { loadReactProfiles } from "./react-profiles";

export { SLUG_MAX_LEN, SLUG_PATTERN } from "./slug";
export { assertValidSlug } from "./slug-lists";

type DirectoryDemoInjector = {
  injectDirectoryDemo: (registry: ProfileRegistry) => void;
};

/** Test-only module, omitted from production via dead-code elimination. */
const guestCspModules =
  import.meta.env.VITE_GUEST_CSP_EXAMPLE === "1"
    ? (import.meta.glob("./guest-csp-example.ts", { eager: true }) as Record<
        string,
        GuestCspInjector
      >)
    : {};

/** Local directory paging demo. Dev + flag only; never in production builds. */
const directoryDemoModules =
  import.meta.env.DEV && import.meta.env.VITE_DIRECTORY_DEMO === "45"
    ? (import.meta.glob("../features/directory/directory-demo.tsx", {
        eager: true,
      }) as Record<string, DirectoryDemoInjector>)
    : {};

function buildRegistry(): ProfileRegistry {
  const { registry, sources } = loadReactProfiles();
  addDataProfiles(registry, sources);

  for (const mod of Object.values(guestCspModules)) {
    mod.injectGuestCspExample(registry, sources);
  }

  for (const mod of Object.values(directoryDemoModules)) {
    mod.injectDirectoryDemo(registry);
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
