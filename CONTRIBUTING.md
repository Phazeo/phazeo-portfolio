# Contributing to Phazeo Portfolio Profiles

## Adding Your Profile

1. **Fork** this repository
2. **Create** your profile folder: `profiles/<your-slug>/`
3. **Add** `meta.ts`, `v1/theme.ts`, `v1/ProfilePage.tsx`, `v1/index.tsx`, and components
4. **Register** in `src/registry.ts`
5. **Test** locally with `pnpm dev`
6. **Open a PR** with your changes

## Profile Slug

- Use lowercase, hyphenated slug (e.g. `john-doe`)
- Must be unique across all profiles
- Do **not** reuse a slug that already exists on the private monorepo site
  (public merge currently wins on collisions — avoid accidental overrides)

## Required Files

| File | Purpose |
|------|---------|
| `meta.ts` | ProfileConfig: slug, displayName, role, versions |
| `v1/theme.ts` | Theme (CSS vars) and SEO metadata |
| `v1/ProfilePage.tsx` | Main component (default export) with the actual portfolio UI |
| `v1/index.tsx` | Exports `profileVersion` with `componentLoader`, `theme`, `seo` |

## File Structure (Code Splitting)

Each profile version uses a **componentLoader** pattern for lazy loading. This ensures each profile is loaded on demand when a user visits its URL (e.g. `/sriram` loads only Sriram's chunk, not everyone else's).

```
profiles/<slug>/
├── meta.ts
└── v1/
    ├── index.tsx      # Exports componentLoader, theme, seo
    ├── ProfilePage.tsx # Default export: the actual portfolio UI
    ├── theme.ts
    └── components/
```

### Example: `v1/index.tsx`

```tsx
import type { ProfileVersion } from "../../../types";
import { seo, theme } from "./theme";

export const profileVersion: ProfileVersion = {
  componentLoader: () => import("./ProfilePage"),
  theme,
  seo,
};

export default profileVersion;
```

### Example: `v1/ProfilePage.tsx`

```tsx
import { About } from "./components/About";
import { Contact } from "./components/Contact";
import { Hero } from "./components/Hero";
// ... other components

export default function SriramProfilePage() {
  return (
    <div className="min-h-screen">
      <Hero />
      <About />
      {/* ... */}
      <Contact />
    </div>
  );
}
```

See `profiles/sriram/` for a complete example.

## Assets

- Place resume PDF at `public/profiles/<slug>/resume.pdf`
- Place images (e.g. og-image) at `public/profiles/<slug>/`
- In code and SEO, use `profileAssetUrl` / `profileAssetPath` from
  `profiles/_shared/assets.ts` so paths stay compatible with the private
  monorepo’s `/profiles/_public/<slug>/` runtime layout
- Optional: set `cardSummary` and `skills` in `meta.ts` — the local home page
  shows `cardSummary` on profile cards

## Guidelines

- Follow existing patterns in `profiles/sriram/`
- Keep profiles self-contained; share only via `profiles/_shared/` when needed
- Run `pnpm quality` before opening a PR

## Commit messages (no AI attribution)

Human contributor emails are fine. Do **not** let AI tools appear in commits:

- No `Co-authored-by: Cursor <cursoragent@cursor.com>` (or Copilot / Claude / ChatGPT)
- No `Made-with: Cursor` / “Generated with Claude” style lines
- Do not set `git user.email` to an AI address (`cursoragent@…`, `noreply@anthropic.com`, …)

Local husky strips common trailers, then refuses if any remain. CI re-checks every PR
(`scripts/check-no-ai-commit.mjs`). In Cursor, you can also turn off
**Settings → Agent → Attribution** (or **Git & PRs → Attribution**); the hook covers CLI/cloud misses.
