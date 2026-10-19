/**
 * Static server for dist/ that applies CDN-style _headers (path merge
 * emulation from headers-merge) and _redirects, with SPA fallback for
 * extensionless paths.
 *
 * Usage: node tools/lib/static-server.ts [--port 4173] [--dir <dist-folder>]
 * Prints LISTEN <port> when ready. Import startStaticServer for programmatic use.
 */
import { existsSync, readFileSync, statSync } from "node:fs";
import type { Stats } from "node:fs";
import { createServer, type Server } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import {
  mergeHeadersForPath,
  parseHeadersFile,
  type HeaderBlock,
} from "../build/headers-merge.ts";
import { loadRedirects, matchRedirect } from "../build/redirects.ts";

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

export type StaticServerOptions = {
  port?: number;
  dist?: string;
  host?: string;
};

export type StaticServer = {
  port: number;
  close: () => Promise<void>;
};

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

function headersRecord(blocks: HeaderBlock[], pathname: string): Record<string, string> {
  const merged = mergeHeadersForPath(blocks, pathname);
  return Object.fromEntries(merged.entries());
}

function safeJoin(root: string, urlPath: string): string | null {
  const decoded = decodeURIComponent(urlPath.split("?")[0] ?? "/");
  const cleaned = normalize(decoded).replace(/^(\.\.(\/|\\|$))+/, "");
  const abs = resolve(root, `.${cleaned}`);
  if (!abs.startsWith(root + sep) && abs !== root) return null;
  return abs;
}

/** Start a static server. Resolves once listening. */
export function startStaticServer(opts: StaticServerOptions = {}): Promise<StaticServer> {
  const port = opts.port ?? 4173;
  const host = opts.host ?? "127.0.0.1";
  const DIST = opts.dist ?? DEFAULT_DIST;

  if (!existsSync(DIST)) {
    return Promise.reject(new Error(`static-server: ${DIST} missing - run pnpm build first`));
  }

  const headersBlocks = existsSync(join(DIST, "_headers"))
    ? parseHeadersFile(readFileSync(join(DIST, "_headers"), "utf8"))
    : [];
  const redirectRules = loadRedirects(join(DIST, "_redirects"));

  const server: Server = createServer((req, res) => {
    const reqHost = req.headers.host ?? `${host}:${port}`;
    const url = new URL(req.url ?? "/", `http://${reqHost}`);
    let pathname = url.pathname;
    if (pathname.length > 1 && pathname.endsWith("/")) {
      pathname = pathname.slice(0, -1);
    }

    const redir = matchRedirect(pathname, redirectRules);
    if (redir) {
      const hdrs = headersRecord(headersBlocks, pathname);
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

    // SPA fallback: unknown paths without extension go to index.html
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
        const hdrs = headersRecord(headersBlocks, pathname);
        res.writeHead(404, hdrs).end("not found");
        return;
      }
    }

    const body = readFileSync(filePath);
    const type = MIME[extname(filePath).toLowerCase()] ?? "application/octet-stream";
    const hdrs = headersRecord(headersBlocks, pathname);
    res.writeHead(200, { "Content-Type": type, "Content-Length": body.length, ...hdrs });
    res.end(body);
  });

  return new Promise((resolveListen, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      resolveListen({
        port,
        close: () =>
          new Promise((res, rej) => {
            server.close((err) => (err ? rej(err) : res()));
          }),
      });
    });
  });
}

const invokedAsCli =
  Boolean(process.argv[1]) &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1] ?? "");

if (invokedAsCli) {
  const { port, dist } = parseArgs(process.argv);
  startStaticServer({ port, dist })
    .then(() => {
      console.log(`LISTEN ${port}`);
    })
    .catch((err: unknown) => {
      console.error(err instanceof Error ? err.message : err);
      process.exit(1);
    });
}
