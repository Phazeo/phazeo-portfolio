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

function surfaces(vars: Map<string, string>): { overBase: Rgba; overGlow: Rgba } {
  const base = { ...parseColor(requireVar(vars, "--dir-base")), a: 1 };
  const glow = parseColor(requireVar(vars, "--dir-glow-bright"));
  const glowOpacity = Math.max(
    Number(requireVar(vars, "--dir-glow-opacity-tl")),
    Number(requireVar(vars, "--dir-glow-opacity-br"))
  );
  const card = parseColor(requireVar(vars, "--dir-card-fill"));
  const overBase = composite(card, base);
  const lit = composite({ ...glow, a: glowOpacity }, base);
  const overGlow = composite(card, lit);
  return { overBase, overGlow };
}

function assertTextContrast(vars: Map<string, string>, names: string[], min: number) {
  const { overBase, overGlow } = surfaces(vars);
  for (const name of names) {
    const fg = parseColor(requireVar(vars, name));
    const solid = { ...fg, a: 1 };
    const r1 = contrastRatio(solid, overBase);
    const r2 = contrastRatio(solid, overGlow);
    assert.ok(
      r1 >= min,
      `${name} over base+card: ${r1.toFixed(2)} < ${min}`
    );
    assert.ok(
      r2 >= min,
      `${name} over glow+card: ${r2.toFixed(2)} < ${min}`
    );
  }
}

function assertUiContrast(vars: Map<string, string>, token: string, min: number) {
  const { overBase, overGlow } = surfaces(vars);
  const color = parseColor(requireVar(vars, token));
  // Focus ring is drawn as opaque outline color.
  if (token === "--dir-focus-ring") {
    const solid = { ...color, a: 1 };
    const base = { ...parseColor(requireVar(vars, "--dir-base")), a: 1 };
    assert.ok(
      contrastRatio(solid, base) >= min,
      `${token} vs base: ${contrastRatio(solid, base).toFixed(2)} < ${min}`
    );
    assert.ok(
      contrastRatio(solid, overGlow) >= min,
      `${token} vs glow+card: ${contrastRatio(solid, overGlow).toFixed(2)} < ${min}`
    );
    return;
  }
  // Search border: composite translucent stroke over the field/card surface.
  const edgeBase = composite(color, overBase);
  const edgeGlow = composite(color, overGlow);
  assert.ok(
    contrastRatio(edgeBase, overBase) >= min,
    `${token} edge over base+card: ${contrastRatio(edgeBase, overBase).toFixed(2)} < ${min}`
  );
  assert.ok(
    contrastRatio(edgeGlow, overGlow) >= min,
    `${token} edge over glow+card: ${contrastRatio(edgeGlow, overGlow).toFixed(2)} < ${min}`
  );
}

describe("directory contrast tokens", () => {
  const css = readFileSync(cssPath, "utf8");
  const light = readVars(extractBlock(css, ".directory-shell {"));
  const dark = readVars(extractBlock(css, ".dark .directory-shell {"));

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
});
