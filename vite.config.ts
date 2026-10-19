import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import type { Plugin } from "vite";
import { defineConfig } from "vite";
import { loadRedirects, matchRedirect } from "./tools/build/redirects.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));

function redirectsPlugin(): Plugin {
  return {
    name: "phazeo-redirects",
    configureServer(server) {
      const rules = loadRedirects(resolve(__dirname, "public/_redirects"));
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
      const rules = loadRedirects(resolve(__dirname, "public/_redirects"));
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
export default defineConfig(({ command }) => {
  if (command === "build" && process.env["VITE_DIRECTORY_DEMO"]) {
    throw new Error(
      "VITE_DIRECTORY_DEMO is for local directory review only. Unset it before pnpm build."
    );
  }
  return {
    plugins: [react(), tailwindcss(), redirectsPlugin()],
    base: "/",
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
  };
});
