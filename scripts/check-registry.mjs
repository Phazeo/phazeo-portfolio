#!/usr/bin/env node
/**
 * Load src/registry.ts via Vite SSR so registry validation fails the build
 * (not only at runtime in the browser). Uses vite already in the tree — no new deps.
 *
 * Also fail closed when a profile references a local asset under
 * public/profiles/<slug>/… that is missing on disk, or uses an unresolved
 * template path in profileAssetUrl / profileAssetPath.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { createServer } from "vite";

const ROOT = new URL("..", import.meta.url).pathname;
const PROFILES_DIR = join(ROOT, "profiles");
const PUBLIC_PROFILES = join(ROOT, "public", "profiles");

/** Literal second arg: profileAssetUrl("slug", "file") */
const ASSET_LITERAL_RE =
  /profileAsset(?:Url|Path)\(\s*["']([^"']+)["']\s*,\s*["']([^"']+)["']\s*\)/g;
/** Any call whose second argument is a template literal (may contain ${). */
const ASSET_TEMPLATE_CALL_RE =
  /profileAsset(?:Url|Path)\(\s*["']([^"']+)["']\s*,\s*`([^`]*)`\s*\)/g;
const LOCAL_PATH_RE = /["'`](\/profiles\/([a-z0-9-]+)\/([^"'`]+))["'`]/g;
/** Simple ${ident} interpolations inside a template. */
const INTERP_RE = /\$\{([^}]*)\}/g;
const STRING_PROP_RE = (ident) =>
  new RegExp(String.raw`\b${ident}\s*:\s*["']([^"']+)["']`, "g");

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
 * @param {string} text
 * @param {number} index
 */
function lineAt(text, index) {
  return text.slice(0, index).split(/\r?\n/).length;
}

/**
 * Resolve template path values from string-literal property assignments
 * for each simple ${ident} in the template. Returns null if unresolvable.
 * @param {string} template
 * @param {string} fileText
 * @returns {string[] | null}
 */
function resolveTemplatePaths(template, fileText) {
  if (!template.includes("${")) {
    return [template];
  }
  const interps = [...template.matchAll(INTERP_RE)];
  if (interps.length === 0) return [template];

  /** @type {string[][]} */
  const optionsPerInterp = [];
  for (const m of interps) {
    const expr = m[1].trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(expr)) {
      return null;
    }
    const vals = [...fileText.matchAll(STRING_PROP_RE(expr))].map((x) => x[1]);
    if (vals.length === 0) return null;
    optionsPerInterp.push([...new Set(vals)]);
  }

  // Cartesian product of interpolation options → concrete paths.
  /** @type {string[]} */
  let paths = [template];
  for (let i = 0; i < interps.length; i++) {
    const token = interps[i][0];
    const next = [];
    for (const base of paths) {
      for (const v of optionsPerInterp[i]) {
        next.push(base.replace(token, v));
      }
    }
    paths = next;
  }
  if (paths.some((p) => p.includes("${"))) return null;
  return [...new Set(paths)];
}

/**
 * @returns {string[]}
 */
function collectAssetErrors() {
  /** @type {string[]} */
  const errors = [];
  /** @type {{ slug: string, rel: string }[]} */
  const required = [];
  const seenRel = new Set();
  let referencedAssets = false;

  /** @param {string} slug @param {string} file */
  function requireFile(slug, file) {
    referencedAssets = true;
    const cleaned = file.replace(/^\/+/, "");
    const rel = `profiles/${slug}/${cleaned}`;
    if (seenRel.has(rel)) return;
    seenRel.add(rel);
    required.push({ slug, rel });
  }

  walkFiles(PROFILES_DIR, (abs) => {
    const text = readFileSync(abs, "utf8");
    const from = relative(ROOT, abs);

    for (const m of text.matchAll(ASSET_LITERAL_RE)) {
      requireFile(m[1], m[2]);
    }

    for (const m of text.matchAll(ASSET_TEMPLATE_CALL_RE)) {
      const slug = m[1];
      const template = m[2];
      const line = lineAt(text, m.index ?? 0);
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
    }

    for (const m of text.matchAll(LOCAL_PATH_RE)) {
      requireFile(m[2], m[3]);
    }
  });

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

async function main() {
  const assetErrors = collectAssetErrors();
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
