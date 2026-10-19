import { type ProfileConfig, profileAssetPath } from "#kit";
import { assertValidSlug } from "../../registry/slug-lists";
import { dataProfileThemes } from "./themes";
import type { DataProfileJson } from "./types";

function socialsFromProfiles(
  profiles: DataProfileJson["basics"]["profiles"]
): ProfileConfig["socials"] | undefined {
  if (!profiles || profiles.length === 0) {
    return undefined;
  }
  const socials: NonNullable<ProfileConfig["socials"]> = {};
  for (const p of profiles) {
    const net = p.network.toLowerCase();
    if (net.includes("linkedin") && !socials.linkedin) {
      socials.linkedin = p.url;
    } else if (net.includes("github") && !socials.github) {
      socials.github = p.url;
    } else if ((net.includes("twitter") || net === "x") && !socials.twitter) {
      socials.twitter = p.url;
    } else if (net.includes("website") && !socials.website) {
      socials.website = p.url;
    }
  }
  return Object.keys(socials).length > 0 ? socials : undefined;
}

export function configFromDataProfile(
  slug: string,
  data: DataProfileJson,
  pathHint: string
): ProfileConfig {
  assertValidSlug(slug, pathHint);
  if (!data?.meta?.owner?.githubId || !data.meta.owner.githubLogin) {
    throw new Error(`registry: ${pathHint} missing meta.owner`);
  }
  if (data.meta.affiliation !== "team" && data.meta.affiliation !== "guest") {
    throw new Error(`registry: ${pathHint} missing meta.affiliation`);
  }
  const theme = dataProfileThemes[data.meta.theme];
  if (!theme) {
    throw new Error(`registry: ${pathHint} unknown meta.theme`);
  }
  const summary = data.basics.summary;
  return {
    slug,
    displayName: data.basics.name,
    role: data.basics.label,
    owner: {
      githubId: data.meta.owner.githubId,
      githubLogin: data.meta.owner.githubLogin,
    },
    affiliation: data.meta.affiliation,
    listed: true,
    cardSummary: summary.length > 160 ? `${summary.slice(0, 157)}...` : summary,
    socials: socialsFromProfiles(data.basics.profiles),
    versions: {
      v1: {
        componentLoader: () =>
          import("./DataProfilePage").then((m) => ({
            default: m.createDataProfilePage(slug, data),
          })),
        theme,
        seo: {
          title: `${data.basics.name} | ${data.basics.label}`,
          description: summary.length > 160 ? `${summary.slice(0, 157)}...` : summary,
          ogImage: data.basics.image ? profileAssetPath(slug, data.basics.image) : undefined,
        },
      },
    },
  };
}
