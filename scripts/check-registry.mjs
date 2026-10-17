#!/usr/bin/env node
/**
 * Load src/registry.ts via Vite SSR so registry validation fails the build
 * (not only at runtime in the browser). Uses vite already in the tree — no new deps.
 */
import { createServer } from "vite";

const ROOT = new URL("..", import.meta.url).pathname;

async function main() {
  const server = await createServer({
    root: ROOT,
    server: { middlewareMode: true },
    appType: "custom",
    logLevel: "error",
  });

  try {
    await server.ssrLoadModule("/src/registry.ts");
    console.log("check-registry: OK");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("check-registry: FAILED");
    console.error(message);
    process.exitCode = 1;
  } finally {
    await server.close();
  }
}

main();
