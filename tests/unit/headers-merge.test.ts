import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assertHeadersMerge,
  headerSourceCount,
  mergeHeadersForPath,
  parseHeadersFile,
  patternMatches,
} from "../../tools/build/headers-merge.ts";

describe("headers-merge", () => {
  it("matches /* and /assets/* patterns", () => {
    assert.equal(patternMatches("/*", "/"), true);
    assert.equal(patternMatches("/*", "/dinesh-allimuthu"), true);
    assert.equal(patternMatches("/*", "/assets/example.js"), true);
    assert.equal(patternMatches("/assets/*", "/assets/example.js"), true);
    assert.equal(patternMatches("/assets/*", "/"), false);
    assert.equal(patternMatches("/assets/*", "/index.html"), false);
  });

  it("merges /* security with /assets/* cache without duplicate names", () => {
    const text = `/*
  Content-Security-Policy: default-src 'self'
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  X-Frame-Options: DENY
  Cross-Origin-Opener-Policy: same-origin
  Permissions-Policy: camera=()
  Strict-Transport-Security: max-age=31536000

/assets/*
  Cache-Control: public, max-age=31536000, immutable
`;
    const blocks = parseHeadersFile(text);
    const merged = mergeHeadersForPath(blocks, "/assets/example.js");
    assert.equal(merged.get("Cache-Control"), "public, max-age=31536000, immutable");
    assert.equal(merged.has("Content-Security-Policy"), true);
    assert.equal(headerSourceCount(blocks, "/assets/example.js", "Content-Security-Policy"), 1);
    assert.equal(headerSourceCount(blocks, "/assets/example.js", "Cache-Control"), 1);
    assert.deepEqual(assertHeadersMerge(text), []);
  });

  it("flags duplicate security headers when /assets/* repeats them", () => {
    const text = `/*
  Content-Security-Policy: default-src 'self'
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  X-Frame-Options: DENY
  Cross-Origin-Opener-Policy: same-origin
  Permissions-Policy: camera=()
  Strict-Transport-Security: max-age=31536000

/assets/*
  Content-Security-Policy: default-src 'self'
  Cache-Control: public, max-age=31536000, immutable
`;
    const issues = assertHeadersMerge(text);
    assert.ok(
      issues.some((i) => i.includes("duplicate header name Content-Security-Policy")),
      `expected duplicate CSP issue, got: ${issues.join("; ")}`
    );
  });

  it("joins duplicate names with a comma when merging", () => {
    const blocks = parseHeadersFile(`/*
  X-Test: a

/assets/*
  X-Test: b
`);
    const merged = mergeHeadersForPath(blocks, "/assets/x.js");
    assert.equal(merged.get("X-Test"), "a, b");
  });
});
