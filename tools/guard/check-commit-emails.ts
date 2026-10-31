#!/usr/bin/env node
/**
 * Allowlist commit author/committer emails for first-parent commits on
 * protected branches (push path). PR commits from forks are not checked here.
 *
 * Allowed identities:
 * - Phazeo CI bot GitHub noreply
 * - Owner GitHub noreply
 *
 * GitHub merge commits may use committer noreply@github.com only when:
 * - the commit has 2 or more parents
 * - the author is an allowed noreply identity
 * - GitHub reports commit.verification.verified === true
 *
 * Exact SHAs listed in config/policy/boundary-exceptions.txt with rule
 * commit-email may skip this check when already an ancestor of origin/main.
 *
 * Usage:
 *   node tools/guard/check-commit-emails.ts --range <git-range> [--first-parent]
 *   node tools/guard/check-commit-emails.ts --sha <commit>
 */
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  isAncestorOfProtectedTip,
  loadExceptions,
  type BoundaryException,
} from "./check-public-boundary.ts";

const ROOT = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const EXCEPTIONS_PATH = resolve(ROOT, "config/policy/boundary-exceptions.txt");

// Retired machine user: kept only so its commits already in history still pass.
export const PHAZEO_CI_EMAIL = "334465155+phazeo-ci-bot@users.noreply.github.com";
// The assistant GitHub App: it never authors content, only the merge commits GitHub creates for it.
export const PHAZEO_BOT_EMAIL = "350456534+phazeo[bot]@users.noreply.github.com";
export const OWNER_EMAIL = "56721895+dinesh-ad@users.noreply.github.com";
export const GITHUB_MERGE_COMMITTER = "noreply@github.com";
export const COMMIT_EMAIL_RULE = "commit-email";

const ALLOWED_EMAILS = new Set([PHAZEO_CI_EMAIL, OWNER_EMAIL]);

export type CommitIdentity = {
  sha: string;
  parents: string[];
  authorEmail: string;
  committerEmail: string;
};

export type VerifiedLookup = (sha: string) => boolean | Promise<boolean>;

export function isAllowedAuthorEmail(email: string): boolean {
  return ALLOWED_EMAILS.has(email);
}

/**
 * Pure rule: whether this commit's author/committer pair is allowed,
 * given verification.verified from the GitHub API (required for merge committer).
 */
export function isAllowedCommitIdentity(commit: CommitIdentity, verified: boolean): boolean {
  if (commit.authorEmail === PHAZEO_BOT_EMAIL) {
    return (
      commit.committerEmail === GITHUB_MERGE_COMMITTER && commit.parents.length >= 2 && verified
    );
  }
  if (!isAllowedAuthorEmail(commit.authorEmail)) {
    return false;
  }
  if (ALLOWED_EMAILS.has(commit.committerEmail)) {
    return true;
  }
  if (commit.committerEmail === GITHUB_MERGE_COMMITTER) {
    return commit.parents.length >= 2 && verified;
  }
  return false;
}

/** True when sha has a commit-email exception and is already on a protected tip. */
export function hasCommitEmailException(
  sha: string,
  exceptions: readonly BoundaryException[],
  cwd: string
): boolean {
  const full = sha.toLowerCase();
  const match = exceptions.find((e) => e.sha === full && e.rule === COMMIT_EMAIL_RULE);
  if (!match) return false;
  return isAncestorOfProtectedTip(full, cwd);
}

export function readCommitIdentity(cwd: string, sha: string): CommitIdentity {
  const out = execFileSync(
    "git",
    ["-C", cwd, "log", "-1", "--format=%H%n%P%n%ae%n%ce", sha],
    { encoding: "utf8" }
  );
  const lines = out.trimEnd().split("\n");
  const full = (lines[0] ?? "").trim();
  const parentsLine = (lines[1] ?? "").trim();
  const authorEmail = (lines[2] ?? "").trim();
  const committerEmail = (lines[3] ?? "").trim();
  const parents = parentsLine ? parentsLine.split(/\s+/).filter(Boolean) : [];
  return { sha: full, parents, authorEmail, committerEmail };
}

