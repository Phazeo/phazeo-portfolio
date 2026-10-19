/**
 * Changed-scope tests. Each case builds a temp git repo with real commits and runs the
 * scope computation on it. No network, no remotes.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { resolveBoundaryFiles } from "../../tools/checks/check-import-boundaries.ts";
import {
  type ChangedScope,
  computeChangedScope,
  isNarrowScope,
} from "../../tools/lib/changed-scope.ts";

type Tree = Record<string, string>;

function git(cwd: string, ...args: string[]): string {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: "Scope Test",
      GIT_AUTHOR_EMAIL: "scope-test@example.com",
      GIT_COMMITTER_NAME: "Scope Test",
      GIT_COMMITTER_EMAIL: "scope-test@example.com",
    },
  }).trim();
}

/**
 * Commit the current index to `branch` with plumbing commands. Fixture repos live in a
 * temp dir, so this avoids machine-level commit hooks that only apply to real work.
 */
function commitTo(root: string, branch: string, parent: string | null, message: string): void {
  git(root, "add", "-A");
  const tree = git(root, "write-tree");
  const parentArgs = parent ? ["-p", parent] : [];
  const commit = git(root, "commit-tree", tree, ...parentArgs, "-m", message);
  git(root, "update-ref", `refs/heads/${branch}`, commit);
}

function writeTree(root: string, tree: Tree): void {
  for (const [rel, body] of Object.entries(tree)) {
    const abs = join(root, rel);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, body);
  }
}

const BASE_TREE: Tree = {
  "profiles/alpha/meta.ts": "export const a = 1;\n",
  "profiles/beta/profile.json": "{}\n",
  "src/app/main.ts": "export const m = 1;\n",
  "src/kit/index.ts": "export const k = 1;\n",
  "README.md": "base\n",
};

