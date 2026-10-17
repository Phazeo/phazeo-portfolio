/**
 * Public assets live in this repo at `public/profiles/<slug>/…`.
 * The private monorepo merge copies them to
 * `apps/portfolio/public/profiles/_public/<slug>/…`, so runtime URLs
 * (and SEO `ogImage` paths) must use the `_public` prefix.
 *
 * Local `pnpm dev` / `pnpm preview` in this repo rewrite
 * `/profiles/_public/*` → `/profiles/*` via the Vite plugin in vite.config.ts.
 */
export function profileAssetUrl(slug: string, file: string): string {
  const base = import.meta.env.BASE_URL ?? "/";
  return `${base}profiles/_public/${slug}/${file}`;
}

/** Path relative to site root (no leading slash) — for SEO ogImage, etc. */
export function profileAssetPath(slug: string, file: string): string {
  return `profiles/_public/${slug}/${file}`;
}
