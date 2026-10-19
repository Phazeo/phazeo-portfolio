/**
 * Minimal PNG reader and pixel comparer using node:zlib only.
 * Supports non-interlaced 8-bit grayscale, gray+alpha, RGB, and RGBA, which
 * covers what Chrome's Page.captureScreenshot emits.
 */
import { inflateSync } from "node:zlib";

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export type DecodedPng = {
  width: number;
  height: number;
  /** Always 4 bytes per pixel (RGBA), row-major. */
  rgba: Uint8Array;
};

export type PngDiff = {
  /** Number of pixels whose RGBA differs, or all pixels of the larger image on a size mismatch. */
  differingPixels: number;
  totalPixels: number;
  sizeMismatch: boolean;
  a: { width: number; height: number };
  b: { width: number; height: number };
};

function channelsForColorType(colorType: number): number {
  switch (colorType) {
    case 0:
      return 1;
    case 4:
      return 2;
    case 2:
      return 3;
    case 6:
      return 4;
    default:
      throw new Error(`png: unsupported color type ${colorType}`);
  }
}

function paeth(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

/** Undo PNG scanline filters in place. `raw` holds height rows of (1 filter byte + stride bytes). */
function unfilter(raw: Uint8Array, height: number, stride: number, bpp: number): Uint8Array {
  const out = new Uint8Array(height * stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)] ?? 0;
    const src = y * (stride + 1) + 1;
    const dst = y * stride;
    const prev = dst - stride;
    for (let x = 0; x < stride; x++) {
      const cur = raw[src + x] ?? 0;
      const left = x >= bpp ? (out[dst + x - bpp] ?? 0) : 0;
      const up = y > 0 ? (out[prev + x] ?? 0) : 0;
      const upLeft = y > 0 && x >= bpp ? (out[prev + x - bpp] ?? 0) : 0;
      let value: number;
      switch (filter) {
        case 0:
          value = cur;
          break;
        case 1:
          value = cur + left;
          break;
        case 2:
          value = cur + up;
          break;
        case 3:
          value = cur + ((left + up) >> 1);
          break;
        case 4:
          value = cur + paeth(left, up, upLeft);
          break;
        default:
          throw new Error(`png: unknown filter type ${filter}`);
      }
      out[dst + x] = value & 0xff;
    }
  }
  return out;
}

export function decodePng(buf: Uint8Array): DecodedPng {
  const data = Buffer.from(buf.buffer, buf.byteOffset, buf.byteLength);
  if (data.length < 8 || !data.subarray(0, 8).equals(SIGNATURE)) {
    throw new Error("png: bad signature");
  }
  let width = 0;
  let height = 0;
  let colorType = -1;
  const idat: Buffer[] = [];
  let offset = 8;
  while (offset + 8 <= data.length) {
    const length = data.readUInt32BE(offset);
    const type = data.toString("latin1", offset + 4, offset + 8);
    const body = data.subarray(offset + 8, offset + 8 + length);
    offset += 12 + length;
    if (type === "IHDR") {
      width = body.readUInt32BE(0);
      height = body.readUInt32BE(4);
      const bitDepth = body.readUInt8(8);
      colorType = body.readUInt8(9);
      const interlace = body.readUInt8(12);
      if (bitDepth !== 8) throw new Error(`png: unsupported bit depth ${bitDepth}`);
      if (interlace !== 0) throw new Error("png: interlaced images are not supported");
    } else if (type === "IDAT") {
      idat.push(body);
    } else if (type === "IEND") {
      break;
    }
  }
  if (width === 0 || height === 0 || colorType < 0) throw new Error("png: missing IHDR");
  if (idat.length === 0) throw new Error("png: missing IDAT");

  const channels = channelsForColorType(colorType);
  const stride = width * channels;
  const raw = inflateSync(Buffer.concat(idat));
  if (raw.length !== height * (stride + 1)) {
    throw new Error(`png: inflated size ${raw.length} does not match ${width}x${height}`);
  }
  const pixels = unfilter(raw, height, stride, channels);

  const rgba = new Uint8Array(width * height * 4);
  for (let i = 0, n = width * height; i < n; i++) {
    const s = i * channels;
    const d = i * 4;
    if (channels === 4) {
      rgba[d] = pixels[s] ?? 0;
      rgba[d + 1] = pixels[s + 1] ?? 0;
      rgba[d + 2] = pixels[s + 2] ?? 0;
      rgba[d + 3] = pixels[s + 3] ?? 0;
    } else if (channels === 3) {
      rgba[d] = pixels[s] ?? 0;
      rgba[d + 1] = pixels[s + 1] ?? 0;
      rgba[d + 2] = pixels[s + 2] ?? 0;
      rgba[d + 3] = 255;
    } else {
      const g = pixels[s] ?? 0;
      rgba[d] = g;
      rgba[d + 1] = g;
      rgba[d + 2] = g;
      rgba[d + 3] = channels === 2 ? (pixels[s + 1] ?? 255) : 255;
    }
  }
  return { width, height, rgba };
}

/** Count differing pixels between two PNG buffers (RGBA compared exactly). */
export function diffPng(aBuf: Uint8Array, bBuf: Uint8Array): PngDiff {
  const a = decodePng(aBuf);
  const b = decodePng(bBuf);
  const sizes = { a: { width: a.width, height: a.height }, b: { width: b.width, height: b.height } };
  if (a.width !== b.width || a.height !== b.height) {
    const total = Math.max(a.width * a.height, b.width * b.height);
    return { differingPixels: total, totalPixels: total, sizeMismatch: true, ...sizes };
  }
  let differing = 0;
  const total = a.width * a.height;
  for (let i = 0; i < total; i++) {
    const o = i * 4;
    if (
      a.rgba[o] !== b.rgba[o] ||
      a.rgba[o + 1] !== b.rgba[o + 1] ||
      a.rgba[o + 2] !== b.rgba[o + 2] ||
      a.rgba[o + 3] !== b.rgba[o + 3]
    ) {
      differing++;
    }
  }
  return { differingPixels: differing, totalPixels: total, sizeMismatch: false, ...sizes };
}
