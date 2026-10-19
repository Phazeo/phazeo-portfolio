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

Use either a React profile (`meta.ts` + `v1/…`) **or** a data-first `profile.json`, never both in the same slug folder.

## Team React profile

1. **Fork** this repository
2. **Create** `profiles/<your-slug>/` with `meta.ts`, `v1/theme.ts`, `v1/ProfilePage.tsx`, `v1/index.tsx`, and components as needed
3. **Ensure** the folder name equals `meta.slug` (the registry discovers `profiles/*/meta.ts`)
4. **Test** with `pnpm install`, `pnpm dev`, and `pnpm quality`
5. **Open a PR**

See `profiles/sriram-sm/` for a complete React example.

### Address (slug)

- Full name as the person writes it, lowercase and hyphenated (for example `jane-doe`). An initial is fine for a later part (for example `jane-d`).
- Must match `^[a-z][a-z0-9]*(-[a-z0-9]+)+$`, max 40 characters, at least two hyphen-separated parts.
- Must not appear in `.github/retired-slugs.txt` or `.github/reserved-slugs.txt`.
- Must be unique. The repository owner approves the address.

### Assets

- Put resumes and images under `public/profiles/<slug>/`
- Use `profileAssetUrl` / `profileAssetPath` from `profiles/_shared/assets.ts`
- Old `/profiles/_public/*` URLs permanently redirect to `/profiles/*` via `public/_redirects`

## What gets blocked and why

This repository is public. Automated checks block:

- **Phone numbers** and **street addresses** in source, text, images, or PDFs
- **Image metadata** (EXIF/XMP) on JPEG/PNG/WebP/GIF
- **Resume PDFs** that contain phone numbers
- **Unreviewed hosts** - every hostname must be listed in `.github/allowed-hosts.txt`
- **Long dashes** (em dash or en dash) outside `profiles/` and `public/profiles/`

Credentials, private keys, tool caches, oversized binaries, and similar secrets are also blocked by the leak guard.

## How to fix a blocked PR

1. Read the failing check log (leak guard, public boundary, ownership, or build).
2. Remove or rewrite the blocked content. For images, strip metadata before committing. For hosts, ask for an allowlist review instead of adding internal names.
3. Re-run locally:

```sh
pnpm quality
sh scripts/check-leaks --tree
```

4. Push again. Do not bypass hooks.

## Commit rules

- **No AI attribution** in author, committer, co-author, or message trailers. Local hooks strip common trailers and refuse leftovers; CI re-checks (`scripts/check-no-ai-commit.mjs`).
- **No long dashes** in commit messages (or in files outside profile content trees). Use a normal hyphen, a colon, or rewrite.

Human contributor emails are fine. Do not set `git user.email` to an AI tool address.
