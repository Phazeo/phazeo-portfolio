#!/usr/bin/env node
/**
 * Strict format lock for policy files that the leak scanner path-allowlists.
 * Rejects any line that is not a blank, an approved comment, or a matching digest/exception.
 */
import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const MAX_BYTES = 16 * 1024;

const COMMENT_TEXT_RE = /^[A-Za-z0-9 ,.:()/-]{0,100}$/;
const DENYLIST_DIGEST_RE = /^[0-9a-f]{64}$/;
const EXCEPTION_LINE_RE =
  /^[0-9a-f]{40} (denylist-token|commit-email) owner accepted \d{4}-\d{2}-\d{2}: (term already public in main history|historical merge, unsigned)$/;

export const DEFAULT_DENYLIST_PATH = resolve(ROOT, "config/policy/boundary-denylist.sha256");
export const DEFAULT_EXCEPTIONS_PATH = resolve(ROOT, "config/policy/boundary-exceptions.txt");

export type PolicyKind = "denylist" | "exceptions";

export type PolicyCheckResult = {
  ok: boolean;
  errors: string[];
};

function isAsciiUtf8(buf: Buffer): boolean {
  for (const b of buf) {
    if (b > 0x7f) return false;
  }
  return true;
}

function checkSharedEnvelope(label: string, buf: Buffer, errors: string[]): string | null {
  if (buf.byteLength > MAX_BYTES) {
    errors.push(`${label}: file exceeds ${MAX_BYTES} bytes (${buf.byteLength})`);
    return null;
  }
  if (!isAsciiUtf8(buf)) {
    errors.push(`${label}: non-ASCII or non-UTF-8 byte present`);
    return null;
  }
  const text = buf.toString("utf8");
  if (text.includes("\r")) {
    errors.push(`${label}: CRLF or bare CR line ending is not allowed (LF only)`);
    return null;
  }
  return text;
}

function checkComment(label: string, lineNo: number, line: string, errors: string[]): void {
  if (!line.startsWith("# ")) {
    errors.push(`${label}:${lineNo}: comment must start with "# "`);
    return;
  }
  const text = line.slice(2);
  if (!COMMENT_TEXT_RE.test(text)) {
    errors.push(
      `${label}:${lineNo}: comment text must be at most 100 chars of [A-Za-z0-9 ,.:()/-]`
    );
  }
}

export function checkDenylistText(label: string, text: string): PolicyCheckResult {
  const errors: string[] = [];
  const seen = new Set<string>();
  const lines = text.split("\n");
  // Allow a trailing empty split from a final LF; reject empty file mid-content via loop.
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    const lineNo = i + 1;
    if (i === lines.length - 1 && line === "") continue;
    if (line === "") continue;
    if (line.startsWith("#")) {
      checkComment(label, lineNo, line, errors);
      continue;
    }
    if (!DENYLIST_DIGEST_RE.test(line)) {
      errors.push(`${label}:${lineNo}: expected 64 lowercase hex digits`);
      continue;
    }
    if (seen.has(line)) {
      errors.push(`${label}:${lineNo}: duplicate digest`);
      continue;
    }
    seen.add(line);
  }
  return { ok: errors.length === 0, errors };
}

export function checkExceptionsText(label: string, text: string): PolicyCheckResult {
  const errors: string[] = [];
  const seen = new Set<string>();
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    const lineNo = i + 1;
    if (i === lines.length - 1 && line === "") continue;
    if (line === "") continue;
    if (line.startsWith("#")) {
      checkComment(label, lineNo, line, errors);
      continue;
    }
    if (!EXCEPTION_LINE_RE.test(line)) {
      errors.push(
        `${label}:${lineNo}: expected 40-hex rule owner accepted YYYY-MM-DD: fixed reason`
      );
      continue;
    }
    const sha = line.slice(0, 40);
    const rule = line.slice(41).split(" ")[0] ?? "";
    const key = `${sha} ${rule}`;
    if (seen.has(key)) {
      errors.push(`${label}:${lineNo}: duplicate SHA and rule pair`);
      continue;
    }
    seen.add(key);
  }
  return { ok: errors.length === 0, errors };
}

export function checkPolicyFile(path: string, kind: PolicyKind): PolicyCheckResult {
  const label = path;
  let buf: Buffer;
  try {
    const st = statSync(path);
    if (st.size > MAX_BYTES) {
      return {
        ok: false,
        errors: [`${label}: file exceeds ${MAX_BYTES} bytes (${st.size})`],
      };
    }
    buf = readFileSync(path);
  } catch (err) {
    return {
      ok: false,
      errors: [`${label}: ${err instanceof Error ? err.message : String(err)}`],
    };
  }
  const errors: string[] = [];
  const text = checkSharedEnvelope(label, buf, errors);
  if (text === null) return { ok: false, errors };
  const body = kind === "denylist" ? checkDenylistText(label, text) : checkExceptionsText(label, text);
  return { ok: body.ok && errors.length === 0, errors: [...errors, ...body.errors] };
}

export function checkPolicyFiles(
  denylistPath = DEFAULT_DENYLIST_PATH,
  exceptionsPath = DEFAULT_EXCEPTIONS_PATH
): PolicyCheckResult {
  const a = checkPolicyFile(denylistPath, "denylist");
  const b = checkPolicyFile(exceptionsPath, "exceptions");
  return { ok: a.ok && b.ok, errors: [...a.errors, ...b.errors] };
}

function main(): void {
  const result = checkPolicyFiles();
  if (!result.ok) {
    console.error("check-policy-files: format errors:");
    for (const e of result.errors) {
      console.error(`  ${e}`);
    }
    process.exit(1);
  }
  console.log("check-policy-files: OK");
}

const isDirectRun =
  process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  main();
}
