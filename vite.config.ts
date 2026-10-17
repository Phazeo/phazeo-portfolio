import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import type { Plugin } from "vite";
import { defineConfig } from "vite";

const __dirname = dirname(fileURLToPath(import.meta.url));

type RedirectRule = { from: string; to: string; status: number; splat: boolean };

function loadRedirects(): RedirectRule[] {
  const file = resolve(__dirname, "public/_redirects");
  if (!existsSync(file)) return [];
  const rules: RedirectRule[] = [];
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const parts = t.split(/\s+/);
    if (parts.length < 3) continue;
    const [from, to, statusStr] = parts;
    const status = Number(statusStr);
    if (!from || !to || !Number.isFinite(status)) continue;
    rules.push({
      from,
      to,
      status,
      splat: from.endsWith("/*"),
    });
  }
  return rules;
}

function matchRedirect(urlPath: string, rules: RedirectRule[]): { location: string; status: number } | null {
  const path = urlPath.split("?")[0] || "/";
  for (const rule of rules) {
    if (rule.splat) {
      const prefix = rule.from.slice(0, -1); // drop trailing *
      if (path === prefix.slice(0, -1) || path.startsWith(prefix)) {
        const rest = path.startsWith(prefix) ? path.slice(prefix.length) : "";
        const location = rule.to.includes(":splat")
          ? rule.to.replace(":splat", rest)
          : rule.to;
        return { location, status: rule.status };
      }
    } else if (path === rule.from) {
      return { location: rule.to, status: rule.status };
    }
  }
  return null;
}

function redirectsPlugin(): Plugin {
  return {
    name: "phazeo-redirects",
    configureServer(server) {
      const rules = loadRedirects();
      server.middlewares.use((req, res, next) => {
        const url = req.url || "/";
        const hit = matchRedirect(url, rules);
        if (!hit) {
          next();
          return;
        }
        res.statusCode = hit.status;
        res.setHeader("Location", hit.location);
        res.end();
      });
    },
    configurePreviewServer(server) {
      const rules = loadRedirects();
      server.middlewares.use((req, res, next) => {
        const url = req.url || "/";
        const hit = matchRedirect(url, rules);
        if (!hit) {
          next();
          return;
        }
        res.statusCode = hit.status;
        res.setHeader("Location", hit.location);
        res.end();
      });
    },
  };
}
export default defineConfig({
  plugins: [react(), tailwindcss(), redirectsPlugin()],
  base: "/",
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: "dist",
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: "vendor",
              test: /node_modules\/(react|react-dom|react-router(?:-dom)?)\//,
            },
          ],
        },
      },
    },
  },
});
