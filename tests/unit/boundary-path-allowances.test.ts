/**
 * Path allowances: listed denylist digests pass only in the exact file
 * .github/workflows/deploy.yml, and only in tree or root scans.
 * Probe tokens are generated at test time; nothing sensitive is committed.
 */
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import type { SpawnSyncReturns } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { copyFileSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve, sep } from "node:path";
import { after, before, describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const COPIED = [
  join("tools", "guard", "check-public-boundary.ts"),
  join("tools", "checks", "check-policy-files.ts"),
];
const SCRIPT_REL = COPIED[0] ?? "";
const DENYLIST_REL = join("config", "policy", "boundary-denylist.sha256");
const ALLOWANCES_REL = join("config", "policy", "boundary-path-allowances.txt");
const ALLOWED_PATH = ".github/workflows/deploy.yml";
const TMP = realpathSync(tmpdir());
const GIT_ENV = { ...process.env, GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1" };

function sha(tok: string): string {
  return createHash("sha256").update(tok.toLowerCase(), "utf8").digest("hex");
}

const allowedTok = `allowprobe${randomBytes(6).toString("hex")}`;
const otherTok = `otherprobe${randomBytes(6).toString("hex")}`;

let repo = "";

/** Throwaway-repository guard: git only ever runs inside a fresh temp repo. */
function git(...args: string[]): string {
  assert.ok(repo.startsWith(`${TMP}${sep}`), "git target must be a temp repo");
  return execFileSync("git", ["-C", repo, ...args], { encoding: "utf8", env: GIT_ENV });
}

function put(rel: string, text: string): void {
  mkdirSync(dirname(join(repo, rel)), { recursive: true });
  writeFileSync(join(repo, rel), text, "utf8");
}

function writeAllowances(text: string): void {
  put(ALLOWANCES_REL, text);
}

function run(args: string[]): SpawnSyncReturns<string> {
  return spawnSync(process.execPath, [join(repo, SCRIPT_REL), ...args], {
    encoding: "utf8",
    cwd: repo,
    timeout: 20_000,
  });
}

/** Commit exactly the given files (plus tooling) and run the tracked tree scan. */
function treeScan(files: Record<string, string>): SpawnSyncReturns<string> {
  git("rm", "-rq", "--cached", "--ignore-unmatch", ".github", "elsewhere", "deploy.yml");
  rmSync(join(repo, ".github"), { recursive: true, force: true });
  rmSync(join(repo, "elsewhere"), { recursive: true, force: true });
  rmSync(join(repo, "deploy.yml"), { force: true });
  for (const [rel, text] of Object.entries(files)) put(rel, text);
  git("add", "-A");
  return run(["--tree"]);
}

describe("boundary path allowances", { timeout: 60_000 }, () => {
  before(() => {
    repo = mkdtempSync(join(TMP, "boundary-allow-"));
    git("init", "-q");
    assert.equal(realpathSync(git("rev-parse", "--show-toplevel").trim()), repo);
    for (const rel of COPIED) {
      mkdirSync(dirname(join(repo, rel)), { recursive: true });
      copyFileSync(join(ROOT, rel), join(repo, rel));
    }
    put(DENYLIST_REL, `${sha(allowedTok)}\n${sha(otherTok)}\n`);
    writeAllowances(`# Test allowance\n${ALLOWED_PATH} ${sha(allowedTok)}\n`);
  });

  after(() => {
    rmSync(repo, { recursive: true, force: true });
  });

  it("allows a listed token in the exact path", () => {
    const r = treeScan({ [ALLOWED_PATH]: `uses: ${allowedTok}/x@0\n` });
    assert.equal(r.status, 0, `expected pass: ${r.stderr}`);
  });

  it("still blocks an unlisted denylisted token in the exact path", () => {
    const r = treeScan({ [ALLOWED_PATH]: `uses: ${allowedTok}/x@0\nrun: ${otherTok}\n` });
    assert.equal(r.status, 1, r.stderr);
    assert.deepEqual(
      r.stderr.trim().split("\n"),
      [`[denylist-token] ${ALLOWED_PATH} hash=${sha(otherTok).slice(0, 12)}...`],
      "only the unlisted token may be reported"
    );
  });

  for (const copy of [
    ".github/workflows/deploy-copy.yml",
    ".github/workflows/Deploy.yml",
    ".github/workflows/deploy.yaml",
    ".github/workflows/sub/deploy.yml",
    ".github/deploy.yml",
    "deploy.yml",
    "elsewhere/.github/workflows/deploy.yml",
  ]) {
    it(`blocks the same text in a renamed or moved copy: ${copy}`, () => {
      const text = `uses: ${allowedTok}/x@0\n`;
      const r = treeScan({ [ALLOWED_PATH]: text, [copy]: text });
      assert.equal(r.status, 1, `expected ${copy} to fail`);
      assert.match(r.stderr, /denylist-token/);
      assert.deepEqual(
        r.stderr.trim().split("\n"),
        [`[denylist-token] ${copy} hash=${sha(allowedTok).slice(0, 12)}...`],
        "only the copy may be reported; the allowed path itself passes"
      );
    });
  }

  it("blocks the token in PR, issue or comment text", () => {
    const r = run(["--text", `see ${allowedTok}`]);
    assert.equal(r.status, 1, "text mode must ignore path allowances");
  });

  it("blocks the token in a text file (commit message draft)", () => {
    put("MSG", `chore: add ${allowedTok} deploy\n`);
    const r = run(["--text-file", join(repo, "MSG")]);
    assert.equal(r.status, 1, "text-file mode must ignore path allowances");
    rmSync(join(repo, "MSG"));
  });

  it("blocks the token in commit messages of a range", () => {
    treeScan({});
    git("-c", "user.name=Test", "-c", "user.email=test@users.noreply.github.com", "commit", "-qm", "base");
    const base = git("rev-parse", "HEAD").trim();
    git(
      "-c",
      "user.name=Test",
      "-c",
      "user.email=test@users.noreply.github.com",
      "commit",
      "-q",
      "--allow-empty",
      "-m",
      `ci: ${allowedTok} deploy`
    );
    const r = run(["--commits", `${base}..HEAD`, "--cwd", repo]);
    assert.equal(r.status, 1, "commit mode must ignore path allowances");
  });

  it("blocks again once the allowance line is removed", () => {
    writeAllowances("# Test allowance\n");
    const r = treeScan({ [ALLOWED_PATH]: `uses: ${allowedTok}/x@0\n` });
    writeAllowances(`# Test allowance\n${ALLOWED_PATH} ${sha(allowedTok)}\n`);
    assert.equal(r.status, 1, "no allowance line means the token is blocked");
  });

  for (const [label, text] of [
    ["another path", `.github/workflows/ci.yml ${sha(allowedTok)}\n`],
    ["upper-case hex", `${ALLOWED_PATH} ${sha(allowedTok).toUpperCase()}\n`],
    ["two spaces", `${ALLOWED_PATH}  ${sha(allowedTok)}\n`],
    ["CRLF", `${ALLOWED_PATH} ${sha(allowedTok)}\r\n`],
    ["non-ASCII comment", `# café\n${ALLOWED_PATH} ${sha(allowedTok)}\n`],
    ["digest not in the denylist", `${ALLOWED_PATH} ${sha("not-denylisted")}\n`],
    ["duplicate digest", `${ALLOWED_PATH} ${sha(allowedTok)}\n${ALLOWED_PATH} ${sha(allowedTok)}\n`],
  ] as const) {
    it(`fails closed (exit 2) on a malformed allowances file: ${label}`, () => {
      writeAllowances(text);
      const r = treeScan({ [ALLOWED_PATH]: `uses: ${allowedTok}/x@0\n` });
      writeAllowances(`# Test allowance\n${ALLOWED_PATH} ${sha(allowedTok)}\n`);
      assert.equal(r.status, 2, `expected exit 2 for ${label}: ${r.stderr}`);
    });
  }

  it("fails closed on an oversized allowances file", () => {
    writeAllowances(`# ${"a".repeat(90)}\n`.repeat(200));
    const r = treeScan({ [ALLOWED_PATH]: `uses: ${allowedTok}/x@0\n` });
    writeAllowances(`# Test allowance\n${ALLOWED_PATH} ${sha(allowedTok)}\n`);
    assert.equal(r.status, 2, r.stderr);
  });
});
