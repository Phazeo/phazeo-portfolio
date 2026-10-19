/**
 * Deterministic full-page screenshots over CDP.
 * Each capture runs in a fresh browser context (no shared storage or cache).
 */
import { setTimeout as sleep } from "node:timers/promises";
import {
  type CdpConnection,
  type CdpSend,
  evaluate,
  withSession,
} from "./chrome-cdp.ts";

export type Viewport = { name: string; width: number; height: number; mobile: boolean };
export type Theme = "light" | "dark";

export type CaptureOptions = {
  url: string;
  viewport: Viewport;
  theme: Theme;
  /** CSS selectors hidden with visibility:hidden before the screenshot. */
  masks: readonly string[];
  /** Wait after returning to the top so in-view animations (delay + duration) finish. */
  settleMs?: number;
};

/** setInterval delays at or above this are not scheduled. */
export const FROZEN_INTERVAL_MIN_MS = 1000;

const FREEZE_CSS = `
*, *::before, *::after {
  animation: none !important;
  animation-delay: 0s !important;
  animation-duration: 0s !important;
  transition: none !important;
  transition-delay: 0s !important;
  transition-duration: 0s !important;
  scroll-behavior: auto !important;
  caret-color: transparent !important;
}
`;

function installScript(masks: readonly string[]): string {
  const css = masks.length
    ? `${FREEZE_CSS}\n${masks.join(",\n")} { visibility: hidden !important; }\n`
    : FREEZE_CSS;
  // Constructable stylesheets are not subject to the page's style-src CSP,
  // so no CSP bypass is needed.
  // Long-period setInterval rotators (for example a word flipper on a 2.5s timer) make the
  // screenshot depend on wall-clock time. They are never scheduled, so the page shows its
  // first state. Short intervals (below 1s) and all setTimeout calls are left untouched.
  return `(() => {
    const realSetInterval = window.setInterval.bind(window);
    window.setInterval = (handler, delay, ...rest) =>
      typeof delay === "number" && delay >= ${FROZEN_INTERVAL_MIN_MS}
        ? 0
        : realSetInterval(handler, delay, ...rest);
    const css = ${JSON.stringify(css)};
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(css);
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
  })();`;
}

function stringProp(value: unknown, key: string): string | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const v: unknown = Reflect.get(value, key);
  return typeof v === "string" ? v : undefined;
}

function numberProp(value: unknown, key: string): number {
  if (typeof value !== "object" || value === null) return 0;
  const v: unknown = Reflect.get(value, key);
  return typeof v === "number" ? v : 0;
}

type NetworkTracker = {
  inflight: () => number;
  lastActivity: () => number;
  stop: () => void;
};

function trackNetwork(browser: CdpConnection): NetworkTracker {
  const open = new Set<string>();
  let last = Date.now();
  const add = (p: unknown): void => {
    const id = stringProp(p, "requestId");
    if (id) open.add(id);
    last = Date.now();
  };
  const del = (p: unknown): void => {
    const id = stringProp(p, "requestId");
    if (id) open.delete(id);
    last = Date.now();
  };
  const offs = [
    browser.on("Network.requestWillBeSent", add),
    browser.on("Network.loadingFinished", del),
    browser.on("Network.loadingFailed", del),
  ];
  return {
    inflight: () => open.size,
    lastActivity: () => last,
    stop: () => {
      for (const off of offs) off();
    },
  };
}

async function waitNetworkQuiet(net: NetworkTracker, quietMs = 500, timeoutMs = 20000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (net.inflight() === 0 && Date.now() - net.lastActivity() >= quietMs) return;
    await sleep(50);
  }
  throw new Error(`network not quiet after ${timeoutMs}ms (${net.inflight()} in flight)`);
}

