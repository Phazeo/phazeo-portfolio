#!/usr/bin/env node
/**
 * Default-deny hostname scanner for non-profile files.
 * Profile data under profiles/<slug>/ (not _shared) is skipped.
 * Never prints full URLs that might embed secrets - host + file:line only.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const ALLOWLIST_PATH = join(ROOT, ".github", "allowed-hosts.txt");

const SKIP_DIR = new Set([".git", "node_modules", ".tools", "dist", "test/leak-fixtures"]);

const TEXT_EXT =
  /\.(md|mdx|txt|ts|tsx|js|jsx|mjs|cjs|json|yml|yaml|toml|html|css|svg|sh|mjs|cjs|env|example|gitignore|npmrc|editorconfig)$/i;

// Rough host extractor - does not print the full match.
// Bare "//" is omitted: it false-positives on JavaScript regex literals like /\/\//i.test(...).
const HOST_RE =
  /(?:https?|wss?):\/\/([a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+)/gi;

function parseArgs(argv) {
  const out = { roots: [], includeFixtures: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--include-fixtures") out.includeFixtures = true;
    else if (a === "--root" && argv[i + 1]) out.roots.push(resolve(argv[++i]));
    else if (!a.startsWith("-")) out.roots.push(resolve(a));
  }
  if (out.roots.length === 0) out.roots.push(ROOT);
  return out;
}

function loadAllowlist() {
  const raw = readFileSync(ALLOWLIST_PATH, "utf8");
  const hosts = new Set();
  for (const line of raw.split("\n")) {
    const t = line.trim().toLowerCase();
    if (!t || t.startsWith("#")) continue;
    hosts.add(t);
  }
  return hosts;
}

function isProfileDataPath(rel) {
  const norm = rel.split(sep).join("/");
  // profiles/_shared is shared code - scan it.
  if (norm.startsWith("profiles/_shared/")) return false;
  if (/^profiles\/[^/_][^/]*\//.test(norm)) return true;
  // reference/<slug>/ holds profile samples - treat as profile data.
  if (/^reference\/[^/_][^/]*\//.test(norm)) return true;
  return false;
}

function shouldSkipDir(rel) {
  const norm = rel.split(sep).join("/");
  for (const skip of SKIP_DIR) {
    if (norm === skip || norm.startsWith(`${skip}/`)) return true;
  }
  return false;
}

function* walk(dir, base, includeFixtures) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const ent of entries) {
    const abs = join(dir, ent.name);
    const rel = relative(base, abs);
    if (ent.isDirectory()) {
      if (!includeFixtures && shouldSkipDir(rel)) continue;
      if (rel.split(sep)[0] === "node_modules" || rel.startsWith(".git")) continue;
      yield* walk(abs, base, includeFixtures);
    } else if (ent.isFile()) {
      yield { abs, rel };
    }
  }
}

function hostAllowed(host, allow) {
  const h = host.toLowerCase();
  if (allow.has(h)) return true;
  // Allow subdomains of an allowlisted registrable-ish suffix when listed without www.
  for (const a of allow) {
    if (h === a || h.endsWith(`.${a}`)) return true;
  }
  return false;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!existsSync(ALLOWLIST_PATH)) {
    console.error("check-hosts: missing .github/allowed-hosts.txt");
    process.exit(2);
  }
  const allow = loadAllowlist();
  const findings = [];

  for (const root of args.roots) {
    for (const { abs, rel } of walk(root, root, args.includeFixtures)) {
      if (isProfileDataPath(rel)) continue;
      const base = rel.split(sep).pop() ?? "";
      if (!(TEXT_EXT.test(base) || base === "Dockerfile" || !base.includes("."))) {
        if (!TEXT_EXT.test(rel)) continue;
      }
      let text;
      try {
        text = readFileSync(abs, "utf8");
      } catch {
        continue;
      }
      // Skip binary-ish
      if (text.includes("\0")) continue;
      const lines = text.split(/\r?\n/);
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i] ?? "";
        HOST_RE.lastIndex = 0;
        let m;
        while ((m = HOST_RE.exec(line)) !== null) {
          const host = m[1];
          if (!host) continue;
          if (hostAllowed(host, allow)) continue;
          findings.push({ rule: "disallowed-host", file: rel, line: i + 1, host });
        }
      }
    }
  }

  if (findings.length > 0) {
    for (const f of findings) {
      console.error(`[${f.rule}] ${f.file}:${f.line} host=${f.host}`);
    }
    process.exit(1);
  }
}

main();