export function listShasInRange(cwd: string, range: string, firstParent = false): string[] {
  const args = ["-C", cwd, "rev-list", "--reverse"];
  if (firstParent) args.push("--first-parent");
  args.push(range);
  const out = execFileSync("git", args, { encoding: "utf8" });
  return out
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

function parseRepoSlug(env: NodeJS.ProcessEnv = process.env): { owner: string; repo: string } {
  const slug = env["GITHUB_REPOSITORY"];
  if (slug && slug.includes("/")) {
    const [owner, repo] = slug.split("/");
    if (owner && repo) return { owner, repo };
  }
  return { owner: "Phazeo", repo: "phazeo-portfolio" };
}

/**
 * Return true only when GitHub reports commit.verification.verified === true.
 * Do not trust committer name/email from the API: those are the fields anyone
 * can write into a local commit object.
 */
export async function fetchGithubMergeAttestation(
  sha: string,
  opts: {
    owner?: string;
    repo?: string;
    token?: string;
    fetchImpl?: typeof fetch;
  } = {}
): Promise<boolean> {
  const { owner, repo } = opts.owner && opts.repo ? opts : parseRepoSlug();
  const fetchImpl = opts.fetchImpl ?? fetch;
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "phazeo-portfolio-commit-emails",
  };
  const token = opts.token ?? process.env["GITHUB_TOKEN"] ?? process.env["GH_TOKEN"];
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const url = `https://api.github.com/repos/${owner}/${repo}/commits/${sha}`;
  const res = await fetchImpl(url, { headers });
  if (!res.ok) {
    throw new Error(`GitHub commit lookup failed for ${sha.slice(0, 7)}: HTTP ${res.status}`);
  }
  const data = (await res.json()) as {
    commit?: { verification?: { verified?: boolean } };
  };
  return data.commit?.verification?.verified === true;
}

export async function checkCommitEmails(
  cwd: string,
  shas: readonly string[],
  lookup: VerifiedLookup,
  opts: {
    exceptions?: readonly BoundaryException[];
    exceptionsPath?: string;
  } = {}
): Promise<{ ok: boolean; failures: string[]; exceptionsApplied: number }> {
  const exceptions =
    opts.exceptions ?? loadExceptions(opts.exceptionsPath ?? EXCEPTIONS_PATH);
  const failures: string[] = [];
  let exceptionsApplied = 0;
  for (const sha of shas) {
    const commit = readCommitIdentity(cwd, sha);
    let verified = false;
    const needsVerify =
      commit.committerEmail === GITHUB_MERGE_COMMITTER && !ALLOWED_EMAILS.has(commit.committerEmail);
    if (needsVerify) {
      verified = await lookup(commit.sha);
    }
    if (isAllowedCommitIdentity(commit, verified)) {
      continue;
    }
    if (hasCommitEmailException(commit.sha, exceptions, cwd)) {
      exceptionsApplied++;
      continue;
    }
    const short = commit.sha.slice(0, 7);
    failures.push(
      `${short} author=${commit.authorEmail} committer=${commit.committerEmail} parents=${commit.parents.length} verified=${verified}`
    );
  }
  return { ok: failures.length === 0, failures, exceptionsApplied };
}

function parseArgs(argv: readonly string[]): {
  range: string | null;
  sha: string | null;
  firstParent: boolean;
} {
  let range: string | null = null;
  let sha: string | null = null;
  let firstParent = false;
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i] ?? "";
    const next = argv[i + 1];
    if (a === "--range" && next) {
      range = next;
      i++;
    } else if (a === "--sha" && next) {
      sha = next;
      i++;
    } else if (a === "--first-parent") {
      firstParent = true;
    } else if (a === "-h" || a === "--help") {
      console.log(
        "Usage: check-commit-emails.ts --range <git-range> [--first-parent] | --sha <commit>"
      );
      process.exit(0);
    } else {
      console.error(`check-commit-emails: unknown argument ${a}`);
      process.exit(2);
    }
  }
  return { range, sha, firstParent };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv);
  if (!args.range && !args.sha) {
    console.error("check-commit-emails: pass --range <git-range> or --sha <commit>");
    process.exit(2);
  }
  const shas = args.sha
    ? [args.sha]
    : listShasInRange(ROOT, args.range ?? "", args.firstParent);
  if (shas.length === 0) {
    console.log("check-commit-emails: no commits in range");
    return;
  }
  const result = await checkCommitEmails(ROOT, shas, (sha) => fetchGithubMergeAttestation(sha));
  if (result.exceptionsApplied > 0) {
    console.log(
      `check-commit-emails: applied ${result.exceptionsApplied} listed exception${result.exceptionsApplied === 1 ? "" : "s"}`
    );
  }
  if (!result.ok) {
    console.error("check-commit-emails: disallowed author/committer email(s):");
    for (const line of result.failures) {
      console.error(`  ${line}`);
    }
    process.exit(1);
  }
  console.log(
    `check-commit-emails: OK (${shas.length} commit${shas.length === 1 ? "" : "s"}${args.firstParent ? ", first-parent" : ""})`
  );
}

const isDirectRun =
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}
