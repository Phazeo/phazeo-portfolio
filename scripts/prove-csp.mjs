#!/usr/bin/env node
/**
 * Prove CSP via a real Chromium (Playwright package is not a repo dependency).
 * Uses the preinstalled ms-playwright Chromium or system google-chrome over CDP.
 * No new npm dependencies.
 *
 * Usage: node scripts/prove-csp.mjs [--port 4173]
 * Expects dist/ already built with _headers and _redirects.
 */
import { spawn } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { createServer } from "node:http";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as sleep } from "node:timers/promises";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const DIST = join(ROOT, "dist");

const PROFILE_SLUGS = [
  "dinesh-allimuthu",
  "sowmipriya-rajendiran",
  "sriram-sm",
  "kayalvizhi-sm",
  "yokeshwar-vs",
];

const EXPECTED_HEADING_FONT = {
  "dinesh-allimuthu": "Space Grotesk Variable",
  "sowmipriya-rajendiran": "Playfair Display Variable",
  "sriram-sm": "Outfit Variable",
  "kayalvizhi-sm": "Outfit Variable",
  "yokeshwar-vs": "Outfit Variable",
};

function findChromium() {
  const cache = join(process.env.HOME ?? "", ".cache/ms-playwright");
  if (existsSync(cache)) {
    for (const dir of readdirSync(cache)) {
      if (!dir.startsWith("chromium-")) continue;
      const candidates = [
        join(cache, dir, "chrome-linux", "chrome"),
        join(cache, dir, "chrome-linux64", "chrome"),
      ];
      for (const c of candidates) {
        if (existsSync(c)) return c;
      }
    }
  }
  for (const c of ["/usr/bin/google-chrome", "/usr/bin/chromium"]) {
    if (existsSync(c)) return c;
  }
  return null;
}

async function getFreePort() {
  return new Promise((resolvePort) => {
    const s = createServer();
    s.listen(0, "127.0.0.1", () => {
      const addr = s.address();
      const port = typeof addr === "object" && addr ? addr.port : 0;
      s.close(() => resolvePort(port));
    });
  });
}

async function cdpConnect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => {
    ws.addEventListener("open", () => res());
    ws.addEventListener("error", (e) => rej(e));
  });
  let nextId = 1;
  /** @type {Map<number, {resolve: Function, reject: Function}>} */
  const pending = new Map();
  /** @type {Map<string, Set<Function>>} */
  const events = new Map();

  ws.addEventListener("message", (ev) => {
    const msg = JSON.parse(String(ev.data));
    if (msg.id != null && pending.has(msg.id)) {
      const p = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) p.reject(new Error(JSON.stringify(msg.error)));
      else p.resolve(msg.result);
      return;
    }
    if (msg.method) {
      const set = events.get(msg.method);
      if (set) for (const fn of set) fn(msg.params);
    }
  });

  function on(method, fn) {
    if (!events.has(method)) events.set(method, new Set());
    events.get(method).add(fn);
    return () => events.get(method)?.delete(fn);
  }

  function send(method, params = {}, sessionId) {
    const id = nextId++;
    const payload = { id, method, params };
    if (sessionId) payload.sessionId = sessionId;
    return new Promise((resolveP, rejectP) => {
      pending.set(id, { resolve: resolveP, reject: rejectP });
      ws.send(JSON.stringify(payload));
    });
  }

  return {
    send,
    on,
    close: () => ws.close(),
  };
}

async function withSession(browserCdp, targetId) {
  const { sessionId } = await browserCdp.send("Target.attachToTarget", {
    targetId,
    flatten: true,
  });
  const send = (method, params = {}) => browserCdp.send(method, params, sessionId);
  return { sessionId, send };
}

async function evaluate(send, expression) {
  const result = await send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text ?? "evaluate failed");
  }
  return result.result?.value;
}

async function main() {
  const chromePath = findChromium();
  if (!chromePath) {
    console.error(
      "prove-csp: no Chromium found (Playwright not in package.json; no ms-playwright/google-chrome). STOP — do not add Playwright without approval."
    );
    process.exit(2);
  }

  const servePort = await getFreePort();
  const debugPort = await getFreePort();

  const serve = spawn(process.execPath, [join(ROOT, "scripts/serve-dist.mjs"), "--port", String(servePort)], {
    cwd: ROOT,
    stdio: ["ignore", "pipe", "pipe"],
  });

  await new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error("serve-dist timeout")), 15000);
    serve.stdout.on("data", (buf) => {
      if (String(buf).includes("LISTEN")) {
        clearTimeout(t);
        res();
      }
    });
    serve.stderr.on("data", (buf) => process.stderr.write(buf));
    serve.on("exit", (code) => {
      clearTimeout(t);
      rej(new Error(`serve-dist exited ${code}`));
    });
  });

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
      "--user-data-dir=/tmp/phazeo-csp-chrome-profile",
      "about:blank",
    ],
    { stdio: ["ignore", "pipe", "pipe"] }
  );

  let version;
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${debugPort}/json/version`);
      version = await res.json();
      break;
    } catch {
      await sleep(250);
    }
  }
  if (!version?.webSocketDebuggerUrl) {
    chrome.kill();
    serve.kill();
    console.error("prove-csp: could not connect to Chromium CDP");
    process.exit(1);
  }

  const browser = await cdpConnect(version.webSocketDebuggerUrl);
  const { targetId } = await browser.send("Target.createTarget", {
    url: "about:blank",
  });
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
  /** @type {Array<Record<string, unknown>>} */
  const rows = [];
  let failed = false;

  async function loadRoute(path, opts = {}) {
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

    const status = await evaluate(
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
  async function resetCollectors() {
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
    const before = await evaluate(page.send, `document.documentElement.classList.contains('dark')`);
    await evaluate(
      page.send,
      `document.querySelector('[aria-label*="Switch to"]')?.click(); true`
    );
    await sleep(400);
    const after = await evaluate(page.send, `document.documentElement.classList.contains('dark')`);
    const themeOk = before !== after;
    if (!themeOk) failed = true;
    const viol = await evaluate(page.send, `window.__cspViolations.length`);
    const errs = await evaluate(page.send, `window.__consoleErrors.length`);
    rows.push({
      route: "/ (theme-toggle)",
      status: themeOk && viol === 0 && errs === 0 ? "ok" : "FAIL",
      violations: viol,
      errors: errs,
      heading: `dark:${before}->${after}`,
      fontFamily: null,
    });
  }

  for (const slug of PROFILE_SLUGS) {
    await resetCollectors();
    const r = await loadRoute(`/${slug}`, { waitMs: 2000 });
    const expected = EXPECTED_HEADING_FONT[slug];
    const fontOk = typeof r.fontFamily === "string" && r.fontFamily.includes(expected);
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
      expectedFont: expected,
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
  serve.kill("SIGKILL");

  if (failed) {
    console.error("prove-csp: FAILED");
    process.exit(1);
  }
  console.log("prove-csp: OK");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
