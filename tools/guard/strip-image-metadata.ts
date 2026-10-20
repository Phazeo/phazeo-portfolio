#!/usr/bin/env node
/**
 * Lossless strip of image metadata (no new deps).
 * JPEG: drop APPn (0xE0-0xEF) and COM (0xFE) segments; keep SOF/SOS/DHT/DQT/etc.
 * PNG: drop eXIf, tEXt, zTXt, iTXt chunks.
 * Usage: node tools/guard/strip-image-metadata.ts <file> [<file>...]
 * Writes in place. Prints path + before/after byte sizes.
 */
import { readFileSync, statSync, writeFileSync } from "node:fs";

function stripJpeg(buf: Buffer): Buffer {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) {
    throw new Error("not a JPEG");
  }
  const parts: Buffer[] = [buf.subarray(0, 2)]; // SOI
  let i = 2;
  while (i + 1 < buf.length) {
    if (buf[i] !== 0xff) {
      parts.push(buf.subarray(i));
      break;
    }
    while (i < buf.length && buf[i] === 0xff) i += 1;
    if (i >= buf.length) break;
    const marker = buf[i] ?? 0;
    i += 1;

    // Standalone markers (no length): TEM, RSTn, SOI/EOI
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) {
      parts.push(Buffer.from([0xff, marker]));
      if (marker === 0xd9) break; // EOI
      continue;
    }

    if (i + 1 >= buf.length) break;
    const segLen = buf.readUInt16BE(i);
    if (segLen < 2 || i + segLen > buf.length) {
      throw new Error("invalid JPEG segment length");
    }
    const dataStart = i;
    const dataEnd = i + segLen;
    const isAppOrCom = (marker >= 0xe0 && marker <= 0xef) || marker === 0xfe;

    if (marker === 0xda) {
      // SOS + remaining scan data
      parts.push(Buffer.from([0xff, marker]));
      parts.push(buf.subarray(dataStart));
      break;
    }

    if (!isAppOrCom) {
      parts.push(Buffer.from([0xff, marker]));
      parts.push(buf.subarray(dataStart, dataEnd));
    }
    i = dataEnd;
  }
  return Buffer.concat(parts);
}

function stripPng(buf: Buffer): Buffer {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (buf.length < 8 || !buf.subarray(0, 8).equals(sig)) {
    throw new Error("not a PNG");
  }
  const drop = new Set(["eXIf", "tEXt", "zTXt", "iTXt"]);
  const parts: Buffer[] = [sig];
  let i = 8;
  while (i + 12 <= buf.length) {
    const len = buf.readUInt32BE(i);
    const type = buf.toString("ascii", i + 4, i + 8);
    const chunkEnd = i + 12 + len;
    if (chunkEnd > buf.length) throw new Error("invalid PNG chunk");
    if (!drop.has(type)) {
      parts.push(buf.subarray(i, chunkEnd));
    }
    i = chunkEnd;
    if (type === "IEND") break;
  }
  return Buffer.concat(parts);
}

function strip(path: string): { path: string; before: number; after: number } {
  const before = statSync(path).size;
  const buf = readFileSync(path);
  let out: Buffer;
  if (buf[0] === 0xff && buf[1] === 0xd8) out = stripJpeg(buf);
  else if (buf[0] === 0x89 && buf[1] === 0x50) out = stripPng(buf);
  else throw new Error(`unsupported image type: ${path}`);
  writeFileSync(path, out);
  const after = statSync(path).size;
  console.log(`${path}\t${before}\t${after}`);
  return { path, before, after };
}

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error("usage: node tools/guard/strip-image-metadata.ts <file>...");
  process.exit(2);
}
let failed = false;
for (const f of files) {
  try {
    strip(f);
  } catch (err) {
    failed = true;
    console.error(`${f}: ${err instanceof Error ? err.message : String(err)}`);
  }
}
if (failed) process.exit(1);
