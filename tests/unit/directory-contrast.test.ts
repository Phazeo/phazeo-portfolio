import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const cssPath = join(root, "src/features/directory/directory.css");

type Rgba = { r: number; g: number; b: number; a: number };

function parseHex(hex: string): Rgba {
  const h = hex.replace("#", "").trim();
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  const n = Number.parseInt(full, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: 1 };
}

function parseColor(raw: string): Rgba {
  const v = raw.trim();
  if (v.startsWith("#")) {
    return parseHex(v);
  }
  const m = v.match(
    /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/i
  );
  if (!m) {
    throw new Error(`unsupported color: ${raw}`);
  }
  return {
    r: Number(m[1]),
    g: Number(m[2]),
    b: Number(m[3]),
    a: m[4] == null ? 1 : Number(m[4]),
  };
}

function composite(fg: Rgba, bg: Rgba): Rgba {
  const a = fg.a + bg.a * (1 - fg.a);
  if (a === 0) {
    return { r: 0, g: 0, b: 0, a: 0 };
  }
  return {
    r: (fg.r * fg.a + bg.r * bg.a * (1 - fg.a)) / a,
    g: (fg.g * fg.a + bg.g * bg.a * (1 - fg.a)) / a,
    b: (fg.b * fg.a + bg.b * bg.a * (1 - fg.a)) / a,
    a,
  };
}

function channel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function luminance(c: Rgba): number {
  return 0.2126 * channel(c.r) + 0.7152 * channel(c.g) + 0.0722 * channel(c.b);
}

