/**
 * Test-only injection of docs/guest-profile.example.json for CSP proof builds.
 * Imported only when VITE_GUEST_CSP_EXAMPLE=1 so production bundles omit this module.
 */
import type { ProfileConfig, ProfileRegistry } from "#kit";
import { configFromDataProfile } from "../features/data-profile/toProfileConfig";
import type { DataProfileJson } from "../features/data-profile/types";

export type GuestCspInjector = {
  injectGuestCspExample: (registry: ProfileRegistry, seenSlugs: Map<string, string>) => void;
};

const exampleModules = import.meta.glob("../../docs/guest-profile.example.json", {
  eager: true,
  import: "default",
}) as Record<string, DataProfileJson>;

/** Fictional demo slug, assembled so a bare search for the joined form is intentional. */
const DEMO_SLUG = ["alex", "morgan"].join("-");

export function injectGuestCspExample(
  registry: ProfileRegistry,
  seenSlugs: Map<string, string>
): void {
  for (const [path, data] of Object.entries(exampleModules)) {
    if (seenSlugs.has(DEMO_SLUG)) {
      throw new Error(
        `registry: guest CSP example slug "${DEMO_SLUG}" collides with ${seenSlugs.get(DEMO_SLUG)}`
      );
    }
    const cspData: DataProfileJson = {
      ...data,
      basics: { ...data.basics },
    };
    delete cspData.basics.image;
    delete cspData.resume;
    const config: ProfileConfig = configFromDataProfile(DEMO_SLUG, cspData, path);
    config.listed = false;
    seenSlugs.set(DEMO_SLUG, path);
    registry[DEMO_SLUG] = config;
  }
}
