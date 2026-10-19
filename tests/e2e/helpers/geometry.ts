import type { Locator, Page } from "@playwright/test";

export type Rect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
};

export function centreX(r: Rect): number {
  return r.left + r.width / 2;
}

export function gapY(a: Rect, b: Rect): number {
  return b.top - a.bottom;
}

export function intersects(a: Rect, b: Rect): boolean {
  return !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);
}

export async function boundingRect(locator: Locator): Promise<Rect> {
  const box = await locator.boundingBox();
  if (!box) {
    throw new Error("boundingBox returned null");
  }
  return {
    left: box.x,
    top: box.y,
    right: box.x + box.width,
    bottom: box.y + box.height,
    width: box.width,
    height: box.height,
  };
}

export async function computedStyle(
  page: Page,
  selector: string,
  prop: string
): Promise<string> {
  return page.locator(selector).evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), prop);
}

export async function styleMap(
  locator: Locator,
  props: readonly string[]
): Promise<Record<string, string>> {
  return locator.evaluate((el, list) => {
    const cs = getComputedStyle(el);
    const out: Record<string, string> = {};
    for (const p of list) {
      out[p] = cs.getPropertyValue(p) || (cs as unknown as Record<string, string>)[p] || "";
    }
    return out;
  }, props);
}

/** True when two horizontal centres agree within 1px. */
export function centresAligned(values: number[], tolerance = 1): boolean {
  if (values.length === 0) return true;
  const min = Math.min(...values);
  const max = Math.max(...values);
  return max - min <= tolerance;
}

export function near(actual: number, expected: number, tol = 2): boolean {
  return Math.abs(actual - expected) <= tol;
}
