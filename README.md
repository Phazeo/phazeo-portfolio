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
pnpm build
```

Open http://localhost:5173 to preview locally.

## What CI checks on every PR

- **Leak guard:** personal data, credentials, and host allowlist on the change set and tree.
- **Public boundary:** denylisted tokens, section-sign markers in text, and long dashes outside profile content.
- **Profile ownership:** only the profile owner (or an allowed exception) may change that slug.
- **Build and security headers:** quality, production build, and hashed CSP / headers check.

## Contributing and terms

- [CONTRIBUTING.md](./CONTRIBUTING.md) - how to add or change a profile
- [PROFILE-TERMS.md](./PROFILE-TERMS.md) - what you may publish
- [SECURITY.md](./SECURITY.md) - how to report a vulnerability privately

## Deployment

Deployment is handled by the maintainers.

## License

- **Code** (app shell, shared scripts, profile UI code): MIT - see [LICENSE](./LICENSE).
- **Profile content** (biography, experience text, photos, and similar material) belongs to each person and is **not** licensed under MIT.
