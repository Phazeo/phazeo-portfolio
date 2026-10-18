#!/usr/bin/env node
/**
 * Forbidden filenames, image EXIF/XMP, tool-cache paths, binaries, and oversized files.
 * Pure Node. Never prints secret or EXIF values — rule id + file:line only.
 */
import { existsSync, lstatSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { textMatchesAnyPhone } from "./phone-patterns.mjs";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED_LARGE = join(ROOT, ".github", "allowed-large-files.txt");
const ALLOWED_BINARIES = join(ROOT, ".github", "allowed-binaries.txt");

const FORBIDDEN_NAME =
  /(^|\/)(\.env(\..+)?|.*\.pem|.*\.key|.*\.p12|.*\.pfx|id_rsa.*|id_ed25519.*|.*\.tfstate.*|.*\.sqlite.*|.*\.db|.*\.dump|docker-compose.*\.ya?ml|.*\.kdbx)$/i;

const FORBIDDEN_BASENAME = /^(nginx\.conf|Caddyfile|caddy\.json)$/i;

// Do not skip .tools/node_modules/dist — those paths must raise [tool-cache].
const SKIP_DIR_CONTENT = new Set([".git", "test/leak-fixtures"]);

const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);
const PDF_EXT = ".pdf";

const TOOL_CACHE_PREFIXES = [".tools/", "node_modules/", "dist/"];

const DOB_PHRASE = /\b(?:date\s+of\s+birth|d\.?o\.?b\.?|born\s+on)\b/i;
const POSTCODE_TOKEN = /\b(?:post\s*code|postal\s*code|zip\s*code)\b/i;
const STREET_TOKEN = /\b(?:street|avenue|road|lane|boulevard|rue|strasse)\b/i;

const PDF_META_KEYS = new Set([
  "Author",
  "Creator",
  "Producer",
  "CreationDate",
  "ModDate",
]);

function parseArgs(argv) {
  const out = { roots: [], includeFixtures: false, reportImages: false, tracked: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--include-fixtures") out.includeFixtures = true;
    else if (a === "--report-images") out.reportImages = true;
    else if (a === "--tracked") out.tracked = true;
    else if (a === "--root" && argv[i + 1]) out.roots.push(resolve(argv[++i]));
    else if (a.startsWith("-")) {
      console.error(`check-forbidden-files: unknown flag ${a}`);
      process.exit(2);
    } else out.roots.push(resolve(a));
  }
  if (out.roots.length === 0) out.roots.push(ROOT);
  return out;
}

function loadPathList(file) {
  if (!existsSync(file)) return new Set();
  const set = new Set();
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    set.add(t.split(sep).join("/"));
  }
  return set;
}

function shouldSkipDir(rel, includeFixtures) {
  if (includeFixtures) {
    const top = rel.split(sep)[0];
    if (top === "node_modules" || top === ".git") return true;
    return false;
  }
  const norm = rel.split(sep).join("/");
  for (const skip of SKIP_DIR_CONTENT) {
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
      if (shouldSkipDir(rel, includeFixtures)) continue;
      yield* walk(abs, base, includeFixtures);
    } else if (ent.isFile() || ent.isSymbolicLink()) {
      yield { abs, rel };
    }
  }
}

function trackedFiles(root) {
  try {
    const out = execFileSync("git", ["-C", root, "ls-files", "-z"], {
      encoding: "buffer",
      maxBuffer: 64 * 1024 * 1024,
    });
    return out
      .toString("utf8")
      .split("\0")
      .filter(Boolean)
      .map((rel) => ({ abs: join(root, rel), rel }));
  } catch {
    return null;
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

function isToolCachePath(rel) {
  const norm = rel.split(sep).join("/");
  return TOOL_CACHE_PREFIXES.some((p) => norm === p.slice(0, -1) || norm.startsWith(p));
}

function looksLikeXmp(buf) {
  const n = Math.min(buf.length, 512);
  const head = buf.toString("latin1", 0, n);
  return (
    head.includes("ns.adobe.com/xap/") ||
    head.includes("adobe:ns:meta") ||
    head.includes("<x:xmpmeta") ||
    head.includes("xmlns:xmp=")
  );
}

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
    if (looksLikeXmp(buf.subarray(dataStart, dataEnd))) return true;
    i = dataEnd + (size % 2);
  }
  return false;
}

