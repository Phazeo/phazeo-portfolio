#!/usr/bin/env node
/**
 * Prove visual parity between two commits.
 *
 * Builds BASE and HEAD in separate temporary git worktrees, compares dist/ file
 * hashes, serves both with tools/build/serve-dist.ts, and screenshots every route
 * in Chrome over CDP (desktop and mobile, light and dark). HEAD is captured twice
 * to prove the capture is deterministic. No new npm dependencies.
 *
 * Usage:
 *   node tests/prove/visual-parity.ts [--base <rev>] [--head <rev>] [--out <dir>]
 *                                     [--mask <css-selector>]... [--keep]
 *                                     [--allow-dist-diff] [--help]
 *   defaults: --base origin/batch/merge-private-into-public  --head HEAD
 *
 * --allow-dist-diff: report dist/ differences (paths and SHA-256) but do not fail on them.
 *   Screenshot comparison and the determinism check stay strict. Use this for intentional
 *   refactors where bundle hashes change but pixels must not. CI does not pass this flag.
 *
 * Exit codes: 0 pass, 1 parity or determinism failure, 2 Chrome not found.
 */
import { type ChildProcess, spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import {
  type CdpConnection,
  cdpConnect,
  findChromium,
  getFreePort,
  webSocketUrlFrom,
} from "../../tools/lib/chrome-cdp.ts";
import {
  buildManifest,
  compareManifests,
  type DistFile,
} from "../../tools/lib/dist-manifest.ts";
import {
  addWorktree,
  installAndBuild,
  removeWorktree,
  resolveCommit,
} from "../../tools/lib/git-build.ts";
import { capturePage, type Theme, type Viewport } from "../../tools/lib/page-capture.ts";
import { diffPng } from "../../tools/lib/png.ts";

const ROOT = resolve(fileURLToPath(new URL("../..", import.meta.url)));

const DEFAULT_BASE = "origin/batch/merge-private-into-public";
const DEFAULT_HEAD = "HEAD";
const MISSING_ROUTE = "/__visual-parity-missing__";

const VIEWPORTS: readonly Viewport[] = [
  { name: "desktop", width: 1440, height: 900, mobile: false },
  { name: "mobile", width: 390, height: 844, mobile: true },
];
const THEMES: readonly Theme[] = ["light", "dark"];

/** CSS selectors hidden in every capture. Keep empty unless something truly cannot be made deterministic. */
const BUILTIN_MASKS: readonly string[] = [];

type Args = {
  base: string;
  head: string;
  out: string | null;
  masks: string[];
  keep: boolean;
  allowDistDiff: boolean;
  help: boolean;
};

const HELP = `Usage: node tests/prove/visual-parity.ts [options]

Build BASE and HEAD, compare dist/ hashes, and screenshot every route (desktop and
mobile, light and dark). HEAD is captured twice to prove determinism.

Options:
  --base <rev>         BASE revision (default: ${DEFAULT_BASE})
  --head <rev>         HEAD revision (default: ${DEFAULT_HEAD})
  --out <dir>          Directory for screenshots and dist manifests
  --mask <selector>    CSS selector hidden in every capture (repeatable)
  --keep               Keep temporary worktrees and build output
  --allow-dist-diff    Report dist/ differences but do not fail on them.
                       Screenshots and determinism checks remain strict.
  -h, --help           Show this help

Exit codes: 0 pass, 1 parity or determinism failure, 2 Chrome not found.
`;

type Route = { label: string; path: string };

type Label = "base" | "head" | "head2";

type Served = { label: Label; url: string; proc: ChildProcess };

function parseArgs(argv: readonly string[]): Args {
  const args: Args = {
    base: DEFAULT_BASE,
    head: DEFAULT_HEAD,
    out: null,
    masks: [],
    keep: false,
    allowDistDiff: false,
    help: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const flag = argv[i];
    const next = argv[i + 1];
    const need = (): string => {
      if (!next) throw new Error(`${flag} needs a value`);
      i++;
      return next;
    };
    if (flag === "--base") args.base = need();
    else if (flag === "--head") args.head = need();
    else if (flag === "--out") args.out = resolve(need());
    else if (flag === "--mask") args.masks.push(need());
    else if (flag === "--keep") args.keep = true;
    else if (flag === "--allow-dist-diff") args.allowDistDiff = true;
    else if (flag === "--help" || flag === "-h") args.help = true;
    else if (flag === "--") continue;
    else throw new Error(`unknown argument: ${flag}`);
  }
  return args;
}

function slugsIn(worktree: string): string[] {
  const dir = join(worktree, "profiles");
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith("_") && !e.name.startsWith("."))
    .map((e) => e.name)
    .sort();
}

