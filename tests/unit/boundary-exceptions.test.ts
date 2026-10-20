/**
 * Boundary exception file: exact SHA + rule, only when already on a protected tip.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, it } from "node:test";
import {
  applyCommitExceptions,
  loadExceptions,
} from "../../tools/guard/check-public-boundary.ts";

const LISTED = "a1430b85d93adf379762bdffac88dc2ec62a98ce";
const OTHER = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

function git(cwd: string, ...args: string[]): string {
  return execFileSync("git", ["-C", cwd, ...args], {
    encoding: "utf8",
    env: { ...process.env, GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1" },
  });
}

function commitTree(cwd: string, message: string, parent: string | null): string {
  const tree = git(cwd, "write-tree").trim();
  const args = parent ? ["commit-tree", tree, "-p", parent, "-m", message] : ["commit-tree", tree, "-m", message];
  return git(cwd, ...args).trim();
}

describe("boundary-exceptions", () => {
  let repo = "";
  let exceptionsFile = "";

  before(() => {
    repo = mkdtempSync(join(tmpdir(), "boundary-ex-"));
    git(repo, "init", "-q");
    git(repo, "config", "user.name", "Test");
    git(repo, "config", "user.email", "test@users.noreply.github.com");
    writeFileSync(join(repo, "seed.txt"), "seed\n");
    git(repo, "add", "seed.txt");
    const root = commitTree(repo, "root", null);
    // Materialise LISTED as a real object by committing with that message, then
    // note we use synthetic SHAs in applyCommitExceptions unit checks; for
    // ancestry we build origin/main containing a commit we treat as listed.
    git(repo, "update-ref", "refs/heads/main", root);
    git(repo, "update-ref", "refs/remotes/origin/main", root);
    git(repo, "update-ref", "refs/remotes/origin/batch/merge-private-into-public", root);

    exceptionsFile = join(repo, "exceptions.txt");
    writeFileSync(
      exceptionsFile,
      `${LISTED} denylist-token owner accepted 2026-10-20: term already public in main history\n`,
      "utf8"
    );
  });

  after(() => {
    rmSync(repo, { recursive: true, force: true });
  });

  it("loads exception lines as sha + rule", () => {
    const rows = loadExceptions(exceptionsFile);
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.sha, LISTED);
    assert.equal(rows[0]?.rule, "denylist-token");
  });

  it("listed SHA passes only for its rule when it is an ancestor of a protected tip", () => {
    // Point origin/main at LISTED by creating a commit and renaming... we cannot
    // force LISTED's hash. Instead: write LISTED into exceptions pointing at the
    // real tip SHA of this temp repo.
    const tip = git(repo, "rev-parse", "refs/remotes/origin/main").trim();
    const localExceptions = join(repo, "ex-local.txt");
    writeFileSync(
      localExceptions,
      `${tip} denylist-token owner accepted 2026-10-20: term already public in main history\n`
    );
    const exceptions = loadExceptions(localExceptions);
    const findings = [
      { rule: "denylist-token", source: `commit:${tip.slice(0, 7)}`, hashPrefix: "deadbeefdead" },
      { rule: "long-dash", source: `commit:${tip.slice(0, 7)}` },
    ];
    const { kept, applied } = applyCommitExceptions(tip, findings, exceptions, repo);
    assert.equal(applied, 1);
    assert.equal(kept.length, 1);
    assert.equal(kept[0]?.rule, "long-dash");
  });

  it("unlisted SHA still fails for denylist-token", () => {
    const tip = git(repo, "rev-parse", "refs/remotes/origin/main").trim();
    const exceptions = loadExceptions(exceptionsFile);
    const findings = [
      { rule: "denylist-token", source: `commit:${OTHER.slice(0, 7)}`, hashPrefix: "deadbeefdead" },
    ];
    const { kept, applied } = applyCommitExceptions(OTHER, findings, exceptions, repo);
    assert.equal(applied, 0);
    assert.equal(kept.length, 1);
    // tip unused but proves protected tips resolve
    assert.ok(tip.length === 40);
  });

  it("listed SHA that is not an ancestor of a protected tip still fails", () => {
    // Create an orphan commit not reachable from origin/main or origin/batch.
    mkdirSync(join(repo, "orphan"), { recursive: true });
    writeFileSync(join(repo, "orphan", "x.txt"), "orphan\n");
    git(repo, "add", "orphan/x.txt");
    const orphan = commitTree(repo, "orphan", null);
    const localExceptions = join(repo, "ex-orphan.txt");
    writeFileSync(
      localExceptions,
      `${orphan} denylist-token owner accepted 2026-10-20: term already public in main history\n`
    );
    const exceptions = loadExceptions(localExceptions);
    const findings = [
      { rule: "denylist-token", source: `commit:${orphan.slice(0, 7)}`, hashPrefix: "deadbeefdead" },
    ];
    const { kept, applied } = applyCommitExceptions(orphan, findings, exceptions, repo);
    assert.equal(applied, 0, "exception must not apply off the protected tips");
    assert.equal(kept.length, 1);
  });
});
