/**
 * Build a git commit in an isolated temporary worktree.
 * The repository's own checkout, index, and config are never modified.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export type BuiltCommit = {
  sha: string;
  worktree: string;
  dist: string;
};

function git(root: string, args: readonly string[]): string {
  const r = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  if (r.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${(r.stderr || r.stdout || "").trim()}`);
  }
  return r.stdout.trim();
}

export function resolveCommit(root: string, rev: string): string {
  return git(root, ["rev-parse", "--verify", "--quiet", `${rev}^{commit}`]);
}

export function addWorktree(root: string, dir: string, sha: string): void {
  git(root, ["worktree", "add", "--detach", "--force", dir, sha]);
}

export function removeWorktree(root: string, dir: string): void {
  spawnSync("git", ["worktree", "remove", "--force", dir], { cwd: root, encoding: "utf8" });
  spawnSync("git", ["worktree", "prune"], { cwd: root, encoding: "utf8" });
}

/** Run a command in `cwd`, appending output to `logFile`. Throws with the log tail on failure. */
export function runLogged(
  cwd: string,
  logFile: string,
  cmd: string,
  args: readonly string[],
  env: Record<string, string | undefined> = {}
): void {
  const r = spawnSync(cmd, args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
    env: { ...process.env, ...env },
  });
  const header = `$ ${cmd} ${args.join(" ")}\n`;
  const body = `${header}${r.stdout ?? ""}${r.stderr ?? ""}\n`;
  const prior = existsSync(logFile) ? readFileSync(logFile, "utf8") : "";
  writeFileSync(logFile, prior + body, "utf8");
  if (r.status !== 0) {
    const tail = body.split("\n").slice(-60).join("\n");
    throw new Error(`${cmd} ${args.join(" ")} failed in ${cwd} (log: ${logFile})\n${tail}`);
  }
}

/** pnpm install --frozen-lockfile then pnpm build inside an existing checkout. */
export function installAndBuild(worktree: string, logFile: string): string {
  // HUSKY=0 keeps the `prepare` script from touching git hooks config.
  const env = { HUSKY: "0", CI: "true" };
  runLogged(worktree, logFile, "pnpm", ["install", "--frozen-lockfile"], env);
  runLogged(worktree, logFile, "pnpm", ["build"], env);
  const dist = join(worktree, "dist");
  if (!existsSync(join(dist, "index.html"))) {
    throw new Error(`build produced no dist/index.html in ${worktree}`);
  }
  return dist;
}