async function scrollThrough(send: CdpSend): Promise<void> {
  // Visit the whole page so in-view and lazy content is triggered, then return to the top.
  await evaluate(
    send,
    `(async () => {
      const step = Math.max(200, Math.floor(window.innerHeight * 0.75));
      const total = document.documentElement.scrollHeight;
      for (let y = 0; y < total; y += step) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 60));
      }
      window.scrollTo(0, total);
      await new Promise((r) => setTimeout(r, 60));
      return true;
    })()`
  );
}

async function finishAndReset(send: CdpSend): Promise<void> {
  await evaluate(
    send,
    `(async () => {
      for (let pass = 0; pass < 5; pass++) {
        const running = document.getAnimations();
        if (running.length === 0) break;
        for (const a of running) {
          try { a.finish(); } catch { a.cancel(); }
        }
        await new Promise((r) => requestAnimationFrame(() => r(null)));
      }
      await document.fonts.ready;
      window.scrollTo(0, 0);
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(null))));
      return true;
    })()`
  );
}

export async function capturePage(
  browser: CdpConnection,
  opts: CaptureOptions
): Promise<Buffer> {
  const { browserContextId } = await browser.send("Target.createBrowserContext", {
    disposeOnDetach: true,
  });
  if (!browserContextId) throw new Error("Target.createBrowserContext returned no id");
  const { targetId } = await browser.send("Target.createTarget", {
    url: "about:blank",
    browserContextId,
  });
  if (!targetId) throw new Error("Target.createTarget returned no targetId");
  const net = trackNetwork(browser);
  try {
    const page = await withSession(browser, targetId);
    const { send } = page;
    await send("Page.enable");
    await send("Runtime.enable");
    await send("Network.enable");
    await send("Network.setCacheDisabled", { cacheDisabled: true });
    await send("Emulation.setDeviceMetricsOverride", {
      width: opts.viewport.width,
      height: opts.viewport.height,
      deviceScaleFactor: 1,
      mobile: opts.viewport.mobile,
    });
    await send("Emulation.setEmulatedMedia", {
      features: [
        { name: "prefers-color-scheme", value: opts.theme },
        { name: "prefers-reduced-motion", value: "reduce" },
      ],
    });
    await send("Page.addScriptToEvaluateOnNewDocument", { source: installScript(opts.masks) });

    const loaded = new Promise<void>((res, rej) => {
      const t = setTimeout(() => rej(new Error(`load timeout for ${opts.url}`)), 30000);
      const off = browser.on("Page.loadEventFired", () => {
        clearTimeout(t);
        off();
        res();
      });
    });
    await send("Page.navigate", { url: opts.url });
    await loaded;

    await waitNetworkQuiet(net);
    await evaluate(send, "document.fonts.ready.then(() => true)");
    await scrollThrough(send);
    await waitNetworkQuiet(net);
    await finishAndReset(send);
    await sleep(opts.settleMs ?? 1500);
    await finishAndReset(send);

    const scrollY = await evaluate<number>(send, "window.scrollY");
    if (scrollY !== 0) throw new Error(`expected scrollY 0, got ${scrollY}`);

    const metrics = await send("Page.getLayoutMetrics");
    const size: unknown = Reflect.get(metrics, "cssContentSize") ?? Reflect.get(metrics, "contentSize");
    const width = Math.max(opts.viewport.width, Math.ceil(numberProp(size, "width")));
    const height = Math.max(opts.viewport.height, Math.ceil(numberProp(size, "height")));
    const shot = await send("Page.captureScreenshot", {
      format: "png",
      fromSurface: true,
      captureBeyondViewport: true,
      clip: { x: 0, y: 0, width, height, scale: 1 },
    });
    if (!shot.data) throw new Error("Page.captureScreenshot returned no data");
    return Buffer.from(shot.data, "base64");
  } finally {
    net.stop();
    await browser.send("Target.closeTarget", { targetId }).catch(() => undefined);
    await browser.send("Target.disposeBrowserContext", { browserContextId }).catch(() => undefined);
  }
}
