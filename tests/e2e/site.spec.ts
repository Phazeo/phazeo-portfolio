import { expect, test } from "@playwright/test";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { DIRECTORY_DEMO_NAMES } from "../../src/features/directory/directory-demo-names.ts";
import {
  ASSETS_CACHE_VALUE,
  mergeHeadersForPath,
  parseHeadersFile,
  SECURITY_HEADER_NAMES,
  headerSourceCount,
} from "../../tools/build/headers-merge.ts";
import { loadRedirects, matchRedirect, parseRedirects } from "../../tools/build/redirects.ts";
import { ROOT, siteProfileSlugs } from "./helpers/scope.ts";

const DIST = join(ROOT, "dist");
const HEADERS_PATH = join(DIST, "_headers");
const REDIRECTS_PATH = join(ROOT, "public/_redirects");
const NOT_FOUND_PATH = "/this-slug-does-not-exist-xyz";

function expectedCspFor(pathname: string): string {
  const blocks = parseHeadersFile(readFileSync(HEADERS_PATH, "utf8"));
  const merged = mergeHeadersForPath(blocks, pathname);
  const csp = merged.get("Content-Security-Policy");
  if (!csp) {
    throw new Error(`no CSP in dist/_headers for ${pathname}`);
  }
  return csp;
}

function fingerprintedAsset(): string {
  const assets = join(DIST, "assets");
  if (!existsSync(assets)) {
    throw new Error("dist/assets missing; run pnpm build first");
  }
  const file = readdirSync(assets).find((name) => /^index-.*\.(js|css)$/.test(name));
  if (!file) {
    throw new Error("no fingerprinted index asset in dist/assets");
  }
  return `/assets/${file}`;
}

type PageCollectors = {
  violations: unknown[];
  consoleErrors: string[];
  pageErrors: string[];
};

async function attachCollectors(page: import("@playwright/test").Page): Promise<PageCollectors> {
  const collectors: PageCollectors = { violations: [], consoleErrors: [], pageErrors: [] };
  await page.addInitScript(() => {
    const w = window as unknown as {
      __cspViolations: unknown[];
    };
    w.__cspViolations = [];
    document.addEventListener("securitypolicyviolation", (e) => {
      w.__cspViolations.push({
        violatedDirective: e.violatedDirective,
        blockedURI: e.blockedURI,
        effectiveDirective: e.effectiveDirective,
      });
    });
  });
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      collectors.consoleErrors.push(msg.text());
    }
  });
  page.on("pageerror", (err) => {
    collectors.pageErrors.push(String(err));
  });
  return collectors;
}

async function readViolations(page: import("@playwright/test").Page): Promise<unknown[]> {
  return page.evaluate(() => {
    const w = window as unknown as { __cspViolations?: unknown[] };
    return w.__cspViolations?.slice() ?? [];
  });
}

test.describe("site", () => {
  test.beforeAll(() => {
    test.skip(!existsSync(HEADERS_PATH), "dist/_headers missing; run pnpm build first");
  });

  const routes = (): { path: string; label: string }[] => {
    const list: { path: string; label: string }[] = [
      { path: "/", label: "home" },
      ...siteProfileSlugs().map((slug) => ({ path: `/${slug}`, label: slug })),
      { path: NOT_FOUND_PATH, label: "404" },
    ];
    return list;
  };

  for (const route of routes()) {
    test(`${route.label}: CSP, heading, no violations`, async ({ page, baseURL }) => {
      const collectors = await attachCollectors(page);
      const response = await page.goto(route.path, { waitUntil: "domcontentloaded" });
      expect(response, "navigation response").toBeTruthy();
      const csp = response?.headers()["content-security-policy"];
      expect(csp).toBe(expectedCspFor(route.path));
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect.poll(async () => (await readViolations(page)).length).toBe(0);
      expect(collectors.consoleErrors, collectors.consoleErrors.join("\n")).toEqual([]);
      expect(collectors.pageErrors, collectors.pageErrors.join("\n")).toEqual([]);
      void baseURL;
    });
  }

  test("redirects match public/_redirects", async ({ request }) => {
    const text = readFileSync(REDIRECTS_PATH, "utf8");
    const rules = parseRedirects(text);
    expect(rules.length).toBeGreaterThan(0);
    for (const rule of rules) {
      const path = rule.splat
        ? `${rule.from.slice(0, -1)}sample`
        : rule.from;
      const expected = matchRedirect(path, rules);
      expect(expected, `match for ${path}`).toBeTruthy();
      const res = await request.get(path, { maxRedirects: 0 });
      expect(res.status(), path).toBe(expected?.status);
      expect(res.headers()["location"], path).toBe(expected?.location);
    }
  });

  test("fingerprinted asset cache and security headers", async ({ request }) => {
    const assetPath = fingerprintedAsset();
    const blocks = parseHeadersFile(readFileSync(HEADERS_PATH, "utf8"));
    const res = await request.get(assetPath);
    expect(res.ok()).toBeTruthy();
    const headers = res.headers();
    expect(headers["cache-control"]).toBe(ASSETS_CACHE_VALUE);
    for (const name of SECURITY_HEADER_NAMES) {
      const key = name.toLowerCase();
      expect(headers[key], name).toBeTruthy();
      expect(headerSourceCount(blocks, assetPath, name)).toBe(1);
    }
    expect(headerSourceCount(blocks, assetPath, "Cache-Control")).toBe(1);
    // Response map has one entry per name (no duplicated keys).
    const raw = await res.headersArray();
    const counts = new Map<string, number>();
    for (const { name } of raw) {
      const lower = name.toLowerCase();
      counts.set(lower, (counts.get(lower) ?? 0) + 1);
    }
    for (const name of SECURITY_HEADER_NAMES) {
      expect(counts.get(name.toLowerCase())).toBe(1);
    }
  });

  test("dist redirects file is loadable", () => {
    const distRedirects = join(DIST, "_redirects");
    expect(existsSync(distRedirects)).toBeTruthy();
    expect(loadRedirects(distRedirects).length).toBeGreaterThan(0);
  });

  test("production dist omits guest example and directory demo content", () => {
    const forbidden = [
      "alex-morgan",
      "Alex Morgan",
      ...DIRECTORY_DEMO_NAMES,
      "VITE_DIRECTORY_DEMO",
    ];
    const hits: string[] = [];

    function walk(dir: string): void {
      for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) {
          walk(path);
          continue;
        }
        const text = readFileSync(path, "utf8");
        for (const needle of forbidden) {
          if (text.includes(needle)) {
            hits.push(`${path}: ${needle}`);
          }
        }
      }
    }

    walk(DIST);
    expect(hits, hits.join("\n")).toEqual([]);
  });
});
