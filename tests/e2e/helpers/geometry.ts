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

/** Line count and last-line word count for a single text element (no nested markup). */
export async function textLineStats(
  locator: Locator
): Promise<{ lineCount: number; lastLineWords: number }> {
  return locator.evaluate((el) => {
    const text = el.textContent ?? "";
    const trimmed = text.trim();
    if (!trimmed) return { lineCount: 0, lastLineWords: 0 };

    let textNode: Text | null = null;
    const walk = (node: Node) => {
      if (textNode) return;
      if (node.nodeType === Node.TEXT_NODE && (node.textContent ?? "").trim()) {
        textNode = node as Text;
        return;
      }
      for (const child of node.childNodes) walk(child);
    };
    walk(el);
    if (!textNode) return { lineCount: 1, lastLineWords: trimmed.split(/\s+/).length };

    const words = trimmed.split(/\s+/).filter(Boolean);
    const lineMap = new Map<number, number>();
    let searchFrom = 0;
    for (const word of words) {
      const idx = text.indexOf(word, searchFrom);
      if (idx < 0) continue;
      searchFrom = idx + word.length;
      const range = document.createRange();
      range.setStart(textNode, idx);
      range.setEnd(textNode, idx + word.length);
      const top = Math.round(range.getBoundingClientRect().top);
      lineMap.set(top, (lineMap.get(top) ?? 0) + 1);
    }
    const tops = [...lineMap.keys()].sort((a, b) => a - b);
    const lastTop = tops[tops.length - 1];
    return {
      lineCount: tops.length,
      lastLineWords: lastTop == null ? 0 : (lineMap.get(lastTop) ?? 0),
    };
  });
}
