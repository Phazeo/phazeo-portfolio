import type { Browser, BrowserContext, Page } from "@playwright/test";
import { STORAGE_KEY, type Theme } from "../../../src/app/providers/theme-session.ts";

/** Open a page with the theme storage key set before any app script runs. */
export async function openWithTheme(
  browser: Browser,
  baseURL: string | undefined,
  theme: Theme,
  path = "/"
): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({
    baseURL,
    colorScheme: theme === "dark" ? "dark" : "light",
  });
  await context.addInitScript(
    ({ key, value }) => {
      try {
        localStorage.setItem(key, value);
      } catch {
        // ignore
      }
    },
    { key: STORAGE_KEY, value: theme }
  );
  const page = await context.newPage();
  await page.goto(path);
  await page.waitForSelector(".directory-shell, h1");
  return { context, page };
}
