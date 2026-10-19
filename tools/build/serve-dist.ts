#!/usr/bin/env node
/**
 * Tiny static server for dist/ that applies CDN-style _headers and _redirects.
 * No dependencies. Used by tests/prove/prove-csp.ts.
 *
 * Usage: node tools/build/serve-dist.ts [--port 4173] [--dir <dist-folder>]
 * --dir defaults to this repo's dist/; tests/prove/visual-parity.ts uses it to
 * serve builds of other commits with this one server.
 * Prints LISTEN <port> when ready.
 */
import { existsSync, readFileSync, statSync } from "node:fs";
import type { Stats } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { loadRedirects, matchRedirect } from "./redirects.ts";

const ROOT = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const DEFAULT_DIST = join(ROOT, "dist");

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".map": "application/json",
};

type HeaderRule = { pattern: string; headers: Record<string, string> };

function parseArgs(argv: readonly string[]): { port: number; dist: string } {
  let port = 4173;
  let dist = DEFAULT_DIST;
  for (let i = 2; i < argv.length; i++) {
    const next = argv[i + 1];
    if (argv[i] === "--port" && next) {
      port = Number(next);
      i++;
    } else if (argv[i] === "--dir" && next) {
      dist = resolve(next);
      i++;
    }
  }
  return { port, dist };
}

function parseHeadersFile(text: string): HeaderRule[] {
  const rules: HeaderRule[] = [];
  let current: HeaderRule | null = null;
  for (const raw of text.split("\n")) {
    const line = raw.replace(/\r$/, "");
    if (!line.trim() || line.trim().startsWith("#")) continue;
    if (!line.startsWith(" ") && !line.startsWith("\t")) {
      current = { pattern: line.trim(), headers: {} };
      rules.push(current);
      continue;
    }
    if (!current) continue;
    const trimmed = line.trim();
    const idx = trimmed.indexOf(":");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    current.headers[key] = value;
  }
  return rules;
}

function pathMatches(pattern: string, pathname: string): boolean {
  if (pattern === "/*" || pattern === "*") return true;
  if (pattern.endsWith("/*")) {
    const prefix = pattern.slice(0, -1); // keep trailing /
    return pathname === prefix.slice(0, -1) || pathname.startsWith(prefix);
  }
  return pathname === pattern;
}

function applyHeaderRules(pathname: string, rules: readonly HeaderRule[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const rule of rules) {
    if (pathMatches(rule.pattern, pathname)) {
      Object.assign(out, rule.headers);
    }
  }
  return out;
}

function safeJoin(root: string, urlPath: string): string | null {
  const decoded = decodeURIComponent(urlPath.split("?")[0] ?? "/");
  const cleaned = normalize(decoded).replace(/^(\.\.(\/|\\|$))+/, "");
  const abs = resolve(root, `.${cleaned}`);
  if (!abs.startsWith(root + sep) && abs !== root) return null;
  return abs;
}

function main(): void {
  const { port, dist: DIST } = parseArgs(process.argv);
  if (!existsSync(DIST)) {
    console.error(`serve-dist: ${DIST} missing - run pnpm build first`);
    process.exit(1);
  }

  const headersRules = existsSync(join(DIST, "_headers"))
    ? parseHeadersFile(readFileSync(join(DIST, "_headers"), "utf8"))
    : [];
  const redirectRules = loadRedirects(join(DIST, "_redirects"));

  const server = createServer((req, res) => {
    const host = req.headers.host ?? `127.0.0.1:${port}`;
    const url = new URL(req.url ?? "/", `http://${host}`);
    let pathname = url.pathname;
    if (pathname.length > 1 && pathname.endsWith("/")) {
      pathname = pathname.slice(0, -1);
    }

    const redir = matchRedirect(pathname, redirectRules);
    if (redir) {
      const hdrs = applyHeaderRules(pathname, headersRules);
      res.writeHead(redir.status, { Location: redir.location, ...hdrs });
      res.end();
      return;
    }

    let filePath = safeJoin(DIST, pathname === "/" ? "/index.html" : pathname);
    if (!filePath) {
      res.writeHead(400).end("bad path");
      return;
    }

    let st: Stats | null;
    try {
      st = statSync(filePath);
    } catch {
      st = null;
    }

    // SPA fallback: unknown paths without extension go to index.html (404 routes handled by app)
    if (!st || !st.isFile()) {
      const ext = extname(pathname);
      if (!ext || ext === ".html") {
        filePath = join(DIST, "index.html");
        try {
          st = statSync(filePath);
        } catch {
          res.writeHead(404).end("not found");
          return;
        }
      } else {
        const hdrs = applyHeaderRules(pathname, headersRules);
        res.writeHead(404, hdrs).end("not found");
        return;
      }
    }

    const body = readFileSync(filePath);
    const type = MIME[extname(filePath).toLowerCase()] ?? "application/octet-stream";
    const hdrs = applyHeaderRules(pathname, headersRules);
    res.writeHead(200, { "Content-Type": type, "Content-Length": body.length, ...hdrs });
    res.end(body);
  });

  server.listen(port, "127.0.0.1", () => {
    console.log(`LISTEN ${port}`);
  });
}

main();
