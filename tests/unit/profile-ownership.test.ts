/**
 * Unit tests for decideProfileOwnership and CI fail-closed ownership entry (no network).
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assertBaseShaInCi,
  assertPrActor,
  loadOwnersFromGit,
  runOwnershipCheck,
} from "../../tools/checks/check-profile-ownership.ts";
import type { DecisionInput, Owner } from "../../tools/checks/profile-ownership.ts";
import { decideProfileOwnership, parseApprovedOwners } from "../../tools/checks/profile-ownership.ts";

const approved = parseApprovedOwners(
  `56721895 dinesh-ad\n13678035 sowmipriya\n99900001 guest-user\n`
);
const exceptionIds = new Set([56721895, 334465155]); // dinesh-ad, phazeo-ci-bot
const ownersBySlug: Record<string, Owner> = {
  "dinesh-allimuthu": { githubId: 56721895, githubLogin: "dinesh-ad" },
  "sowmipriya-rajendiran": { githubId: 13678035, githubLogin: "sowmipriya" },
  "sriram-sm": { githubId: 56721895, githubLogin: "dinesh-ad" },
  "alex-morgan": { githubId: 99900001, githubLogin: "guest-user" },
};

type CaseInput = Pick<DecisionInput, "authorId" | "authorLogin" | "changedPaths"> &
  Partial<DecisionInput>;

function check(name: string, input: CaseInput, expectOk: boolean, expectReason: string): void {
  it(name, () => {
    const result = decideProfileOwnership({
      approvedOwners: approved,
      exceptionIds,
      ownersBySlug,
      ...input,
    });
    assert.equal(result.ok, expectOk, `${name}: ok`);
    assert.equal(result.reason, expectReason, `${name}: reason`);
  });
}

describe("profile-ownership", () => {
  // stranger edits someone's profile -> fail
  check(
    "stranger-edits-profile",
    {
      authorId: 999001,
      authorLogin: "stranger",
      changedPaths: ["profiles/sowmipriya-rajendiran/v1/Hero.tsx"],
    },
    false,
    "author-not-approved"
  );

  // approved owner edits own -> pass
  check(
    "owner-edits-own",
    {
      authorId: 13678035,
      authorLogin: "sowmipriya",
      changedPaths: ["profiles/sowmipriya-rajendiran/meta.ts"],
    },
    true,
    "owner-ok"
  );

  // approved owner edits another's -> fail
  check(
    "owner-edits-another",
    {
      authorId: 13678035,
      authorLogin: "sowmipriya",
      changedPaths: ["profiles/dinesh-allimuthu/meta.ts"],
    },
    false,
    "not-profile-owner"
  );

  // renamed login with same ID -> pass
  check(
    "renamed-login-same-id",
    {
      authorId: 13678035,
      authorLogin: "sowmipriya-newlogin",
      changedPaths: ["public/profiles/sowmipriya-rajendiran/profile-photo.jpg"],
    },
    true,
    "owner-ok"
  );

  // old login with different ID -> fail
  check(
    "old-login-different-id",
    {
      authorId: 424242,
      authorLogin: "sowmipriya",
      changedPaths: ["profiles/sowmipriya-rajendiran/meta.ts"],
    },
    false,
    "author-not-approved"
  );

  // exception bot may touch anything
  check(
    "bot-exception",
    {
      authorId: 334465155,
      authorLogin: "phazeo-ci-bot",
      changedPaths: ["src/features/directory/HomePage.tsx", "profiles/sriram-sm/meta.ts"],
    },
    true,
    "exception-author"
  );

  // non-exception cannot change non-profile paths
  check(
    "non-profile-path",
    {
      authorId: 13678035,
      authorLogin: "sowmipriya",
      changedPaths: ["src/features/directory/HomePage.tsx"],
    },
    false,
    "non-profile-path"
  );

  // non-owner deletes a file in someone else's profile -> fail
  check(
    "non-owner-deletes-other-profile-file",
    {
      authorId: 13678035,
      authorLogin: "sowmipriya",
      changedPaths: ["profiles/dinesh-allimuthu/v1/Hero.tsx"],
    },
    false,
    "not-profile-owner"
  );

  // non-owner renames a file out of someone else's profile (delete + add) -> fail
  check(
    "non-owner-renames-out-of-other-profile",
    {
      authorId: 13678035,
      authorLogin: "sowmipriya",
      changedPaths: [
        "profiles/dinesh-allimuthu/v1/notes.txt",
        "tmp/notes.txt",
      ],
    },
    false,
    "not-profile-owner"
  );

  // data-first: owner edits own profile.json -> pass
  check(
    "data-owner-edits-own-json",
    {
      authorId: 99900001,
      authorLogin: "guest-user",
      changedPaths: ["profiles/alex-morgan/profile.json"],
    },
    true,
    "owner-ok"
  );

  // data-first: non-owner edits profile.json -> fail
  check(
    "data-non-owner-edits-json",
    {
      authorId: 13678035,
      authorLogin: "sowmipriya",
      changedPaths: ["profiles/alex-morgan/profile.json"],
    },
    false,
    "not-profile-owner"
  );

  // data-first: non-owner changes meta.owner on someone else's profile (base owner wins) -> fail
  check(
    "data-non-owner-steals-meta-owner",
    {
      authorId: 13678035,
      authorLogin: "sowmipriya",
      changedPaths: ["profiles/alex-morgan/profile.json"],
      // HEAD claims sowmipriya owns it after the edit:
      ownersBySlug: {
        ...ownersBySlug,
        "alex-morgan": { githubId: 13678035, githubLogin: "sowmipriya" },
      },
      baseOwnersBySlug: {
        "alex-morgan": { githubId: 99900001, githubLogin: "guest-user" },
      },
    },
    false,
    "not-profile-owner"
  );

  // Explicit: approved non-owner rewrites meta.owner to themselves while base owner remains: fail
  it("data-non-owner-claims-meta-owner", () => {
    const result = runOwnershipCheck({
      authorId: 13678035,
      authorLogin: "sowmipriya",
      changedPaths: ["profiles/alex-morgan/profile.json"],
      githubActions: "true",
      baseSha: "deadbeef",
      ownersBySlug: {
        ...ownersBySlug,
        "alex-morgan": { githubId: 13678035, githubLogin: "sowmipriya" },
      },
      baseOwnersBySlug: {
        "alex-morgan": { githubId: 99900001, githubLogin: "guest-user" },
      },
    });
    assert.equal(result.ok, false, "data-non-owner-claims-meta-owner: ok");
    assert.equal(result.reason, "not-profile-owner", "data-non-owner-claims-meta-owner: reason");
  });

  // new data profile: author not approved -> fail
  check(
    "data-new-profile-unapproved-author",
    {
      authorId: 424242,
      authorLogin: "random-person",
      changedPaths: ["profiles/new-guest/profile.json"],
      ownersBySlug: {
        ...ownersBySlug,
        "new-guest": { githubId: 424242, githubLogin: "random-person" },
      },
      baseOwnersBySlug: {},
    },
    false,
    "author-not-approved"
  );

  // Legacy profile (base has slug, no owner field): only maintainer exceptions.
  check(
    "legacy-bot-changes",
    {
      authorId: 334465155,
      authorLogin: "phazeo-ci-bot",
      changedPaths: ["profiles/kayalvizhi/meta.ts", "profiles/kayalvizhi-sm/meta.ts"],
      baseOwnersBySlug: { kayalvizhi: null },
      ownersBySlug: {
        ...ownersBySlug,
        "kayalvizhi-sm": { githubId: 56721895, githubLogin: "dinesh-ad" },
      },
    },
    true,
    "exception-author"
  );

  check(
    "legacy-owner-changes",
    {
      authorId: 56721895,
      authorLogin: "dinesh-ad",
      changedPaths: ["profiles/kayalvizhi/meta.ts"],
      baseOwnersBySlug: { kayalvizhi: null },
    },
    true,
    "exception-author"
  );

  check(
    "legacy-outside-contributor-changes",
    {
      authorId: 13678035,
      authorLogin: "sowmipriya",
      changedPaths: ["profiles/kayalvizhi/meta.ts"],
      baseOwnersBySlug: { kayalvizhi: null },
    },
    false,
    "legacy-profile-maintainer-only"
  );

  check(
    "contributor-changes-own-owned-profile",
    {
      authorId: 13678035,
      authorLogin: "sowmipriya",
      changedPaths: ["profiles/sowmipriya-rajendiran/meta.ts"],
      baseOwnersBySlug: {
        "sowmipriya-rajendiran": { githubId: 13678035, githubLogin: "sowmipriya" },
      },
    },
    true,
    "owner-ok"
  );

  it("unknown-actor-fails", () => {
    assert.throws(
      () => assertPrActor({ authorId: Number.NaN, authorLogin: "" }),
      /author id missing|author login missing/,
      "unknown-actor-fails"
    );
    assert.throws(
      () =>
        runOwnershipCheck({
          authorId: Number.NaN,
          authorLogin: "",
          changedPaths: ["profiles/alex-morgan/profile.json"],
          ownersBySlug,
          baseOwnersBySlug: {},
        }),
      /author id missing|author login missing/,
      "unknown-actor-run"
    );
  });

  it("legacy-base-load-records-null", () => {
    const map = loadOwnersFromGit("abc123", {
      execFileSync: (_cmd, args) => {
        if (args.includes("ls-tree")) {
          return "profiles/kayalvizhi/meta.ts\n";
        }
        return "export const kayalvizhiConfig = { slug: \"kayalvizhi\" };\n";
      },
    });
    assert.equal(Object.hasOwn(map, "kayalvizhi"), true);
    assert.equal(map["kayalvizhi"], null);
  });

  // CI mode without BASE_SHA: fail closed
  it("ci-missing-base-sha", () => {
    assert.throws(
      () => assertBaseShaInCi({ githubActions: "true", baseSha: "" }),
      /BASE_SHA is required/,
      "ci-missing-base-sha"
    );
  });

  it("ci-run-missing-base-sha", () => {
    assert.throws(
      () =>
        runOwnershipCheck({
          authorId: 13678035,
          authorLogin: "sowmipriya",
          changedPaths: ["profiles/sowmipriya-rajendiran/meta.ts"],
          githubActions: "true",
          baseSha: "",
          ownersBySlug,
        }),
      /BASE_SHA is required/,
      "ci-run-missing-base-sha"
    );
  });

  // Base git read error: fail closed (never fall back to head owners)
  it("base-read-error-ls-tree", () => {
    assert.throws(
      () =>
        loadOwnersFromGit("not-a-real-sha", {
          execFileSync: () => {
            throw new Error("simulated ls-tree failure");
          },
        }),
      /failed to list base owners/,
      "base-read-error-ls-tree"
    );
  });

  it("base-read-error-show", () => {
    assert.throws(
      () =>
        loadOwnersFromGit("abc123", {
          execFileSync: (_cmd, args) => {
            if (args.includes("ls-tree")) {
              return "profiles/alex-morgan/profile.json\n";
            }
            throw new Error("simulated show failure");
          },
        }),
      /failed to read base owner file/,
      "base-read-error-show"
    );
  });

  it("ci-run-base-read-error", () => {
    assert.throws(
      () =>
        runOwnershipCheck({
          authorId: 13678035,
          authorLogin: "sowmipriya",
          changedPaths: ["profiles/alex-morgan/profile.json"],
          githubActions: "true",
          baseSha: "abc123",
          ownersBySlug: {
            ...ownersBySlug,
            "alex-morgan": { githubId: 13678035, githubLogin: "sowmipriya" },
          },
          loadBaseOwners: () => {
            throw new Error(
              "check-profile-ownership: failed to list base owners (git ls-tree abc123)"
            );
          },
        }),
      /failed to list base owners/,
      "ci-run-base-read-error"
    );
  });
});
