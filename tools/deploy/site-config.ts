#!/usr/bin/env node
/**
 * Deploy config for the static site: written at run time, never committed.
 * The site is static files only. A server-side script (a "main" key, or a
 * _worker.js entry in the assets folder) is refused, and so is any key the
 * deploy does not need.
 *
 *   write          --out <file> --name <name> --compatibility-date <YYYY-MM-DD> --assets <dir>
 *   check          --config <file>
 *   refuse-tracked --root <repo> --stem <stem>   (no tracked <stem>.toml/.json/.jsonc)
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export type SiteConfig = {
  name: string;
  compatibility_date: string;
  assets: { directory: string; not_found_handling: "single-page-application" };
  workers_dev: false;
  preview_urls: false;
};

const TOP_KEYS = ["name", "compatibility_date", "assets", "workers_dev", "preview_urls"] as const;
const ASSET_KEYS = ["directory", "not_found_handling"] as const;
const NAME_RE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const CONFIG_EXTENSIONS = [".toml", ".json", ".jsonc"] as const;
/** Assets-folder entries that would be read as a server-side script. */
const SCRIPT_ENTRIES = ["_worker.js"] as const;

export function buildSiteConfig(name: string, compatibilityDate: string, assets: string): SiteConfig {
  return {
    name,
    compatibility_date: compatibilityDate,
    assets: { directory: assets, not_found_handling: "single-page-application" },
    workers_dev: false,
    preview_urls: false,
  };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Every reason the parsed config is not an assets-only site config. Empty means valid. */
export function checkSiteConfig(value: unknown): string[] {
  const errors: string[] = [];
  if (!isRecord(value)) return ["config must be a JSON object"];
  if ("main" in value) errors.push('a server-side script ("main") is not allowed');
  for (const key of Object.keys(value)) {
    if (key !== "main" && !(TOP_KEYS as readonly string[]).includes(key)) {
      errors.push(`unexpected key "${key}"`);
    }
  }
  const name = value["name"];
  if (typeof name !== "string" || !NAME_RE.test(name)) errors.push('"name" must be a lower-case name');
  const date = value["compatibility_date"];
  if (typeof date !== "string" || !DATE_RE.test(date)) {
    errors.push('"compatibility_date" must be YYYY-MM-DD');
  }
  if (value["workers_dev"] !== false) errors.push('"workers_dev" must be false');
  if (value["preview_urls"] !== false) errors.push('"preview_urls" must be false');
  const assets = value["assets"];
  if (!isRecord(assets)) {
    errors.push('"assets" must be an object');
    return errors;
  }
  for (const key of Object.keys(assets)) {
    if (!(ASSET_KEYS as readonly string[]).includes(key)) errors.push(`unexpected key "assets.${key}"`);
  }
  const dir = assets["directory"];
  if (typeof dir !== "string" || dir === "") errors.push('"assets.directory" must be a path');
  if (assets["not_found_handling"] !== "single-page-application") {
    errors.push('"assets.not_found_handling" must be "single-page-application"');
  }
  return errors;
}

/** Reasons the assets folder cannot be deployed as static files only. */
export function checkAssetsDir(dir: string): string[] {
  if (!existsSync(dir) || !statSync(dir).isDirectory()) return [`assets folder missing: ${dir}`];
  const errors: string[] = [];
  for (const entry of SCRIPT_ENTRIES) {
    if (existsSync(resolve(dir, entry))) errors.push(`server-side script entry in assets: ${entry}`);
  }
  for (const required of ["index.html", "_headers"]) {
    if (!existsSync(resolve(dir, required))) errors.push(`assets folder has no ${required}`);
  }
  return errors;
}

/** Tracked files whose name is <stem> plus a config extension. */
export function trackedConfigFiles(trackedPaths: readonly string[], stem: string): string[] {
  const names = new Set(CONFIG_EXTENSIONS.map((ext) => `${stem}${ext}`));
  return trackedPaths.filter((p) => names.has(basename(p)));
}

function flag(argv: readonly string[], name: string): string {
  const i = argv.indexOf(name);
  const v = i >= 0 ? argv[i + 1] : undefined;
  if (v === undefined || v.startsWith("--")) {
    console.error(`site-config: missing ${name}`);
    process.exit(2);
  }
  return v;
}

function fail(errors: readonly string[]): never {
  for (const e of errors) console.error(`site-config: ${e}`);
  process.exit(1);
}

function main(argv: readonly string[]): void {
  const cmd = argv[0];
  if (cmd === "write") {
    const out = flag(argv, "--out");
    const config = buildSiteConfig(
      flag(argv, "--name"),
      flag(argv, "--compatibility-date"),
      flag(argv, "--assets")
    );
    const errors = checkSiteConfig(config);
    if (errors.length > 0) fail(errors);
    writeFileSync(out, `${JSON.stringify(config, null, 2)}\n`, "utf8");
    console.log(`site-config: wrote ${out}`);
  } else if (cmd === "check") {
    const path = flag(argv, "--config");
    let parsed: unknown;
    try {
      parsed = JSON.parse(readFileSync(path, "utf8"));
    } catch (err) {
      fail([`cannot read ${path}: ${err instanceof Error ? err.message : String(err)}`]);
    }
    const errors = checkSiteConfig(parsed);
    if (errors.length > 0) fail(errors);
    const dir = (parsed as SiteConfig).assets.directory;
    const assetErrors = checkAssetsDir(resolve(dirname(path), dir));
    if (assetErrors.length > 0) fail(assetErrors);
    console.log("site-config: OK (static files only)");
  } else if (cmd === "refuse-tracked") {
    const root = flag(argv, "--root");
    const stem = flag(argv, "--stem");
    const out = execFileSync("git", ["-C", root, "ls-files", "-z"], { encoding: "utf8" });
    const found = trackedConfigFiles(out.split("\0").filter(Boolean), stem);
    if (found.length > 0) fail(found.map((p) => `config file must not be committed: ${p}`));
    console.log("site-config: OK (no committed deploy config)");
  } else {
    console.error("site-config: use write, check or refuse-tracked");
    process.exit(2);
  }
}

const isDirectRun =
  process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  main(process.argv.slice(2));
}
