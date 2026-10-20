#!/usr/bin/env node
/**
 * Write (or --check) dist/_headers with a hashed CSP for the static host.
 * Hashes are computed from dist/index.html - never hard-coded.
 *
 * Path blocks are structured so static host merge does not duplicate header names:
 * /* carries security headers; /assets/* only adds Cache-Control.
 *
 * Usage: node tools/build/write-headers.ts [--check] [--dir <out-dir>]
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ASSETS_CACHE_VALUE,
  assertHeadersMerge,
  parseHeadersFile,
} from "./headers-merge.ts";

const ROOT = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const DEFAULT_DIST = join(ROOT, "dist");

/** Any inline event-handler attribute: on* = … inside a tag. */
const INLINE_HANDLER = /<[^>]+\son[a-z]+\s*=/i;

const STYLE_BLOCK = /<style\b[^>]*>/i;
const STYLE_ATTR = /\sstyle\s*=/i;

const ASSETS_CACHE = `Cache-Control: ${ASSETS_CACHE_VALUE}`;

function fail(msg: string): never {
  console.error(`write-headers: ${msg}`);
  process.exit(1);
}

function parseArgs(argv: readonly string[]): { check: boolean; dist: string } {
  let check = false;
  let dist = DEFAULT_DIST;
  for (let i = 2; i < argv.length; i++) {
    const next = argv[i + 1];
    if (argv[i] === "--check") {
      check = true;
    } else if (argv[i] === "--dir" && next) {
      dist = resolve(next);
      i++;
    }
  }
  return { check, dist };
}

function sha256Base64(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("base64");
}

/** Case-insensitive script start tags in the document. */
export function countScriptStartTags(html: string): number {
  return [...html.matchAll(/<script\b/gi)].length;
}

export type ExtractedScripts = {
  inline: string[];
  externalWithSrc: number;
};

/**
 * Extract every well-formed <script>...</script> pair.
 * Start tags may carry attributes; end tags are case-insensitive and allow
 * optional whitespace before ">" (for example </script > or </SCRIPT>).
 * Fail closed when start-tag count does not equal extracted pairs.
 */
export function extractScripts(html: string): ExtractedScripts {
  const re = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;
  const inline: string[] = [];
  let externalWithSrc = 0;
  for (const m of html.matchAll(re)) {
    const attrs = m[1] ?? "";
    if (/\bsrc\s*=/i.test(attrs)) {
      externalWithSrc++;
      continue;
    }
    inline.push(m[2] ?? "");
  }
  const starts = countScriptStartTags(html);
  const extracted = inline.length + externalWithSrc;
  if (extracted !== starts) {
    throw new Error(
      `write-headers: script tag count mismatch (starts=${starts} extracted=${extracted})`
    );
  }
  return { inline, externalWithSrc };
}

/** Inline script bodies only (no src=). Used by CSP hashing. */
export function extractInlineScripts(html: string): string[] {
  return extractScripts(html).inline;
}

function buildCsp(html: string, indexLabel: string): string {
  if (INLINE_HANDLER.test(html)) {
    fail(`inline event handler attribute found in ${indexLabel}`);
  }
  if (STYLE_BLOCK.test(html)) {
    fail(`inline <style> block found in ${indexLabel} - refuse 'unsafe-inline'; STOP and report`);
  }
  if (STYLE_ATTR.test(html)) {
    fail(`style= attribute found in ${indexLabel} - refuse 'unsafe-inline'; STOP and report`);
  }

  let inline: string[];
  try {
    inline = extractInlineScripts(html);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    fail(message.replace(/^write-headers:\s*/, ""));
  }
  const hashes: string[] = [];
  for (const body of inline) {
    if (body.length === 0) {
      fail("empty inline <script> cannot be hashed meaningfully");
    }
    hashes.push(`'sha256-${sha256Base64(body)}'`);
  }

  const scriptSrc =
    hashes.length > 0 ? `script-src 'self' ${hashes.join(" ")}` : `script-src 'self'`;

  return [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

function securityHeaderLines(csp: string): string[] {
  return [
    `  Content-Security-Policy: ${csp}`,
    "  X-Content-Type-Options: nosniff",
    "  Referrer-Policy: strict-origin-when-cross-origin",
    "  X-Frame-Options: DENY",
    "  Cross-Origin-Opener-Policy: same-origin",
    "  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
    "  Strict-Transport-Security: max-age=31536000",
  ];
}

function buildHeadersFile(html: string, indexLabel: string): string {
  const csp = buildCsp(html, indexLabel);
  const sec = securityHeaderLines(csp);
  const lines = ["/*", ...sec, "", "/assets/*", `  ${ASSETS_CACHE}`, ""];
  return lines.join("\n");
}

function assertHeadersPolicy(headersText: string): void {
  if (/(^|\n)\/index\.html(\n|$)/.test(headersText)) {
    fail("/index.html path block must not be present");
  }
  const blocks = parseHeadersFile(headersText);
  const assets = blocks.find((b) => b.pattern === "/assets/*");
  if (!assets) {
    fail("missing /assets/* block");
  }
  if (assets.headers.size !== 1 || !assets.headers.has("Cache-Control")) {
    fail("/assets/* must contain only Cache-Control");
  }
  if (assets.headers.get("Cache-Control") !== ASSETS_CACHE_VALUE) {
    fail(`/assets/* must include ${ASSETS_CACHE}`);
  }
  const issues = assertHeadersMerge(headersText);
  if (issues.length > 0) {
    fail(`static host merge checks failed:\n${issues.join("\n")}`);
  }
}

function main(): void {
  const { check, dist } = parseArgs(process.argv);
  const indexPath = join(dist, "index.html");
  const headersPath = join(dist, "_headers");
  const indexLabel = relative(ROOT, indexPath) || indexPath;
  const headersLabel = relative(ROOT, headersPath) || headersPath;

  if (!existsSync(indexPath)) {
    fail(`${indexLabel} missing - run pnpm build first`);
  }
  const html = readFileSync(indexPath, "utf8");
  const expected = buildHeadersFile(html, indexLabel);

  if (check) {
    if (!existsSync(headersPath)) {
      fail(`${headersLabel} missing`);
    }
    const actual = readFileSync(headersPath, "utf8");
    if (actual !== expected) {
      fail(`${headersLabel} does not match current ${indexLabel} hashes`);
    }
    assertHeadersPolicy(actual);
    console.log("write-headers: --check OK");
    return;
  }

  writeFileSync(headersPath, expected, "utf8");
  console.log(`write-headers: wrote ${headersLabel}`);
}

const isDirectRun =
  process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  main();
}
