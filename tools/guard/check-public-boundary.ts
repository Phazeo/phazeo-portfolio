#!/usr/bin/env node
/**
 * Public/private boundary scanner for the portfolio repo.
 * Fails on:
 * - section-sign rule refs (section sign + digit)
 * - tokens whose SHA-256 (lower-cased) is in config/policy/boundary-denylist.sha256
 * - em dash (U+2014) or en dash (U+2013), except under profiles/** and public/profiles/**
 * Never prints matched plaintext - rule, source, and hash prefix only.
 *
 * Commit-message mode (--commits): scans each commit message in a git range.
 * Exact full SHAs in config/policy/boundary-exceptions.txt may skip one listed
 * rule only when that SHA is already an ancestor of origin/batch or origin/main.
 */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import type { Dirent } from "node:fs";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const DENYLIST_PATH = join(ROOT, "config", "policy", "boundary-denylist.sha256");
const EXCEPTIONS_PATH = join(ROOT, "config", "policy", "boundary-exceptions.txt");

const SECTION_RE = /§\d/;
const LONG_DASH_RE = /[\u2013\u2014]/;

const PROTECTED_TIPS = ["origin/batch/merge-private-into-public", "origin/main"] as const;

type Args = {
  roots: string[];
  text: string | null;
  source: string;
  tree: boolean;
  tracked: boolean;
  denylist: string;
  exceptions: string;
  allowLongDash: boolean;
  commitsRange: string | null;
  cwd: string;
};

type Finding = { rule: string; source: string; hashPrefix?: string };

type FileEntry = { abs: string; rel: string };

export type BoundaryException = {
  sha: string;
  rule: string;
  reason: string;
};

function parseArgs(argv: readonly string[]): Args {
  const out: Args = {
    roots: [],
    text: null,
    source: "stdin",
    tree: false,
    tracked: false,
    denylist: DENYLIST_PATH,
    exceptions: EXCEPTIONS_PATH,
    allowLongDash: false,
    commitsRange: null,
    cwd: ROOT,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i] ?? "";
    const next = argv[i + 1];
    if (a === "--tree") {
      out.tree = true;
      out.tracked = true;
    } else if (a === "--tracked") out.tracked = true;
    else if (a === "--denylist" && next) {
      out.denylist = resolve(next);
      i++;
    } else if (a === "--exceptions" && next) {
      out.exceptions = resolve(next);
      i++;
    } else if (a === "--allow-long-dash") out.allowLongDash = true;
    else if (a === "--commits" && next) {
      out.commitsRange = next;
      i++;
    } else if (a === "--cwd" && next) {
      out.cwd = resolve(next);
      i++;
    } else if (a === "--text" && next != null) {
      out.text = next;
      out.source = "arg";
      i++;
    } else if (a === "--text-env" && next) {
      out.text = process.env[next] ?? "";
      out.source = `env:${next}`;
      i++;
    } else if (a === "--text-file" && next) {
      const path = resolve(next);
      out.text = readFileSync(path, "utf8");
      out.source = path;
      i++;
    } else if (a === "--root" && next) {
      out.roots.push(resolve(next));
      i++;
    } else if (!a.startsWith("-")) out.roots.push(resolve(a));
  }
  if (out.roots.length === 0 && (out.tree || out.tracked)) out.roots.push(ROOT);
  return out;
}

function loadDenylist(path: string): Set<string> {
  if (!existsSync(path)) {
    console.error("check-public-boundary: missing denylist at", path);
    process.exit(2);
  }
  const set = new Set<string>();
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

/** Load exceptions file. Missing file means no exceptions. */
export function loadExceptions(path: string): BoundaryException[] {
  if (!existsSync(path)) return [];
  const out: BoundaryException[] = [];
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const parts = t.split(/\s+/);
    const sha = parts[0] ?? "";
    const rule = parts[1] ?? "";
    const reason = parts.slice(2).join(" ");
    if (!/^[0-9a-f]{40}$/i.test(sha) || !rule) {
      console.error("check-public-boundary: invalid exceptions line (need <sha> <rule> <reason>)");
      process.exit(2);
    }
    out.push({ sha: sha.toLowerCase(), rule, reason });
  }
  return out;
}

export function isAncestorOfProtectedTip(
  sha: string,
  cwd: string,
  tips: readonly string[] = PROTECTED_TIPS
): boolean {
  for (const tip of tips) {
    try {
      execFileSync("git", ["-C", cwd, "rev-parse", "--verify", tip], {
        stdio: "ignore",
      });
    } catch {
      continue;
    }
    try {
      execFileSync("git", ["-C", cwd, "merge-base", "--is-ancestor", sha, tip], {
        stdio: "ignore",
      });
      return true;
    } catch {
      // not an ancestor of this tip
    }
  }
  return false;
}

/**
 * Drop findings covered by an exception that names this exact SHA and rule,
 * and whose SHA is already an ancestor of a protected tip.
 * Returns kept findings and how many exception applications were used.
 */
export function applyCommitExceptions(
  sha: string,
  findings: readonly Finding[],
  exceptions: readonly BoundaryException[],
  cwd: string,
  tips: readonly string[] = PROTECTED_TIPS
): { kept: Finding[]; applied: number } {
  const full = sha.toLowerCase();
  let applied = 0;
  const kept: Finding[] = [];
  for (const f of findings) {
    const match = exceptions.find((e) => e.sha === full && e.rule === f.rule);
    if (!match) {
      kept.push(f);
      continue;
    }
    if (!isAncestorOfProtectedTip(full, cwd, tips)) {
      kept.push(f);
      continue;
    }
    applied++;
  }
  return { kept, applied };
}

