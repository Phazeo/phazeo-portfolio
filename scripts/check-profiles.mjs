#!/usr/bin/env node
/**
 * Build-time validation for profiles/<slug>/profile.json (Ajv + local rules).
 * Fail closed: schema, slug rules, XOR with React profiles, assets, hosts, phones.
 */
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
  cpSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { textMatchesAnyPhone } from "./phone-patterns.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PROFILES_DIR = join(ROOT, "profiles");
const PUBLIC_PROFILES = join(ROOT, "public", "profiles");
const SCHEMA_PATH = join(ROOT, "schemas", "profile.schema.json");
const RETIRED_PATH = join(ROOT, ".github", "retired-slugs.txt");
const RESERVED_PATH = join(ROOT, ".github", "reserved-slugs.txt");

const SLUG_PATTERN = /^[a-z][a-z0-9]*(-[a-z0-9]+)+$/;
const SLUG_MAX_LEN = 40;
const FORBIDDEN_KEYS = new Set(["phone", "location", "address", "postalCode"]);
const FORBIDDEN_FIELD_MSG =
  "Phone numbers and street addresses are not allowed on public profiles. Please remove this field.";

/**
 * @param {string} text
 * @returns {Set<string>}
 */
function parseSlugList(text) {
  const set = new Set();
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    set.add(t);
  }
  return set;
}

/**
 * @param {unknown} err
 * @param {string} file
 * @returns {string}
 */
function formatAjvError(err, file) {
  const path = err.instancePath || "/";
  const params = err.params || {};
  if (err.keyword === "additionalProperties") {
    const prop = params.additionalProperty;
    if (typeof prop === "string" && FORBIDDEN_KEYS.has(prop)) {
      return `${file}: ${path} — ${FORBIDDEN_FIELD_MSG}`;
    }
    return `${file}: ${path} — unknown field "${prop}" is not allowed`;
  }
  if (err.keyword === "format" && params.format === "email") {
    return `${file}: ${path} — must be a valid email address`;
  }
  if (err.keyword === "pattern" && /https/.test(String(err.schema || ""))) {
    return `${file}: ${path} — URL must start with https://`;
  }
  if (err.keyword === "pattern" && /0-9/.test(String(err.schema || ""))) {
    return `${file}: ${path} — date must be YYYY, YYYY-MM, or YYYY-MM-DD`;
  }
  const msg = err.message || "invalid value";
  return `${file}: ${path} — ${msg}`;
}

/**
 * @param {unknown} value
 * @param {string} path
 * @param {string[]} out
 * @param {string} file
 */
function collectPhoneHits(value, path, out, file) {
  if (typeof value === "string") {
    if (textMatchesAnyPhone(value)) {
      out.push(
        `${file}: ${path} — ${FORBIDDEN_FIELD_MSG}`
      );
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, i) => collectPhoneHits(item, `${path}/${i}`, out, file));
    return;
  }
  if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      if (FORBIDDEN_KEYS.has(k)) {
        out.push(`${file}: ${path}/${k} — ${FORBIDDEN_FIELD_MSG}`);
      }
      collectPhoneHits(v, `${path}/${k}`, out, file);
    }
  }
}

/**
 * @param {string} absFile
 * @param {string} label
 * @returns {string[]}
 */
