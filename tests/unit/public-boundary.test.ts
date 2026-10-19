/**
 * Prove tools/guard/check-public-boundary.ts and the commit-msg long-dash hook.
 * Sensitive tokens are generated at test time; nothing sensitive is committed.
 */
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import type { SpawnSyncReturns } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { after, before, describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const SCRIPT_REL = join("tools", "guard", "check-public-boundary.ts");
const DENYLIST_REL = join("config", "policy", "boundary-denylist.sha256");
const SCRIPT = join(ROOT, SCRIPT_REL);
const DENYLIST = join(ROOT, DENYLIST_REL);
const COMMIT_MSG_HOOK = join(ROOT, ".husky", "commit-msg");

function run(args: string[], env: Record<string, string> = {}): SpawnSyncReturns<string> {
  return spawnSync(process.execPath, [SCRIPT, ...args], {
    encoding: "utf8",
    env: { ...process.env, ...env },
    cwd: ROOT,
  });
}

function sha(tok: string): string {
  return createHash("sha256").update(tok.toLowerCase(), "utf8").digest("hex");
}

const probe = `probe-${randomBytes(8).toString("hex")}.example`;
const probeHash = sha(probe);

let tmp = "";
let tmpDeny = "";
let repoTmp = "";
let hookDir = "";
let profTmp = "";

describe("public-boundary", () => {
  before(() => {
    tmp = mkdtempSync(join(tmpdir(), "boundary-"));
    tmpDeny = join(tmp, "boundary-denylist.sha256");
    writeFileSync(tmpDeny, `${probeHash}\n`, "utf8");
    repoTmp = mkdtempSync(join(tmpdir(), "boundary-repo-"));
    hookDir = mkdtempSync(join(tmpdir(), "boundary-hook-"));
    profTmp = mkdtempSync(join(tmpdir(), "boundary-prof-"));
  });

  after(() => {
    rmSync(tmp, { recursive: true, force: true });
    rmSync(repoTmp, { recursive: true, force: true });
    rmSync(hookDir, { recursive: true, force: true });
    rmSync(profTmp, { recursive: true, force: true });
  });

  it("committed denylist holds only SHA-256 digests", () => {
    const denyRaw = readFileSync(DENYLIST, "utf8");
    const digests: string[] = [];
    for (const line of denyRaw.split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      assert.match(t, /^[0-9a-f]{64}$/, "denylist line is not a SHA-256 hex digest");
      digests.push(t);
    }
    assert.ok(digests.length >= 1, "denylist empty");
    const stripped = denyRaw
      .split("\n")
      .filter((l) => l.trim() && !l.trim().startsWith("#"))
      .join("\n");
    assert.ok(!/[g-zG-Z_]/.test(stripped), "denylist appears to contain plain names");
  });

  // Tracked .yml and .ts containing a denylisted token both fail the tree scan
  it("tree scan fails on denylisted token in tracked files", () => {
    execFileSync("git", ["init", "-q"], { cwd: repoTmp });
    execFileSync("git", ["config", "user.name", "Test"], { cwd: repoTmp });
    execFileSync("git", ["config", "user.email", "test@users.noreply.github.com"], {
      cwd: repoTmp,
    });
    mkdirSync(join(repoTmp, "config", "policy"), { recursive: true });
    mkdirSync(join(repoTmp, "tools", "guard"), { recursive: true });
    copyFileSync(SCRIPT, join(repoTmp, SCRIPT_REL));
    writeFileSync(join(repoTmp, DENYLIST_REL), `${probeHash}\n`);
    writeFileSync(join(repoTmp, "bad.yml"), `name: ${probe}\n`);
    writeFileSync(join(repoTmp, "bad.ts"), `export const x = "${probe}";\n`);
    execFileSync("git", ["add", "."], { cwd: repoTmp });
    // Throwaway repo: ignore user-level git config (commit hooks, signing).
    execFileSync("git", ["commit", "-qm", "seed"], {
      cwd: repoTmp,
      env: { ...process.env, GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1" },
    });
    const ymlFail = spawnSync(process.execPath, [join(repoTmp, SCRIPT_REL), "--tree"], {
      encoding: "utf8",
      cwd: repoTmp,
    });
    assert.notEqual(
      ymlFail.status,
      0,
      "expected tree scan to fail on denylisted token in tracked files"
    );
    assert.match(ymlFail.stderr, /denylist-token/, "expected denylist-token from tree scan");
  });

  it("edited PR body simulation fails", () => {
    const bodyFail = run(["--denylist", tmpDeny, "--text", `please see ${probe}`]);
    assert.notEqual(bodyFail.status, 0, "expected edited PR body simulation to fail");
  });

  it("commit-message simulation fails", () => {
    const msgFile = join(tmp, "COMMIT_EDITMSG");
    writeFileSync(msgFile, `chore: touch ${probe}\n`);
    const msgFail = run(["--denylist", tmpDeny, "--text-file", msgFile]);
    assert.notEqual(msgFail.status, 0, "expected commit-message simulation to fail");
  });

  it("commit message with an em dash fails the commit-msg hook", () => {
    const hookMsg = join(hookDir, "MSG");
    writeFileSync(hookMsg, "fix: tidy prose\u2014more words\n");
    const hook = spawnSync("sh", [COMMIT_MSG_HOOK, hookMsg], {
      encoding: "utf8",
      cwd: ROOT,
    });
    assert.notEqual(hook.status, 0, "expected commit-msg hook to fail on em dash");
    assert.match(
      `${hook.stderr}${hook.stdout}`,
      /long-dash/,
      `expected long-dash from commit-msg hook: ${hook.stderr}`
    );
  });

  it("file in src/ with an en dash fails", () => {
    const srcFile = join(tmp, "src-sample.tsx");
    writeFileSync(srcFile, 'export const range = "2020\u20132023";\n');
    // text-file always checks long-dash
    const srcFail = run(["--denylist", tmpDeny, "--text-file", srcFile]);
    assert.notEqual(srcFail.status, 0, "expected en dash in text file to fail");
    // also test via a mini tree
    mkdirSync(join(tmp, "src"), { recursive: true });
    mkdirSync(join(tmp, "config", "policy"), { recursive: true });
    const srcTreeFile = join(tmp, "src", "Dash.tsx");
    writeFileSync(srcTreeFile, 'export const range = "2020\u20132023";\n');
    writeFileSync(join(tmp, DENYLIST_REL), `${probeHash}\n`);
    const srcTree = run(["--denylist", join(tmp, DENYLIST_REL), "--root", tmp]);
    assert.notEqual(srcTree.status, 0, "expected src/ en dash to fail");
    assert.match(srcTree.stderr, /long-dash/, "expected long-dash for src/");
  });

  it("file under profiles/ with an em dash passes (long-dash exempt)", () => {
    mkdirSync(join(profTmp, "config", "policy"), { recursive: true });
    mkdirSync(join(profTmp, "profiles", "demo"), { recursive: true });
    writeFileSync(join(profTmp, DENYLIST_REL), `${probeHash}\n`);
    writeFileSync(join(profTmp, "profiles", "demo", "note.md"), "Title\u2014subtitle\n");
    const profilesPass = run(["--denylist", join(profTmp, DENYLIST_REL), "--root", profTmp]);
    assert.equal(
      profilesPass.status,
      0,
      `profiles/ em dash should pass long-dash: ${profilesPass.stderr}`
    );
  });

  it("clean text passes", () => {
    const clean = run([
      "--denylist",
      tmpDeny,
      "--text",
      "Public portfolios use reviewed hosts and hashed CSP.",
    ]);
    assert.equal(clean.status, 0, `clean text should pass: ${clean.stderr}`);
  });

  // Build at runtime so this file does not contain the pattern.
  it("section ref fails", () => {
    const sectionText = `see section ${"\u00A7"}7A`;
    const section = run(["--denylist", tmpDeny, "--text", sectionText]);
    assert.notEqual(section.status, 0, "expected section-ref to fail");
  });
});