function buildRoutes(slugs: readonly string[]): Route[] {
  return [
    { label: "home", path: "/" },
    ...slugs.map((s) => ({ label: `profile-${s}`, path: `/${s}` })),
    { label: "not-found", path: MISSING_ROUTE },
  ];
}

async function serve(label: Label, dist: string): Promise<Served> {
  const port = await getFreePort();
  const proc = spawn(
    process.execPath,
    [join(ROOT, "tools/build/serve-dist.ts"), "--port", String(port), "--dir", dist],
    { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"] }
  );
  await new Promise<void>((res, rej) => {
    const t = setTimeout(() => rej(new Error(`serve-dist timeout (${label})`)), 15000);
    proc.stdout?.on("data", (buf: Buffer) => {
      if (String(buf).includes("LISTEN")) {
        clearTimeout(t);
        res();
      }
    });
    proc.stderr?.on("data", (buf: Buffer) => process.stderr.write(buf));
    proc.on("exit", (code) => {
      clearTimeout(t);
      rej(new Error(`serve-dist exited ${code} (${label})`));
    });
  });
  return { label, url: `http://127.0.0.1:${port}`, proc };
}

async function launchChrome(
  chromePath: string,
  profileDir: string
): Promise<{ proc: ChildProcess; browser: CdpConnection }> {
  const debugPort = await getFreePort();
  const proc = spawn(
    chromePath,
    [
      `--remote-debugging-port=${debugPort}`,
      "--headless=new",
      "--disable-gpu",
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--no-first-run",
      "--no-default-browser-check",
      "--hide-scrollbars",
      "--force-color-profile=srgb",
      "--force-device-scale-factor=1",
      "--font-render-hinting=none",
      "--disable-lcd-text",
      `--user-data-dir=${profileDir}`,
      "about:blank",
    ],
    { stdio: ["ignore", "ignore", "ignore"] }
  );
  let wsUrl: string | null = null;
  for (let i = 0; i < 80 && !wsUrl; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${debugPort}/json/version`);
      wsUrl = webSocketUrlFrom(await res.json());
    } catch {
      await sleep(250);
    }
  }
  if (!wsUrl) {
    proc.kill();
    throw new Error("could not connect to Chrome CDP");
  }
  return { proc, browser: await cdpConnect(wsUrl) };
}

function shotName(route: Route, viewport: Viewport, theme: Theme): string {
  return `${route.label}__${viewport.name}__${theme}.png`;
}

type ShotKey = string;
const keyOf = (route: Route, viewport: Viewport, theme: Theme): ShotKey =>
  `${route.label}|${viewport.name}|${theme}`;

async function capturePass(
  browser: CdpConnection,
  served: Served,
  routes: readonly Route[],
  masks: readonly string[],
  outDir: string
): Promise<Map<ShotKey, Buffer>> {
  const dir = join(outDir, served.label);
  mkdirSync(dir, { recursive: true });
  const shots = new Map<ShotKey, Buffer>();
  for (const route of routes) {
    for (const viewport of VIEWPORTS) {
      for (const theme of THEMES) {
        const png = await capturePage(browser, {
          url: `${served.url}${route.path}`,
          viewport,
          theme,
          masks,
        });
        writeFileSync(join(dir, shotName(route, viewport, theme)), png);
        shots.set(keyOf(route, viewport, theme), png);
      }
    }
  }
  console.log(`visual-parity: captured ${shots.size} screenshots for ${served.label}`);
  return shots;
}

type CompareResult = { failures: string[]; identical: number; pixelEqual: number };

function compareShots(
  aName: string,
  bName: string,
  a: Map<ShotKey, Buffer>,
  b: Map<ShotKey, Buffer>,
  routes: readonly Route[]
): CompareResult {
  const failures: string[] = [];
  let identical = 0;
  let pixelEqual = 0;
  for (const route of routes) {
    for (const viewport of VIEWPORTS) {
      for (const theme of THEMES) {
        const key = keyOf(route, viewport, theme);
        const x = a.get(key);
        const y = b.get(key);
        const where = `route=${route.path} viewport=${viewport.name} theme=${theme}`;
        if (!x || !y) {
          failures.push(`${where}: missing screenshot (${aName}=${!!x} ${bName}=${!!y})`);
          continue;
        }
        if (x.equals(y)) {
          identical++;
          continue;
        }
        const d = diffPng(x, y);
        if (d.differingPixels === 0) {
          pixelEqual++;
          continue;
        }
        const size = d.sizeMismatch
          ? ` size mismatch ${aName}=${d.a.width}x${d.a.height} ${bName}=${d.b.width}x${d.b.height}`
          : "";
        failures.push(
          `${where}: ${d.differingPixels} of ${d.totalPixels} pixels differ${size}`
        );
      }
    }
  }
  return { failures, identical, pixelEqual };
}

async function main(): Promise<number> {
  const args = parseArgs(process.argv);
  if (args.help) {
    console.log(HELP);
    return 0;
  }
  const masks = [...BUILTIN_MASKS, ...args.masks];

  const chromePath = findChromium();
  if (!chromePath) {
    console.error(
      "visual-parity: no Chromium found. Set CHROME_PATH to a usable Chrome/Chromium binary. Do not add Playwright or download browsers."
    );
    return 2;
  }

  const baseSha = resolveCommit(ROOT, args.base);
  const headSha = resolveCommit(ROOT, args.head);
  const sameCommit = baseSha === headSha;
  console.log(`visual-parity: BASE ${args.base} -> ${baseSha}`);
  console.log(`visual-parity: HEAD ${args.head} -> ${headSha}`);
  if (sameCommit) console.log("visual-parity: BASE and HEAD are the same commit; building once");

  const work = mkdtempSync(join(tmpdir(), "phazeo-visual-parity-"));
  const outDir = args.out ?? join(work, "screenshots");
  mkdirSync(outDir, { recursive: true });
  const worktrees: string[] = [];
  const procs: ChildProcess[] = [];
  let browser: CdpConnection | null = null;

  const cleanup = (): void => {
    browser?.close();
    for (const p of procs) p.kill();
    if (!args.keep) {
      for (const wt of worktrees) removeWorktree(ROOT, wt);
      rmSync(join(work, "base"), { recursive: true, force: true });
      rmSync(join(work, "head"), { recursive: true, force: true });
      rmSync(join(work, "chrome-profile"), { recursive: true, force: true });
    }
  };
  const onSignal = (): void => {
    cleanup();
    process.exit(130);
  };
  process.once("SIGINT", onSignal);
  process.once("SIGTERM", onSignal);

  try {
    // 1. Build both commits in isolated worktrees.
    const built = new Map<string, { worktree: string; dist: string }>();
    for (const [name, sha] of [
      ["base", baseSha],
      ["head", headSha],
    ] as const) {
      const existing = built.get(sha);
      if (existing) continue;
      const wt = join(work, name);
      addWorktree(ROOT, wt, sha);
      worktrees.push(wt);
      console.log(`visual-parity: building ${name} ${sha.slice(0, 12)} (install + build)`);
      const dist = installAndBuild(wt, join(work, `${name}-build.log`));
      built.set(sha, { worktree: wt, dist });
    }
    const baseBuild = built.get(baseSha);
    const headBuild = built.get(headSha);
    if (!baseBuild || !headBuild) throw new Error("internal: missing build");

    // 2. dist manifests.
    const baseManifest: DistFile[] = buildManifest(baseBuild.dist);
    const headManifest: DistFile[] = buildManifest(headBuild.dist);
    writeFileSync(join(outDir, "dist-base.json"), `${JSON.stringify(baseManifest, null, 2)}\n`);
    writeFileSync(join(outDir, "dist-head.json"), `${JSON.stringify(headManifest, null, 2)}\n`);
    const distCmp = compareManifests(baseManifest, headManifest);
    const distOk = distCmp.identical || distCmp.sameContentSets;
    console.log(
      `visual-parity: dist BASE ${baseManifest.length} files, HEAD ${headManifest.length} files`
    );
    if (distCmp.identical) {
      console.log("visual-parity: dist identical (same paths, same SHA-256)");
    } else if (distCmp.sameContentSets) {
      console.log("visual-parity: dist file names differ but content SHA-256 multisets are equal");
      for (const line of distCmp.pathDiffs) console.log(`  ${line}`);
    } else {
      console.log("visual-parity: dist DIFFERS");
      for (const line of distCmp.pathDiffs) console.log(`  ${line}`);
      for (const line of distCmp.contentDiffs) console.log(`  ${line}`);
    }

    // 3. Routes (union of both commits so a missing profile surfaces as a diff).
    const slugs = [...new Set([...slugsIn(baseBuild.worktree), ...slugsIn(headBuild.worktree)])].sort();
    const routes = buildRoutes(slugs);
    console.log(`visual-parity: routes ${routes.map((r) => r.path).join(" ")}`);

    // 4. Serve and capture.
    const servedBase = await serve("base", baseBuild.dist);
    const servedHead = await serve("head", headBuild.dist);
    const servedHead2 = await serve("head2", headBuild.dist);
    procs.push(servedBase.proc, servedHead.proc, servedHead2.proc);

    const chrome = await launchChrome(chromePath, join(work, "chrome-profile"));
    procs.push(chrome.proc);
    browser = chrome.browser;

    const baseShots = await capturePass(browser, servedBase, routes, masks, outDir);
    const headShots = await capturePass(browser, servedHead, routes, masks, outDir);
    const head2Shots = await capturePass(browser, servedHead2, routes, masks, outDir);

    // 5. Determinism: HEAD twice must be byte-identical.
    const det = compareShots("head", "head2", headShots, head2Shots, routes);
    const detOk = det.pixelEqual === 0 && det.failures.length === 0;
    if (!detOk) {
      console.log("visual-parity: determinism FAIL (HEAD captured twice is not byte-identical)");
      for (const f of det.failures) console.log(`  ${f}`);
      if (det.pixelEqual > 0) console.log(`  ${det.pixelEqual} pairs differ in bytes but not pixels`);
    }

    // 6. BASE vs HEAD.
    const cmp = compareShots("base", "head", baseShots, headShots, routes);
    const visualOk = cmp.failures.length === 0;
    if (!visualOk) {
      console.log("visual-parity: visual differences");
      for (const f of cmp.failures) console.log(`  ${f}`);
    }

    // 7. Summary.
    const total = routes.length * VIEWPORTS.length * THEMES.length;
    console.log("");
    console.log("visual-parity summary");
    console.log(
      `  matrix: ${routes.length} routes x ${VIEWPORTS.length} viewports x ${THEMES.length} themes = ${total} screenshot pairs`
    );
    console.log(`  viewports: ${VIEWPORTS.map((v) => `${v.width}x${v.height}`).join(", ")}`);
    console.log(`  themes: ${THEMES.join(", ")}`);
    console.log(`  masks: ${masks.length ? masks.join(", ") : "none"}`);
    console.log(
      `  dist: ${distCmp.identical ? "identical" : distOk ? "same content, different names" : "DIFFERENT"}`
    );
    console.log(
      `  determinism (HEAD x2): ${detOk ? `OK, ${det.identical}/${total} byte-identical` : "FAIL"}`
    );
    console.log(
      `  visual (BASE vs HEAD): ${visualOk ? "OK" : "FAIL"}, ${cmp.identical} byte-identical, ${cmp.pixelEqual} pixel-identical, ${cmp.failures.length} differing`
    );
    console.log(`  screenshots: ${outDir}`);
    const distPass = distOk || args.allowDistDiff;
    if (!distOk && args.allowDistDiff) {
      console.log("  dist difference ignored (--allow-dist-diff); screenshots remain strict");
    }
    const ok = distPass && detOk && visualOk;
    console.log(`visual-parity: ${ok ? "PASS" : "FAIL"}`);
    return ok ? 0 : 1;
  } finally {
    cleanup();
  }
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error(err);
    process.exit(1);
  }
);
