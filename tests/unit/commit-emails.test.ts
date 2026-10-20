/**
 * Commit author/committer allowlist: verified merges only, first-parent push path,
 * and ancestor-gated commit-email exceptions.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, it } from "node:test";
import {
  COMMIT_EMAIL_RULE,
  GITHUB_MERGE_COMMITTER,
  OWNER_EMAIL,
  PHAZEO_CI_EMAIL,
  checkCommitEmails,
  hasCommitEmailException,
  isAllowedCommitIdentity,
  listShasInRange,
  type CommitIdentity,
} from "../../tools/guard/check-commit-emails.ts";
import { loadExceptions } from "../../tools/guard/check-public-boundary.ts";

function base(over: Partial<CommitIdentity> = {}): CommitIdentity {
  return {
    sha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    parents: ["bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", "cccccccccccccccccccccccccccccccccccccccc"],
    authorEmail: PHAZEO_CI_EMAIL,
    committerEmail: GITHUB_MERGE_COMMITTER,
    ...over,
  };
}

function git(cwd: string, ...args: string[]): string {
  return execFileSync("git", ["-C", cwd, ...args], {
    encoding: "utf8",
    env: {
      ...process.env,
      GIT_CONFIG_GLOBAL: "/dev/null",
      GIT_CONFIG_NOSYSTEM: "1",
      GIT_AUTHOR_NAME: "Test",
      GIT_AUTHOR_EMAIL: "test@users.noreply.github.com",
      GIT_COMMITTER_NAME: "Test",
      GIT_COMMITTER_EMAIL: "test@users.noreply.github.com",
    },
  });
}

function commitWith(
  cwd: string,
  message: string,
  opts: {
    authorEmail: string;
    committerEmail: string;
    committerName?: string;
    parents?: string[];
  }
): string {
  const tree = git(cwd, "write-tree").trim();
  const args = ["commit-tree", tree, "-m", message];
  for (const p of opts.parents ?? []) {
    args.push("-p", p);
  }
  return execFileSync("git", ["-C", cwd, ...args], {
    encoding: "utf8",
    env: {
      ...process.env,
      GIT_CONFIG_GLOBAL: "/dev/null",
      GIT_CONFIG_NOSYSTEM: "1",
      GIT_AUTHOR_NAME: "Author",
      GIT_AUTHOR_EMAIL: opts.authorEmail,
      GIT_COMMITTER_NAME: opts.committerName ?? "Committer",
      GIT_COMMITTER_EMAIL: opts.committerEmail,
    },
  }).trim();
}

describe("commit-emails identity", () => {
  it("allows a verified GitHub merge commit with the CI bot author", () => {
    assert.equal(isAllowedCommitIdentity(base(), true), true);
  });

  it("allows a verified GitHub merge commit with the owner author", () => {
    assert.equal(isAllowedCommitIdentity(base({ authorEmail: OWNER_EMAIL }), true), true);
  });

  it("rejects noreply@github.com on a non-merge (single parent)", () => {
    assert.equal(
      isAllowedCommitIdentity(base({ parents: ["bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"] }), true),
      false
    );
  });

  it("rejects a forged merge when verification is false", () => {
    assert.equal(isAllowedCommitIdentity(base(), false), false);
  });

  it("rejects noreply@github.com when the author is not allowlisted", () => {
    assert.equal(
      isAllowedCommitIdentity(base({ authorEmail: "stranger@users.noreply.github.com" }), true),
      false
    );
  });

  it("allows Phazeo CI as both author and committer without verification", () => {
    assert.equal(
      isAllowedCommitIdentity(
        base({
          committerEmail: PHAZEO_CI_EMAIL,
          parents: ["bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"],
        }),
        false
      ),
      true
    );
  });
});

describe("commit-emails push vs PR semantics", () => {
  let repo = "";

  before(() => {
    repo = mkdtempSync(join(tmpdir(), "commit-email-"));
    git(repo, "init", "-q");
    git(repo, "config", "user.name", "Test");
    git(repo, "config", "user.email", "test@users.noreply.github.com");
    writeFileSync(join(repo, "seed.txt"), "seed\n");
    git(repo, "add", "seed.txt");
    const root = commitWith(repo, "root", {
      authorEmail: PHAZEO_CI_EMAIL,
      committerEmail: PHAZEO_CI_EMAIL,
    });
    git(repo, "update-ref", "refs/heads/main", root);
    git(repo, "update-ref", "refs/remotes/origin/main", root);
    git(repo, "update-ref", "refs/remotes/origin/batch/merge-private-into-public", root);
  });

  after(() => {
    rmSync(repo, { recursive: true, force: true });
  });

  it("a fork commit with a personal email is not subject to the PR email allowlist", () => {
    // PR path does not call checkCommitEmails; personal emails are fine there.
    // Assert the pure identity rule would fail (so we know PR must skip it),
    // and that our PR workflow contract is "no email check".
    const personal = isAllowedCommitIdentity(
      base({
        authorEmail: "contributor@example.com",
        committerEmail: "contributor@example.com",
        parents: ["bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"],
      }),
      false
    );
    assert.equal(personal, false);
  });

  it("a direct push to main by an unknown email fails the push check", async () => {
    writeFileSync(join(repo, "direct.txt"), "direct\n");
    git(repo, "add", "direct.txt");
    const main = git(repo, "rev-parse", "refs/remotes/origin/main").trim();
    const bad = commitWith(repo, "direct push", {
      authorEmail: "unknown@example.com",
      committerEmail: "unknown@example.com",
      parents: [main],
    });
    git(repo, "update-ref", "refs/heads/main", bad);
    const result = await checkCommitEmails(repo, [bad], async () => false, {
      exceptions: [],
    });
    assert.equal(result.ok, false);
    assert.match(result.failures[0] ?? "", /unknown@example\.com/);
  });

  it("a verified GitHub merge passes", async () => {
    const main = git(repo, "rev-parse", "refs/remotes/origin/main").trim();
    writeFileSync(join(repo, "side.txt"), "side\n");
    git(repo, "add", "side.txt");
    const side = commitWith(repo, "feature", {
      authorEmail: "fork@example.com",
      committerEmail: "fork@example.com",
      parents: [main],
    });
    const merge = commitWith(repo, "Merge pull request #1", {
      authorEmail: PHAZEO_CI_EMAIL,
      committerEmail: GITHUB_MERGE_COMMITTER,
      committerName: "GitHub",
      parents: [main, side],
    });
    const result = await checkCommitEmails(repo, [merge], async () => true, {
      exceptions: [],
    });
    assert.equal(result.ok, true);
  });

  it("a forged unverified merge fails unless listed and an ancestor", async () => {
    const main = git(repo, "rev-parse", "refs/remotes/origin/main").trim();
    writeFileSync(join(repo, "forge.txt"), "forge\n");
    git(repo, "add", "forge.txt");
    const side = commitWith(repo, "forged side", {
      authorEmail: PHAZEO_CI_EMAIL,
      committerEmail: PHAZEO_CI_EMAIL,
      parents: [main],
    });
    const forged = commitWith(repo, "Merge pull request #99", {
      authorEmail: PHAZEO_CI_EMAIL,
      committerEmail: GITHUB_MERGE_COMMITTER,
      committerName: "GitHub",
      parents: [main, side],
    });

    const noEx = await checkCommitEmails(repo, [forged], async () => false, {
      exceptions: [],
    });
    assert.equal(noEx.ok, false, "forged merge must fail without exception");

    // Listed but not yet on a protected tip -> still fails.
    const forgedException = [
      {
        sha: forged.toLowerCase(),
        rule: COMMIT_EMAIL_RULE,
        reason: "owner accepted 2026-10-20: historical merge, unsigned",
      },
    ];
    const listedOffTip = await checkCommitEmails(repo, [forged], async () => false, {
      exceptions: forgedException,
    });
    assert.equal(listedOffTip.ok, false, "listed SHA off protected tip must fail");
    assert.equal(hasCommitEmailException(forged, forgedException, repo), false);

    // Put forged on origin/main tip, then exception applies.
    git(repo, "update-ref", "refs/remotes/origin/main", forged);
    git(repo, "update-ref", "refs/remotes/origin/batch/merge-private-into-public", forged);
    const listedOnTip = await checkCommitEmails(repo, [forged], async () => false, {
      exceptions: [
        {
          sha: forged.toLowerCase(),
          rule: COMMIT_EMAIL_RULE,
          reason: "owner accepted 2026-10-20: historical merge, unsigned",
        },
      ],
    });
    assert.equal(listedOnTip.ok, true);
    assert.equal(listedOnTip.exceptionsApplied, 1);
  });

  it("a merged PR side commit with a personal email passes the push first-parent check", async () => {
    // Reset tips to a bot-owned root for a clean first-parent chain.
    writeFileSync(join(repo, "reset.txt"), "reset\n");
    git(repo, "add", "reset.txt");
    const root = commitWith(repo, "reset root", {
      authorEmail: PHAZEO_CI_EMAIL,
      committerEmail: PHAZEO_CI_EMAIL,
    });
    git(repo, "update-ref", "refs/remotes/origin/main", root);
    git(repo, "update-ref", "refs/heads/main", root);

    writeFileSync(join(repo, "pr-side.txt"), "pr\n");
    git(repo, "add", "pr-side.txt");
    const side = commitWith(repo, "fork change", {
      authorEmail: "fork-user@users.noreply.github.com",
      committerEmail: "fork-user@users.noreply.github.com",
      parents: [root],
    });
    const merge = commitWith(repo, "Merge pull request #2", {
      authorEmail: PHAZEO_CI_EMAIL,
      committerEmail: GITHUB_MERGE_COMMITTER,
      committerName: "GitHub",
      parents: [root, side],
    });
    git(repo, "update-ref", "refs/heads/main", merge);

    const all = listShasInRange(repo, `${root}..${merge}`, false);
    const first = listShasInRange(repo, `${root}..${merge}`, true);
    assert.ok(all.includes(side), "side commit in full range");
    assert.ok(!first.includes(side), "side commit not first-parent");
    assert.deepEqual(first, [merge]);

    const pushCheck = await checkCommitEmails(repo, first, async () => true, {
      exceptions: [],
    });
    assert.equal(pushCheck.ok, true);

    // Side commit alone would fail email allowlist if checked (PR path skips this).
    const sideAlone = await checkCommitEmails(repo, [side], async () => false, {
      exceptions: [],
    });
    assert.equal(sideAlone.ok, false);
  });

  it("loads commit-email lines from the shared exceptions file", () => {
    const path = join(repo, "ex.txt");
    writeFileSync(
      path,
      "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa commit-email owner accepted 2026-10-20: historical merge, unsigned\n"
    );
    const rows = loadExceptions(path);
    assert.equal(rows[0]?.rule, COMMIT_EMAIL_RULE);
  });
});
