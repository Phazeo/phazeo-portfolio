#!/usr/bin/env node
/**
 * Unit tests for decideProfileOwnership (no network).
 */
import assert from "node:assert/strict";
import { decideProfileOwnership, parseApprovedOwners } from "./profile-ownership.mjs";

const approved = parseApprovedOwners(`56721895 dinesh-ad\n13678035 sowmipriya\n99900001 guest-user\n`);
const exceptionIds = new Set([56721895, 334465155]); // dinesh-ad, phazeo-ci-bot
const ownersBySlug = {
  "dinesh-allimuthu": { githubId: 56721895, githubLogin: "dinesh-ad" },
  "sowmipriya-rajendiran": { githubId: 13678035, githubLogin: "sowmipriya" },
  "sriram-sm": { githubId: 56721895, githubLogin: "dinesh-ad" },
  "alex-morgan": { githubId: 99900001, githubLogin: "guest-user" },
};

function check(name, input, expectOk, expectReason) {
  const result = decideProfileOwnership({
    approvedOwners: approved,
    exceptionIds,
    ownersBySlug,
    ...input,
  });
  assert.equal(result.ok, expectOk, `${name}: ok`);
  assert.equal(result.reason, expectReason, `${name}: reason`);
  console.log(`OK: ${name}`);
}

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
    changedPaths: ["src/pages/HomePage.tsx", "profiles/sriram-sm/meta.ts"],
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
    changedPaths: ["src/pages/HomePage.tsx"],
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

console.log("test-profile-ownership: all cases OK");
