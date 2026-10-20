/**
 * Inline script extraction for CSP hashing (CodeQL-safe end tags).
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  countScriptStartTags,
  extractInlineScripts,
  extractScripts,
} from "../../tools/build/write-headers.ts";

describe("write-headers script extraction", () => {
  it("extracts across </script > with trailing space", () => {
    const html = `<html><script>var a=1;</script ></html>`;
    assert.deepEqual(extractInlineScripts(html), ["var a=1;"]);
  });

  it("extracts across </SCRIPT> mixed case", () => {
    const html = `<html><SCRIPT type="text/javascript">var b=2;</SCRIPT></html>`;
    assert.deepEqual(extractInlineScripts(html), ["var b=2;"]);
  });

  it("allows attributes on the start tag", () => {
    const html = `<script type="module" data-x="1">var c=3;</script>`;
    assert.deepEqual(extractInlineScripts(html), ["var c=3;"]);
  });

  it("does not hash a src script", () => {
    const html = `<script src="/assets/app.js"></script><script>var d=4;</script>`;
    const got = extractScripts(html);
    assert.equal(got.externalWithSrc, 1);
    assert.deepEqual(got.inline, ["var d=4;"]);
  });

  it("fails closed on start-tag vs extracted count mismatch", () => {
    const html = `<script>var e=5;`; // unclosed
    assert.equal(countScriptStartTags(html), 1);
    assert.throws(
      () => extractScripts(html),
      /script tag count mismatch/,
      "count-mismatch"
    );
  });
});
