/**
 * Dev-only synthetic directory entries for paging review.
 * Loaded only when VITE_DIRECTORY_DEMO=45 and import.meta.env.DEV.
 */
import type { ProfileConfig, ProfileRegistry } from "#kit";
import { DEFAULT_THEME } from "#kit";
import { DIRECTORY_DEMO_NAMES } from "./directory-demo-names";

export { DIRECTORY_DEMO_NAMES };

const ROLES = [
  "Software Engineer",
  "Product Designer",
  "Data Analyst",
  "Platform Engineer",
  "Research Scientist",
] as const;

const SKILL_SETS = [
  ["TypeScript", "React"],
  ["Python", "SQL"],
  ["Design systems", "Accessibility"],
  ["Data science", "ML"],
  ["Cloud", "Automation"],
] as const;

function DemoStubPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8 text-center">
      <p className="text-gray-600 dark:text-zinc-400">
        Demo directory entry for local review. Not part of production.
      </p>
    </div>
  );
}

function slugFor(index: number, name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `demo-${base}-${index + 1}`;
}

export function injectDirectoryDemo(registry: ProfileRegistry): void {
  if (!import.meta.env.DEV) {
    return;
  }
  if (import.meta.env.VITE_DIRECTORY_DEMO !== "45") {
    return;
  }
  if (DIRECTORY_DEMO_NAMES.length !== 45) {
    throw new Error(`directory-demo: expected 45 names, got ${DIRECTORY_DEMO_NAMES.length}`);
  }

  DIRECTORY_DEMO_NAMES.forEach((displayName, i) => {
    const slug = slugFor(i, displayName);
    if (registry[slug]) {
      throw new Error(`directory-demo: slug collision ${slug}`);
    }
    const affiliation = i % 3 === 0 ? "guest" : "team";
    const role = ROLES[i % ROLES.length] ?? ROLES[0];
    const skillSet = SKILL_SETS[i % SKILL_SETS.length] ?? SKILL_SETS[0];
    const skills = skillSet.map((name) => ({ name }));
    const config: ProfileConfig = {
      slug,
      displayName,
      role,
      owner: { githubId: 910_000_000 + i, githubLogin: `demo-dir-${i + 1}` },
      affiliation,
      listed: true,
      skills,
      cardSummary:
        i % 2 === 0
          ? "Synthetic demo profile for directory search, filter and paging review."
          : undefined,
      versions: {
        v1: {
          componentLoader: async () => ({ default: DemoStubPage }),
          theme: DEFAULT_THEME,
        },
      },
    };
    registry[slug] = config;
  });
}
