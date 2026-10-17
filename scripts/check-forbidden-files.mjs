#!/usr/bin/env node
/**
 * Fail on forbidden filenames and any EXIF/XMP metadata in JPEG/PNG/WebP/GIF
 * anywhere in the tree (rule id: image-metadata).
 * Pure Node container parsers over the whole file. Never prints EXIF values.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
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

const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);

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

function looksLikeXmp(buf) {
  const n = Math.min(buf.length, 512);
  const head = buf.toString("latin1", 0, n);
  // Avoid http(s):// host literals in this source file (host scanner).
  return (
    head.includes("ns.adobe.com/xap/") ||
    head.includes("adobe:ns:meta") ||
    head.includes("<x:xmpmeta") ||
    head.includes("xmlns:xmp=")
  );
}

/** JPEG: walk markers; APP1 Exif\0\0 or XMP packet. */
function jpegHasMetadata(buf) {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return false;
  let i = 2;
  while (i + 3 < buf.length) {
    if (buf[i] !== 0xff) {
      i += 1;
      continue;
    }
    const marker = buf[i + 1];
    if (marker === 0xd9 || marker === 0xda) break;
    if (marker === 0x00 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      i += 2;
      continue;
    }
    if (i + 3 >= buf.length) break;
    const segLen = buf.readUInt16BE(i + 2);
    if (segLen < 2 || i + 2 + segLen > buf.length) break;
    const payload = buf.subarray(i + 4, i + 2 + segLen);
    if (marker === 0xe1) {
      if (
        payload.length >= 6 &&
        payload.toString("ascii", 0, 4) === "Exif" &&
        payload[4] === 0x00 &&
        payload[5] === 0x00
      ) {
        return true;
      }
      if (looksLikeXmp(payload)) return true;
    } else if (marker >= 0xe0 && marker <= 0xef) {
      if (looksLikeXmp(payload)) return true;
    }
    i += 2 + segLen;
  }
  return false;
}

/** PNG: eXIf chunk, or text chunks carrying XMP. */
function pngHasMetadata(buf) {
  if (buf.length < 8) return false;
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (!buf.subarray(0, 8).equals(sig)) return false;
  let i = 8;
  while (i + 12 <= buf.length) {
    const len = buf.readUInt32BE(i);
    const type = buf.toString("ascii", i + 4, i + 8);
    const dataStart = i + 8;
    const dataEnd = dataStart + len;
    if (dataEnd + 4 > buf.length) break;
    const data = buf.subarray(dataStart, dataEnd);
    if (type === "eXIf") return true;
    if (type === "iTXt" || type === "tEXt" || type === "zTXt") {
      const keywordEnd = data.indexOf(0);
      const keyword =
        keywordEnd >= 0 ? data.toString("latin1", 0, keywordEnd) : data.toString("latin1");
      if (keyword === "XML:com.adobe.xmp" || keyword.toLowerCase().includes("xmp")) return true;
      if (looksLikeXmp(data)) return true;
    }
    if (type === "IEND") break;
    i = dataEnd + 4;
  }
  return false;
}

/** WebP: EXIF / XMP chunks. */
function webpHasMetadata(buf) {
  if (buf.length < 16) return false;
  if (buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WEBP") {
    return false;
  }
  let i = 12;
  while (i + 8 <= buf.length) {
    const fourcc = buf.toString("ascii", i, i + 4);
    const size = buf.readUInt32LE(i + 4);
    const dataStart = i + 8;
    const dataEnd = dataStart + size;
    if (dataEnd > buf.length) break;
    if (fourcc === "EXIF" || fourcc === "exif" || fourcc === "XMP " || fourcc === "XMP\0") {
      return true;
    }
    const data = buf.subarray(dataStart, dataEnd);
    if (looksLikeXmp(data)) return true;
    i = dataEnd + (size % 2);
  }
  return false;
}

/** GIF: Application Extension carrying XMP. */
function gifHasMetadata(buf) {
  if (buf.length < 6) return false;
  const header = buf.toString("ascii", 0, 6);
  if (header !== "GIF87a" && header !== "GIF89a") return false;
  let i = 6;
  while (i + 2 < buf.length) {
    const b = buf[i];
    if (b === 0x3b) break; // trailer
    if (b === 0x2c) {
      // image descriptor
      if (i + 10 > buf.length) break;
      i += 10;
      const packed = buf[i - 1];
      if (packed & 0x80) {
        const lzw = packed & 0x07;
        i += 3 * 2 ** (lzw + 1);
      }
      if (i >= buf.length) break;
      i += 1; // LZW min code size
      while (i < buf.length) {
        const block = buf[i];
        i += 1;
        if (block === 0) break;
        i += block;
      }
      continue;
    }
    if (b === 0x21) {
      const label = buf[i + 1];
      i += 2;
      if (label === 0xff && i + 11 <= buf.length) {
        const ident = buf.toString("latin1", i, i + 8);
        const auth = buf.toString("latin1", i + 8, i + 11);
        i += 11;
        if (ident.startsWith("XMP") || `${ident}${auth}`.includes("XMP")) {
          return true;
        }
        // drain data sub-blocks; inspect for XMP packet
        const chunks = [];
        while (i < buf.length) {
          const block = buf[i];
          i += 1;
          if (block === 0) break;
          chunks.push(buf.subarray(i, i + block));
          i += block;
        }
        if (looksLikeXmp(Buffer.concat(chunks))) return true;
        continue;
      }
      while (i < buf.length) {
        const block = buf[i];
        i += 1;
        if (block === 0) break;
        i += block;
      }
      continue;
    }
    i += 1;
  }
  return false;
}

function hasImageMetadata(buf, ext) {
  if (ext === ".jpg" || ext === ".jpeg") return jpegHasMetadata(buf);
  if (ext === ".png") return pngHasMetadata(buf);
  if (ext === ".webp") return webpHasMetadata(buf);
  if (ext === ".gif") return gifHasMetadata(buf);
  return false;
}

function extOf(rel) {
  const m = /\.([a-z0-9]+)$/i.exec(rel);
  return m ? `.${m[1].toLowerCase()}` : "";
}

function main() {
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
      if (!IMAGE_EXT.has(ext)) continue;

      let size = 0;
      try {
        size = statSync(abs).size;
      } catch {
        continue;
      }
      let buf;
      try {
        buf = readFileSync(abs);
      } catch {
        continue;
      }
      const meta = hasImageMetadata(buf, ext);
      if (args.reportImages) {
        imageReport.push({ file: rel, size, metadata: meta });
      }
      if (meta) {
        findings.push({ rule: "image-metadata", file: rel, line: 1 });
      }
    }
  }

  if (args.reportImages) {
    for (const row of imageReport) {
      console.log(
        JSON.stringify({
          file: row.file,
          size: row.size,
          metadata: row.metadata,
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

main();
