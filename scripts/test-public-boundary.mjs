#!/usr/bin/env node
/**
 * Prove check-public-boundary.mjs: denylisted token fails, §+digit fails,
 * clean text passes, denylist file has no plain names.
 */
import { createHash, randomBytes } from "node:crypto";
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const SCRIPT = join(ROOT, "scripts", "check-public-boundary.mjs");
const DENYLIST = join(ROOT, ".github", "boundary-denylist.sha256");

function fail(msg) {
  console.error(`test-public-boundary: FAIL ${msg}`);
  process.exit(1);
}

function run(args) {
  return spawnSync(process.execPath, [SCRIPT, ...args], {
    encoding: "utf8",
    env: process.env,
  });
}

// 1) denylist file: only SHA-256 hex digests, no plain names
const denyRaw = readFileSync(DENYLIST, "utf8");
const digests = [];
for (const line of denyRaw.split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  if (!/^[0-9a-f]{64}$/.test(t)) {
    fail("denylist line is not a SHA-256 hex digest");
  }
  digests.push(t);
}
if (digests.length < 1) fail("denylist empty");
const stripped = denyRaw
  .split("\n")
  .filter((l) => l.trim() && !l.trim().startsWith("#"))
  .join("\n");
if (/[g-zG-Z_]/.test(stripped)) {
  fail("denylist appears to contain plain names");
}

// 2) generated text containing a denylisted token fails
const probe = `probe-${randomBytes(8).toString("hex")}.example`;
const probeHash = createHash("sha256").update(probe.toLowerCase(), "utf8").digest("hex");
const tmp = mkdtempSync(join(tmpdir(), "boundary-"));
const tmpDeny = join(tmp, "boundary-denylist.sha256");
writeFileSync(tmpDeny, `${probeHash}\n`, "utf8");
const bad = run(["--denylist", tmpDeny, "--text", `see ${probe} in docs`]);
if (bad.status === 0) fail("expected denylisted token to fail");
if (!/denylist-token/.test(bad.stderr)) fail("expected denylist-token in stderr");

// 3) § + digit fails
const section = run(["--denylist", tmpDeny, "--text", "see section §7A for details"]);
if (section.status === 0) fail("expected section-ref to fail");
if (!/section-ref/.test(section.stderr)) fail("expected section-ref in stderr");

// 4) clean text passes
const clean = run([
  "--denylist",
  tmpDeny,
  "--text",
  "Public portfolios use reviewed hosts and hashed CSP.",
]);
if (clean.status !== 0) {
  fail(`clean text should pass: ${clean.stderr}`);
}

rmSync(tmp, { recursive: true, force: true });
console.log("test-public-boundary: ok");
