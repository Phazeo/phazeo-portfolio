#!/usr/bin/env node
/**
 * Prove CSP via a real Chromium (Playwright package is not a repo dependency).
 * Uses the preinstalled ms-playwright Chromium or system google-chrome over CDP.
 * No new npm dependencies.
 *
 * Usage: node tests/prove/prove-csp.ts [--full]
 * Expects dist/ already built with _headers and _redirects.
 *
 * Modes:
 *   pr   (GITHUB_EVENT_NAME=pull_request or SCOPE_BASE set): visit the fixed routes
 *        (/, 404, retired redirect, prod-dist guest check, alex-morgan test build), each
 *        changed profile slug, and, when shared code changed, one React and one data
 *        representative profile.
 *   full (--full, SCOPE_FULL=1, PROVE_CSP_FULL=1, a failed diff, or any non-PR run):
 *        every profile under profiles/.
 */
import { spawn, spawnSync } from "node:child_process";
import type { Dirent } from "node:fs";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import {
  cdpConnect,
  evaluate,
  findChromium,
  getFreePort,
  webSocketUrlFrom,
  withSession,
} from "../../tools/lib/chrome-cdp.ts";
import { isPullRequestScope, loadScopeFromEnv } from "../../tools/lib/changed-scope.ts";

const ROOT = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const DIST = join(ROOT, "dist");
const DIST_PROD_BACKUP = join(ROOT, ".tmp-dist-prod-csp");

const DATA_PROFILE_FONT = "Outfit Variable";

type ProfileKind = "react" | "data";
type ProfileInfo = { slug: string; kind: ProfileKind };

/** Every profiles/<slug> folder with a meta.ts (react) or profile.json (data), sorted by slug. */
function discoverProfiles(): ProfileInfo[] {
  const dir = join(ROOT, "profiles");
  if (!existsSync(dir)) return [];
  const out: ProfileInfo[] = [];
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    if (!ent.isDirectory() || ent.name.startsWith("_") || ent.name.startsWith(".")) continue;
    if (existsSync(join(dir, ent.name, "meta.ts"))) out.push({ slug: ent.name, kind: "react" });
    else if (existsSync(join(dir, ent.name, "profile.json"))) out.push({ slug: ent.name, kind: "data" });
  }
  return out.sort((a, b) => a.slug.localeCompare(b.slug));
}

type Plan = { mode: "pr" | "full"; slugs: string[] };

/** Fixed routes always visited: /, 404, retired redirect, prod-dist check, alex-morgan build. */
const FIXED_ROUTE_COUNT = 5;

function planRoutes(): Plan {
  const profiles = discoverProfiles();
  const all = profiles.map((p) => p.slug);
  const forceFull =
    process.argv.includes("--full") ||
    process.env["SCOPE_FULL"] === "1" ||
    process.env["PROVE_CSP_FULL"] === "1";
  if (forceFull || !isPullRequestScope()) return { mode: "full", slugs: all };

  const scope = loadScopeFromEnv(ROOT);
  if (scope.failClosed) return { mode: "full", slugs: all };

  const picked = new Set(scope.changedSlugs.filter((slug) => all.includes(slug)));
  if (scope.sharedChanged) {
    // One representative per profile kind. With no data profile in the tree, the
    // alex-morgan guest build covers the data path.
    const react = profiles.find((p) => p.kind === "react");
    const data = profiles.find((p) => p.kind === "data");
    if (react) picked.add(react.slug);
    if (data) picked.add(data.slug);
  }
  return { mode: "pr", slugs: [...picked].sort() };
}

const EXPECTED_HEADING_FONT: Record<string, string> = {
  "dinesh-allimuthu": "Space Grotesk Variable",
  "sowmipriya-rajendiran": "Playfair Display Variable",
  "sriram-sm": "Outfit Variable",
  "kayalvizhi-sm": "Outfit Variable",
  "yokeshwar-vs": "Outfit Variable",
};

