#!/usr/bin/env node
/**
 * Load src/registry/index.ts via Vite SSR so registry validation fails the build
 * (not only at runtime in the browser). Uses vite already in the tree - no new deps.
 *
 * Fail closed when a profile references a missing local asset, or calls
 * profileAssetUrl / profileAssetPath with a non-literal slug or an
 * unresolvable / non-literal path argument.
 *
 * Data-first profiles (profiles/<slug>/profile.json) are loaded by src/registry/index.ts;
 * mutual exclusion with meta.ts is enforced by tools/checks/check-profiles.ts.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import { isNarrowScope, loadScopeFromEnv } from "../lib/changed-scope.ts";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const PROFILES_DIR = join(ROOT, "profiles");
const PUBLIC_PROFILES = join(ROOT, "public", "profiles");

/** Every call site (definition sites filtered separately). */
const ASSET_CALL_SITE_RE = /profileAsset(?:Url|Path)\s*\(/g;
/** Literal: profileAssetUrl("slug", "file") */
const ASSET_LITERAL_PREFIX =
  /^profileAsset(?:Url|Path)\(\s*["']([^"']+)["']\s*,\s*["']([^"']+)["']\s*\)/;
/** Template path: profileAssetUrl("slug", `…`) */
const ASSET_TEMPLATE_PREFIX =
  /^profileAsset(?:Url|Path)\(\s*["']([^"']+)["']\s*,\s*`([^`]*)`\s*\)/;
const LOCAL_PATH_RE = /["'`](\/profiles\/([a-z0-9-]+)\/([^"'`]+))["'`]/g;
const INTERP_RE = /\$\{([^}]*)\}/g;
const STRING_PROP_RE = (ident: string): RegExp =>
  new RegExp(String.raw`\b${ident}\s*:\s*["']([^"']+)["']`, "g");

function walkFiles(dir: string, visit: (abs: string) => void): void {
  if (!existsSync(dir)) return;
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === "node_modules" || ent.name === "dist") continue;
    const abs = join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name.startsWith(".") && ent.name !== ".") continue;
      walkFiles(abs, visit);
    } else if (/\.(tsx?|jsx?|mjs|cjs|md)$/.test(ent.name)) {
      visit(abs);
    }
  }
}

/** Walk only profiles/<slug> for each slug (slugs without a folder are skipped). */
function walkProfileSlugs(slugs: readonly string[], visit: (abs: string) => void): void {
  for (const slug of slugs) walkFiles(join(PROFILES_DIR, slug), visit);
}

function lineAt(text: string, index: number): number {
  return text.slice(0, index).split(/\r?\n/).length;
}

function isFunctionDeclaration(text: string, index: number): boolean {
  const before = text.slice(Math.max(0, index - 32), index);
  return /(?:export\s+)?function\s*$/.test(before);
}

function resolveTemplatePaths(template: string, fileText: string): string[] | null {
  if (!template.includes("${")) {
    return [template];
  }
  const interps = [...template.matchAll(INTERP_RE)];
  if (interps.length === 0) return [template];

  const optionsPerInterp: string[][] = [];
  for (const m of interps) {
    const expr = (m[1] ?? "").trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(expr)) {
      return null;
    }
    const vals = [...fileText.matchAll(STRING_PROP_RE(expr))].flatMap((x) =>
      x[1] === undefined ? [] : [x[1]]
    );
    if (vals.length === 0) return null;
    optionsPerInterp.push([...new Set(vals)]);
  }

  let paths: string[] = [template];
  for (let i = 0; i < interps.length; i++) {
    const token = interps[i]?.[0];
    if (token === undefined) return null;
    const next: string[] = [];
    for (const base of paths) {
      for (const v of optionsPerInterp[i] ?? []) {
        next.push(base.replace(token, v));
      }
    }
    paths = next;
  }
  if (paths.some((p) => p.includes("${"))) return null;
  return [...new Set(paths)];
}

/**
 * `slugs` limits the per-profile asset scan to those folders; null scans every profile.
 */
