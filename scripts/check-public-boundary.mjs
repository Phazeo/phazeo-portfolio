#!/usr/bin/env node
/**
 * Public/private boundary scanner for the portfolio repo.
 * Fails on section-sign rule refs (§ + digit) and on tokens whose SHA-256
 * (lower-cased) appears in .github/boundary-denylist.sha256 (hashes only).
 * Never prints matched plaintext — rule, file/source, and hash prefix only.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const DENYLIST_PATH = join(ROOT, ".github", "boundary-denylist.sha256");

const SKIP_DIR = new Set([
  ".git",
  "node_modules",
  ".tools",
  "dist",
  "test/leak-fixtures",
]);

const TREE_EXT = /\.(md|mdx|json|ts|tsx)$/i;

const SECTION_RE = /§\d/;

function parseArgs(argv) {
  const out = {
    roots: [],
    text: null,
    source: "stdin",
    tree: false,
    denylist: DENYLIST_PATH,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--tree") out.tree = true;
    else if (a === "--denylist" && argv[i + 1]) out.denylist = resolve(argv[++i]);
    else if (a === "--text" && argv[i + 1] != null) {
      out.text = argv[++i];
      out.source = "arg";
    } else if (a === "--text-env" && argv[i + 1]) {
      const key = argv[++i];
      out.text = process.env[key] ?? "";
      out.source = `env:${key}`;
    } else if (a === "--root" && argv[i + 1]) out.roots.push(resolve(argv[++i]));
    else if (!a.startsWith("-")) out.roots.push(resolve(a));
  }
  if (out.roots.length === 0 && out.tree) out.roots.push(ROOT);
  return out;
}

function loadDenylist(path) {
  if (!existsSync(path)) {
    console.error("check-public-boundary: missing denylist at", path);
    process.exit(2);
  }
  const set = new Set();
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const t = line.trim().toLowerCase();
    if (!t || t.startsWith("#")) continue;
    if (!/^[0-9a-f]{64}$/.test(t)) {
      console.error("check-public-boundary: denylist must contain only SHA-256 hex digests");
      process.exit(2);
    }
    set.add(t);
  }
  return set;
}

function sha256Lower(token) {
  return createHash("sha256").update(token.toLowerCase(), "utf8").digest("hex");
}

/**
 * Tokenise on non-alphanumeric characters, keeping `-` and `.` inside tokens.
 * Also yield every hyphen- and dot-joined contiguous sub-sequence.
 */
function tokensFrom(text) {
  const out = new Set();
  const primary = text.match(/[A-Za-z0-9][A-Za-z0-9.-]*[A-Za-z0-9]|[A-Za-z0-9]/g) ?? [];
  for (const tok of primary) {
    out.add(tok);
    const parts = tok.split(/[-.]/).filter(Boolean);
    if (parts.length <= 1) continue;
    const seps = [];
    for (let i = 0; i < tok.length; i++) {
      const ch = tok[i];
      if (ch === "-" || ch === ".") seps.push(ch);
    }
    // contiguous joined sub-sequences across separators
    for (let i = 0; i < parts.length; i++) {
      let acc = parts[i];
      out.add(acc);
      for (let j = i; j < parts.length - 1; j++) {
        acc = acc + seps[j] + parts[j + 1];
        out.add(acc);
      }
    }
  }
  return out;
}

function scanText(source, text, denylist, findings) {
  if (SECTION_RE.test(text)) {
    findings.push({ rule: "section-ref", source });
  }
  for (const tok of tokensFrom(text)) {
    const digest = sha256Lower(tok);
    if (denylist.has(digest)) {
      findings.push({
        rule: "denylist-token",
        source,
        hashPrefix: digest.slice(0, 12),
      });
    }
  }
}

function shouldSkipDir(rel) {
  const norm = rel.split(sep).join("/");
  for (const skip of SKIP_DIR) {
    if (norm === skip || norm.startsWith(`${skip}/`)) return true;
  }
  return false;
}

function* walk(dir, base) {
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
      if (shouldSkipDir(rel)) continue;
      if (rel.split(sep)[0] === "node_modules" || rel.startsWith(".git")) continue;
      yield* walk(abs, base);
    } else if (ent.isFile()) {
      yield { abs, rel };
    }
  }
}

function scanTree(root, denylist, findings) {
  const docsDir = join(root, "docs");
  if (existsSync(docsDir) && statSync(docsDir).isDirectory()) {
    for (const { abs, rel } of walk(docsDir, root)) {
      const norm = rel.split(sep).join("/");
      let text;
      try {
        text = readFileSync(abs, "utf8");
      } catch {
        continue;
      }
      if (text.includes("\0")) continue;
      scanText(norm, text, denylist, findings);
    }
  }
  for (const { abs, rel } of walk(root, root)) {
    const norm = rel.split(sep).join("/");
    const base = norm.split("/").pop() ?? "";
    if (!TREE_EXT.test(base)) continue;
    if (norm.startsWith("docs/")) continue; // already scanned
    let text;
    try {
      text = readFileSync(abs, "utf8");
    } catch {
      continue;
    }
    if (text.includes("\0")) continue;
    scanText(norm, text, denylist, findings);
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const denylist = loadDenylist(args.denylist);
  const findings = [];

  if (args.text != null) {
    scanText(args.source, args.text, denylist, findings);
  }

  if (args.tree || args.roots.length > 0) {
    const roots = args.roots.length > 0 ? args.roots : [ROOT];
    for (const root of roots) {
      scanTree(root, denylist, findings);
    }
  }

  if (args.text == null && !args.tree && args.roots.length === 0) {
    console.error(
      "check-public-boundary: pass --tree and/or --text-env <VAR> / --text <string>"
    );
    process.exit(2);
  }

  if (findings.length > 0) {
    for (const f of findings) {
      if (f.rule === "section-ref") {
        console.error(`[section-ref] ${f.source}`);
      } else {
        console.error(`[denylist-token] ${f.source} hash=${f.hashPrefix}…`);
      }
    }
    process.exit(1);
  }
}

main();