type RouteStatus = {
  title: string;
  h1: string | null;
  fontFamily: string | null;
  dark: boolean;
  violations: unknown[];
  errors: unknown[];
  href: string;
};

type Row = {
  route: string;
  status: string;
  violations: number;
  errors: number;
  heading: string | null;
  fontFamily: string | null;
  expectedFont?: string;
};

/** Prove write-headers rejects inline on* handlers (temp dist only). */
function proveWriteHeadersRejectsHandlers(): void {
  const tmp = mkdtempSync(join(tmpdir(), "phazeo-write-headers-"));
  try {
    mkdirSync(join(tmp, "dist"), { recursive: true });
    mkdirSync(join(tmp, "tools", "build"), { recursive: true });
    writeFileSync(
      join(tmp, "dist/index.html"),
      '<!doctype html><html><body><div onpointerdown="x()">x</div></body></html>\n',
      "utf8"
    );
    writeFileSync(
      join(tmp, "tools/build/write-headers.ts"),
      readFileSync(join(ROOT, "tools/build/write-headers.ts"), "utf8"),
      "utf8"
    );
    writeFileSync(
      join(tmp, "tools/build/headers-merge.ts"),
      readFileSync(join(ROOT, "tools/build/headers-merge.ts"), "utf8"),
      "utf8"
    );
    const result = spawnSync(process.execPath, ["tools/build/write-headers.ts"], {
      cwd: tmp,
      encoding: "utf8",
    });
    if (result.status === 0) {
      console.error("prove-csp: write-headers should fail on onpointerdown=");
      process.exit(1);
    }
    const err = `${result.stderr ?? ""}${result.stdout ?? ""}`;
    if (!/inline event handler/i.test(err)) {
      console.error("prove-csp: write-headers failure message missing handler hint");
      process.exit(1);
    }
    console.log("prove-csp: write-headers rejects onpointerdown= OK");
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

async function main(): Promise<void> {
  const plan = planRoutes();
  const profileKinds = new Map(discoverProfiles().map((p) => [p.slug, p.kind]));
  console.log(
    `prove-csp: mode=${plan.mode} routes=${FIXED_ROUTE_COUNT + plan.slugs.length} slugs=${plan.slugs.join(",") || "none"}`
  );

  proveWriteHeadersRejectsHandlers();

  const chromePath = findChromium();
  if (!chromePath) {
    console.error(
      "prove-csp: no Chromium found. Set CHROME_PATH to a usable Chrome/Chromium binary. STOP - do not add Playwright or download browsers without approval."
    );
    process.exit(2);
  }

  const servePort = await getFreePort();
  const debugPort = await getFreePort();

  const serve = spawn(process.execPath, [join(ROOT, "tools/build/serve-dist.ts"), "--port", String(servePort)], {
    cwd: ROOT,
    stdio: ["ignore", "pipe", "pipe"],
  });

  await new Promise<void>((res, rej) => {
    const t = setTimeout(() => rej(new Error("serve-dist timeout")), 15000);
    serve.stdout.on("data", (buf: Buffer) => {
      if (String(buf).includes("LISTEN")) {
        clearTimeout(t);
        res();
      }
    });
    serve.stderr.on("data", (buf: Buffer) => process.stderr.write(buf));
    serve.on("exit", (code) => {
      clearTimeout(t);
      rej(new Error(`serve-dist exited ${code}`));
    });
  });

  const chromeProfile = mkdtempSync(join(tmpdir(), "phazeo-csp-chrome-"));
  const chromeErr: Buffer[] = [];
  const chrome = spawn(
    chromePath,
    [
      `--remote-debugging-port=${debugPort}`,
      "--headless=new",
      "--disable-gpu",
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--no-first-run",
      "--no-default-browser-check",
      `--user-data-dir=${chromeProfile}`,
      "about:blank",
    ],
    { stdio: ["ignore", "ignore", "pipe"] }
  );
  chrome.stderr?.on("data", (buf: Buffer) => {
    chromeErr.push(buf);
  });

  let wsDebuggerUrl: string | null = null;
  for (let i = 0; i < 80; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${debugPort}/json/version`);
      wsDebuggerUrl = webSocketUrlFrom(await res.json());
      break;
    } catch {
      await sleep(250);
    }
  }
  if (!wsDebuggerUrl) {
    chrome.kill();
    serve.kill();
    rmSync(chromeProfile, { recursive: true, force: true });
    const errText = Buffer.concat(chromeErr).toString("utf8").trim();
    console.error("prove-csp: could not connect to Chromium CDP");
    if (errText) {
      console.error(errText.slice(0, 2000));
    }
    process.exit(1);
  }

  const browser = await cdpConnect(wsDebuggerUrl);
  const { targetId } = await browser.send("Target.createTarget", {
    url: "about:blank",
  });
  if (!targetId) throw new Error("Target.createTarget returned no targetId");
  const page = await withSession(browser, targetId);
  await page.send("Page.enable");
  await page.send("Runtime.enable");
  await page.send("Network.enable");
  await page.send("Page.addScriptToEvaluateOnNewDocument", {
    source: `
      window.__cspViolations = [];
      window.__consoleErrors = [];
      document.addEventListener('securitypolicyviolation', (e) => {
        window.__cspViolations.push({
          violatedDirective: e.violatedDirective,
          blockedURI: e.blockedURI,
          effectiveDirective: e.effectiveDirective,
        });
      });
      const origError = console.error.bind(console);
      console.error = (...args) => {
        window.__consoleErrors.push(args.map(String).join(' '));
        origError(...args);
      };
    `,
  });

  const base = `http://127.0.0.1:${servePort}`;
  const rows: Row[] = [];
  let failed = false;

  async function loadRoute(path: string, opts: { waitMs?: number } = {}): Promise<RouteStatus> {
    const url = `${base}${path}`;
    await page.send("Page.navigate", { url });
    // Wait for SPA + fonts
    await sleep(opts.waitMs ?? 2000);
    for (let i = 0; i < 30; i++) {
      const ready = await evaluate(
        page.send,
        `(async () => {
          await document.fonts.ready;
          return document.querySelector('h1')?.textContent?.trim()
            || document.body?.innerText?.slice(0, 80)
            || '';
        })()`
      );
      if (ready && String(ready).length > 0) break;
      await sleep(200);
    }

    const status = await evaluate<RouteStatus>(
      page.send,
      `(async () => {
        await document.fonts.ready;
        return {
          title: document.title,
          h1: document.querySelector('h1')?.textContent?.trim() || null,
          fontFamily: document.querySelector('h1')
            ? getComputedStyle(document.querySelector('h1')).fontFamily
            : null,
          dark: document.documentElement.classList.contains('dark'),
          violations: window.__cspViolations.slice(),
          errors: window.__consoleErrors.slice(),
          href: location.href,
        };
      })()`
    );
    return status;
  }

  // Reset collectors helper
  async function resetCollectors(): Promise<void> {
    await evaluate(
      page.send,
      `window.__cspViolations=[]; window.__consoleErrors=[]; true`
    );
  }

  // /
  await resetCollectors();
  {
    const r = await loadRoute("/");
    const violations = r.violations?.length ?? 0;
    const errors = r.errors?.length ?? 0;
    const ok = violations === 0 && errors === 0 && Boolean(r.h1 || r.title);
    if (!ok) failed = true;
    rows.push({
      route: "/",
      status: ok ? "ok" : "FAIL",
      violations,
      errors,
      heading: r.h1,
      fontFamily: r.fontFamily,
    });

    // Theme toggle
    await resetCollectors();
    const before = await evaluate<boolean>(page.send, `document.documentElement.classList.contains('dark')`);
    await evaluate(
      page.send,
      `document.querySelector('.theme-switch, [aria-label="Dark mode"], [aria-label*="Switch to"]')?.click(); true`
    );
    await sleep(400);
    const after = await evaluate<boolean>(page.send, `document.documentElement.classList.contains('dark')`);
    const themeOk = before !== after;
    if (!themeOk) failed = true;
    const viol = await evaluate<number>(page.send, `window.__cspViolations.length`);
    const errs = await evaluate<number>(page.send, `window.__consoleErrors.length`);
    rows.push({
      route: "/ (theme-toggle)",
      status: themeOk && viol === 0 && errs === 0 ? "ok" : "FAIL",
      violations: viol,
      errors: errs,
      heading: `dark:${before}->${after}`,
      fontFamily: null,
    });
  }

  for (const slug of plan.slugs) {
    await resetCollectors();
    const r = await loadRoute(`/${slug}`, { waitMs: 2000 });
    // Known React profiles have pinned fonts; data profiles default to Outfit; others skip the font check.
    const expected =
      EXPECTED_HEADING_FONT[slug] ?? (profileKinds.get(slug) === "data" ? DATA_PROFILE_FONT : "");
    const fontOk =
      expected === "" || (typeof r.fontFamily === "string" && r.fontFamily.includes(expected));
    const violations = r.violations?.length ?? 0;
    const errors = r.errors?.length ?? 0;
    const ok = violations === 0 && errors === 0 && Boolean(r.h1) && fontOk;
    if (!ok) failed = true;
    rows.push({
      route: `/${slug}`,
      status: ok ? "ok" : "FAIL",
      violations,
      errors,
      heading: r.h1,
      fontFamily: r.fontFamily,
      ...(expected ? { expectedFont: expected } : {}),
    });
  }

  // Retired slug redirect
  {
    const res = await fetch(`${base}/dinesh`, { redirect: "manual" });
    const ok = res.status === 301 && res.headers.get("location") === "/dinesh-allimuthu";
    if (!ok) failed = true;
    rows.push({
      route: "/dinesh (retired)",
      status: ok ? "ok" : "FAIL",
      violations: 0,
      errors: 0,
      heading: `HTTP ${res.status} → ${res.headers.get("location")}`,
      fontFamily: null,
    });
  }

  // 404 path (SPA serves index; app shows NotFound)
  await resetCollectors();
  {
    const r = await loadRoute("/this-slug-does-not-exist-xyz");
    const violations = r.violations?.length ?? 0;
    const errors = r.errors?.length ?? 0;
    const ok = violations === 0 && errors === 0;
    if (!ok) failed = true;
    rows.push({
      route: "/this-slug-does-not-exist-xyz",
      status: ok ? "ok" : "FAIL",
      violations,
      errors,
      heading: r.h1,
      fontFamily: r.fontFamily,
    });
  }

  // Production dist must not include the guest CSP example slug/name.
  {
    const hit = distContainsMarker(DIST, ["alex-morgan", "Alex Morgan"]);
    const ok = !hit;
    if (!ok) failed = true;
    rows.push({
      route: "prod-dist (no guest example)",
      status: ok ? "ok" : "FAIL",
      violations: 0,
      errors: ok ? 0 : 1,
      heading: hit ? `found:${hit}` : "clean",
      fontFamily: null,
    });
  }

  // Stop production server before rebuilding with the test-only example.
  serve.kill("SIGKILL");
  await sleep(300);

  // Test-only build with docs example injected as /alex-morgan
  rmSync(DIST_PROD_BACKUP, { recursive: true, force: true });
  renameSync(DIST, DIST_PROD_BACKUP);
  const guestBuild = spawnSync(
    "pnpm",
    ["exec", "vite", "build"],
    {
      cwd: ROOT,
      env: { ...process.env, VITE_GUEST_CSP_EXAMPLE: "1" },
      encoding: "utf8",
    }
  );
  if (guestBuild.status !== 0) {
    restoreProdDist();
    console.error(guestBuild.stdout);
    console.error(guestBuild.stderr);
    console.error("prove-csp: guest example vite build failed");
    process.exit(1);
  }
  const headers = spawnSync(process.execPath, [join(ROOT, "tools/build/write-headers.ts")], {
    cwd: ROOT,
    encoding: "utf8",
  });
  if (headers.status !== 0) {
    restoreProdDist();
    console.error(headers.stderr || headers.stdout);
    console.error("prove-csp: write-headers failed for guest example build");
    process.exit(1);
  }

  const serve2 = spawn(process.execPath, [join(ROOT, "tools/build/serve-dist.ts"), "--port", String(servePort)], {
    cwd: ROOT,
    stdio: ["ignore", "pipe", "pipe"],
  });
  await new Promise<void>((res, rej) => {
    const t = setTimeout(() => rej(new Error("serve-dist (guest) timeout")), 15000);
    serve2.stdout.on("data", (buf: Buffer) => {
      if (String(buf).includes("LISTEN")) {
        clearTimeout(t);
        res();
      }
    });
    serve2.stderr.on("data", (buf: Buffer) => process.stderr.write(buf));
    serve2.on("exit", (code) => {
      clearTimeout(t);
      rej(new Error(`serve-dist (guest) exited ${code}`));
    });
  });

  await resetCollectors();
  {
    const r = await loadRoute("/alex-morgan", { waitMs: 2000 });
    const expected = "Outfit Variable";
    const fontOk = typeof r.fontFamily === "string" && r.fontFamily.includes(expected);
    const violations = r.violations?.length ?? 0;
    const errors = r.errors?.length ?? 0;
    const ok =
      violations === 0 &&
      errors === 0 &&
      typeof r.h1 === "string" &&
      r.h1.includes("Alex Morgan") &&
      fontOk;
    if (!ok) failed = true;
    rows.push({
      route: "/alex-morgan (guest example, test build)",
      status: ok ? "ok" : "FAIL",
      violations,
      errors,
      heading: r.h1,
      fontFamily: r.fontFamily,
      expectedFont: expected,
    });
  }

  serve2.kill("SIGKILL");
  restoreProdDist();

  console.log(JSON.stringify({ chromePath, rows }, null, 2));
  for (const row of rows) {
    console.log(
      [
        row.route,
        row.status,
        `violations=${row.violations}`,
        `errors=${row.errors}`,
        row.fontFamily ? `font=${row.fontFamily}` : "",
        row.expectedFont ? `expected=${row.expectedFont}` : "",
        row.heading ? `h1=${JSON.stringify(row.heading).slice(0, 60)}` : "",
      ]
        .filter(Boolean)
        .join(" | ")
    );
  }

  browser.close();
  chrome.kill("SIGKILL");
  rmSync(chromeProfile, { recursive: true, force: true });

  if (failed) {
    console.error("prove-csp: FAILED");
    process.exit(1);
  }
  console.log("prove-csp: OK");
}

function restoreProdDist(): void {
  rmSync(DIST, { recursive: true, force: true });
  if (existsSync(DIST_PROD_BACKUP)) {
    renameSync(DIST_PROD_BACKUP, DIST);
  }
}

function distContainsMarker(dir: string, markers: readonly string[]): string | null {
  if (!existsSync(dir)) return "missing-dist";
  const stack: string[] = [dir];
  while (stack.length) {
    const cur = stack.pop();
    if (!cur) break;
    let entries: Dirent[];
    try {
      entries = readdirSync(cur, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const ent of entries) {
      const abs = join(cur, ent.name);
      if (ent.isDirectory()) {
        stack.push(abs);
        continue;
      }
      if (!/\.(js|css|html|json|txt|map)$/i.test(ent.name)) continue;
      let text = "";
      try {
        text = readFileSync(abs, "utf8");
      } catch {
        continue;
      }
      for (const m of markers) {
        if (text.includes(m)) return m;
      }
    }
  }
  return null;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
