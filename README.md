# Phazeo Portfolio Profiles

Public repository for portfolio profiles. External developers can add and edit profiles here without needing access to the private monorepo.

Before publishing personal content, read [PROFILE-TERMS.md](./PROFILE-TERMS.md) and [CONTRIBUTING.md](./CONTRIBUTING.md).

## Quick Start

```bash
pnpm install
pnpm dev
```

Open http://localhost:5173 to preview profiles locally. Profiles use the `componentLoader` pattern for lazy loading—each profile is loaded on demand when visited.

## Structure

```
phazeo-portfolio-profiles/
├── profiles/           # Profile folders (one per person)
│   └── <slug>/
│       ├── meta.ts     # ProfileConfig (slug, displayName, role, versions, etc.)
│       └── v1/
│           ├── index.tsx      # Exports componentLoader, theme, seo (enables lazy loading)
│           ├── ProfilePage.tsx # Default export: the actual portfolio UI
│           ├── theme.ts       # Theme + SEO
│           └── components/
├── types/              # Shared types (ProfileConfig, ProfileVersion, etc.)
├── src/                # Dev server (Vite + React Router)
│   ├── registry.ts     # Imports and registers all profiles
│   ├── router.tsx
│   └── pages/
├── profiles/_shared/      # Shared helpers (asset URLs, navigation shell)
├── public/
│   └── profiles/<slug>/   # Static assets (resume.pdf, images) — see Assets below
└── package.json
```

## Assets

Store files under `public/profiles/<slug>/` (e.g. `resume.pdf`, photos). This
repo serves them at `/profiles/<slug>/…`. Use the helpers in
[`profiles/_shared/assets.ts`](profiles/_shared/assets.ts):

```ts
import { profileAssetPath, profileAssetUrl } from "../../_shared/assets";

const resume = profileAssetUrl("your-slug", "resume.pdf");
// seo.ogImage: profileAssetPath("your-slug", "profile-photo.jpg")
```

Legacy `/profiles/_public/*` links 301 to `/profiles/*` via `public/_redirects`.

## Adding a New Profile

1. Create `profiles/<slug>/meta.ts` with `ProfileConfig` (folder name must equal `meta.slug`)
2. Create `profiles/<slug>/v1/theme.ts` with theme and SEO
3. Create `profiles/<slug>/v1/ProfilePage.tsx` with your portfolio component (default export)
4. Create `profiles/<slug>/v1/index.tsx` exporting `profileVersion` with `componentLoader: () => import("./ProfilePage")`, `theme`, and `seo`
5. Add components in `profiles/<slug>/v1/components/`
6. Registry auto-discovers `profiles/*/meta.ts` — run `pnpm check:registry` / `pnpm build`

The `componentLoader` pattern enables lazy loading so each profile is loaded on demand when visited.

See `profiles/sriram-sm/` for a complete example.

## Types

- `ProfileConfig` – metadata (slug, displayName, role, skills, socials, versions)
- `ProfileVersion` – `{ componentLoader, theme, seo }` (componentLoader enables per-profile code splitting)
- `ProfileTheme` – CSS variables, optional font URL
- `ProfileSeo` – title, description, ogImage

## Integration with Main Site

The private `phazeo-portfolio` repo clones this repo at build time, merges the registry, and deploys. Your changes here are pulled in on the next deploy.

### Auto-deploy after CI on main

The `trigger-deploy.yml` workflow runs only after the **CI** workflow succeeds on
a push to `main` (so a broken main does not poke Cloudflare). It then POSTs to
the Cloudflare deploy hook so the live site rebuilds with the latest profiles.

**Setup (one-time):** Add a GitHub secret in this repo:

- **Settings** → **Secrets and variables** → **Actions** → **New repository secret**
- Name: `CLOUDFLARE_DEPLOY_HOOK`
- Value: the deploy hook URL from Cloudflare Pages (Pages → project → Settings → Deploy hooks)

Do not commit the URL. Keep it as a secret.

## License

See [LICENSE](./LICENSE).
