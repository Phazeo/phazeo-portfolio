#!/usr/bin/env node
/**
 * Build-time validation for profiles/<slug>/profile.json (Ajv + local rules).
 * Fail closed: schema, slug rules, XOR with React profiles, assets, hosts, phones.
 */
import { execFileSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { ErrorObject, ValidateFunction } from "ajv";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { parseSlugList, validateSlug } from "../../src/registry/slug.ts";
import { textMatchesAnyPhone } from "../guard/phone-patterns.ts";
import { isNarrowScope, loadScopeFromEnv } from "../lib/changed-scope.ts";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const PROFILES_DIR = join(ROOT, "profiles");
const PUBLIC_PROFILES = join(ROOT, "public", "profiles");
const SCHEMA_PATH = join(ROOT, "schemas", "profile.schema.json");
const RETIRED_PATH = join(ROOT, "config", "slugs", "retired.txt");
const RESERVED_PATH = join(ROOT, "config", "slugs", "reserved.txt");
const POLICY_FILES = ["allowed-hosts.txt", "allowed-binaries.txt", "allowed-large-files.txt"];
const FORBIDDEN_FILES_TOOL = join(ROOT, "tools", "guard", "check-forbidden-files.ts");
const HOSTS_TOOL = join(ROOT, "tools", "guard", "check-hosts.ts");

const FORBIDDEN_KEYS = new Set(["phone", "location", "address", "postalCode"]);
const FORBIDDEN_FIELD_MSG =
  "Phone numbers and street addresses are not allowed on public profiles. Please remove this field.";

export type ValidateOptions = {
  slug?: string;
  skipAssets?: boolean;
  skipHosts?: boolean;
  validate?: ValidateFunction;
};

function formatAjvError(err: ErrorObject, file: string): string {
  const path = err.instancePath || "/";
  const params: Record<string, unknown> = err.params || {};
  if (err.keyword === "additionalProperties") {
    const prop = params["additionalProperty"];
    if (typeof prop === "string" && FORBIDDEN_KEYS.has(prop)) {
      return `${file}: ${path} - ${FORBIDDEN_FIELD_MSG}`;
    }
    return `${file}: ${path} - unknown field "${prop}" is not allowed`;
  }
  if (err.keyword === "format" && params["format"] === "email") {
    return `${file}: ${path} - must be a valid email address`;
  }
  if (err.keyword === "pattern" && /https/.test(String(err.schema || ""))) {
    return `${file}: ${path} - URL must start with https://`;
  }
  if (err.keyword === "pattern" && /0-9/.test(String(err.schema || ""))) {
    return `${file}: ${path} - date must be YYYY, YYYY-MM, or YYYY-MM-DD`;
  }
  const msg = err.message || "invalid value";
  return `${file}: ${path} - ${msg}`;
}

function collectPhoneHits(value: unknown, path: string, out: string[], file: string): void {
  if (typeof value === "string") {
    if (textMatchesAnyPhone(value)) {
      out.push(
        `${file}: ${path} - ${FORBIDDEN_FIELD_MSG}`
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
        out.push(`${file}: ${path}/${k} - ${FORBIDDEN_FIELD_MSG}`);
      }
      collectPhoneHits(v, `${path}/${k}`, out, file);
    }
  }
}

/** First non-empty of stderr, stdout, message from a failed child process. */
function failureOutput(err: unknown): string {
  if (!(err instanceof Error)) return String(err);
  const stderr = "stderr" in err ? String(err.stderr ?? "") : "";
  if (stderr) return stderr;
  const stdout = "stdout" in err ? String(err.stdout ?? "") : "";
  return stdout || err.message;
}

function copyPolicyFiles(tmp: string, names: readonly string[]): void {
  mkdirSync(join(tmp, "config", "policy"), { recursive: true });
  for (const name of names) {
    const src = join(ROOT, "config", "policy", name);
    if (existsSync(src)) cpSync(src, join(tmp, "config", "policy", name));
  }
}

function scanAssetWithLeakGuards(absFile: string, label: string): string[] {
  const errors: string[] = [];
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
    copyPolicyFiles(tmp, POLICY_FILES);
    execFileSync(process.execPath, [FORBIDDEN_FILES_TOOL, "--root", tmp], { encoding: "utf8" });
  } catch (err) {
    const lines = failureOutput(err)
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

function scanHosts(absJson: string, label: string): string[] {
  const errors: string[] = [];
  const tmp = mkdtempSync(join(tmpdir(), "phazeo-profile-hosts-"));
  try {
    copyPolicyFiles(tmp, ["allowed-hosts.txt"]);
    writeFileSync(join(tmp, "profile.json"), readFileSync(absJson));
    execFileSync(process.execPath, [HOSTS_TOOL, "--root", tmp], { encoding: "utf8" });
  } catch (err) {
    const lines = failureOutput(err)
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

function assertValidSlug(slug: string): string[] {
  const lists = {
    retired: parseSlugList(readFileSync(RETIRED_PATH, "utf8")),
    reserved: parseSlugList(readFileSync(RESERVED_PATH, "utf8")),
  };
  return validateSlug(slug, lists).map((msg) => `check-profiles: ${msg}`);
}

/**
 * Validate one profile.json (used by tests and folder walk).
 */
export function validateProfileJsonFile(absPath: string, opts: ValidateOptions = {}): string[] {
  const errors: string[] = [];
  const file = relative(ROOT, absPath).split("\\").join("/") || absPath;
  let data: unknown;
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

  if (!opts.skipAssets) {
    const slug = opts.slug;
    const image = nestedString(data, "basics", "image");
    if (slug && image) {
      const img = join(PUBLIC_PROFILES, slug, image);
      errors.push(...scanAssetWithLeakGuards(img, `public/profiles/${slug}/${image}`));
    }
    const resumeFile = nestedString(data, "resume", "file");
    if (slug && resumeFile) {
      const pdf = join(PUBLIC_PROFILES, slug, resumeFile);
      errors.push(...scanAssetWithLeakGuards(pdf, `public/profiles/${slug}/${resumeFile}`));
    }
  }

  return errors;
}

/** Read `data[outer][inner]` when it is a non-empty string; otherwise undefined. */
function nestedString(data: unknown, outer: string, inner: string): string | undefined {
  if (typeof data !== "object" || data === null) return undefined;
  const section: unknown = Reflect.get(data, outer);
  if (typeof section !== "object" || section === null) return undefined;
  const value: unknown = Reflect.get(section, inner);
  return typeof value === "string" && value ? value : undefined;
}

function main(): void {
  if (!existsSync(SCHEMA_PATH)) {
    console.error("check-profiles: missing schemas/profile.schema.json");
    process.exit(2);
  }

  const schema = JSON.parse(readFileSync(SCHEMA_PATH, "utf8"));
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addFormats(ajv);
  const validate = ajv.compile(schema);

  const errors: string[] = [];
  if (!existsSync(PROFILES_DIR)) {
    console.error("check-profiles: missing profiles/");
    process.exit(2);
  }

  const scope = loadScopeFromEnv(ROOT);
  const narrow = isNarrowScope(scope);
  const expensiveSlugs = new Set(scope.changedSlugs);
  console.log(
    `check-profiles: scope slugs=${scope.changedSlugs.join(",") || "none"} shared=${scope.sharedChanged} failClosed=${scope.failClosed}`
  );

  for (const ent of readdirSync(PROFILES_DIR, { withFileTypes: true })) {
    if (!ent.isDirectory()) continue;
    if (ent.name.startsWith("_")) {
      errors.push(
        `check-profiles: profiles/${ent.name}/ is not allowed; shared code lives in src/kit`
      );
      continue;
    }
    const slug = ent.name;
    errors.push(...assertValidSlug(slug));
    const dir = join(PROFILES_DIR, slug);
    const metaPath = join(dir, "meta.ts");
    const jsonPath = join(dir, "profile.json");
    const hasMeta = existsSync(metaPath);
    const hasJson = existsSync(jsonPath);

    if (hasMeta && hasJson) {
      errors.push(
        `check-profiles: profiles/${slug}/ has both meta.ts and profile.json - use exactly one`
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

    // Cheap structural and slug checks above always run; schema, assets, and hosts only for slugs in scope.
    if (narrow && !expensiveSlugs.has(slug)) continue;

    errors.push(
      ...validateProfileJsonFile(jsonPath, {
        slug,
        validate,
        skipAssets: false,
        skipHosts: false,
      })
    );
  }

  // In-scope profile.json validation repeats the slug check; report each message once.
  const unique = [...new Set(errors)];
  if (unique.length > 0) {
    console.error("check-profiles: FAILED");
    for (const e of unique) console.error(e);
    process.exit(1);
  }
  console.log("check-profiles: OK");
}

const entry = process.argv[1] ? pathToFileURL(process.argv[1]).href : "";
if (entry && import.meta.url === entry) {
  main();
}
