# Phazeo Portfolio Profiles

A public showcase of Phazeo team portfolios, plus invited guests.

## Profile types

- **Team (React):** `profiles/<slug>/meta.ts` plus a `v1/` React page (lazy-loaded).
- **Guest (`profile.json`):** invite-only data file at `profiles/<slug>/profile.json`, rendered by the shared template.

Do not put both kinds in the same slug folder.

## Address (slug)

The address is the person's full name as they write it, lowercase and hyphenated. An initial is fine for a later part.

Examples: `firstname-lastname`, `firstname-x`.

Rules: at least two hyphen-separated parts, max 40 characters, must match `^[a-z][a-z0-9]*(-[a-z0-9]+)+$`, and must not appear in `config/slugs/retired.txt` or `config/slugs/reserved.txt`.

## Local development

```bash
pnpm install
pnpm dev
```

Other useful commands:

```bash
pnpm quality
pnpm check:imports
pnpm build
```

## Repository layout

- `profiles/<slug>/`: one folder per person (React `meta.ts` plus `v1/`, or `profile.json`).
- `src/app`: app shell (router, providers, not-found page).
- `src/features`: directory (home), portfolio (profile loader), data-profile (JSON template).
- `src/registry`: discovers profiles and validates slugs.
- `src/kit`: the only code profiles may import (`#kit`): types, asset helpers, navigation, fonts.
- `tools`, `config`, `tests`: checks, policy lists, and tests.

See [docs/architecture.md](./docs/architecture.md) for the dependency rules.

Open http://localhost:5173 to preview locally.

## What CI checks on every PR

- **Leak guard:** personal data, credentials, and host allowlist on the change set and tree.
- **Public boundary:** denylisted tokens, section-sign markers in text, and long dashes outside profile content. Listed tokens may appear only in the deploy workflow file (`config/policy/boundary-path-allowances.txt`), never in other files, commit messages, PR text, issues or comments.
- **Profile ownership:** only the profile owner (or an allowed exception) may change that slug.
- **Import boundaries:** profiles import only their own folder, `#kit`, and an allowed package list.
- **Build and security headers:** quality, production build, and hashed CSP / headers check.

## Contributing and terms

- [CONTRIBUTING.md](./CONTRIBUTING.md) - how to add or change a profile
- [PROFILE-TERMS.md](./PROFILE-TERMS.md) - what you may publish
- [SECURITY.md](./SECURITY.md) - how to report a vulnerability privately

## Deployment

Every push to `main` runs `.github/workflows/deploy.yml`: it builds and checks the site like CI, then publishes the static files from a protected environment. A check refuses any server-side script. When the site's domain is configured, the workflow compares the live security headers with the build and rolls back on a mismatch. Deploy credentials and settings are managed by the maintainers.

## License

- **Code** (app shell, shared scripts, profile UI code): MIT - see [LICENSE](./LICENSE).
- **Profile content** (biography, experience text, photos, and similar material) belongs to each person and is **not** licensed under MIT.
