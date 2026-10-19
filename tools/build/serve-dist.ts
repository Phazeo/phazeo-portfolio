#!/usr/bin/env node
/**
 * CLI wrapper around tools/lib/static-server.ts.
 * Usage: node tools/build/serve-dist.ts [--port 4173] [--dir <dist-folder>]
 */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { startStaticServer } from "../lib/static-server.ts";

const ROOT = resolve(fileURLToPath(new URL("../..", import.meta.url)));

function parseArgs(argv: readonly string[]): { port: number; dist: string } {
  let port = 4173;
  let dist = resolve(ROOT, "dist");
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

const { port, dist } = parseArgs(process.argv);
startStaticServer({ port, dist })
  .then(() => {
    console.log(`LISTEN ${port}`);
  })
  .catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
