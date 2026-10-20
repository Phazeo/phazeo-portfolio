/**
 * Commit author/committer allowlist and GitHub merge-committer exception.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  GITHUB_MERGE_COMMITTER,
  OWNER_EMAIL,
  PHAZEO_CI_EMAIL,
  isAllowedCommitIdentity,
  type CommitIdentity,
} from "../../tools/guard/check-commit-emails.ts";

function base(over: Partial<CommitIdentity> = {}): CommitIdentity {
  return {
    sha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    parents: ["bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", "cccccccccccccccccccccccccccccccccccccccc"],
    authorEmail: PHAZEO_CI_EMAIL,
    committerEmail: GITHUB_MERGE_COMMITTER,
    ...over,
  };
}

describe("commit-emails", () => {
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

  it("rejects noreply@github.com when GitHub does not attest the merge", () => {
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
        base({ committerEmail: PHAZEO_CI_EMAIL, parents: ["bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"] }),
        false
      ),
      true
    );
  });
});
