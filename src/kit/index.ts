/**
 * Public surface for profile code. Profiles import from "#kit" (or "#kit/fonts/...").
 * Must stay free of imports from src/app, src/features, src/registry, and src/components.
 */
export { profileAssetPath, profileAssetUrl } from "./assets";
export type { EmailTextProps } from "./EmailText";
export { EmailText } from "./EmailText";
export type { ProfileNavItem, ProfileNavigationProps } from "./ProfileNavigation";
export { ProfileNavigation } from "./ProfileNavigation";
export type { EmailParts } from "./split-email";
export { splitEmail } from "./split-email";
export type {
  ProfileAffiliation,
  ProfileCardSkill,
  ProfileCardSocials,
  ProfileComponentLoader,
  ProfileConfig,
  ProfileOwner,
  ProfileRegistry,
  ProfileSeo,
  ProfileTheme,
  ProfileVersion,
  VersionId,
} from "./types";
export { DEFAULT_THEME, getActiveProfileVersion, getActiveVersion } from "./types";
