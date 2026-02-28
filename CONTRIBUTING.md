# Contributing to Phazeo Portfolio Profiles

## Adding Your Profile

1. **Fork** this repository
2. **Create** your profile folder: `profiles/<your-slug>/`
3. **Add** `meta.ts`, `v1/theme.ts`, `v1/index.tsx`, and components
4. **Register** in `src/registry.ts`
5. **Test** locally with `pnpm dev`
6. **Open a PR** with your changes

## Profile Slug

- Use lowercase, hyphenated slug (e.g. `john-doe`)
- Must be unique across all profiles

## Required Files

| File | Purpose |
|------|---------|
| `meta.ts` | ProfileConfig: slug, displayName, role, versions |
| `v1/theme.ts` | Theme (CSS vars) and SEO metadata |
| `v1/index.tsx` | Main component, exports `profileVersion` |

## Assets

- Place resume PDF at `public/profiles/<slug>/resume.pdf`
- Place images (e.g. og-image) at `public/profiles/<slug>/`

## Code Style

- Use TypeScript
- Follow existing patterns in `profiles/sriram/`
- Run `pnpm typecheck` before submitting