function scanAssetWithLeakGuards(absFile, label) {
  /** @type {string[]} */
  const errors = [];
  if (!existsSync(absFile) || !statSync(absFile).isFile()) {
    errors.push(`check-profiles: missing asset ${label}`);
    return errors;
  }
  const tmp = mkdtempSync(join(tmpdir(), "phazeo-profile-asset-"));
  try {
    const rel = relative(ROOT, absFile).split("\\").join("/");
    const dest = join(tmp, rel);
    mkdirSync(dirname(dest), { recursive: true });
    cpSync(absFile, dest);
    mkdirSync(join(tmp, ".github"), { recursive: true });
    for (const name of [
      "allowed-hosts.txt",
      "allowed-binaries.txt",
      "allowed-large-files.txt",
    ]) {
      const src = join(ROOT, ".github", name);
      if (existsSync(src)) cpSync(src, join(tmp, ".github", name));
    }
    const forbidden = execFileSync(
      process.execPath,
      [join(ROOT, "scripts/check-forbidden-files.mjs"), "--root", tmp],
      { encoding: "utf8" }
    );
    void forbidden;
  } catch (err) {
    const msg = err instanceof Error ? (err.stderr || err.stdout || err.message) : String(err);
    const lines = String(msg)
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) {
      errors.push(`check-profiles: leak scan failed for ${label}`);
    } else {
      for (const line of lines.slice(0, 20)) {
        errors.push(`check-profiles: ${label}: ${line}`);
      }
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
  return errors;
}

/**
 * @param {string} absJson
 * @param {string} label
 * @returns {string[]}
 */
function scanHosts(absJson, label) {
  /** @type {string[]} */
  const errors = [];
  const tmp = mkdtempSync(join(tmpdir(), "phazeo-profile-hosts-"));
  try {
    mkdirSync(join(tmp, ".github"), { recursive: true });
    cpSync(join(ROOT, ".github", "allowed-hosts.txt"), join(tmp, ".github", "allowed-hosts.txt"));
    writeFileSync(join(tmp, "profile.json"), readFileSync(absJson));
    execFileSync(process.execPath, [join(ROOT, "scripts/check-hosts.mjs"), "--root", tmp], {
      encoding: "utf8",
    });
  } catch (err) {
    const msg = err instanceof Error ? (err.stderr || err.stdout || err.message) : String(err);
    const lines = String(msg)
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) {
      errors.push(`check-profiles: host allowlist failed for ${label}`);
    } else {
      for (const line of lines.slice(0, 20)) {
        errors.push(`check-profiles: ${label}: ${line}`);
      }
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
  return errors;
}

/**
 * @param {string} slug
 * @returns {string[]}
 */
function assertValidSlug(slug) {
  /** @type {string[]} */
  const errors = [];
  const retired = parseSlugList(readFileSync(RETIRED_PATH, "utf8"));
  const reserved = parseSlugList(readFileSync(RESERVED_PATH, "utf8"));
  if (slug.length > SLUG_MAX_LEN) {
    errors.push(`check-profiles: slug "${slug}" exceeds ${SLUG_MAX_LEN} characters`);
  }
  if (retired.has(slug)) {
    errors.push(`check-profiles: slug "${slug}" is retired`);
  }
  if (reserved.has(slug)) {
    errors.push(`check-profiles: slug "${slug}" is reserved`);
  }
  if (slug.split("-").length < 2 || !SLUG_PATTERN.test(slug)) {
    errors.push(
      `check-profiles: slug "${slug}" must match ${SLUG_PATTERN} (at least two hyphen-separated parts)`
    );
  }
  return errors;
}

/**
 * Validate one profile.json (used by tests and folder walk).
 * @param {string} absPath
 * @param {{ slug?: string, skipAssets?: boolean, skipHosts?: boolean, validate?: import('ajv').ValidateFunction }} opts
 * @returns {string[]}
 */
export function validateProfileJsonFile(absPath, opts = {}) {
  /** @type {string[]} */
  const errors = [];
  const file = relative(ROOT, absPath).split("\\").join("/") || absPath;
  let data;
  try {
    data = JSON.parse(readFileSync(absPath, "utf8"));
  } catch {
    return [`${file}: invalid JSON`];
  }

  const validate =
    opts.validate ||
    (() => {
      const schema = JSON.parse(readFileSync(SCHEMA_PATH, "utf8"));
      const ajv = new Ajv2020({ allErrors: true, strict: true });
      addFormats(ajv);
      return ajv.compile(schema);
    })();

  const ok = validate(data);
  if (!ok && validate.errors) {
    for (const err of validate.errors) {
      errors.push(formatAjvError(err, file));
    }
  }

  collectPhoneHits(data, "", errors, file);

  if (opts.slug) {
    errors.push(...assertValidSlug(opts.slug));
  }

  if (!opts.skipHosts) {
    errors.push(...scanHosts(absPath, file));
  }

  if (!opts.skipAssets && data && typeof data === "object") {
    const slug = opts.slug;
    if (slug && data.basics?.image) {
      const img = join(PUBLIC_PROFILES, slug, data.basics.image);
      errors.push(...scanAssetWithLeakGuards(img, `public/profiles/${slug}/${data.basics.image}`));
    }
    if (slug && data.resume?.file) {
      const pdf = join(PUBLIC_PROFILES, slug, data.resume.file);
      errors.push(...scanAssetWithLeakGuards(pdf, `public/profiles/${slug}/${data.resume.file}`));
    }
  }

  return errors;
}

function main() {
  if (!existsSync(SCHEMA_PATH)) {
    console.error("check-profiles: missing schemas/profile.schema.json");
    process.exit(2);
  }

  const schema = JSON.parse(readFileSync(SCHEMA_PATH, "utf8"));
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addFormats(ajv);
  const validate = ajv.compile(schema);

  /** @type {string[]} */
  const errors = [];
  if (!existsSync(PROFILES_DIR)) {
    console.error("check-profiles: missing profiles/");
    process.exit(2);
  }

  for (const ent of readdirSync(PROFILES_DIR, { withFileTypes: true })) {
    if (!ent.isDirectory() || ent.name.startsWith("_")) continue;
    const slug = ent.name;
    const dir = join(PROFILES_DIR, slug);
    const metaPath = join(dir, "meta.ts");
    const jsonPath = join(dir, "profile.json");
    const hasMeta = existsSync(metaPath);
    const hasJson = existsSync(jsonPath);

    if (hasMeta && hasJson) {
      errors.push(
        `check-profiles: profiles/${slug}/ has both meta.ts and profile.json — use exactly one`
      );
      continue;
    }
    if (!hasMeta && !hasJson) {
      errors.push(
        `check-profiles: profiles/${slug}/ has neither meta.ts nor profile.json`
      );
      continue;
    }
    if (!hasJson) continue;

    errors.push(...assertValidSlug(slug));
    errors.push(
      ...validateProfileJsonFile(jsonPath, {
        slug,
        validate,
        skipAssets: false,
        skipHosts: false,
      })
    );
  }

  if (errors.length > 0) {
    console.error("check-profiles: FAILED");
    for (const e of errors) console.error(e);
    process.exit(1);
  }
  console.log("check-profiles: OK");
}

const entry = process.argv[1] ? pathToFileURL(process.argv[1]).href : "";
if (entry && import.meta.url === entry) {
  main();
}
