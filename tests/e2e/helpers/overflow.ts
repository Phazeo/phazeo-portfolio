import { expect, type Page } from "@playwright/test";

/** Common phone widths (CSS px). Checked on every run, PR or full sweep. */
export const MOBILE_WIDTHS = [320, 360, 375, 390, 414] as const;

export type OverflowReport = {
  scrollWidth: number;
  clientWidth: number;
  /** Elements past the right edge that no ancestor clips, widest first. */
  offenders: { element: string; right: number }[];
};

/** Measure horizontal overflow of the document and name what causes it. */
export async function measureOverflow(page: Page): Promise<OverflowReport> {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const clientWidth = doc.clientWidth;
    const describe = (el: Element): string => {
      const id = el.id ? `#${el.id}` : "";
      const cls =
        typeof el.className === "string" && el.className.trim()
          ? `.${el.className.trim().split(/\s+/).slice(0, 3).join(".")}`
          : "";
      return `${el.tagName.toLowerCase()}${id}${cls}`;
    };
    const clipsX = (el: Element): boolean => {
      const ox = getComputedStyle(el).overflowX;
      return ox !== "visible";
    };
    const offenders: { element: string; right: number }[] = [];
    for (const el of Array.from(document.body.querySelectorAll("*"))) {
      const right = el.getBoundingClientRect().right + window.scrollX;
      if (right <= clientWidth + 0.5) continue;
      let clipped = false;
      for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
        if (clipsX(a)) {
          clipped = true;
          break;
        }
      }
      if (!clipped) offenders.push({ element: describe(el), right: Math.round(right * 10) / 10 });
    }
    offenders.sort((x, y) => y.right - x.right);
    return { scrollWidth: doc.scrollWidth, clientWidth, offenders: offenders.slice(0, 5) };
  });
}

/** Load `path` at each phone width and assert the page never scrolls sideways. */
export async function expectNoHorizontalOverflow(page: Page, path: string): Promise<void> {
  for (const width of MOBILE_WIDTHS) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto(path, { waitUntil: "load" });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const report = await measureOverflow(page);
    expect
      .soft(
        report.scrollWidth,
        `${path} at ${width}px: scrollWidth ${report.scrollWidth} > clientWidth ${report.clientWidth}; ` +
          `widest past the right edge: ${report.offenders.map((o) => `${o.element} (right ${o.right})`).join(", ") || "none found"}`
      )
      .toBeLessThanOrEqual(report.clientWidth);
  }
}

export type GlowGeometry = {
  hero: { left: number; right: number; top: number; width: number };
  glow: { left: number; right: number; top: number; width: number; height: number };
  layer: { left: number; right: number } | null;
  clientWidth: number;
};

/** Hero glow geometry on the directory home (layer is null where none exists). */
export async function measureHeroGlow(page: Page): Promise<GlowGeometry> {
  return page.evaluate(() => {
    const rect = (sel: string) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { left: r.left, right: r.right, top: r.top, width: r.width, height: r.height };
    };
    const hero = rect(".directory-hero");
    const glow = rect(".directory-hero__glow");
    if (!hero || !glow) throw new Error("directory hero or glow missing");
    const layer = rect(".directory-hero__glow-layer");
    return {
      hero,
      glow,
      layer: layer ? { left: layer.left, right: layer.right } : null,
      clientWidth: document.documentElement.clientWidth,
    };
  });
}
