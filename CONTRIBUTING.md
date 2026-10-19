# Contributing to Phazeo Portfolio Profiles

Profiles are **invite-only**. To get invited, ask the repository owner (do not put contact details in this file). An approved GitHub account owns each slug.

Before you publish personal content, read [PROFILE-TERMS.md](./PROFILE-TERMS.md).

## Guest profile in 5 steps

Guests must be invited by the repository owner first (approved GitHub account). Then:

1. **Fork** this repository
2. **Copy** [`docs/guest-profile.example.json`](./docs/guest-profile.example.json) to `profiles/<your-slug>/profile.json`
3. **Fill it in** - point `$schema` at `../../schemas/profile.schema.json` for editor autocomplete; keep every URL on `https://`
4. **Optionally add** `public/profiles/<your-slug>/photo.jpg` (strip image metadata first) and `public/profiles/<your-slug>/resume.pdf` (no phone numbers - scanners will block the PR)
5. **Open a PR** from your approved account

Use either a React profile (`meta.ts` plus `v1/`) **or** a data-first `profile.json`, never both in the same slug folder.

## Team React profile

1. **Fork** this repository
2. **Create** `profiles/<your-slug>/` with the required files listed below
3. **Ensure** the folder name equals `meta.slug` (the registry discovers `profiles/*/meta.ts`)
4. **Test** with `pnpm install`, `pnpm dev`, and `pnpm quality`
5. **Open a PR**

See `profiles/sriram-sm/` for a complete React example. Architecture notes live in [docs/architecture.md](./docs/architecture.md).

### Required files

| Path | Purpose |
| --- | --- |
| `profiles/<slug>/meta.ts` | Exports the `ProfileConfig` (slug, owner, affiliation, card fields, versions). Default export. |
| `profiles/<slug>/v1/index.tsx` | Exports the `ProfileVersion`: lazy `componentLoader`, `theme`, and optional `seo`. |
| `profiles/<slug>/v1/ProfilePage.tsx` | Default-exported React page for this version. Add more files under `v1/` as needed. |
| `profiles/<slug>/v1/theme.ts` | Exports `theme` (CSS variables) and `seo` (title, description, optional OG image). |

Folders under `profiles/` must not start with an underscore. Shared code lives in `src/kit` and is imported as `#kit`.

### Import rules for profiles

A profile may import only:

- files inside its own `profiles/<slug>/` folder
- `#kit` and `#kit/*` (types, asset helpers, `ProfileNavigation`, font CSS)
- the packages `react`, `react-dom`, `motion`, and `motion/react`

`pnpm check:imports` enforces this (and the boundaries between `src/` areas). Do not import from `src/app`, `src/features`, `src/registry`, `src/components`, `tools`, or `tests`.

### Working example

Replace `jane-doe` and the other placeholder values with your own. The GitHub id must be your numeric account id.

`profiles/jane-doe/meta.ts`

```ts
import type { ProfileConfig } from "#kit";

import { profileVersion as v1 } from "./v1";

export const janeDoeConfig: ProfileConfig = {
  slug: "jane-doe",
  displayName: "Jane Doe",
  role: "Software Engineer",
  owner: { githubId: 1234567, githubLogin: "jane-doe" },
  affiliation: "team",
  listed: true,
  status: "available",
  avatarGradient: "from-indigo-500 to-violet-600",
  skills: [{ name: "TypeScript" }, { name: "React" }],
  cardSummary: "Builds accessible web apps. TypeScript and React.",
  experienceStartYear: 2022,
  socials: {
    linkedin: "https://www.linkedin.com/in/jane-doe",
  },
  versions: {
    v1,
  },
};

export default janeDoeConfig;
```

`profiles/jane-doe/v1/index.tsx`

```tsx
import type { ProfileVersion } from "#kit";
import { seo, theme } from "./theme";

export const profileVersion: ProfileVersion = {
  componentLoader: () => import("./ProfilePage"),
  theme,
  seo,
};

export default profileVersion;
```

`profiles/jane-doe/v1/theme.ts`

