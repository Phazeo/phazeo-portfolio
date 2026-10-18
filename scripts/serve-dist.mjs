#!/usr/bin/env node
/**
 * Tiny static server for dist/ that applies Cloudflare-style _headers and _redirects.
 * No dependencies. Used by prove-csp.mjs.
 *
 * Usage: node scripts/serve-dist.mjs [--port 4173]
 * Prints LISTEN <port> when ready.
 */
import { createServer } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const DIST = join(ROOT, "dist");

const MIME = {
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

function parseArgs(argv) {
  let port = 4173;
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--port" && argv[i + 1]) {
      port = Number(argv[++i]);
    }
  }
  return { port };
}

function parseHeadersFile(text) {
  /** @type {Array<{ pattern: string, headers: Record<string, string> }>} */
  const rules = [];
  let current = null;
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

function pathMatches(pattern, pathname) {
  if (pattern === "/*" || pattern === "*") return true;
  if (pattern.endsWith("/*")) {
    const prefix = pattern.slice(0, -1); // keep trailing /
    return pathname === prefix.slice(0, -1) || pathname.startsWith(prefix);
  }
  return pathname === pattern;
}

function applyHeaderRules(pathname, rules) {
  /** @type {Record<string, string>} */
  const out = {};
  for (const rule of rules) {
    if (pathMatches(rule.pattern, pathname)) {
      Object.assign(out, rule.headers);
    }
  }
  return out;
}

/**
 * Cloudflare Pages _redirects subset: `from to status` with optional :splat.
 */
function parseRedirects(text) {
  /** @type {Array<{ from: string, to: string, status: number }>} */
  const rules = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const parts = line.split(/\s+/);
    if (parts.length < 2) continue;
    const [from, to, statusStr] = parts;
    const status = statusStr ? Number(statusStr) : 301;
    rules.push({ from, to, status });
  }
  return rules;
}

function matchRedirect(pathname, rules) {
  for (const rule of rules) {
    if (rule.from.endsWith("/*")) {
      const prefix = rule.from.slice(0, -1); // e.g. /dinesh/
      const base = rule.from.slice(0, -2); // e.g. /dinesh
      if (pathname === base || pathname.startsWith(prefix)) {
        const splat = pathname === base ? "" : pathname.slice(prefix.length);
        const dest = rule.to.includes(":splat")
          ? rule.to.replace(":splat", splat)
          : rule.to;
        return { location: dest, status: rule.status };
      }
      continue;
    }
    if (pathname === rule.from) {
      return { location: rule.to, status: rule.status };
    }
  }
  return null;
}

function safeJoin(root, urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0] ?? "/");
  const cleaned = normalize(decoded).replace(/^(\.\.(\/|\\|$))+/, "");
  const abs = resolve(root, "." + cleaned);
  if (!abs.startsWith(root + sep) && abs !== root) return null;
  return abs;
}

function main() {
  const { port } = parseArgs(process.argv);
  if (!existsSync(DIST)) {
    console.error("serve-dist: dist/ missing — run pnpm build first");
    process.exit(1);
  }

  const headersRules = existsSync(join(DIST, "_headers"))
    ? parseHeadersFile(readFileSync(join(DIST, "_headers"), "utf8"))
    : [];
  const redirectRules = existsSync(join(DIST, "_redirects"))
    ? parseRedirects(readFileSync(join(DIST, "_redirects"), "utf8"))
    : [];

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

    let st;
    try {
      st = statSync(filePath);
    } catch {
      st = null;
    }

    // SPA fallback: unknown paths without extension → index.html (404 routes handled by app)
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
