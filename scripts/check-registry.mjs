#!/usr/bin/env node
/**
 * Load src/registry.ts via Vite SSR so registry validation fails the build
 * (not only at runtime in the browser). Uses vite already in the tree — no new deps.
 *
 * Also fail closed when a profile references a local asset under
 * public/profiles/<slug>/… that is missing on disk.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { createServer } from "vite";

const ROOT = new URL("..", import.meta.url).pathname;
const PROFILES_DIR = join(ROOT, "profiles");
const PUBLIC_PROFILES = join(ROOT, "public", "profiles");

const ASSET_CALL_RE =
  /profileAsset(?:Url|Path)\(\s*["']([^"']+)["']\s*,\s*["']([^"']+)["']\s*\)/g;
const ASSET_TEMPLATE_PREFIX_RE =
  /profileAsset(?:Url|Path)\(\s*["']([^"']+)["']\s*,\s*`([^`$]*)\$\{/g;
const LOCAL_PATH_RE = /["'`](\/profiles\/([a-z0-9-]+)\/([^"'`]+))["'`]/g;
const LOCAL_LOGO_RE = /localLogo:\s*["']([^"']+)["']/g;

/**
 * @param {string} dir
 * @param {(abs: string) => void} visit
 */
function walkFiles(dir, visit) {
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

/**
 * Collect required public asset relative paths: profiles/<slug>/<file>
 * @returns {{ slug: string, rel: string, from: string }[]}
 */
function collectRequiredAssets() {
  /** @type {{ slug: string, rel: string, from: string }[]} */
  const out = [];
  const seen = new Set();

  /** @param {string} slug @param {string} file @param {string} from */
  function add(slug, file, from) {
    const cleaned = file.replace(/^\/+/, "");
    const rel = `profiles/${slug}/${cleaned}`;
    const key = `${rel}@@${from}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ slug, rel, from });
  }

  walkFiles(PROFILES_DIR, (abs) => {
    const text = readFileSync(abs, "utf8");
    const from = relative(ROOT, abs);

    for (const m of text.matchAll(ASSET_CALL_RE)) {
      add(m[1], m[2], from);
    }

    // `logos/${file}` style — resolve concrete localLogo string literals in the same file.
    const prefixes = [...text.matchAll(ASSET_TEMPLATE_PREFIX_RE)];
    if (prefixes.length > 0) {
      const logos = [...text.matchAll(LOCAL_LOGO_RE)].map((m) => m[1]);
      for (const pref of prefixes) {
        const slug = pref[1];
        const prefix = pref[2];
        for (const logo of logos) {
          add(slug, `${prefix}${logo}`, from);
        }
      }
    }

    for (const m of text.matchAll(LOCAL_PATH_RE)) {
      add(m[2], m[3], from);
    }
  });

  return out;
}

/**
 * @returns {string[]}
 */
function missingAssetErrors() {
  const errors = [];
  for (const { slug, rel } of collectRequiredAssets()) {
    const abs = join(ROOT, "public", rel);
    if (!existsSync(abs) || !statSync(abs).isFile()) {
      errors.push(`registry: missing profile asset for slug "${slug}": /${rel}`);
    }
  }
  // Silence unused PUBLIC_PROFILES if empty tree — still validate dir existence lightly.
  if (!existsSync(PUBLIC_PROFILES)) {
    errors.push("registry: public/profiles/ directory is missing");
  }
  return errors;
}

async function main() {
  const assetErrors = missingAssetErrors();
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
    await server.ssrLoadModule("/src/registry.ts");
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