```ts
import type { ProfileSeo, ProfileTheme } from "#kit";
import { profileAssetPath } from "#kit";

export const theme: ProfileTheme = {
  cssVariables: {
    "--color-primary": "#2563eb",
    "--color-primary-hover": "#1d4ed8",
    "--color-secondary": "#7c3aed",
    "--color-accent": "#0891b2",
    "--color-background": "#f8fafc",
    "--font-heading": "'Outfit Variable', sans-serif",
    "--font-body": "'Inter Variable', system-ui, sans-serif",
  },
};

export const seo: ProfileSeo = {
  title: "Jane Doe | Software Engineer",
  description: "Jane Doe is a software engineer who builds accessible web apps.",
  // Optional: only if public/profiles/jane-doe/profile-photo.jpg exists.
  ogImage: profileAssetPath("jane-doe", "profile-photo.jpg"),
};
```

`profiles/jane-doe/v1/ProfilePage.tsx`

```tsx
import "#kit/fonts/outfit-latin.css";

import { ProfileNavigation, profileAssetUrl } from "#kit";
import { motion } from "motion/react";

const navItems = [
  { label: "About", href: "#about" },
  { label: "Contact", href: "#contact" },
];

export default function JaneDoeProfilePage() {
  return (
    <div className="min-h-screen">
      <ProfileNavigation brandInitial="J" items={navItems} />
      <motion.section
        id="hero"
        className="mx-auto max-w-3xl px-6 py-16"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <img
          src={profileAssetUrl("jane-doe", "profile-photo.jpg")}
          alt="Jane Doe"
          className="mb-6 h-14 w-14 rounded-full object-cover"
        />
        <h1 className="text-4xl font-bold text-(--color-primary)">Jane Doe</h1>
        <p className="mt-2 text-lg text-gray-700">Software Engineer</p>
      </motion.section>
      <section id="about" className="mx-auto max-w-3xl px-6 py-16">
        <h2 className="text-2xl font-semibold">About</h2>
        <p className="mt-4 text-gray-700">Short bio goes here.</p>
      </section>
      <section id="contact" className="mx-auto max-w-3xl px-6 py-16">
        <h2 className="text-2xl font-semibold">Contact</h2>
        <p className="mt-4 text-gray-700">Find me on GitHub or LinkedIn.</p>
      </section>
    </div>
  );
}
```

If you reference `profile-photo.jpg`, add `public/profiles/jane-doe/profile-photo.jpg` (metadata stripped). `pnpm check:registry` fails when a referenced asset is missing.

### Address (slug)

- Full name as the person writes it, lowercase and hyphenated (for example `jane-doe`). An initial is fine for a later part (for example `jane-d`).
- Must match `^[a-z][a-z0-9]*(-[a-z0-9]+)+$`, max 40 characters, at least two hyphen-separated parts.
- Must not appear in `config/slugs/retired.txt` or `config/slugs/reserved.txt`.
- Must be unique. The repository owner approves the address.

### Assets

- Put resumes and images under `public/profiles/<slug>/`
- Use `profileAssetUrl` / `profileAssetPath` from `#kit`
- Old `/profiles/_public/*` URLs permanently redirect to `/profiles/*` via `public/_redirects`

## What gets blocked and why

This repository is public. Automated checks block:

- **Phone numbers** and **street addresses** in source, text, images, or PDFs
- **Image metadata** (EXIF/XMP) on JPEG/PNG/WebP/GIF
- **Resume PDFs** that contain phone numbers
- **Unreviewed hosts** - every hostname must be listed in `config/policy/allowed-hosts.txt`
- **Long dashes** (em dash or en dash) outside `profiles/` and `public/profiles/`

Credentials, private keys, tool caches, oversized binaries, and similar secrets are also blocked by the leak guard.

## How to fix a blocked PR

1. Read the failing check log (leak guard, public boundary, ownership, or build).
2. Remove or rewrite the blocked content. For images, strip metadata before committing. For hosts, ask for an allowlist review instead of adding internal names.
3. Re-run locally:

```sh
pnpm quality
pnpm guard:tree
```

4. Push again. Do not bypass hooks.

## Commit rules

- **No AI attribution** in author, committer, co-author, or message trailers. Local hooks strip common trailers and refuse leftovers; CI re-checks (`pnpm` / the no-AI commit workflow).
- **No long dashes** in commit messages (or in files outside profile content trees). Use a normal hyphen, a colon, or rewrite.

Human contributor emails are fine. Do not set `git user.email` to an AI tool address.
