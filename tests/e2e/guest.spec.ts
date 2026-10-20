import { expect, test } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { mergeHeadersForPath, parseHeadersFile } from "../../tools/build/headers-merge.ts";
import { ROOT } from "./helpers/scope.ts";

const GUEST_DIST = join(ROOT, ".tmp-dist-guest");
const HEADERS_PATH = join(GUEST_DIST, "_headers");
const GUEST_PATH = "/alex-morgan";

function expectedCspFor(pathname: string): string {
  const blocks = parseHeadersFile(readFileSync(HEADERS_PATH, "utf8"));
  const merged = mergeHeadersForPath(blocks, pathname);
  const csp = merged.get("Content-Security-Policy");
  if (!csp) {
    throw new Error(`no CSP in .tmp-dist-guest/_headers for ${pathname}`);
  }
  return csp;
}

type PageCollectors = {
  violations: unknown[];
  consoleErrors: string[];
  pageErrors: string[];
};

async function attachCollectors(page: import("@playwright/test").Page): Promise<PageCollectors> {
  const collectors: PageCollectors = { violations: [], consoleErrors: [], pageErrors: [] };
  await page.addInitScript(() => {
    const w = window as unknown as { __cspViolations: unknown[] };
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

test.describe("guest example", () => {
  test.beforeAll(() => {
    test.skip(!existsSync(HEADERS_PATH), ".tmp-dist-guest/_headers missing; guest webServer must build first");
  });

  test("alex-morgan: CSP, heading, theme toggle, no errors", async ({ page }) => {
    const collectors = await attachCollectors(page);
    const response = await page.goto(GUEST_PATH, { waitUntil: "domcontentloaded" });
    expect(response, "navigation response").toBeTruthy();
    const csp = response?.headers()["content-security-policy"];
    expect(csp).toBe(expectedCspFor(GUEST_PATH));
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect.poll(async () => (await readViolations(page)).length).toBe(0);
    expect(collectors.consoleErrors, collectors.consoleErrors.join("\n")).toEqual([]);
    expect(collectors.pageErrors, collectors.pageErrors.join("\n")).toEqual([]);

    const themeBtn = page.getByRole("button", { name: /Switch to (dark|light) mode/i });
    await expect(themeBtn).toBeVisible();
    await themeBtn.click();
    await expect.poll(async () => (await readViolations(page)).length).toBe(0);
    expect(collectors.consoleErrors, collectors.consoleErrors.join("\n")).toEqual([]);
    expect(collectors.pageErrors, collectors.pageErrors.join("\n")).toEqual([]);
  });
});
