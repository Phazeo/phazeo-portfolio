#!/usr/bin/env node
/**
 * Allowlist commit author/committer emails for the public portfolio repo.
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
 * Usage:
 *   node tools/guard/check-commit-emails.ts --range <git-range>
 *   node tools/guard/check-commit-emails.ts --sha <commit>
 */
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("../..", import.meta.url)));

export const PHAZEO_CI_EMAIL = "334465155+phazeo-ci-bot@users.noreply.github.com";
export const OWNER_EMAIL = "56721895+dinesh-ad@users.noreply.github.com";
export const GITHUB_MERGE_COMMITTER = "noreply@github.com";

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
 * given a GitHub API attestation for the merge committer case.
 * `githubAttested` is true when verification.verified is true, or when the
 * API commit object itself names committer GitHub + noreply@github.com
 * (legacy unsigned web merges).
 */
export function isAllowedCommitIdentity(
  commit: CommitIdentity,
  githubAttested: boolean
): boolean {
  if (!isAllowedAuthorEmail(commit.authorEmail)) {
    return false;
  }
  if (ALLOWED_EMAILS.has(commit.committerEmail)) {
    return true;
  }
  if (commit.committerEmail === GITHUB_MERGE_COMMITTER) {
    return commit.parents.length >= 2 && githubAttested;
  }
  return false;
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

export function listShasInRange(cwd: string, range: string): string[] {
  const out = execFileSync("git", ["-C", cwd, "rev-list", "--reverse", range], {
    encoding: "utf8",
  });
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
  return { owner: "Phazeo", repo: "phazeo-portfolio-profiles" };
}

/**
 * Ask GitHub whether this SHA is attested as a GitHub merge committer case:
 * - verification.verified === true (signed web merge), or
 * - API committer is exactly GitHub + noreply@github.com (legacy unsigned web merge).
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
    "User-Agent": "phazeo-portfolio-profiles-commit-emails",
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
    commit?: {
      committer?: { name?: string; email?: string };
      verification?: { verified?: boolean };
    };
  };
  if (data.commit?.verification?.verified === true) {
    return true;
  }
  const c = data.commit?.committer;
  return c?.email === GITHUB_MERGE_COMMITTER && c?.name === "GitHub";
}

export async function checkCommitEmails(
  cwd: string,
  shas: readonly string[],
  lookup: VerifiedLookup
): Promise<{ ok: boolean; failures: string[] }> {
  const failures: string[] = [];
  for (const sha of shas) {
    const commit = readCommitIdentity(cwd, sha);
    let githubAttested = false;
    const needsAttestation =
      commit.committerEmail === GITHUB_MERGE_COMMITTER && !ALLOWED_EMAILS.has(commit.committerEmail);
    if (needsAttestation) {
      githubAttested = await lookup(commit.sha);
    }
    if (!isAllowedCommitIdentity(commit, githubAttested)) {
      const short = commit.sha.slice(0, 7);
      failures.push(
        `${short} author=${commit.authorEmail} committer=${commit.committerEmail} parents=${commit.parents.length} githubAttested=${githubAttested}`
      );
    }
  }
  return { ok: failures.length === 0, failures };
}

function parseArgs(argv: readonly string[]): { range: string | null; sha: string | null } {
  let range: string | null = null;
  let sha: string | null = null;
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i] ?? "";
    const next = argv[i + 1];
    if (a === "--range" && next) {
      range = next;
      i++;
    } else if (a === "--sha" && next) {
      sha = next;
      i++;
    } else if (a === "-h" || a === "--help") {
      console.log("Usage: check-commit-emails.ts --range <git-range> | --sha <commit>");
      process.exit(0);
    } else {
      console.error(`check-commit-emails: unknown argument ${a}`);
      process.exit(2);
    }
  }
  return { range, sha };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv);
  if (!args.range && !args.sha) {
    console.error("check-commit-emails: pass --range <git-range> or --sha <commit>");
    process.exit(2);
  }
  const shas = args.sha ? [args.sha] : listShasInRange(ROOT, args.range ?? "");
  if (shas.length === 0) {
    console.log("check-commit-emails: no commits in range");
    return;
  }
  const result = await checkCommitEmails(ROOT, shas, (sha) => fetchGithubMergeAttestation(sha));
  if (!result.ok) {
    console.error("check-commit-emails: disallowed author/committer email(s):");
    for (const line of result.failures) {
      console.error(`  ${line}`);
    }
    process.exit(1);
  }
  console.log(`check-commit-emails: OK (${shas.length} commit${shas.length === 1 ? "" : "s"})`);
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
