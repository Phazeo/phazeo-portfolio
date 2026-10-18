#!/usr/bin/env node
/**
 * Public/private boundary scanner for the portfolio repo.
 * Fails on:
 * - section-sign rule refs (section sign + digit)
 * - tokens whose SHA-256 (lower-cased) is in .github/boundary-denylist.sha256
 * - em dash (U+2014) or en dash (U+2013), except under profiles/** and public/profiles/**
 * Never prints matched plaintext - rule, source, and hash prefix only.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const DENYLIST_PATH = join(ROOT, ".github", "boundary-denylist.sha256");

const SECTION_RE = /§\d/;
const LONG_DASH_RE = /[\u2013\u2014]/;

function parseArgs(argv) {
  const out = {
    roots: [],
    text: null,
    source: "stdin",
    tree: false,
    tracked: false,
    denylist: DENYLIST_PATH,
    allowLongDash: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--tree") {
      out.tree = true;
      out.tracked = true;
    } else if (a === "--tracked") out.tracked = true;
    else if (a === "--denylist" && argv[i + 1]) out.denylist = resolve(argv[++i]);
    else if (a === "--allow-long-dash") out.allowLongDash = true;
    else if (a === "--text" && argv[i + 1] != null) {
      out.text = argv[++i];
      out.source = "arg";
    } else if (a === "--text-env" && argv[i + 1]) {
      const key = argv[++i];
      out.text = process.env[key] ?? "";
      out.source = `env:${key}`;
    } else if (a === "--text-file" && argv[i + 1]) {
      const path = resolve(argv[++i]);
      out.text = readFileSync(path, "utf8");
      out.source = path;
    } else if (a === "--root" && argv[i + 1]) out.roots.push(resolve(argv[++i]));
    else if (!a.startsWith("-")) out.roots.push(resolve(a));
  }
  if (out.roots.length === 0 && (out.tree || out.tracked)) out.roots.push(ROOT);
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

function isProfilePath(norm) {
  return (
    norm === "profiles" ||
    norm.startsWith("profiles/") ||
    norm === "public/profiles" ||
    norm.startsWith("public/profiles/")
  );
}

function shouldSkipPath(norm) {
  if (norm === "pnpm-lock.yaml") return true;
  if (norm === ".github/boundary-denylist.sha256") return true;
  if (norm === "test/leak-fixtures" || norm.startsWith("test/leak-fixtures/")) return true;
  return false;
}

function scanText(source, text, denylist, findings, opts = {}) {
  const checkLongDash = opts.checkLongDash !== false;
  if (SECTION_RE.test(text)) {
    findings.push({ rule: "section-ref", source });
  }
  if (checkLongDash && LONG_DASH_RE.test(text)) {
    findings.push({ rule: "long-dash", source });
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

function* walkFiles(dir, base) {
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
      const top = rel.split(sep)[0];
      if (top === "node_modules" || top === ".git" || top === ".tools" || top === "dist") {
        continue;
      }
      yield* walkFiles(abs, base);
    } else if (ent.isFile()) {
      yield { abs, rel };
    }
  }
}

function trackedFiles(root) {
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

function scanRoot(root, denylist, findings, useTracked) {
  const files = useTracked ? trackedFiles(root) : null;
  const iterable = files ?? walkFiles(root, root);
  for (const { abs, rel } of iterable) {
    const norm = rel.split(sep).join("/");
    if (shouldSkipPath(norm)) continue;
    let data;
    try {
      data = readFileSync(abs);
    } catch {
      continue;
    }
    if (data.includes(0)) continue;
    let text;
    try {
      text = data.toString("utf8");
    } catch {
      continue;
    }
    scanText(norm, text, denylist, findings, {
      checkLongDash: !isProfilePath(norm),
    });
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const denylist = loadDenylist(args.denylist);
  const findings = [];

  if (args.text != null) {
    scanText(args.source, args.text, denylist, findings, {
      checkLongDash: !args.allowLongDash,
    });
  }

  if (args.tree || args.tracked || args.roots.length > 0) {
    const roots = args.roots.length > 0 ? args.roots : [ROOT];
    const useTracked = args.tracked && roots.length === 1 && roots[0] === ROOT;
    for (const root of roots) {
      // Staged/temp trees: walk files present. Repo tip: git ls-files.
      const tracked = useTracked || (args.tracked && root === ROOT);
      scanRoot(root, denylist, findings, tracked);
    }
  }

  if (args.text == null && !args.tree && !args.tracked && args.roots.length === 0) {
    console.error(
      "check-public-boundary: pass --tree and/or --text-env <VAR> / --text-file <path> / --text <string>"
    );
    process.exit(2);
  }

  if (findings.length > 0) {
    for (const f of findings) {
      if (f.rule === "denylist-token") {
        console.error(`[denylist-token] ${f.source} hash=${f.hashPrefix}...`);
      } else {
        console.error(`[${f.rule}] ${f.source}`);
      }
    }
    process.exit(1);
  }
}

main();