/** Make a repo with a `main` commit and a `feature` commit that applies `change`. */
function withRepo(change: Tree, fn: (root: string) => void): void {
  const root = mkdtempSync(join(tmpdir(), "phazeo-scope-test-"));
  try {
    git(root, "init", "-q", "-b", "main");
    writeTree(root, BASE_TREE);
    commitTo(root, "main", null, "base");
    writeTree(root, change);
    commitTo(root, "feature", "main", "change");
    fn(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function scopeFor(change: Tree): ChangedScope {
  let scope: ChangedScope | undefined;
  withRepo(change, (root) => {
    scope = computeChangedScope(root, "main", "feature");
  });
  if (!scope) throw new Error("scope not computed");
  return scope;
}

describe("computeChangedScope", () => {
  it("profile-only change: slug set, not shared", () => {
    const scope = scopeFor({
      "profiles/alpha/meta.ts": "export const a = 2;\n",
      "public/profiles/beta/avatar.txt": "x\n",
    });
    assert.deepEqual(scope.changedSlugs, ["alpha", "beta"]);
    assert.equal(scope.sharedChanged, false);
    assert.equal(scope.failClosed, false);
  });

  it("shared-only change: no slugs, shared", () => {
    const scope = scopeFor({ "src/app/main.ts": "export const m = 2;\n" });
    assert.deepEqual(scope.changedSlugs, []);
    assert.equal(scope.sharedChanged, true);
    assert.equal(scope.failClosed, false);
    assert.deepEqual(scope.changedPaths, ["src/app/main.ts"]);
  });

  it("both: slugs and shared", () => {
    const scope = scopeFor({
      "profiles/beta/profile.json": '{"a":1}\n',
      "src/kit/index.ts": "export const k = 2;\n",
    });
    assert.deepEqual(scope.changedSlugs, ["beta"]);
    assert.equal(scope.sharedChanged, true);
    assert.equal(scope.failClosed, false);
  });

  it("diff failure (bogus revs) fails closed: every slug and shared", () => {
    withRepo({ "README.md": "changed\n" }, (root) => {
      const scope = computeChangedScope(root, "no-such-base", "no-such-head");
      assert.equal(scope.failClosed, true);
      assert.equal(scope.sharedChanged, true);
      assert.deepEqual(scope.changedSlugs, ["alpha", "beta"]);
    });
  });
});

describe("isNarrowScope", () => {
  const diff: ChangedScope = {
    changedSlugs: ["alpha"],
    sharedChanged: false,
    failClosed: false,
    changedPaths: ["profiles/alpha/meta.ts"],
  };

  it("narrow only for a PR with a computed diff and no full sweep", () => {
    assert.equal(isNarrowScope(diff, { GITHUB_EVENT_NAME: "pull_request" }), true);
    assert.equal(isNarrowScope(diff, { GITHUB_EVENT_NAME: "push" }), false);
    assert.equal(isNarrowScope(diff, { GITHUB_EVENT_NAME: "pull_request", SCOPE_FULL: "1" }), false);
    assert.equal(
      isNarrowScope({ ...diff, failClosed: true }, { GITHUB_EVENT_NAME: "pull_request" }),
      false
    );
  });
});

describe("resolveBoundaryFiles", () => {
  const PR_ENV = { GITHUB_EVENT_NAME: "pull_request" };
  const TREE: Tree = {
    "src/kit/index.ts": "export {};\n",
    "src/kit/button.tsx": "export {};\n",
    "src/features/home/page.ts": "export {};\n",
    "src/features/home/notes.md": "not source\n",
    "profiles/alpha/meta.ts": "export {};\n",
    "profiles/beta/meta.ts": "export {};\n",
  };

  function pick(scope: ChangedScope, env: NodeJS.ProcessEnv): { scoped: boolean; files: string[] } {
    const root = mkdtempSync(join(tmpdir(), "phazeo-scope-files-"));
    try {
      writeTree(root, TREE);
      const out = resolveBoundaryFiles(root, scope, env);
      const prefix = `${root}/`;
      return { scoped: out.scoped, files: out.files.map((f) => f.replace(prefix, "")) };
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }

  it("includes all of src/kit when shared code changed", () => {
    const out = pick(
      {
        changedSlugs: [],
        sharedChanged: true,
        failClosed: false,
        changedPaths: ["src/features/home/page.ts", "src/features/home/notes.md", "tools/x.ts"],
      },
      PR_ENV
    );
    assert.equal(out.scoped, true);
    assert.deepEqual(out.files, [
      "src/features/home/page.ts",
      "src/kit/button.tsx",
      "src/kit/index.ts",
    ]);
  });

  it("profile-only change checks just that profile's source files", () => {
    const out = pick(
      {
        changedSlugs: ["alpha"],
        sharedChanged: false,
        failClosed: false,
        changedPaths: ["profiles/alpha/meta.ts", "public/profiles/alpha/a.png"],
      },
      PR_ENV
    );
    assert.deepEqual(out.files, ["profiles/alpha/meta.ts"]);
  });

  it("nothing relevant changed: scoped with zero files", () => {
    const out = pick(
      { changedSlugs: [], sharedChanged: false, failClosed: false, changedPaths: [] },
      PR_ENV
    );
    assert.equal(out.scoped, true);
    assert.deepEqual(out.files, []);
  });

  it("full list for non-PR, SCOPE_FULL, or fail-closed", () => {
    const narrow: ChangedScope = {
      changedSlugs: [],
      sharedChanged: false,
      failClosed: false,
      changedPaths: [],
    };
    const all = pick(narrow, { GITHUB_EVENT_NAME: "push" });
    assert.equal(all.scoped, false);
    assert.equal(all.files.length, 5);
    assert.equal(pick(narrow, { ...PR_ENV, SCOPE_FULL: "1" }).files.length, 5);
    assert.equal(pick({ ...narrow, failClosed: true }, PR_ENV).files.length, 5);
  });
});
