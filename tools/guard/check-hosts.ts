#!/usr/bin/env node
/**
 * Default-deny hostname scanner for the whole tree (including profiles/).
 * Exact allowlist match by default; "*.example.com" allows that host and subdomains.
 * Also flags bare *.phazeo.com hostnames (no scheme) that are not exactly listed.
 * Never prints full URLs - host + file:line only.
 */
import { execFileSync } from "node:child_process";
import type { Dirent } from "node:fs";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const ALLOWLIST_REL = join("config", "policy", "allowed-hosts.txt");
const ALLOWLIST_PATH = join(ROOT, ALLOWLIST_REL);

// "test/leak-fixtures" is the legacy fixture path, still present in older commits.
const SKIP_DIR = new Set([
  ".git",
  "node_modules",
  ".tools",
  "dist",
  "tests/fixtures/leak",
  "test/leak-fixtures",
]);

const TEXT_EXT =
  /\.(md|mdx|txt|ts|tsx|js|jsx|mjs|cjs|json|yml|yaml|toml|html|css|svg|sh|mjs|cjs|env|example|gitignore|npmrc|editorconfig)$/i;

const HOST_RE =
  /(?:https?|wss?):\/\/([a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+)/gi;

// Bare hostname ending in .phazeo.com (no scheme).
const BARE_PHAZEO_RE = /(?<![\w.-])([a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*\.phazeo\.com)(?![\w.-])/gi;

type Args = { roots: string[]; includeFixtures: boolean; tracked: boolean };

type Allowlist = { exact: Set<string>; wildcards: string[] };

type Finding = { rule: string; file: string; line: number; host: string };

type FileEntry = { abs: string; rel: string };

function parseArgs(argv: readonly string[]): Args {
  const out: Args = { roots: [], includeFixtures: false, tracked: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i] ?? "";
    const next = argv[i + 1];
    if (a === "--include-fixtures") out.includeFixtures = true;
    else if (a === "--tracked") out.tracked = true;
    else if (a === "--root" && next) {
      out.roots.push(resolve(next));
      i++;
    } else if (!a.startsWith("-")) out.roots.push(resolve(a));
  }
  if (out.roots.length === 0) out.roots.push(ROOT);
  return out;
}

function resolveAllowlistPath(scanRoot: string): string {
  const inRoot = join(scanRoot, ALLOWLIST_REL);
  if (existsSync(inRoot)) return inRoot;
  return ALLOWLIST_PATH;
}

function loadAllowlist(allowlistPath: string): Allowlist {
  const raw = readFileSync(allowlistPath, "utf8");
  const exact = new Set<string>();
  const wildcards: string[] = [];
  for (const line of raw.split("\n")) {
    const t = line.trim().toLowerCase();
    if (!t || t.startsWith("#")) continue;
    if (t.startsWith("*.")) {
      const base = t.slice(2);
      if (base === "phazeo.com" || base.endsWith(".phazeo.com")) {
        console.error("check-hosts: wildcard for phazeo.com is forbidden");
        process.exit(2);
      }
      wildcards.push(base);
    } else {
      exact.add(t);
    }
  }
  return { exact, wildcards };
}

function hostAllowed(host: string, allow: Allowlist): boolean {
  const h = host.toLowerCase();
  // Loopback is allowed by the IP gate; treat the same for URL hosts.
  if (h === "127.0.0.1" || h === "localhost" || h === "::1" || h === "[::1]") {
    return true;
  }
  if (allow.exact.has(h)) return true;
  for (const base of allow.wildcards) {
    if (h === base || h.endsWith(`.${base}`)) return true;
  }
  return false;
}

function shouldSkipDir(rel: string): boolean {
  const norm = rel.split(sep).join("/");
  for (const skip of SKIP_DIR) {
    if (norm === skip || norm.startsWith(`${skip}/`)) return true;
  }
  return false;
}

function* walk(dir: string, base: string, includeFixtures: boolean): Generator<FileEntry> {
  let entries: Dirent[];
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

function trackedFiles(root: string): FileEntry[] | null {
  try {
    const out = execFileSync("git", ["-C", root, "ls-files", "-z"], {
      encoding: "buffer",
      maxBuffer: 32 * 1024 * 1024,
    });
    return out
      .toString("utf8")
      .split("\0")
      .filter(Boolean)
      .map((rel) => ({ abs: join(root, rel), rel }));
  } catch {
    return null;
  }
}

function scanText(rel: string, text: string, allow: Allowlist, findings: Finding[]): void {
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    for (const m of line.matchAll(HOST_RE)) {
      const host = m[1];
      if (!host) continue;
      if (hostAllowed(host, allow)) continue;
      findings.push({ rule: "disallowed-host", file: rel, line: i + 1, host });
    }
    for (const m of line.matchAll(BARE_PHAZEO_RE)) {
      const host = m[1];
      if (!host) continue;
      // Skip if this occurrence is part of a URL already covered above.
      const idx = m.index ?? 0;
      const before = line.slice(Math.max(0, idx - 8), idx).toLowerCase();
      if (/https?:\/\/$/i.test(before) || /wss?:\/\/$/i.test(before)) continue;
      if (hostAllowed(host, allow)) continue;
      findings.push({ rule: "disallowed-bare-phazeo-host", file: rel, line: i + 1, host });
    }
  }
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  if (!existsSync(ALLOWLIST_PATH)) {
    console.error("check-hosts: missing config/policy/allowed-hosts.txt");
    process.exit(2);
  }
  const findings: Finding[] = [];

  for (const root of args.roots) {
    const allowPath = resolveAllowlistPath(root);
    if (!existsSync(allowPath)) {
      console.error(`check-hosts: missing allowlist at ${allowPath}`);
      process.exit(2);
    }
    const allow = loadAllowlist(allowPath);
    const files = args.tracked ? trackedFiles(root) : null;
    const iterable = files ?? walk(root, root, args.includeFixtures);
    for (const { abs, rel } of iterable) {
      const norm = rel.split(sep).join("/");
      if (
        !args.includeFixtures &&
        (norm === "tests/fixtures/leak" ||
          norm.startsWith("tests/fixtures/leak/") ||
          norm === "test/leak-fixtures" ||
          norm.startsWith("test/leak-fixtures/"))
      ) {
        continue;
      }
      const base = rel.split(sep).pop() ?? "";
      if (!(TEXT_EXT.test(base) || base === "Dockerfile" || !base.includes("."))) {
        if (!TEXT_EXT.test(rel)) continue;
      }
      let text: string;
      try {
        text = readFileSync(abs, "utf8");
      } catch {
        continue;
      }
      if (text.includes("\0")) continue;
      scanText(rel.split(sep).join("/"), text, allow, findings);
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
