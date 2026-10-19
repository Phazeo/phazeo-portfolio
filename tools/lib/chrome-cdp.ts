/**
 * Minimal Chrome DevTools Protocol helpers over the built-in WebSocket.
 * No dependencies. Shared by tests/prove/prove-csp.ts and tests/prove/visual-parity.ts.
 */
import { existsSync, readdirSync } from "node:fs";
import { createServer } from "node:http";
import { join } from "node:path";

export type CdpParams = Record<string, unknown>;

export type CdpResult = {
  sessionId?: string;
  targetId?: string;
  browserContextId?: string;
  data?: string;
  exceptionDetails?: { text?: string };
  result?: { value?: unknown };
};

type CdpMessage = {
  id?: number;
  method?: string;
  params?: unknown;
  result?: CdpResult;
  error?: unknown;
};

export type CdpSend = (method: string, params?: CdpParams) => Promise<CdpResult>;

type Pending = {
  resolve: (value: CdpResult) => void;
  reject: (reason: Error) => void;
};

export type CdpConnection = {
  send: (method: string, params?: CdpParams, sessionId?: string) => Promise<CdpResult>;
  on: (method: string, fn: (params: unknown) => void) => () => void;
  close: () => void;
};

export function findChromium(): string | null {
  const fromEnv = process.env["CHROME_PATH"] || process.env["CHROMIUM_PATH"];
  if (fromEnv && existsSync(fromEnv)) {
    return fromEnv;
  }
  const cache = join(process.env["HOME"] ?? "", ".cache/ms-playwright");
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
  for (const c of [
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ]) {
    if (existsSync(c)) return c;
  }
  return null;
}

export async function getFreePort(): Promise<number> {
  return new Promise<number>((resolvePort) => {
    const s = createServer();
    s.listen(0, "127.0.0.1", () => {
      const addr = s.address();
      const port = typeof addr === "object" && addr ? addr.port : 0;
      s.close(() => resolvePort(port));
    });
  });
}

/** Extract webSocketDebuggerUrl from a /json/version response body. */
export function webSocketUrlFrom(data: unknown): string | null {
  if (typeof data !== "object" || data === null) return null;
  const url: unknown = Reflect.get(data, "webSocketDebuggerUrl");
  return typeof url === "string" && url ? url : null;
}

export async function cdpConnect(wsUrl: string): Promise<CdpConnection> {
  const ws = new WebSocket(wsUrl);
  await new Promise<void>((res, rej) => {
    ws.addEventListener("open", () => res());
    ws.addEventListener("error", (e) => rej(e));
  });
  let nextId = 1;
  const pending = new Map<number, Pending>();
  const events = new Map<string, Set<(params: unknown) => void>>();

  ws.addEventListener("message", (ev) => {
    const msg: CdpMessage = JSON.parse(String(ev.data));
    const p = msg.id != null ? pending.get(msg.id) : undefined;
    if (msg.id != null && p) {
      pending.delete(msg.id);
      if (msg.error) p.reject(new Error(JSON.stringify(msg.error)));
      else p.resolve(msg.result ?? {});
      return;
    }
    if (msg.method) {
      const set = events.get(msg.method);
      if (set) for (const fn of set) fn(msg.params);
    }
  });

  function on(method: string, fn: (params: unknown) => void): () => void {
    let set = events.get(method);
    if (!set) {
      set = new Set();
      events.set(method, set);
    }
    set.add(fn);
    return () => {
      events.get(method)?.delete(fn);
    };
  }

  function send(method: string, params: CdpParams = {}, sessionId?: string): Promise<CdpResult> {
    const id = nextId++;
    const payload: Record<string, unknown> = { id, method, params };
    if (sessionId) payload["sessionId"] = sessionId;
    return new Promise<CdpResult>((resolveP, rejectP) => {
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

export async function withSession(
  browserCdp: CdpConnection,
  targetId: string
): Promise<{ sessionId: string; send: CdpSend }> {
  const { sessionId } = await browserCdp.send("Target.attachToTarget", {
    targetId,
    flatten: true,
  });
  if (!sessionId) throw new Error("Target.attachToTarget returned no sessionId");
  const send: CdpSend = (method, params = {}) => browserCdp.send(method, params, sessionId);
  return { sessionId, send };
}

export async function evaluate<T = unknown>(send: CdpSend, expression: string): Promise<T> {
  const result = await send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text ?? "evaluate failed");
  }
  return result.result?.value as T;
}
