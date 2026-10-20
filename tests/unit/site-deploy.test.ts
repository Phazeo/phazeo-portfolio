/**
 * Deploy helpers: the run-time config is static files only, and the live
 * header check compares exactly the names dist/_headers sets.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  buildSiteConfig,
  checkAssetsDir,
  checkSiteConfig,
  trackedConfigFiles,
} from "../../tools/deploy/site-config.ts";
import {
  compareHeaders,
  expectedHeaders,
  listedHosts,
  parseHeadersFile,
  verifyLive,
} from "../../tools/deploy/verify-live-headers.ts";

const ROOT = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const CONFIG_SCRIPT = join(ROOT, "tools", "deploy", "site-config.ts");

const dirs: string[] = [];
afterEach(() => {
  while (dirs.length > 0) {
    const d = dirs.pop();
    if (d) rmSync(d, { recursive: true, force: true });
  }
});

function tempDir(): string {
  const d = mkdtempSync(join(tmpdir(), "site-deploy-"));
  dirs.push(d);
  return d;
}

function siteDir(): string {
  const d = tempDir();
  mkdirSync(join(d, "dist"));
  writeFileSync(join(d, "dist", "index.html"), "<!doctype html>\n");
  writeFileSync(join(d, "dist", "_headers"), "/*\n  X-Frame-Options: DENY\n");
  return d;
}

const VALID = buildSiteConfig("phazeo-portfolio", "2026-10-01", "dist");

describe("site-config", { timeout: 30_000 }, () => {
  it("the built config is valid and static-only", () => {
    assert.deepEqual(checkSiteConfig(VALID), []);
    assert.equal(VALID.workers_dev, false);
    assert.equal(VALID.preview_urls, false);
    assert.equal("main" in VALID, false);
  });

  it('refuses a "main" key', () => {
    const errors = checkSiteConfig({ ...VALID, main: "src/index.ts" });
    assert.ok(errors.some((e) => /server-side script \("main"\)/.test(e)), errors.join("\n"));
  });

  for (const [label, value] of [
    ["workers_dev on", { ...VALID, workers_dev: true }],
    ["preview_urls on", { ...VALID, preview_urls: true }],
    ["workers_dev missing", { ...VALID, workers_dev: undefined }],
    ["an extra top-level key", { ...VALID, routes: [] }],
    ["an extra assets key", { ...VALID, assets: { ...VALID.assets, binding: "ASSETS" } }],
    ["another not-found mode", { ...VALID, assets: { ...VALID.assets, not_found_handling: "none" } }],
    ["no assets", { ...VALID, assets: undefined }],
    ["a bad name", { ...VALID, name: "Bad Name" }],
    ["a bad date", { ...VALID, compatibility_date: "today" }],
    ["an array", [VALID]],
  ] as const) {
    it(`refuses ${label}`, () => {
      const parsed: unknown = JSON.parse(JSON.stringify(value));
      assert.notDeepEqual(checkSiteConfig(parsed), []);
    });
  }

  it("refuses a _worker.js entry in the assets folder", () => {
    const d = siteDir();
    assert.deepEqual(checkAssetsDir(join(d, "dist")), []);
    writeFileSync(join(d, "dist", "_worker.js"), "export default {};\n");
    assert.ok(checkAssetsDir(join(d, "dist")).some((e) => /_worker\.js/.test(e)));
  });

  it("refuses an assets folder without index.html or _headers", () => {
    const d = tempDir();
    mkdirSync(join(d, "dist"));
    assert.equal(checkAssetsDir(join(d, "dist")).length, 2);
    assert.equal(checkAssetsDir(join(d, "missing")).length, 1);
  });

  it("finds committed config files only by exact stem and extension", () => {
    const found = trackedConfigFiles(
      ["a/tool.toml", "tool.json", "x/tool.jsonc", "tool.yaml", "mytool.toml", "tool.toml.bak"],
      "tool"
    );
    assert.deepEqual(found, ["a/tool.toml", "tool.json", "x/tool.jsonc"]);
  });

  it("CLI write then check passes; a hand-added main key fails", () => {
    const d = siteDir();
    const cfg = join(d, "site-deploy.json");
    const run = (...args: string[]) =>
      spawnSync(process.execPath, [CONFIG_SCRIPT, ...args], { encoding: "utf8", timeout: 10_000 });
    const w = run("write", "--out", cfg, "--name", "phazeo-portfolio", "--compatibility-date", "2026-10-01", "--assets", "dist");
    assert.equal(w.status, 0, w.stderr);
    assert.equal(run("check", "--config", cfg).status, 0);
    writeFileSync(cfg, JSON.stringify({ ...VALID, main: "index.js" }));
    const bad = run("check", "--config", cfg);
    assert.equal(bad.status, 1);
    assert.match(bad.stderr, /server-side script/);
  });
});

const HEADERS_FILE = [
  "# comment",
  "/*",
  "  X-Frame-Options: DENY",
  "  Referrer-Policy: strict-origin-when-cross-origin",
  "",
  "/assets/*",
  "  Cache-Control: public, max-age=31536000, immutable",
  "",
].join("\n");

function live(headers: Record<string, string>, status = 200): Response {
  return new Response("ok", { status, headers });
}

describe("verify-live-headers", { timeout: 30_000 }, () => {
  it("parses rules and picks only the names that apply to the path", () => {
    const rules = parseHeadersFile(HEADERS_FILE);
    assert.equal(rules.length, 2);
    assert.deepEqual(
      [...expectedHeaders(rules, "/")],
      [
        ["x-frame-options", "DENY"],
        ["referrer-policy", "strict-origin-when-cross-origin"],
      ]
    );
    assert.equal(expectedHeaders(rules, "/assets/app.js").size, 3);
  });

  it("rejects a header line outside a path block", () => {
    assert.throws(() => parseHeadersFile("  X-Frame-Options: DENY\n"));
  });

  it("ignores live headers that _headers does not list, and flags missing or different ones", () => {
    const expected = expectedHeaders(parseHeadersFile(HEADERS_FILE), "/");
    assert.deepEqual(
      compareHeaders(expected, new Headers({ "x-frame-options": "DENY", "referrer-policy": "strict-origin-when-cross-origin", server: "x" })),
      []
    );
    const bad = compareHeaders(expected, new Headers({ "x-frame-options": "SAMEORIGIN" }));
    assert.equal(bad.length, 2);
  });

  it("retries until the headers match", async () => {
    const expected = new Map([["x-frame-options", "DENY"]]);
    let t = 0;
    let calls = 0;
    const result = await verifyLive({
      url: "https://example.com/",
      expected,
      timeoutMs: 60_000,
      intervalMs: 5_000,
      now: () => t,
      sleep: async (ms) => {
        t += ms;
      },
      fetchFn: async () => {
        calls++;
        return calls < 3 ? live({}) : live({ "x-frame-options": "DENY" });
      },
    });
    assert.deepEqual(result, { ok: true, attempts: 3, mismatches: [] });
  });

  it("gives up at the time limit, counting errors and non-200 as mismatches", async () => {
    let t = 0;
    let calls = 0;
    const result = await verifyLive({
      url: "https://example.com/",
      expected: new Map([["x-frame-options", "DENY"]]),
      timeoutMs: 60_000,
      intervalMs: 5_000,
      now: () => t,
      sleep: async (ms) => {
        t += ms;
      },
      fetchFn: async () => {
        calls++;
        if (calls % 2 === 0) throw new Error("connection reset");
        return live({ "x-frame-options": "DENY" }, 503);
      },
    });
    assert.equal(result.ok, false);
    assert.equal(result.attempts, 13);
    assert.ok(t <= 60_000, `waited ${t} ms`);
  });

  it("accepts only exact listed hosts from the allowlist", () => {
    const hosts = listedHosts("# c\nexample.com\n*.example.org\nWWW.Example.com\n");
    assert.deepEqual([...hosts], ["example.com", "www.example.com"]);
  });

  it("keeps quotes and spaces inside a header value", () => {
    const rules = parseHeadersFile("/*\n  Content-Security-Policy: default-src 'self'\n");
    assert.equal(expectedHeaders(rules, "/").get("content-security-policy"), "default-src 'self'");
  });
});
