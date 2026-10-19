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

function srgbToLin(c: number): number {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function linToSrgb(c: number): number {
  const v = c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
  return Math.min(255, Math.max(0, Math.round(v * 255)));
}

/**
 * backdrop-filter brightness model (conservative):
 * - Multiply channels in linear light, then encode back to sRGB.
 * - Blur is ignored (backdrop colour is treated as uniform).
 * - Saturate is treated as luminance-preserving.
 */
function applyBrightness(color: Rgba, factor: number): Rgba {
  return {
    r: linToSrgb(srgbToLin(color.r) * factor),
    g: linToSrgb(srgbToLin(color.g) * factor),
    b: linToSrgb(srgbToLin(color.b) * factor),
    a: color.a,
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

function shapeLightest(vars: Map<string, string>, n: 1 | 2 | 3 | 4): Rgba {
  const light = parseColor(requireVar(vars, `--dir-shape-${n}-light`));
  const innerA = Number(requireVar(vars, "--dir-shape-inner-alpha"));
  return composite({ r: 255, g: 255, b: 255, a: innerA }, { ...light, a: 1 });
}

function shapeDarkest(vars: Map<string, string>, n: 1 | 2 | 3 | 4): Rgba {
  return parseColor(requireVar(vars, `--dir-shape-${n}-dark`));
}

/** Backdrops after brightness, before glass stack. */
function backdrops(vars: Map<string, string>): Rgba[] {
  const base = { ...parseColor(requireVar(vars, "--dir-base")), a: 1 };
  const shapeOpacity = Number(requireVar(vars, "--dir-shape-opacity"));
  const brightness = Number(requireVar(vars, "--dir-brightness"));
  const out: Rgba[] = [applyBrightness(base, brightness)];
  for (const n of [1, 2, 3, 4] as const) {
    out.push(
      applyBrightness(
        composite({ ...shapeLightest(vars, n), a: shapeOpacity }, base),
        brightness
      )
    );
    out.push(
      applyBrightness(
        composite({ ...shapeDarkest(vars, n), a: shapeOpacity }, base),
        brightness
      )
    );
  }
  return out;
}

/**
 * Text-zone stack v2: tint, then weak overlay only.
 * Strong corner overlay and specular band are outside the text zone.
 */
function textZoneSurfaces(vars: Map<string, string>): Rgba[] {
  const fills = [
    parseColor(requireVar(vars, "--dir-card-fill")),
    parseColor(requireVar(vars, "--dir-card-fill-touch")),
  ];
  const weak = parseColor(requireVar(vars, "--dir-overlay-weak"));
  const surfaces: Rgba[] = [];
  for (const bd of backdrops(vars)) {
    for (const fill of fills) {
      let s = composite(fill, bd);
      s = composite(weak, s);
      surfaces.push(s);
    }
  }
  return surfaces;
}

function worstTextContrast(vars: Map<string, string>, names: string[]): Map<string, number> {
  const surfaces = textZoneSurfaces(vars);
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
    assert.ok(r + 1e-9 >= min, `${name} worst-case: ${r.toFixed(2)} < ${min}`);
  }
}

function assertUiContrast(vars: Map<string, string>, token: string, min: number) {
  const surfaces = textZoneSurfaces(vars);
  const color = parseColor(requireVar(vars, token));
  if (token === "--dir-focus-ring" || token === "--dir-text-muted") {
    const solid = { ...color, a: 1 };
    for (const [i, surface] of surfaces.entries()) {
      const r = contrastRatio(solid, surface);
      assert.ok(r + 1e-9 >= min, `${token} vs surface[${i}]: ${r.toFixed(2)} < ${min}`);
    }
    return;
  }
  for (const [i, surface] of surfaces.entries()) {
    const edge = composite(color, surface);
    const r = contrastRatio(edge, surface);
    assert.ok(r + 1e-9 >= min, `${token} edge over surface[${i}]: ${r.toFixed(2)} < ${min}`);
  }
}

function assertSegmentActiveContrast(vars: Map<string, string>, min: number) {
  const surfaces = textZoneSurfaces(vars);
  const fill = parseColor(requireVar(vars, "--dir-segment-active-fill"));
  const text = { ...parseColor(requireVar(vars, "--dir-segment-active-text")), a: 1 };
  for (const [i, surface] of surfaces.entries()) {
    const activeSurface = composite(fill, surface);
    const r = contrastRatio(text, activeSurface);
    assert.ok(
      r + 1e-9 >= min,
      `--dir-segment-active-text over active fill on surface[${i}]: ${r.toFixed(2)} < ${min}`
    );
  }
}

function fillAlpha(vars: Map<string, string>, name: string): number {
  return parseColor(requireVar(vars, name)).a;
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

  it("meets translucency ceilings for card fills (raise tint only)", () => {
    assert.ok(
      fillAlpha(dark, "--dir-card-fill") <= 0.5 + 1e-9,
      `dark tint ${fillAlpha(dark, "--dir-card-fill")} > 0.50`
    );
    assert.ok(
      fillAlpha(dark, "--dir-card-fill-touch") <= 0.55 + 1e-9,
      `dark touch ${fillAlpha(dark, "--dir-card-fill-touch")} > 0.55`
    );
    assert.ok(
      fillAlpha(light, "--dir-card-fill") <= 0.38 + 1e-9,
      `light fill ${fillAlpha(light, "--dir-card-fill")} > 0.38`
    );
    assert.ok(
      fillAlpha(light, "--dir-card-fill-touch") <= 0.42 + 1e-9,
      `light touch ${fillAlpha(light, "--dir-card-fill-touch")} > 0.42`
    );
  });

  it("keeps placeholder distinct from typed text and secondary from name", () => {
    assert.notEqual(
      requireVar(light, "--dir-text-placeholder"),
      requireVar(light, "--dir-text-name")
    );
    assert.notEqual(
      requireVar(light, "--dir-text-role"),
      requireVar(light, "--dir-text-name")
    );
    assert.notEqual(
      requireVar(dark, "--dir-text-placeholder"),
      requireVar(dark, "--dir-text-name")
    );
    assert.notEqual(
      requireVar(dark, "--dir-text-role"),
      requireVar(dark, "--dir-text-name")
    );
  });

  it("meets WCAG 4.5:1 text-zone stack contrast in light theme", () => {
    assertTextContrast(light, textTokens, 4.5);
  });

  it("meets WCAG 4.5:1 text-zone stack contrast in dark theme", () => {
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

  it("meets WCAG 3:1 for dark hero title end colour over base (large text)", () => {
    const fg = { ...parseColor(requireVar(dark, "--dir-hero-to")), a: 1 };
    const base = { ...parseColor(requireVar(dark, "--dir-base")), a: 1 };
    const r = contrastRatio(fg, base);
    assert.ok(
      r + 1e-9 >= 3,
      `--dir-hero-to over --dir-base: ${r.toFixed(2)} < 3`
    );
    console.log(`contrast dark hero-to over base: ${r.toFixed(2)}`);
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