function gifHasMetadata(buf) {
  if (buf.length < 6) return false;
  const header = buf.toString("ascii", 0, 6);
  if (header !== "GIF87a" && header !== "GIF89a") return false;
  let i = 6;
  while (i + 2 < buf.length) {
    const b = buf[i];
    if (b === 0x3b) break;
    if (b === 0x2c) {
      if (i + 10 > buf.length) break;
      i += 10;
      const packed = buf[i - 1];
      if (packed & 0x80) {
        const lzw = packed & 0x07;
        i += 3 * 2 ** (lzw + 1);
      }
      if (i >= buf.length) break;
      i += 1;
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
        if (ident.startsWith("XMP") || `${ident}${auth}`.includes("XMP")) return true;
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

function hasBinarySignature(buf) {
  if (buf.length >= 4 && buf[0] === 0x7f && buf.toString("ascii", 1, 4) === "ELF") return true;
  if (buf.length >= 4 && buf[0] === 0xcf && buf[1] === 0xfa && buf[2] === 0xed && buf[3] === 0xfe)
    return true; // Mach-O 64 LE
  if (buf.length >= 4 && buf[0] === 0xce && buf[1] === 0xfa && buf[2] === 0xed && buf[3] === 0xfe)
    return true; // Mach-O 32 LE
  if (buf.length >= 4 && buf[0] === 0xfe && buf[1] === 0xed && buf[2] === 0xfa && buf[3] === 0xce)
    return true;
  if (buf.length >= 4 && buf[0] === 0xfe && buf[1] === 0xed && buf[2] === 0xfa && buf[3] === 0xcf)
    return true;
  if (buf.length >= 2 && buf[0] === 0x4d && buf[1] === 0x5a) return true; // PE/MZ
  if (buf.length >= 4 && buf[0] === 0x50 && buf[1] === 0x4b && (buf[2] === 0x03 || buf[2] === 0x05 || buf[2] === 0x07))
    return true; // ZIP
  if (buf.length >= 2 && buf[0] === 0x1f && buf[1] === 0x8b) return true; // gzip
  if (buf.length >= 262 && buf.toString("ascii", 257, 262) === "ustar") return true; // tar
  return false;
}

function extOf(rel) {
  const m = /\.([a-z0-9]+)$/i.exec(rel);
  return m ? `.${m[1].toLowerCase()}` : "";
}

function commandExists(bin) {
  try {
    execFileSync("sh", ["-c", `command -v ${bin}`], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function scanPdfTextForPii(text, norm, findings) {
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNo = i + 1;
    if (textMatchesAnyPhone(line)) {
      findings.push({ rule: "pdf-pii", file: norm, line: lineNo });
    }
    if (DOB_PHRASE.test(line)) {
      findings.push({ rule: "pdf-pii", file: norm, line: lineNo });
    }
    if (POSTCODE_TOKEN.test(line) && STREET_TOKEN.test(line)) {
      findings.push({ rule: "pdf-pii", file: norm, line: lineNo });
    }
  }
}

function scanPdfFile(abs, norm, findings) {
  if (!commandExists("pdftotext") || !commandExists("pdfinfo")) {
    findings.push({ rule: "pdf-tooling-missing", file: norm, line: 1 });
    console.error(
      "check-forbidden-files: pdftotext/pdfinfo required to scan PDFs (install poppler-utils)."
    );
    return;
  }
  let text = "";
  try {
    text = execFileSync("pdftotext", ["-layout", abs, "-"], {
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024,
    });
  } catch {
    findings.push({ rule: "pdf-pii", file: norm, line: 1 });
    return;
  }
  scanPdfTextForPii(text, norm, findings);

  let info = "";
  try {
    info = execFileSync("pdfinfo", [abs], {
      encoding: "utf8",
      maxBuffer: 4 * 1024 * 1024,
    });
  } catch {
    findings.push({ rule: "pdf-metadata", file: norm, line: 1 });
    return;
  }
  let metaHit = false;
  for (const line of info.split(/\r?\n/)) {
    const idx = line.indexOf(":");
    if (idx < 0) continue;
    const key = line.slice(0, idx).trim();
    const val = line.slice(idx + 1).trim();
    if (key === "Metadata Stream" && /^yes$/i.test(val)) {
      metaHit = true;
    }
    if (PDF_META_KEYS.has(key) && val) {
      metaHit = true;
    }
  }
  // XMP via pdfinfo -meta (when supported); any non-empty XMP dump fails closed.
  try {
    const xmp = execFileSync("pdfinfo", ["-meta", abs], {
      encoding: "utf8",
      maxBuffer: 4 * 1024 * 1024,
    });
    if (xmp && xmp.trim().length > 0) {
      metaHit = true;
    }
  } catch {
    // -meta unsupported: Info dict keys above are enough.
  }
  if (metaHit) {
    findings.push({ rule: "pdf-metadata", file: norm, line: 1 });
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const findings = [];
  const imageReport = [];
  const allowedLarge = loadPathList(ALLOWED_LARGE);
  const allowedBinaries = loadPathList(ALLOWED_BINARIES);

  for (const root of args.roots) {
    if (!existsSync(root)) {
      console.error(`check-forbidden-files: root not found: ${root}`);
      process.exit(2);
    }
    const files = args.tracked ? trackedFiles(root) : null;
    const iterable = files ?? [...walk(root, root, args.includeFixtures)];

    for (const { abs, rel } of iterable) {
      const norm = rel.split(sep).join("/");
      // Prove fixtures are scanned only via --include-fixtures / prove-leak-guard.
      if (norm === "test/leak-fixtures" || norm.startsWith("test/leak-fixtures/")) {
        continue;
      }

      if (isToolCachePath(norm)) {
        findings.push({ rule: "tool-cache", file: norm, line: 1 });
        continue;
      }

      if (isForbiddenPath(norm)) {
        findings.push({ rule: "forbidden-file", file: norm, line: 1 });
        continue;
      }

      let st;
      try {
        st = lstatSync(abs);
      } catch {
        continue;
      }
      if (!st.isFile()) continue;

      let buf;
      try {
        buf = readFileSync(abs);
      } catch {
        continue;
      }

      const executable = Boolean(st.mode & 0o111);
      const sig = hasBinarySignature(buf);
      if ((executable || sig) && !allowedBinaries.has(norm)) {
        findings.push({ rule: "binary-file", file: norm, line: 1 });
      }

      if (st.size > MAX_BYTES && !allowedLarge.has(norm)) {
        findings.push({ rule: "file-too-large", file: norm, line: 1 });
      }

      const ext = extOf(norm);
      if (ext === PDF_EXT) {
        scanPdfFile(abs, norm, findings);
        continue;
      }
      if (!IMAGE_EXT.has(ext)) continue;
      const meta = hasImageMetadata(buf, ext);
      if (args.reportImages) {
        imageReport.push({ file: norm, size: st.size, metadata: meta });
      }
      if (meta) {
        findings.push({ rule: "image-metadata", file: norm, line: 1 });
      }
    }
  }

  if (args.reportImages) {
    for (const row of imageReport) {
      console.log(JSON.stringify(row));
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
