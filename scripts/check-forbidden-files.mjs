#!/usr/bin/env node
/**
 * Fail on forbidden filenames and GPS EXIF/XMP in JPEG/PNG/WebP under public/.
 * No new dependencies - pure Node buffer scans for GPS markers.
 * Never prints secret or EXIF coordinate values.
 */
import { createReadStream, existsSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));

const FORBIDDEN_NAME =
  /(^|\/)(\.env(\..+)?|.*\.pem|.*\.key|.*\.p12|.*\.pfx|id_rsa.*|id_ed25519.*|.*\.tfstate.*|.*\.sqlite.*|.*\.db|.*\.dump|docker-compose.*\.ya?ml|.*\.kdbx)$/i;

const FORBIDDEN_BASENAME = /^(nginx\.conf|Caddyfile|caddy\.json)$/i;

const SKIP_DIR = new Set([
  ".git",
  "node_modules",
  ".tools",
  "dist",
  "test/leak-fixtures",
]);

const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp"]);

function parseArgs(argv) {
  const out = { roots: [], includeFixtures: false, reportImages: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--include-fixtures") out.includeFixtures = true;
    else if (a === "--report-images") out.reportImages = true;
    else if (a === "--root" && argv[i + 1]) {
      out.roots.push(resolve(argv[++i]));
    } else if (a.startsWith("-")) {
      console.error(`check-forbidden-files: unknown flag ${a}`);
      process.exit(2);
    } else {
      out.roots.push(resolve(a));
    }
  }
  if (out.roots.length === 0) out.roots.push(ROOT);
  return out;
}

function shouldSkipDir(rel) {
  const norm = rel.split(sep).join("/");
  for (const skip of SKIP_DIR) {
    if (norm === skip || norm.startsWith(`${skip}/`)) return true;
  }
  return false;
}

function* walk(dir, base, includeFixtures) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const ent of entries) {
    const abs = join(dir, ent.name);
    const rel = relative(base, abs);
    if (ent.isDirectory()) {
      if (!includeFixtures && shouldSkipDir(rel)) continue;
      if (includeFixtures && (rel.split(sep)[0] === "node_modules" || rel.startsWith(".git"))) {
        continue;
      }
      yield* walk(abs, base, includeFixtures);
    } else if (ent.isFile()) {
      yield { abs, rel };
    }
  }
}

function isForbiddenPath(rel) {
  const norm = rel.split(sep).join("/");
  const base = norm.split("/").pop() ?? "";
  if (FORBIDDEN_BASENAME.test(base)) return true;
  if (FORBIDDEN_NAME.test(norm)) return true;
  if (/(^|\/)nginx\//i.test(norm) || /(^|\/)caddy\//i.test(norm)) return true;
  return false;
}

/** Read up to max bytes. */
async function readHead(path, max = 512 * 1024) {
  const chunks = [];
  let total = 0;
  const stream = createReadStream(path, { start: 0, end: max - 1 });
  for await (const chunk of stream) {
    chunks.push(chunk);
    total += chunk.length;
    if (total >= max) break;
  }
  return Buffer.concat(chunks, total);
}

/**
 * Detect GPS metadata without decoding coordinates.
 * JPEG: EXIF IFD0 tag 0x8825 (GPSInfo) or XMP gps namespace.
 * PNG: eXIf chunk or XMP gps.
 * WebP: EXIF chunk or XMP gps.
 */
function hasGpsMetadata(buf, ext) {
  if (buf.length < 12) return false;
  const lower = buf.toString("latin1").toLowerCase();
  if (
    lower.includes("exif:gps") ||
    lower.includes("gpslatitude") ||
    lower.includes("gpslongitude") ||
    lower.includes("xmlns:gps=") ||
    lower.includes("/gps/")
  ) {
    return true;
  }

  if (ext === ".jpg" || ext === ".jpeg") {
    // APP1 Exif + GPS IFD tag 0x8825 as big/little endian
    if (buf[0] !== 0xff || buf[1] !== 0xd8) return false;
    for (let i = 0; i < buf.length - 10; i++) {
      if (buf[i] === 0xff && buf[i + 1] === 0xe1) {
        const marker = buf.toString("ascii", i + 4, i + 8);
        if (marker === "Exif") {
          // Search for GPS IFD pointer tag inside EXIF
          for (let j = i; j < Math.min(buf.length - 1, i + 65535); j++) {
            // tag 0x8825 little-endian: 25 88 ; big-endian: 88 25
            if (
              (buf[j] === 0x25 && buf[j + 1] === 0x88) ||
              (buf[j] === 0x88 && buf[j + 1] === 0x25)
            ) {
              return true;
            }
          }
        }
      }
    }
    return false;
  }

  if (ext === ".png") {
    // Look for eXIf chunk type
    for (let i = 8; i < buf.length - 8; i++) {
      if (buf.toString("ascii", i, i + 4) === "eXIf") return true;
    }
    return false;
  }

  if (ext === ".webp") {
    if (buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WEBP") {
      return false;
    }
    for (let i = 12; i < buf.length - 4; i++) {
      const fourcc = buf.toString("ascii", i, i + 4);
      if (fourcc === "EXIF" || fourcc === "exif") return true;
    }
    return false;
  }

  return false;
}

function extOf(rel) {
  const m = /\.([a-z0-9]+)$/i.exec(rel);
  return m ? `.${m[1].toLowerCase()}` : "";
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const findings = [];
  const imageReport = [];

  for (const root of args.roots) {
    if (!existsSync(root)) {
      console.error(`check-forbidden-files: root not found: ${root}`);
      process.exit(2);
    }
    for (const { abs, rel } of walk(root, root, args.includeFixtures)) {
      if (isForbiddenPath(rel)) {
        findings.push({ rule: "forbidden-file", file: rel, line: 1 });
        continue;
      }
      const ext = extOf(rel);
      const norm = rel.split(sep).join("/");
      const rootNorm = root.split(sep).join("/");
      const underPublic =
        norm.startsWith("public/") ||
        norm.includes("/public/") ||
        rootNorm === "public" ||
        rootNorm.endsWith("/public");
      if (!IMAGE_EXT.has(ext)) continue;
      if (!underPublic && !args.reportImages && !args.includeFixtures) continue;

      let size = 0;
      try {
        size = statSync(abs).size;
      } catch {
        continue;
      }
      const head = await readHead(abs);
      const gps = hasGpsMetadata(head, ext);
      if (args.reportImages) {
        imageReport.push({ file: rel, size, gps });
      }
      if (gps && (underPublic || args.includeFixtures)) {
        findings.push({ rule: "image-gps-metadata", file: rel, line: 1 });
      }
    }
  }

  if (args.reportImages) {
    for (const row of imageReport) {
      console.log(
        JSON.stringify({
          file: row.file,
          size: row.size,
          gps: row.gps,
        })
      );
    }
  }

  if (findings.length > 0) {
    for (const f of findings) {
      console.error(`[${f.rule}] ${f.file}:${f.line}`);
    }
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("check-forbidden-files: unexpected error");
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(2);
});
