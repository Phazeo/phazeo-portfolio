#!/usr/bin/env node
/**
 * Write (or --check) dist/_headers with a hashed CSP for the static host.
 * Hashes are computed from dist/index.html - never hard-coded.
 *
 * Path blocks are structured so static host merge does not duplicate header names:
 * /* carries security headers; /assets/* only adds Cache-Control.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ASSETS_CACHE_VALUE,
  assertHeadersMerge,
  parseHeadersFile,
} from "./headers-merge.ts";

const ROOT = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const DIST = join(ROOT, "dist");
const INDEX = join(DIST, "index.html");
const HEADERS_PATH = join(DIST, "_headers");

/** Any inline event-handler attribute: on* = … inside a tag. */
const INLINE_HANDLER = /<[^>]+\son[a-z]+\s*=/i;

const STYLE_BLOCK = /<style\b[^>]*>/i;
const STYLE_ATTR = /\sstyle\s*=/i;

const ASSETS_CACHE = `Cache-Control: ${ASSETS_CACHE_VALUE}`;

function fail(msg: string): never {
  console.error(`write-headers: ${msg}`);
  process.exit(1);
}

function sha256Base64(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("base64");
}

/**
 * Extract text content of every inline <script> (no src=).
 * Uses a simple scan so we hash exactly what the browser sees.
 */
function extractInlineScripts(html: string): string[] {
  const scripts: string[] = [];
  const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  for (const m of html.matchAll(re)) {
    const attrs = m[1] ?? "";
    if (/\bsrc\s*=/i.test(attrs)) continue;
    scripts.push(m[2] ?? "");
  }
  return scripts;
}

function buildCsp(html: string): string {
  if (INLINE_HANDLER.test(html)) {
    fail("inline event handler attribute found in dist/index.html");
  }
  if (STYLE_BLOCK.test(html)) {
    fail(
      "inline <style> block found in dist/index.html - refuse 'unsafe-inline'; STOP and report"
    );
  }
  if (STYLE_ATTR.test(html)) {
    fail(
      "style= attribute found in dist/index.html - refuse 'unsafe-inline'; STOP and report"
    );
  }

  const inline = extractInlineScripts(html);
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

function buildHeadersFile(html: string): string {
  const csp = buildCsp(html);
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
  const check = process.argv.includes("--check");
  if (!existsSync(INDEX)) {
    fail("dist/index.html missing - run pnpm build first");
  }
  const html = readFileSync(INDEX, "utf8");
  const expected = buildHeadersFile(html);

  if (check) {
    if (!existsSync(HEADERS_PATH)) {
      fail("dist/_headers missing");
    }
    const actual = readFileSync(HEADERS_PATH, "utf8");
    if (actual !== expected) {
      fail("dist/_headers does not match current dist/index.html hashes");
    }
    assertHeadersPolicy(actual);
    console.log("write-headers: --check OK");
    return;
  }

  writeFileSync(HEADERS_PATH, expected, "utf8");
  console.log("write-headers: wrote dist/_headers");
}

main();
