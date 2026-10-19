import { expect, test, type Page } from "@playwright/test";
import type { Theme } from "../../src/app/providers/theme-session.ts";
import {
  boundingRect,
  centresAligned,
  gapY,
  near,
  styleMap,
  textLineStats,
} from "./helpers/geometry.ts";
import { directoryWidths } from "./helpers/scope.ts";
import { openWithTheme } from "./helpers/theme.ts";

const WIDTHS = directoryWidths();
const THEMES: Theme[] = ["light", "dark"];

async function setViewport(page: Page, width: number): Promise<void> {
  await page.setViewportSize({ width, height: 900 });
}

async function firstCard(page: Page) {
  return page.locator("[data-dir-card]").first();
}

test.describe("directory demo", () => {
  test("Prompt 40: card clicks open profile; socials stay social", async ({
    browser,
    baseURL,
  }) => {
    const { context, page } = await openWithTheme(browser, baseURL, "light");
    await setViewport(page, 1280);
    const card = await firstCard(page);
    await expect(card).toBeVisible();
    const profileLink = card.locator("a[href^='/']").first();
    const href = await profileLink.getAttribute("href");
    expect(href).toBeTruthy();

    const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const hrefRe = new RegExp(`${escape(href ?? "")}$`);

    async function clickCentre(locator: ReturnType<Page["locator"]>) {
      const box = await boundingRect(locator);
      await page.mouse.click(box.left + box.width / 2, box.top + box.height / 2);
    }

    await clickCentre(card.locator(".directory-card-role"));
    await expect(page).toHaveURL(hrefRe);
    await page.goBack();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    const summary = card.locator(".directory-card-summary");
    if (await summary.count()) {
      await clickCentre(summary);
      await expect(page).toHaveURL(hrefRe);
      await page.goBack();
    }

    const footer = card.locator(".directory-card-footer");
    const fr = await boundingRect(footer);
    await page.mouse.click(fr.right - 24, fr.top + fr.height / 2);
    await expect(page).toHaveURL(hrefRe);
    await page.goBack();

    const social = card.locator("a[href^='http']").first();
    if (await social.count()) {
      const socialHref = await social.getAttribute("href");
      expect(socialHref).toMatch(/^https?:\/\//);
      const hitsSocial = await social.evaluate((el) => {
        const r = el.getBoundingClientRect();
        const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return top?.closest("a") === el;
      });
      expect(hitsSocial).toBe(true);
      await expect(page).toHaveURL(/\/(?:\?.*)?$/);
    }
    await context.close();
  });

  test("Prompt 42: search blur, paging, fast type, clear", async ({ browser, baseURL }) => {
    const { context, page } = await openWithTheme(browser, baseURL, "light");
    await setViewport(page, 1280);
    const search = page.getByRole("searchbox", { name: /search name/i });
    await expect(search).toBeVisible();

    await search.fill("data");
    await search.blur();
    // Blur keeps the directory page (query may update after debounce).
    await expect(page).toHaveURL(/\/(?:\?.*)?$/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // Typing on page 3 resets to page 1.
    await page.goto("/?page=3");
    await expect(page).toHaveURL(/page=3/);
    await search.fill("eng");
    await expect(page).toHaveURL(/^(?!.*page=3).*$/);
    await expect(page).not.toHaveURL(/page=3/);

    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    page.on("pageerror", (err) => errors.push(String(err)));

    const burst = "a".repeat(150);
    await search.fill(burst);
    await expect(page).toHaveURL(/[?&]q=a{10,}/);
    expect(errors).toEqual([]);

    await page.getByRole("button", { name: "Clear search" }).click();
    await expect(search).toHaveValue("");
    await expect(page).not.toHaveURL(/[?&]q=/);
    await context.close();
  });

  test("search polish: native clear hidden, one Clear search, balanced subtitle", async ({
    browser,
    baseURL,
  }) => {
    const { context, page } = await openWithTheme(browser, baseURL, "light");

    for (const width of [390, 1024, 1440]) {
      await setViewport(page, width);
      await page.goto("/");
      const subtitle = page.locator("[data-dir-hero-subtitle]");
      await expect(subtitle).toBeVisible();
      const stats = await textLineStats(subtitle);
      expect(stats.lineCount, `width ${width} lineCount`).toBeLessThanOrEqual(2);
      expect(stats.lastLineWords, `width ${width} lastLineWords`).toBeGreaterThan(1);
    }

    await setViewport(page, 1280);
    const search = page.getByRole("searchbox", { name: /search name/i });
    await search.fill("portfolio");
    const nativeClearDisplay = await search.evaluate((el) => {
      const computed = getComputedStyle(el, "::-webkit-search-cancel-button").display;
      if (computed === "none") return computed;
      // Chromium often mirrors the host for this pseudo; confirm the author hide rule.
      for (const sheet of document.styleSheets) {
        let rules: CSSRuleList;
        try {
          rules = sheet.cssRules;
        } catch {
          continue;
        }
        for (const rule of rules) {
          if (!(rule instanceof CSSStyleRule)) continue;
          if (
            rule.selectorText.includes("::-webkit-search-cancel-button") &&
            rule.style.display === "none"
          ) {
            return "none";
          }
        }
      }
      return computed;
    });
    expect(nativeClearDisplay).toBe("none");
    await expect(page.getByRole("button", { name: "Clear search" })).toHaveCount(1);
    await expect(page.getByRole("button", { name: "Clear search" })).toBeVisible();
    await context.close();
  });

  test("Prompt 43: search and card focus rings", async ({ browser, baseURL }) => {
    const { context, page } = await openWithTheme(browser, baseURL, "light");
    await setViewport(page, 1280);

    await page.getByRole("button", { name: "Dark mode" }).focus();
    for (let i = 0; i < 12; i++) {
      const onSearch = await page.evaluate(
        () => document.activeElement?.matches?.('input[type="search"]') === true
      );
      if (onSearch) break;
      await page.keyboard.press("Tab");
    }
    await expect
      .poll(async () => {
        const shadow = await page.locator(".directory-toolbar-field").evaluate((el) => {
          return getComputedStyle(el).boxShadow;
        });
        return /0px 0px 0px 2px/.test(shadow);
      })
      .toBe(true);

    const link = page.locator("[data-dir-card] a").first();
    await link.focus();
    await expect
      .poll(async () => {
        const card = page.locator("[data-dir-card]").first();
        const outline = await card.evaluate((el) => {
          const cs = getComputedStyle(el);
          return `${cs.outlineStyle}:${cs.outlineWidth}`;
        });
        return outline.startsWith("solid:2px");
      })
      .toBe(true);

    await link.dispatchEvent("mousedown");
    await link.blur();
    await expect
      .poll(async () => {
        const card = page.locator("[data-dir-card]").first();
        const outline = await card.evaluate((el) => getComputedStyle(el).outlineStyle);
        return outline === "none";
      })
      .toBe(true);

    await context.close();
  });

  for (const theme of THEMES) {
    for (const width of WIDTHS) {
      test(`layout+glass ${theme} ${width}`, async ({ browser, baseURL }) => {
        const { context, page } = await openWithTheme(browser, baseURL, theme);
        await setViewport(page, width);

        const eyebrow = page.locator("[data-dir-eyebrow]");
        const title = page.locator("h1.directory-hero-title");
        const subtitle = page.locator("[data-dir-hero-subtitle]");
        const field = page.locator(".directory-toolbar-field");
        const segment = page.locator(".directory-segment");
        const resultsHeader = page.locator(".directory-results-header");
        const grid = page.locator("ul.grid").first();

        await expect(title).toBeVisible();

        const centres = await Promise.all(
          [eyebrow, title, subtitle, field, segment].map(async (loc) => {
            const r = await boundingRect(loc);
            return r.left + r.width / 2;
          })
        );
        expect(centresAligned(centres)).toBe(true);

        const fieldBox = await boundingRect(field);
        expect(near(fieldBox.height, 56, 1)).toBe(true);
        expect(fieldBox.width).toBeLessThanOrEqual(640 + 1);
        const inputSize = await page
          .locator(".directory-toolbar-field__input")
          .evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
        expect(inputSize).toBe(16);

        const segStyles = await styleMap(segment, ["border-radius", "padding-top"]);
        expect(parseFloat(segStyles["border-radius"] || "0")).toBeGreaterThanOrEqual(28);
        expect(parseFloat(segStyles["padding-top"] || "0")).toBeGreaterThanOrEqual(2);

        const gaps = {
          eyebrowTitle: gapY(await boundingRect(eyebrow), await boundingRect(title)),
          titleSubtitle: gapY(await boundingRect(title), await boundingRect(subtitle)),
          subtitleSearch: gapY(await boundingRect(subtitle), await boundingRect(field)),
          searchFilters: gapY(await boundingRect(field), await boundingRect(segment)),
          filtersResults: gapY(await boundingRect(segment), await boundingRect(resultsHeader)),
          resultsGrid: gapY(await boundingRect(resultsHeader), await boundingRect(grid)),
        };
        expect(near(gaps.eyebrowTitle, 16)).toBe(true);
        expect(near(gaps.titleSubtitle, 16)).toBe(true);
        expect(near(gaps.subtitleSearch, 32)).toBe(true);
        expect(near(gaps.searchFilters, 16)).toBe(true);
        expect(near(gaps.filtersResults, 48)).toBe(true);
        expect(near(gaps.resultsGrid, 16)).toBe(true);

        const hr = await boundingRect(resultsHeader);
        const gr = await boundingRect(grid);
        expect(Math.abs(hr.left - gr.left)).toBeLessThanOrEqual(1);
        expect(Math.abs(hr.right - gr.right)).toBeLessThanOrEqual(1);

        // Glass: shapes clear of hero targets; cards overlap shapes; backdrop present
        const geo = await page.evaluate(() => {
          function rect(el: Element | null) {
            if (!el) return null;
            const r = el.getBoundingClientRect();
            return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
          }
          function hit(
            a: { left: number; top: number; right: number; bottom: number },
            b: { left: number; top: number; right: number; bottom: number }
          ) {
            return !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);
          }
          const targets = [
            document.querySelector("[data-dir-eyebrow]"),
            document.querySelector("h1.directory-hero-title"),
            document.querySelector("[data-dir-hero-subtitle]"),
            document.querySelector(".directory-toolbar-field"),
            document.querySelector(".directory-segment"),
            document.querySelector(".directory-results-header"),
          ].map(rect);
          const shapes = [...document.querySelectorAll(".directory-shell__shape")].map((el) =>
            rect(el)
          );
          const heroHits = shapes.map((s) =>
            s ? targets.map((t, i) => (t && hit(s, t) ? i : -1)).filter((i) => i >= 0) : []
          );
          const cards = [...document.querySelectorAll("[data-dir-card]")].map((el) => rect(el));
          let overlap = 0;
          for (const c of cards) {
            if (!c) continue;
            if (shapes.some((s) => s && hit(c, s))) overlap++;
          }
          const field = document.querySelector(".directory-toolbar-field");
          const card = document.querySelector("[data-dir-card]");
          const seg = document.querySelector(".directory-segment");
          const bf = (el: Element | null) => {
            if (!el) return "missing";
            const cs = getComputedStyle(el);
            return cs.backdropFilter || cs.getPropertyValue("-webkit-backdrop-filter") || "none";
          };
          const specular = card?.querySelector(".directory-card__specular");
          let specularOk = false;
          let textClear = true;
          if (card && specular) {
            const cr = card.getBoundingClientRect();
            const sr = specular.getBoundingClientRect();
            const cs = getComputedStyle(specular);
            specularOk =
              Math.abs(sr.left - cr.left) <= 1 &&
              Math.abs(sr.right - cr.right) <= 1 &&
              Math.abs(sr.top - cr.top) <= 1 &&
              Math.abs(sr.bottom - cr.bottom) <= 1 &&
              parseFloat(cs.borderTopLeftRadius) >= 20;
            const band = { left: sr.left, top: sr.top, right: sr.right, bottom: sr.top + 14 };
            for (const sel of [
              ".directory-card-name",
              ".directory-card-role",
              ".directory-card-summary",
              ".directory-card-status",
            ]) {
              const el = card.querySelector(sel);
              if (!el) continue;
              const r = el.getBoundingClientRect();
              if (hit(band, r)) textClear = false;
            }
          }
          return {
            heroHits,
            cardOverlapRatio: cards.length ? overlap / cards.length : 1,
            backdrops: {
              card: bf(card),
              field: bf(field),
              segment: bf(seg),
            },
            specularOk,
            textClear,
          };
        });

        expect(geo.heroHits.every((h) => h.length === 0)).toBe(true);
        expect(geo.cardOverlapRatio).toBeGreaterThan(0);
        expect(geo.backdrops.card).not.toBe("none");
        expect(geo.backdrops.field).not.toBe("none");
        expect(geo.backdrops.segment).not.toBe("none");
        expect(geo.specularOk).toBe(true);
        expect(geo.textClear).toBe(true);

        await context.close();
      });
    }
  }

  test("theme switch: fixed, size, transform, storage, aria", async ({ browser, baseURL }) => {
    const context = await browser.newContext({
      baseURL,
      colorScheme: "light",
    });
    const page = await context.newPage();
    await page.goto("/");
    await setViewport(page, 1280);
    const sw = page.getByRole("button", { name: "Dark mode" });
    await expect(sw).toBeVisible();

    // No storage write on mount when the user has not chosen a theme.
    await expect
      .poll(async () => page.evaluate(() => localStorage.getItem("phazeo-portfolio-theme")))
      .toBeNull();

    const box = await boundingRect(sw);
    expect(near(box.width, 72, 1)).toBe(true);
    expect(near(box.height, 32, 1)).toBe(true);
    const hit = await sw.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return { w: r.width + 12, h: r.height + 12, top: r.top, right: window.innerWidth - r.right };
    });
    expect(near(hit.w, 84, 2)).toBe(true);
    expect(near(hit.h, 44, 2)).toBe(true);
    expect(hit.top).toBeLessThan(40);
    expect(hit.right).toBeLessThan(40);

    await page.evaluate(() => window.scrollTo(0, 800));
    const afterScroll = await boundingRect(sw);
    expect(afterScroll.top).toBeLessThan(40);

    const knobBefore = await page.locator(".theme-switch__knob-wrap").evaluate((el) => {
      return getComputedStyle(el).transform;
    });
    await expect(sw).toHaveAttribute("aria-pressed", "false");
    await expect(page.locator("html")).not.toHaveClass(/dark/);

    await sw.click();
    await expect(sw).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("html")).toHaveClass(/dark/);
    await expect
      .poll(async () => {
        const t = await page.locator(".theme-switch__knob-wrap").evaluate((el) => {
          return getComputedStyle(el).transform;
        });
        // translateX(40ish) → matrix(..., tx, 0) with tx != 0
        const m = t.match(/matrix\(([^)]+)\)/);
        if (!m?.[1]) return t !== knobBefore;
        const parts = m[1].split(",").map((p) => parseFloat(p.trim()));
        return Number.isFinite(parts[4]) && Math.abs(parts[4] ?? 0) > 1;
      })
      .toBe(true);
    await expect
      .poll(async () => page.evaluate(() => localStorage.getItem("phazeo-portfolio-theme")))
      .toBe("dark");
    await context.close();
  });

  test("empty state glass panel avoids shapes", async ({ browser, baseURL }) => {
    const { context, page } = await openWithTheme(browser, baseURL, "light", "/?q=zzzz");
    await setViewport(page, 1280);
    const panel = page.locator(".directory-empty");
    await expect(panel).toBeVisible();
    await expect(panel.getByText(/No people match/i)).toBeVisible();
    await expect(panel.getByRole("button", { name: /Clear filters/i })).toBeVisible();

    const styles = await styleMap(panel, ["backdrop-filter", "-webkit-backdrop-filter"]);
    const bf = styles["backdrop-filter"] || styles["-webkit-backdrop-filter"];
    expect(bf && bf !== "none").toBeTruthy();

    // Empty panel is glass (same stack as cards), so shape overlap is fine; assert glass + copy.
    await expect(panel.locator(".directory-empty__text")).toBeVisible();
    const maxWPx = await panel.evaluate((el) => parseFloat(getComputedStyle(el).maxWidth));
    expect(near(maxWPx, 28 * 16, 1)).toBe(true);
    await context.close();
  });
});
