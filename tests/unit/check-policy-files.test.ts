/**
 * Format lock for boundary-denylist.sha256 and boundary-exceptions.txt.
 */
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, it } from "node:test";
import {
  checkDenylistText,
  checkExceptionsText,
  checkPolicyFile,
  checkPolicyFiles,
  DEFAULT_DENYLIST_PATH,
  DEFAULT_EXCEPTIONS_PATH,
} from "../../tools/checks/check-policy-files.ts";

const dirs: string[] = [];

afterEach(() => {
  while (dirs.length > 0) {
    const d = dirs.pop();
    if (d) rmSync(d, { recursive: true, force: true });
  }
});

function tempFile(name: string, contents: string | Buffer): string {
  const dir = mkdtempSync(join(tmpdir(), "phazeo-policy-"));
  dirs.push(dir);
  const path = join(dir, name);
  writeFileSync(path, contents);
  return path;
}

const VALID_DIGEST =
  "abafd6fec4177cc8039be84592363e8ac7d0edd09d401acb398abbf102ffca23";
const VALID_DIGEST_B =
  "738e22f0acab814cc0c6a9dfdd1c6a193ea278e48b07f070784d608243e68d8c";
const VALID_SHA = "a1430b85d93adf379762bdffac88dc2ec62a98ce";
const VALID_SHA_B = "7586e6bfe22ef6141bbfed49df33981cba2fd6f6";
const VALID_EXCEPTION = `${VALID_SHA} denylist-token owner accepted 2026-10-20: term already public in main history`;
const VALID_EXCEPTION_B = `${VALID_SHA_B} commit-email owner accepted 2026-10-20: historical merge, unsigned`;

describe("check-policy-files", () => {
  it("each valid shape passes", () => {
    const denylist = [
      "# Digests only",
      "",
      VALID_DIGEST,
      VALID_DIGEST_B,
      "",
    ].join("\n");
    const exceptions = [
      "# Exception lines",
      "",
      VALID_EXCEPTION,
      VALID_EXCEPTION_B,
      "",
    ].join("\n");
    assert.equal(checkDenylistText("denylist", denylist).ok, true);
    assert.equal(checkExceptionsText("exceptions", exceptions).ok, true);

    const dPath = tempFile("boundary-denylist.sha256", denylist);
    const ePath = tempFile("boundary-exceptions.txt", exceptions);
    assert.equal(checkPolicyFile(dPath, "denylist").ok, true);
    assert.equal(checkPolicyFile(ePath, "exceptions").ok, true);
  });

  it("repo policy files pass", () => {
    const result = checkPolicyFiles(DEFAULT_DENYLIST_PATH, DEFAULT_EXCEPTIONS_PATH);
    assert.equal(result.ok, true, result.errors.join("\n"));
  });

  it("fails for an extra token", () => {
    const line = `${VALID_EXCEPTION} extra`;
    const r = checkExceptionsText("exceptions", `${line}\n`);
    assert.equal(r.ok, false);
  });

  it("fails for a key=value line", () => {
    const r = checkExceptionsText("exceptions", "token=secret\n");
    assert.equal(r.ok, false);
    const d = checkDenylistText("denylist", "token=secret\n");
    assert.equal(d.ok, false);
  });

  it("fails for a 41 character SHA", () => {
    const bad = `${VALID_SHA}0 denylist-token owner accepted 2026-10-20: term already public in main history\n`;
    const r = checkExceptionsText("exceptions", bad);
    assert.equal(r.ok, false);
  });

  it("fails for an unknown rule", () => {
    const bad = `${VALID_SHA} other-rule owner accepted 2026-10-20: term already public in main history\n`;
    const r = checkExceptionsText("exceptions", bad);
    assert.equal(r.ok, false);
  });

  it("fails for free-text reasons", () => {
    const bad = `${VALID_SHA} denylist-token owner accepted 2026-10-20: because we said so\n`;
    const r = checkExceptionsText("exceptions", bad);
    assert.equal(r.ok, false);
  });

  it("fails for a non-ASCII character", () => {
    const path = tempFile("boundary-denylist.sha256", `${VALID_DIGEST}\ncafe\u00e9\n`);
    const r = checkPolicyFile(path, "denylist");
    assert.equal(r.ok, false);
    assert.ok(r.errors.some((e) => /non-ASCII|non-UTF-8/i.test(e)), r.errors.join("\n"));
  });

  it("fails for CRLF", () => {
    const path = tempFile("boundary-denylist.sha256", `${VALID_DIGEST}\r\n`);
    const r = checkPolicyFile(path, "denylist");
    assert.equal(r.ok, false);
    assert.ok(r.errors.some((e) => /CRLF/i.test(e)), r.errors.join("\n"));
  });

  it("fails for an oversize file", () => {
    const huge = Buffer.alloc(16 * 1024 + 1, 0x61);
    const path = tempFile("boundary-denylist.sha256", huge);
    const r = checkPolicyFile(path, "denylist");
    assert.equal(r.ok, false);
    assert.ok(r.errors.some((e) => /exceeds/i.test(e)), r.errors.join("\n"));
  });
});