function contrastRatio(a: Rgba, b: Rgba): number {
  const l1 = luminance(a);
  const l2 = luminance(b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function extractBlock(css: string, selector: string): string {
  const idx = css.indexOf(selector);
  if (idx < 0) {
    throw new Error(`missing selector ${selector}`);
  }
  const start = css.indexOf("{", idx);
  let depth = 0;
  for (let i = start; i < css.length; i++) {
    if (css[i] === "{") {
      depth++;
    } else if (css[i] === "}") {
      depth--;
      if (depth === 0) {
        return css.slice(start + 1, i);
      }
    }
  }
  throw new Error(`unclosed block for ${selector}`);
}

function readVars(block: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const line of block.split("\n")) {
    const m = line.match(/^\s*(--dir-[\w-]+)\s*:\s*(.+?)\s*;\s*$/);
    if (m?.[1] && m[2]) {
      map.set(m[1], m[2]);
    }
  }
  return map;
}

function requireVar(vars: Map<string, string>, name: string): string {
  const v = vars.get(name);
  if (!v) {
    throw new Error(`missing token ${name}`);
  }
  return v;
}

/** Card fills (default + touch) over base and over each of 4 shape centres. */
function cardSurfaces(vars: Map<string, string>): Rgba[] {
  const base = { ...parseColor(requireVar(vars, "--dir-base")), a: 1 };
  const shapeOpacity = Number(requireVar(vars, "--dir-shape-opacity"));
  const fills = [
    parseColor(requireVar(vars, "--dir-card-fill")),
    parseColor(requireVar(vars, "--dir-card-fill-touch")),
  ];
  const shapeKeys = ["--dir-shape-1", "--dir-shape-2", "--dir-shape-3", "--dir-shape-4"] as const;
  const surfaces: Rgba[] = [];
  for (const card of fills) {
    surfaces.push(composite(card, base));
    for (const key of shapeKeys) {
      const shape = parseColor(requireVar(vars, key));
      const lit = composite({ ...shape, a: shapeOpacity }, base);
      surfaces.push(composite(card, lit));
    }
  }
  return surfaces;
}

function worstTextContrast(vars: Map<string, string>, names: string[]): Map<string, number> {
  const surfaces = cardSurfaces(vars);
  const worst = new Map<string, number>();
  for (const name of names) {
    const fg = { ...parseColor(requireVar(vars, name)), a: 1 };
    let min = Infinity;
    for (const surface of surfaces) {
      min = Math.min(min, contrastRatio(fg, surface));
    }
    worst.set(name, min);
  }
  return worst;
}

function assertTextContrast(vars: Map<string, string>, names: string[], min: number) {
  const worst = worstTextContrast(vars, names);
  for (const name of names) {
    const r = worst.get(name) ?? 0;
    assert.ok(r >= min, `${name} worst-case: ${r.toFixed(2)} < ${min}`);
  }
}

function assertUiContrast(vars: Map<string, string>, token: string, min: number) {
  const surfaces = cardSurfaces(vars);
  const color = parseColor(requireVar(vars, token));
  if (token === "--dir-focus-ring" || token === "--dir-text-muted") {
    const solid = { ...color, a: 1 };
    const base = { ...parseColor(requireVar(vars, "--dir-base")), a: 1 };
    assert.ok(
      contrastRatio(solid, base) >= min,
      `${token} vs base: ${contrastRatio(solid, base).toFixed(2)} < ${min}`
    );
    for (const [i, surface] of surfaces.entries()) {
      const r = contrastRatio(solid, surface);
      assert.ok(r >= min, `${token} vs surface[${i}]: ${r.toFixed(2)} < ${min}`);
    }
    return;
  }
  for (const [i, surface] of surfaces.entries()) {
    const edge = composite(color, surface);
    const r = contrastRatio(edge, surface);
    assert.ok(r >= min, `${token} edge over surface[${i}]: ${r.toFixed(2)} < ${min}`);
  }
}

function assertSegmentActiveContrast(vars: Map<string, string>, min: number) {
  const surfaces = cardSurfaces(vars);
  const fill = parseColor(requireVar(vars, "--dir-segment-active-fill"));
  const text = { ...parseColor(requireVar(vars, "--dir-segment-active-text")), a: 1 };
  for (const [i, surface] of surfaces.entries()) {
    const activeSurface = composite(fill, surface);
    const r = contrastRatio(text, activeSurface);
    assert.ok(
      r >= min,
      `--dir-segment-active-text over active fill on surface[${i}]: ${r.toFixed(2)} < ${min}`
    );
  }
}

describe("directory contrast tokens", () => {
  const css = readFileSync(cssPath, "utf8");
  const light = readVars(extractBlock(css, ".directory-shell {"));
  const darkOverrides = readVars(extractBlock(css, ".dark .directory-shell {"));
  const dark = new Map([...light, ...darkOverrides]);

  const textTokens = [
    "--dir-text-name",
    "--dir-text-role",
    "--dir-text-summary",
    "--dir-text-results",
    "--dir-text-placeholder",
    "--dir-text-status",
    "--dir-text-pagination",
  ];

  it("meets WCAG 4.5:1 text contrast in light theme", () => {
    assertTextContrast(light, textTokens, 4.5);
  });

  it("meets WCAG 4.5:1 text contrast in dark theme", () => {
    assertTextContrast(dark, textTokens, 4.5);
  });

  it("meets WCAG 3:1 for search border and focus ring in light theme", () => {
    assertUiContrast(light, "--dir-search-border", 3);
    assertUiContrast(light, "--dir-focus-ring", 3);
  });

  it("meets WCAG 3:1 for search border and focus ring in dark theme", () => {
    assertUiContrast(dark, "--dir-search-border", 3);
    assertUiContrast(dark, "--dir-focus-ring", 3);
  });

  it("meets WCAG 3:1 for segment active text over active fill in light theme", () => {
    assertSegmentActiveContrast(light, 3);
  });

  it("meets WCAG 3:1 for segment active text over active fill in dark theme", () => {
    assertSegmentActiveContrast(dark, 3);
  });

  it("meets WCAG 3:1 for social icon muted colour in light theme", () => {
    assertUiContrast(light, "--dir-text-muted", 3);
  });

  it("meets WCAG 3:1 for social icon muted colour in dark theme", () => {
    assertUiContrast(dark, "--dir-text-muted", 3);
  });

  it("reports worst-case ratios per text token", () => {
    const lightWorst = worstTextContrast(light, textTokens);
    const darkWorst = worstTextContrast(dark, textTokens);
    for (const name of textTokens) {
      console.log(
        `contrast ${name}: light ${lightWorst.get(name)?.toFixed(2)} dark ${darkWorst.get(name)?.toFixed(2)}`
      );
    }
  });
});