function collectAssetErrors(slugs: readonly string[] | null): string[] {
  const errors: string[] = [];
  const required: { slug: string; rel: string }[] = [];
  const seenRel = new Set<string>();
  let referencedAssets = false;

  function requireFile(slug: string, file: string): void {
    referencedAssets = true;
    const cleaned = file.replace(/^\/+/, "");
    const rel = `profiles/${slug}/${cleaned}`;
    if (seenRel.has(rel)) return;
    seenRel.add(rel);
    required.push({ slug, rel });
  }

  const scanFile = (abs: string): void => {
    const text = readFileSync(abs, "utf8");
    const from = relative(ROOT, abs);

    const callSites: number[] = [];
    for (const m of text.matchAll(ASSET_CALL_SITE_RE)) {
      const idx = m.index ?? 0;
      if (isFunctionDeclaration(text, idx)) continue;
      callSites.push(idx);
    }

    const accounted = new Set<number>();

    for (const idx of callSites) {
      const rest = text.slice(idx);
      const line = lineAt(text, idx);
      const lit = rest.match(ASSET_LITERAL_PREFIX);
      if (lit) {
        accounted.add(idx);
        requireFile(lit[1] ?? "", lit[2] ?? "");
        continue;
      }
      const tmpl = rest.match(ASSET_TEMPLATE_PREFIX);
      if (tmpl) {
        accounted.add(idx);
        const slug = tmpl[1] ?? "";
        const template = tmpl[2] ?? "";
        if (!template.includes("${")) {
          requireFile(slug, template);
          continue;
        }
        const resolved = resolveTemplatePaths(template, text);
        if (!resolved) {
          errors.push(
            `registry: unresolvable profile asset template for slug "${slug}" in ${from}:${line}`
          );
          continue;
        }
        for (const file of resolved) {
          requireFile(slug, file);
        }
        continue;
      }

      // Unaccounted: variable slug/path, function-call arg, etc.
      const slugGuess = rest.match(
        /^profileAsset(?:Url|Path)\(\s*["']([^"']+)["']/
      );
      const slugPart = slugGuess ? `slug "${slugGuess[1]}"` : "slug unknown";
      errors.push(
        `registry: non-literal profile asset call (${slugPart}) in ${from}:${line}`
      );
    }

    for (const m of text.matchAll(LOCAL_PATH_RE)) {
      requireFile(m[2] ?? "", m[3] ?? "");
    }
  };
  if (slugs === null) walkFiles(PROFILES_DIR, scanFile);
  else walkProfileSlugs(slugs, scanFile);

  for (const { slug, rel } of required) {
    const abs = join(ROOT, "public", rel);
    if (!existsSync(abs) || !statSync(abs).isFile()) {
      errors.push(`registry: missing profile asset for slug "${slug}": /${rel}`);
    }
  }

  if (referencedAssets && !existsSync(PUBLIC_PROFILES)) {
    errors.push("registry: public/profiles/ directory is missing");
  }

  return errors;
}

async function main(): Promise<void> {
  const scope = loadScopeFromEnv(ROOT);
  const narrow = isNarrowScope(scope);
  // Shared-only changes on a PR (no changed slugs) skip the per-profile asset walk; SSR still runs.
  const assetSlugs = narrow ? scope.changedSlugs : null;
  console.log(
    `check-registry: asset scan ${assetSlugs === null ? "all profiles" : `slugs=${assetSlugs.join(",") || "none"}`} (shared=${scope.sharedChanged} failClosed=${scope.failClosed})`
  );
  const assetErrors = collectAssetErrors(assetSlugs);
  if (assetErrors.length > 0) {
    console.error("check-registry: FAILED");
    for (const e of assetErrors) console.error(e);
    process.exitCode = 1;
    return;
  }

  const server = await createServer({
    root: ROOT,
    server: { middlewareMode: true },
    appType: "custom",
    logLevel: "error",
  });

  try {
    await server.ssrLoadModule("/src/registry/index.ts");
    console.log("check-registry: OK");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("check-registry: FAILED");
    console.error(message);
    process.exitCode = 1;
  } finally {
    await server.close();
  }
}

main();
