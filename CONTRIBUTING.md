# Contributing to Phazeo Portfolio Profiles

## Guest profile in 5 steps

Guests must be **invited by the repository owner** first (approved GitHub account). Then:

1. **Fork** this repository
2. **Copy** [`docs/guest-profile.example.json`](./docs/guest-profile.example.json) to `profiles/<your-slug>/profile.json`
3. **Fill it in** — point `$schema` at `../../schemas/profile.schema.json` for editor autocomplete; keep every URL on `https://`
4. **Optionally add** `public/profiles/<your-slug>/photo.jpg` (strip image metadata first) and `public/profiles/<your-slug>/resume.pdf` (no phone numbers — the PR will be blocked if scanners find them)
5. **Open a PR** from your approved account

Use either a React profile (`meta.ts` + `v1/…`) **or** a data-first `profile.json`, never both in the same slug folder.

## Adding a React profile (team)

1. **Fork** this repository
2. **Create** your profile folder: `profiles/<your-slug>/`
3. **Add** `meta.ts`, `v1/theme.ts`, `v1/ProfilePage.tsx`, `v1/index.tsx`, and components
4. **Ensure** the folder name equals `meta.slug` (registry auto-discovers `profiles/*/meta.ts`)
5. **Test** locally with `pnpm dev`
6. **Open a PR** with your changes

## Profile Slug (address)

- The address is the person's **full name as they write it**, lowercase and hyphenated
  (e.g. `jane-doe`). Initials for a later part are accepted (e.g. `jane-d`).
- Must match `^[a-z][a-z0-9]*(-[a-z0-9]+)+$`, max 40 characters, **at least two**
  hyphen-separated parts.
- Must not appear in `.github/retired-slugs.txt` or `.github/reserved-slugs.txt`.
- Must be unique across all profiles. The repository owner approves the address.
- Read [PROFILE-TERMS.md](./PROFILE-TERMS.md) before publishing anything personal.

## Required Files

| File | Purpose |
|------|---------|
| `meta.ts` | ProfileConfig: slug, displayName, role, versions |
| `v1/theme.ts` | Theme (CSS vars) and SEO metadata |
| `v1/ProfilePage.tsx` | Main component (default export) with the actual portfolio UI |
| `v1/index.tsx` | Exports `profileVersion` with `componentLoader`, `theme`, `seo` |

## File Structure (Code Splitting)

Each profile version uses a **componentLoader** pattern for lazy loading. This ensures each profile is loaded on demand when a user visits its URL (e.g. `/sriram-sm` loads only that profile’s chunk, not everyone else’s).

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

See `profiles/sriram-sm/` for a complete example.

## Assets

- Place resume PDF at `public/profiles/<slug>/resume.pdf`
- Place images (e.g. og-image) at `public/profiles/<slug>/`
- In code and SEO, use `profileAssetUrl` / `profileAssetPath` from
  `profiles/_shared/assets.ts` (`profiles/<slug>/<file>`). Old
  `/profiles/_public/*` URLs 301 to `/profiles/*` via `public/_redirects`.
- Optional: set `cardSummary` and `skills` in `meta.ts` — the local home page
  shows `cardSummary` on profile cards

## Guidelines

- Follow existing patterns in `profiles/sriram-sm/`
- Keep profiles self-contained; share only via `profiles/_shared/` when needed
- Run `pnpm quality` before opening a PR

## Security: what must never be committed

This repository is **public**. Treat every commit as visible forever.

Never commit:

- **Internal IPs** — private ranges (`10/8`, `172.16/12`, `192.168/16`, `fc00::/7`) or other non-documentation literals. Loopback, `0.0.0.0`, and RFC 5737 / RFC 3849 documentation ranges are the only IP literals the gate allows.
- **Unreviewed hosts/URLs** — every hostname anywhere (including `profiles/`) must appear in `.github/allowed-hosts.txt` as an **exact** entry (or `*.example.com` for deliberate subdomain allowlists — never `*.phazeo.com`). Bare `*.phazeo.com` hostnames are also gated. Do not add unreviewed API or infrastructure hosts without review.
- **Tool caches / binaries / oversized files** — never commit `.tools/`, `node_modules/`, or `dist/`; never commit ELF/Mach-O/PE/zip/tar/gzip (or +x) binaries outside `.github/allowed-binaries.txt`; never commit files over 2 MB outside `.github/allowed-large-files.txt`.
- **Credentials** — connection strings, password/token/api_key literals, `Authorization` headers, private key blocks, cloud tokens.
- **Internal architecture details** that would help an attacker (non-public hostnames, endpoints, or deploy secrets).
- **Image metadata** — JPEG/PNG/WebP/GIF anywhere must not carry EXIF or XMP (including orientation-only EXIF). Strip metadata before adding images.
- **Forbidden filenames** — `.env*`, `*.pem` / `*.key` / `*.p12` / `*.pfx`, `id_rsa*` / `id_ed25519*`, `*.tfstate*`, `*.sqlite*` / `*.db` / `*.dump`, `docker-compose*.yml`, nginx/caddy configs, `*.kdbx`.

Run the single entry point before you push (also runs on husky pre-commit for staged changes, and in CI):

```sh
sh scripts/check-leaks --tree
```

First run downloads the **pinned** gitleaks binary and verifies its SHA-256 against `scripts/gitleaks.pin` (source: the official release `checksums.txt`). Prove the gate with `sh scripts/prove-leak-guard.sh`.

## Commit messages (no AI attribution)

Human contributor emails are fine. Do **not** let AI tools appear in commits:

- No `Co-authored-by: Cursor <cursoragent@cursor.com>` (or Copilot / Claude / ChatGPT)
- No `Made-with: Cursor` / “Generated with Claude” style lines
- Do not set `git user.email` to an AI address (`cursoragent@…`, `noreply@anthropic.com`, …)

Local husky strips common trailers, then refuses if any remain. CI re-checks every PR
(`scripts/check-no-ai-commit.mjs`). In Cursor, you can also turn off
**Settings → Agent → Attribution** (or **Git & PRs → Attribution**); the hook covers CLI/cloud misses.
