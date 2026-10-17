import { cpSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { type Plugin, defineConfig } from "vite";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Production (private monorepo merge) serves assets under /profiles/_public/<slug>/.
 * This preview app keeps sources in public/profiles/<slug>/ and rewrites at serve time;
 * after build, copies into dist/profiles/_public/ so preview matches production URLs.
 */
function profilePublicAssetsPlugin(): Plugin {
  const rewrite = (url?: string) => {
    if (!url?.startsWith("/profiles/_public/")) {
      return url;
    }
    return url.replace("/profiles/_public/", "/profiles/");
  };

  return {
    name: "profile-public-assets",
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        if (req.url) {
          req.url = rewrite(req.url) ?? req.url;
        }
        next();
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, _res, next) => {
        if (req.url) {
          req.url = rewrite(req.url) ?? req.url;
        }
        next();
      });
    },
    closeBundle() {
      const srcRoot = resolve(__dirname, "public/profiles");
      const destRoot = resolve(__dirname, "dist/profiles/_public");
      if (!existsSync(srcRoot)) {
        return;
      }
      mkdirSync(destRoot, { recursive: true });
      for (const entry of readdirSync(srcRoot, { withFileTypes: true })) {
        if (!entry.isDirectory() || entry.name === "_public") {
          continue;
        }
        cpSync(join(srcRoot, entry.name), join(destRoot, entry.name), {
          recursive: true,
          force: true,
        });
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), profilePublicAssetsPlugin()],
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
