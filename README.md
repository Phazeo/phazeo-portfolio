# Phazeo Portfolio Profiles

Public repository for portfolio profiles. External developers can add and edit profiles here without needing access to the private monorepo.

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
├── public/
│   └── profiles/<slug>/   # Static assets (resume.pdf, images)
└── package.json
```

## Adding a New Profile

1. Create `profiles/<slug>/meta.ts` with `ProfileConfig`
2. Create `profiles/<slug>/v1/theme.ts` with theme and SEO
3. Create `profiles/<slug>/v1/ProfilePage.tsx` with your portfolio component (default export)
4. Create `profiles/<slug>/v1/index.tsx` exporting `profileVersion` with `componentLoader: () => import("./ProfilePage")`, `theme`, and `seo`
5. Add components in `profiles/<slug>/v1/components/`
6. Import and register in `src/registry.ts`

The `componentLoader` pattern enables lazy loading so each profile is loaded on demand when visited.

See `profiles/sriram/` for a complete example.

## Types

- `ProfileConfig` – metadata (slug, displayName, role, skills, socials, versions)
- `ProfileVersion` – `{ componentLoader, theme, seo }` (componentLoader enables per-profile code splitting)
- `ProfileTheme` – CSS variables, optional font URL
- `ProfileSeo` – title, description, ogImage

## Integration with Main Site

The private `phazeo-portfolio` repo clones this repo at build time, merges the registry, and deploys. Your changes here are pulled in on the next deploy.

### Auto-deploy on push to main

The `trigger-deploy.yml` workflow calls Cloudflare's deploy hook when changes are pushed to `main`, so the live site rebuilds with the latest profiles.

**Setup (one-time):** Add a GitHub secret in this repo:

- **Settings** → **Secrets and variables** → **Actions** → **New repository secret**
- Name: `CLOUDFLARE_DEPLOY_HOOK`
- Value: the deploy hook URL from Cloudflare Pages (e.g. `https://api.cloudflare.com/client/v4/pages/webhooks/deploy_hooks/...`)

Do not commit the URL. Keep it as a secret.

## License

See [LICENSE](./LICENSE).
