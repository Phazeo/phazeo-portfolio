# Architecture

This is a static single-page app (Vite, React, React Router). Every profile is a separate lazy chunk.

## Layout

```
profiles/<slug>/        one folder per person
src/main.tsx            entry
src/app/                app shell: App, router, providers/ThemeProvider, not-found
src/features/
  directory/            home page, card helpers, experience display
  portfolio/            profile route: lazy loading, theme and SEO application
  data-profile/         template that renders profiles/<slug>/profile.json
src/registry/           profile discovery and slug validation
src/kit/                shared contract for profiles (imported as #kit)
src/components/         shared app UI (error boundary, fallbacks, social icons)
src/styles/             global CSS and the shell font
tools/                  build and check scripts
config/                 policy and slug lists
tests/                  unit tests and Playwright e2e specs
```

## The kit

`src/kit` is the only shared code a profile may import. Use the `#kit` alias (and `#kit/*` for font CSS). It contains:

- `types.ts`: `ProfileConfig`, `ProfileVersion`, `ProfileTheme`, `ProfileSeo`, owner and affiliation types, `DEFAULT_THEME`, and the active-version helpers
- `assets.ts`: `profileAssetUrl` and `profileAssetPath`
- `ProfileNavigation.tsx`: shared navigation bar
- `fonts/`: Latin subset font CSS for profile fonts

The alias is defined once in `package.json` (`imports`) and mirrored in `tsconfig.app.json` (`paths`). Vite reads the package field.

## Dependency rules

Enforced by `pnpm check:imports`:

1. A profile may import only its own folder, `#kit`, and the packages `react`, `react-dom`, `motion`, and `motion/react`.
2. `src/kit` must not import from `src/app`, `src/features`, `src/registry`, or `src/components`.
3. A feature must not import another feature.
4. Nothing under `src/` or `profiles/` may import `tools` or `tests`.

## Registry

`src/registry` builds one map from slug to `ProfileConfig`:

- `react-profiles` loads `profiles/*/meta.ts`
- `data-profiles` loads `profiles/*/profile.json` and converts each one with the data-profile feature
- `guest-csp-example` is only included when `VITE_GUEST_CSP_EXAMPLE=1` (local guest example build)
- `index` merges them, rejects duplicate slugs, and exports `getProfile`, `getListedProfiles`, and related helpers

A slug folder has either `meta.ts` or `profile.json`, never both. Folders whose names start with an underscore are not allowed under `profiles/`.

## Slug rules

`src/registry/slug.ts` is pure (no bundler-only imports) and holds the pattern, the length limit, and `validateSlug`. The app wraps it in `slug-lists` (which loads the reserved and retired lists from `config/slugs`). The profile check script uses the same pure module and reads the lists itself, so there is one rule set.

## Commands

- `pnpm quality`: lint, typecheck, registry, profile and import checks, and the main unit tests
- `pnpm check:imports`: dependency rules above
- `pnpm test`: all unit tests
- `pnpm build`: typecheck, checks, production build, and security headers
- `pnpm test:e2e`: Playwright suites (`site` against `dist/`, `demo` against the directory demo, `guest` against a guest-example build in `.tmp-dist-guest/`). Requires a system Google Chrome install (`channel: "chrome"`). Do not run `playwright install`. Build first so the site project can serve `dist/`.
- `pnpm test:e2e:site` / `pnpm test:e2e:demo` / `pnpm test:e2e:guest`: one project each (`prove:csp` aliases the site project)
- Optional `PW_CHROME_PATH` (or `CHROME_PATH`) overrides the Chrome binary path
