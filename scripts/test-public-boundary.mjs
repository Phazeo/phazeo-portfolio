#!/usr/bin/env node
/**
 * Prove check-public-boundary.mjs and the commit-msg long-dash hook.
 * Sensitive tokens are generated at test time; nothing sensitive is committed.
 */
import { createHash, randomBytes } from "node:crypto";
import {
  readFileSync,
  writeFileSync,
  mkdtempSync,
  rmSync,
  mkdirSync,
  chmodSync,
  copyFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync, execFileSync } from "node:child_process";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const SCRIPT = join(ROOT, "scripts", "check-public-boundary.mjs");
const DENYLIST = join(ROOT, ".github", "boundary-denylist.sha256");
const COMMIT_MSG_HOOK = join(ROOT, ".husky", "commit-msg");

function fail(msg) {
  console.error(`test-public-boundary: FAIL ${msg}`);
  process.exit(1);
}

function run(args, env = {}) {
  return spawnSync(process.execPath, [SCRIPT, ...args], {
    encoding: "utf8",
    env: { ...process.env, ...env },
    cwd: ROOT,
  });
}

function sha(tok) {
  return createHash("sha256").update(tok.toLowerCase(), "utf8").digest("hex");
}

const denyRaw = readFileSync(DENYLIST, "utf8");
const digests = [];
for (const line of denyRaw.split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  if (!/^[0-9a-f]{64}$/.test(t)) fail("denylist line is not a SHA-256 hex digest");
  digests.push(t);
}
if (digests.length < 1) fail("denylist empty");
const stripped = denyRaw
  .split("\n")
  .filter((l) => l.trim() && !l.trim().startsWith("#"))
  .join("\n");
if (/[g-zG-Z_]/.test(stripped)) fail("denylist appears to contain plain names");

const probe = `probe-${randomBytes(8).toString("hex")}.example`;
const probeHash = sha(probe);
const tmp = mkdtempSync(join(tmpdir(), "boundary-"));
const tmpDeny = join(tmp, "boundary-denylist.sha256");
writeFileSync(tmpDeny, `${probeHash}\n`, "utf8");

// Tracked .yml and .mjs containing a denylisted token both fail the tree scan
const repoTmp = mkdtempSync(join(tmpdir(), "boundary-repo-"));
execFileSync("git", ["init", "-q"], { cwd: repoTmp });
execFileSync("git", ["config", "user.name", "Test"], { cwd: repoTmp });
execFileSync("git", ["config", "user.email", "test@users.noreply.github.com"], {
  cwd: repoTmp,
});
mkdirSync(join(repoTmp, ".github"), { recursive: true });
mkdirSync(join(repoTmp, "scripts"), { recursive: true });
copyFileSync(SCRIPT, join(repoTmp, "scripts", "check-public-boundary.mjs"));
writeFileSync(join(repoTmp, ".github", "boundary-denylist.sha256"), `${probeHash}\n`);
writeFileSync(join(repoTmp, "bad.yml"), `name: ${probe}\n`);
writeFileSync(join(repoTmp, "bad.mjs"), `export const x = "${probe}";\n`);
execFileSync("git", ["add", "."], { cwd: repoTmp });
execFileSync("git", ["commit", "-qm", "seed"], { cwd: repoTmp });
const ymlFail = spawnSync(
  process.execPath,
  [join(repoTmp, "scripts", "check-public-boundary.mjs"), "--tree"],
  { encoding: "utf8", cwd: repoTmp }
);
if (ymlFail.status === 0) fail("expected tree scan to fail on denylisted token in tracked files");
if (!/denylist-token/.test(ymlFail.stderr)) fail("expected denylist-token from tree scan");

// Edited-PR-body simulation fails
const bodyFail = run(["--denylist", tmpDeny, "--text", `please see ${probe}`]);
if (bodyFail.status === 0) fail("expected edited PR body simulation to fail");

// Commit-message simulation fails
const msgFile = join(tmp, "COMMIT_EDITMSG");
writeFileSync(msgFile, `chore: touch ${probe}\n`);
const msgFail = run(["--denylist", tmpDeny, "--text-file", msgFile]);
if (msgFail.status === 0) fail("expected commit-message simulation to fail");

// Commit message with an em dash fails the commit-msg hook
const hookDir = mkdtempSync(join(tmpdir(), "boundary-hook-"));
const hookMsg = join(hookDir, "MSG");
writeFileSync(hookMsg, "fix: tidy prose\u2014more words\n");
const hook = spawnSync("sh", [COMMIT_MSG_HOOK, hookMsg], {
  encoding: "utf8",
  cwd: ROOT,
});
if (hook.status === 0) fail("expected commit-msg hook to fail on em dash");
if (!/long-dash/.test(hook.stderr) && !/long-dash/.test(hook.stdout)) {
  // check-public-boundary prints to stderr
  if (!/long-dash/.test(`${hook.stderr}${hook.stdout}`)) {
    fail(`expected long-dash from commit-msg hook: ${hook.stderr}`);
  }
}

// File in src/ with an en dash fails
const srcFile = join(tmp, "src-sample.tsx");
writeFileSync(srcFile, "export const range = \"2020\u20132023\";\n");
const srcFail = run(["--denylist", tmpDeny, "--text-file", srcFile]);
// text-file always checks long-dash; also test via a mini tree
mkdirSync(join(tmp, "src"), { recursive: true });
mkdirSync(join(tmp, ".github"), { recursive: true });
const srcTreeFile = join(tmp, "src", "Dash.tsx");
writeFileSync(srcTreeFile, 'export const range = "2020\u20132023";\n');
writeFileSync(join(tmp, ".github", "boundary-denylist.sha256"), `${probeHash}\n`);
const srcTree = run([
  "--denylist",
  join(tmp, ".github", "boundary-denylist.sha256"),
  "--root",
  tmp,
]);
if (srcTree.status === 0) fail("expected src/ en dash to fail");
if (!/long-dash/.test(srcTree.stderr)) fail("expected long-dash for src/");

// File under profiles/ with an em dash passes (long-dash exempt)
const profTmp = mkdtempSync(join(tmpdir(), "boundary-prof-"));
mkdirSync(join(profTmp, ".github"), { recursive: true });
mkdirSync(join(profTmp, "profiles", "demo"), { recursive: true });
writeFileSync(join(profTmp, ".github", "boundary-denylist.sha256"), `${probeHash}\n`);
writeFileSync(join(profTmp, "profiles", "demo", "note.md"), "Title\u2014subtitle\n");
const profilesPass = run([
  "--denylist",
  join(profTmp, ".github", "boundary-denylist.sha256"),
  "--root",
  profTmp,
]);
if (profilesPass.status !== 0) {
  fail(`profiles/ em dash should pass long-dash: ${profilesPass.stderr}`);
}

// Clean text passes
const clean = run([
  "--denylist",
  tmpDeny,
  "--text",
  "Public portfolios use reviewed hosts and hashed CSP.",
]);
if (clean.status !== 0) fail(`clean text should pass: ${clean.stderr}`);

// Section ref fails (build at runtime so this file does not contain the pattern)
const sectionText = "see section " + "\u00A7" + "7A";
const section = run(["--denylist", tmpDeny, "--text", sectionText]);
if (section.status === 0) fail("expected section-ref to fail");

rmSync(tmp, { recursive: true, force: true });
rmSync(repoTmp, { recursive: true, force: true });
rmSync(hookDir, { recursive: true, force: true });
rmSync(profTmp, { recursive: true, force: true });
console.log("test-public-boundary: ok");
