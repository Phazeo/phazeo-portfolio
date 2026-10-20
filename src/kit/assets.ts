/**
 * Public assets live at `public/profiles/<slug>/...` and are served as
 * `/profiles/<slug>/<file>` in production.
 */
export function profileAssetUrl(slug: string, file: string): string {
  const base = import.meta.env.BASE_URL ?? "/";
  return `${base}profiles/${slug}/${file}`;
}

/** Path relative to site root (no leading slash) for SEO ogImage, etc. */
export function profileAssetPath(slug: string, file: string): string {
  return `profiles/${slug}/${file}`;
}
