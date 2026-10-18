#!/usr/bin/env node
/**
 * Write (or --check) dist/_headers with a hashed CSP for Cloudflare Pages.
 * Hashes are computed from dist/index.html — never hard-coded.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const DIST = join(ROOT, "dist");
const INDEX = join(DIST, "index.html");
const HEADERS_PATH = join(DIST, "_headers");

const INLINE_HANDLER =
  /\s(on(?:abort|blur|cancel|canplay|canplaythrough|change|click|close|contextmenu|copy|cuechange|cut|dblclick|drag|dragend|dragenter|dragleave|dragover|dragstart|drop|durationchange|emptied|ended|error|focus|formdata|input|invalid|keydown|keypress|keyup|load|loadeddata|loadedmetadata|loadstart|mousedown|mouseenter|mouseleave|mousemove|mouseout|mouseover|mouseup|paste|pause|play|playing|progress|ratechange|reset|resize|scroll|securitypolicyviolation|seeked|seeking|select|slotchange|stalled|submit|suspend|timeupdate|toggle|volumechange|waiting|wheel))\s*=/i;

const STYLE_BLOCK = /<style\b[^>]*>/i;
const STYLE_ATTR = /\sstyle\s*=/i;

function fail(msg) {
  console.error(`write-headers: ${msg}`);
  process.exit(1);
}

function sha256Base64(content) {
  return createHash("sha256").update(content, "utf8").digest("base64");
}

/**
 * Extract text content of every inline <script> (no src=).
 * Uses a simple scan so we hash exactly what the browser sees.
 */
function extractInlineScripts(html) {
  const scripts = [];
  const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const attrs = m[1] ?? "";
    if (/\bsrc\s*=/i.test(attrs)) continue;
    scripts.push(m[2] ?? "");
  }
  return scripts;
}

function buildCsp(html) {
  if (INLINE_HANDLER.test(html)) {
    fail("inline event handler attribute found in dist/index.html");
  }
  if (STYLE_BLOCK.test(html)) {
    fail(
      "inline <style> block found in dist/index.html — refuse 'unsafe-inline'; STOP and report"
    );
  }
  if (STYLE_ATTR.test(html)) {
    fail(
      "style= attribute found in dist/index.html — refuse 'unsafe-inline'; STOP and report"
    );
  }

  const inline = extractInlineScripts(html);
  if (inline.length === 0) {
    // SPA may still have zero; allow script-src 'self' only.
  }
  const hashes = [];
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

function buildHeadersFile(html) {
  const csp = buildCsp(html);
  const lines = [
    "/*",
    `  Content-Security-Policy: ${csp}`,
    "  X-Content-Type-Options: nosniff",
    "  Referrer-Policy: strict-origin-when-cross-origin",
    "  X-Frame-Options: DENY",
    "  Cross-Origin-Opener-Policy: same-origin",
    "  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
    "  Strict-Transport-Security: max-age=31536000",
    "",
  ];
  return lines.join("\n");
}

function main() {
  const check = process.argv.includes("--check");
  if (!existsSync(INDEX)) {
    fail("dist/index.html missing — run pnpm build first");
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
    console.log("write-headers: --check OK");
    return;
  }

  writeFileSync(HEADERS_PATH, expected, "utf8");
  console.log("write-headers: wrote dist/_headers");
}

main();