function sha256Lower(token: string): string {
  return createHash("sha256").update(token.toLowerCase(), "utf8").digest("hex");
}

/**
 * Tokenise on non-alphanumeric characters, keeping `-` and `.` inside tokens.
 * Also yield every hyphen- and dot-joined contiguous sub-sequence.
 */
function tokensFrom(text: string): Set<string> {
  const out = new Set<string>();
  const primary = text.match(/[A-Za-z0-9][A-Za-z0-9.-]*[A-Za-z0-9]|[A-Za-z0-9]/g) ?? [];
  for (const tok of primary) {
    out.add(tok);
    const parts = tok.split(/[-.]/).filter(Boolean);
    if (parts.length <= 1) continue;
    const seps: string[] = [];
    for (let i = 0; i < tok.length; i++) {
      const ch = tok[i];
      if (ch === "-" || ch === ".") seps.push(ch);
    }
    for (let i = 0; i < parts.length; i++) {
      let acc = parts[i] ?? "";
      out.add(acc);
      for (let j = i; j < parts.length - 1; j++) {
        acc = acc + (seps[j] ?? "") + (parts[j + 1] ?? "");
        out.add(acc);
      }
    }
  }
  return out;
}

function isProfilePath(norm: string): boolean {
  return (
    norm === "profiles" ||
    norm.startsWith("profiles/") ||
    norm === "public/profiles" ||
    norm.startsWith("public/profiles/")
  );
}

function shouldSkipPath(norm: string): boolean {
  if (norm === "pnpm-lock.yaml") return true;
  if (norm === "config/policy/boundary-denylist.sha256") return true;
  if (norm === "config/policy/boundary-exceptions.txt") return true;
  if (norm === ".github/boundary-denylist.sha256") return true;
  if (norm === "tests/fixtures/leak" || norm.startsWith("tests/fixtures/leak/")) return true;
  // Legacy fixture path, still present in older commits.
  if (norm === "test/leak-fixtures" || norm.startsWith("test/leak-fixtures/")) return true;
  return false;
}

function scanText(
  source: string,
  text: string,
  denylist: ReadonlySet<string>,
  findings: Finding[],
  opts: { checkLongDash?: boolean } = {}
): void {
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

function* walkFiles(dir: string, base: string): Generator<FileEntry> {
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

function scanRoot(
  root: string,
  denylist: ReadonlySet<string>,
  findings: Finding[],
  useTracked: boolean
): void {
  const files = useTracked ? trackedFiles(root) : null;
  const iterable = files ?? walkFiles(root, root);
  for (const { abs, rel } of iterable) {
    const norm = rel.split(sep).join("/");
    if (shouldSkipPath(norm)) continue;
    let data: Buffer;
    try {
      data = readFileSync(abs);
    } catch {
      continue;
    }
    if (data.includes(0)) continue;
    let text: string;
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

function listCommitShas(cwd: string, range: string): string[] {
  const out = execFileSync("git", ["-C", cwd, "rev-list", "--reverse", range], {
    encoding: "utf8",
  });
  return out
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

function commitMessage(cwd: string, sha: string): string {
  return execFileSync("git", ["-C", cwd, "log", "-1", "--format=%B", sha], {
    encoding: "utf8",
  });
}

function reportFindings(findings: readonly Finding[]): void {
  for (const f of findings) {
    if (f.rule === "denylist-token") {
      console.error(`[denylist-token] ${f.source} hash=${f.hashPrefix}...`);
    } else {
      console.error(`[${f.rule}] ${f.source}`);
    }
  }
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const denylist = loadDenylist(args.denylist);
  const exceptions = loadExceptions(args.exceptions);
  const findings: Finding[] = [];
  let exceptionsApplied = 0;

  if (args.commitsRange) {
    const shas = listCommitShas(args.cwd, args.commitsRange);
    for (const sha of shas) {
      const msg = commitMessage(args.cwd, sha);
      const local: Finding[] = [];
      scanText(`commit:${sha.slice(0, 7)}`, msg, denylist, local, {
        checkLongDash: true,
      });
      const { kept, applied } = applyCommitExceptions(
        sha,
        local,
        exceptions,
        args.cwd
      );
      exceptionsApplied += applied;
      findings.push(...kept);
    }
    if (exceptionsApplied > 0) {
      console.log(
        `check-public-boundary: applied ${exceptionsApplied} listed exception${exceptionsApplied === 1 ? "" : "s"}`
      );
    }
  }

  if (args.text != null) {
    scanText(args.source, args.text, denylist, findings, {
      checkLongDash: !args.allowLongDash,
    });
  }

  if (args.tree || args.tracked || args.roots.length > 0) {
    const roots = args.roots.length > 0 ? args.roots : [ROOT];
    const useTracked = args.tracked && roots.length === 1 && roots[0] === ROOT;
    for (const root of roots) {
      const tracked = useTracked || (args.tracked && root === ROOT);
      scanRoot(root, denylist, findings, tracked);
    }
  }

  if (
    args.text == null &&
    !args.tree &&
    !args.tracked &&
    args.roots.length === 0 &&
    !args.commitsRange
  ) {
    console.error(
      "check-public-boundary: pass --tree and/or --commits <range> and/or --text-env <VAR> / --text-file <path> / --text <string>"
    );
    process.exit(2);
  }

  if (findings.length > 0) {
    reportFindings(findings);
    process.exit(1);
  }
}

const isDirectRun =
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  main();
}
