#!/usr/bin/env node
/**
 * After a deploy, check that the live site sends the headers the build wrote.
 * Only the header names listed in dist/_headers for the checked path are
 * compared. Retries until they match or the time limit passes.
 *
 *   --headers <dist/_headers> --domain <host> --allowed-hosts <file>
 *   [--path /] [--timeout-seconds 60] [--interval-seconds 5]
 *
 * Exit 0: match. Exit 1: still different at the time limit. Exit 2: bad input.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

export type HeaderRule = { pattern: string; headers: [string, string][] };

type FetchLike = (url: string, init: RequestInit) => Promise<Response>;

export type VerifyOptions = {
  url: string;
  expected: ReadonlyMap<string, string>;
  timeoutMs: number;
  intervalMs: number;
  fetchFn?: FetchLike;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
};

export type VerifyResult = { ok: boolean; attempts: number; mismatches: string[] };

const HOST_RE = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/;
const REQUEST_TIMEOUT_MS = 10_000;

/** Parse the _headers format: a path line, then indented "Name: value" lines. */
export function parseHeadersFile(text: string): HeaderRule[] {
  const rules: HeaderRule[] = [];
  let current: HeaderRule | null = null;
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const raw = (lines[i] ?? "").replace(/\r$/, "");
    if (raw.trim() === "" || raw.trim().startsWith("#")) continue;
    if (!/^\s/.test(raw)) {
      current = { pattern: raw.trim(), headers: [] };
      rules.push(current);
      continue;
    }
    const m = /^\s+([A-Za-z0-9-]+):\s*(.*)$/.exec(raw);
    if (!current || !m) throw new Error(`_headers line ${i + 1}: expected "Name: value" under a path`);
    current.headers.push([m[1] ?? "", (m[2] ?? "").trim()]);
  }
  return rules;
}

function ruleMatches(pattern: string, path: string): boolean {
  if (pattern === path) return true;
  return pattern.endsWith("*") && !pattern.slice(0, -1).includes("*") && path.startsWith(pattern.slice(0, -1));
}

/** Headers every matching rule sets for this path; repeated names join with ", ". */
export function expectedHeaders(rules: readonly HeaderRule[], path: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const rule of rules) {
    if (!ruleMatches(rule.pattern, path)) continue;
    for (const [name, value] of rule.headers) {
      const key = name.toLowerCase();
      const prev = out.get(key);
      out.set(key, prev === undefined ? value : `${prev}, ${value}`);
    }
  }
  return out;
}

/** Names whose live value differs from the expected one (missing counts as different). */
export function compareHeaders(expected: ReadonlyMap<string, string>, actual: Headers): string[] {
  const mismatches: string[] = [];
  for (const [name, value] of expected) {
    const got = actual.get(name);
    if (got === null || got.trim() !== value) {
      mismatches.push(`${name}: expected "${value}", got ${got === null ? "nothing" : `"${got.trim()}"`}`);
    }
  }
  return mismatches;
}

export async function verifyLive(opts: VerifyOptions): Promise<VerifyResult> {
  const fetchFn = opts.fetchFn ?? fetch;
  const now = opts.now ?? Date.now;
  const sleep = opts.sleep ?? ((ms: number) => delay(ms).then(() => undefined));
  const deadline = now() + opts.timeoutMs;
  let attempts = 0;
  let mismatches: string[] = [];
  for (;;) {
    attempts++;
    try {
      const res = await fetchFn(opts.url, {
        redirect: "manual",
        cache: "no-store",
        headers: { "cache-control": "no-cache" },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      mismatches = compareHeaders(opts.expected, res.headers);
      if (res.status !== 200) mismatches.unshift(`status: expected 200, got ${res.status}`);
    } catch (err) {
      mismatches = [`request failed: ${err instanceof Error ? err.message : String(err)}`];
    }
    if (mismatches.length === 0) return { ok: true, attempts, mismatches };
    if (now() + opts.intervalMs > deadline) return { ok: false, attempts, mismatches };
    await sleep(opts.intervalMs);
  }
}

/** Exact, non-wildcard hosts from the reviewed host allowlist. */
export function listedHosts(text: string): Set<string> {
  const out = new Set<string>();
  for (const line of text.split("\n")) {
    const t = line.trim().toLowerCase();
    if (t && !t.startsWith("#") && !t.startsWith("*.")) out.add(t);
  }
  return out;
}

function flag(argv: readonly string[], name: string, fallback?: string): string {
  const i = argv.indexOf(name);
  const v = i >= 0 ? argv[i + 1] : fallback;
  if (v === undefined || v.startsWith("--")) {
    console.error(`verify-live-headers: missing ${name}`);
    process.exit(2);
  }
  return v;
}

function seconds(argv: readonly string[], name: string, fallback: string): number {
  const n = Number(flag(argv, name, fallback));
  if (!Number.isInteger(n) || n < 1 || n > 600) {
    console.error(`verify-live-headers: ${name} must be 1 to 600`);
    process.exit(2);
  }
  return n * 1000;
}

async function main(argv: readonly string[]): Promise<void> {
  const domain = flag(argv, "--domain").toLowerCase();
  const path = flag(argv, "--path", "/");
  if (!HOST_RE.test(domain) || !listedHosts(readFileSync(flag(argv, "--allowed-hosts"), "utf8")).has(domain)) {
    console.error("verify-live-headers: domain must be a host listed exactly in the host allowlist");
    process.exit(2);
  }
  if (!path.startsWith("/")) {
    console.error("verify-live-headers: --path must start with /");
    process.exit(2);
  }
  const expected = expectedHeaders(parseHeadersFile(readFileSync(flag(argv, "--headers"), "utf8")), path);
  if (expected.size === 0) {
    console.error(`verify-live-headers: _headers sets nothing for ${path}`);
    process.exit(2);
  }
  const result = await verifyLive({
    url: `https://${domain}${path}`,
    expected,
    timeoutMs: seconds(argv, "--timeout-seconds", "60"),
    intervalMs: seconds(argv, "--interval-seconds", "5"),
  });
  if (result.ok) {
    console.log(`verify-live-headers: ${expected.size} headers match (attempt ${result.attempts})`);
    return;
  }
  console.error(`verify-live-headers: still different after ${result.attempts} attempts:`);
  for (const m of result.mismatches) console.error(`  ${m}`);
  process.exit(1);
}

const isDirectRun =
  process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  await main(process.argv.slice(2));
}
