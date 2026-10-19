import assert from "node:assert/strict";
import { test } from "node:test";
import { deflateSync } from "node:zlib";
import { decodePng, diffPng } from "../../tools/lib/png.ts";

function crc32(buf: Uint8Array): number {
  let c = 0xffffffff;
  for (const byte of buf) {
    c ^= byte;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, body: Uint8Array): Buffer {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(body.length, 0);
  head.write(type, 4, "latin1");
  const tail = Buffer.alloc(4);
  tail.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, "latin1"), body])), 0);
  return Buffer.concat([head, body, tail]);
}

/** Encode raw pixel rows (each row already prefixed with its filter byte). */
function encode(width: number, height: number, colorType: number, rows: Uint8Array): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = colorType;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(rows)),
    chunk("IEND", new Uint8Array(0)),
  ]);
}

test("decodes RGBA with filter 0", () => {
  const png = decodePng(encode(2, 1, 6, Uint8Array.from([0, 1, 2, 3, 4, 5, 6, 7, 8])));
  assert.equal(png.width, 2);
  assert.deepEqual([...png.rgba], [1, 2, 3, 4, 5, 6, 7, 8]);
});

test("decodes RGB (adds opaque alpha) with Sub, Up, Average and Paeth filters", () => {
  // 1 wide, 4 tall, RGB. Each row uses a different filter.
  const rows = Uint8Array.from([
    0, 10, 20, 30, // raw -> 10,20,30
    2, 1, 1, 1, // Up -> 11,21,31
    3, 2, 2, 2, // Average (left 0, up) -> 2 + (0+11>>1)=7, 2+10=12, 2+15=17
    4, 1, 1, 1, // Paeth with only "up" available -> 1+7, 1+12, 1+17
  ]);
  const png = decodePng(encode(1, 4, 2, rows));
  assert.deepEqual(
    [...png.rgba],
    [10, 20, 30, 255, 11, 21, 31, 255, 7, 12, 17, 255, 8, 13, 18, 255]
  );
});

test("Sub filter uses the pixel to the left", () => {
  const png = decodePng(encode(2, 1, 6, Uint8Array.from([1, 5, 5, 5, 5, 1, 1, 1, 1])));
  assert.deepEqual([...png.rgba], [5, 5, 5, 5, 6, 6, 6, 6]);
});

test("diffPng counts differing pixels and flags size mismatch", () => {
  const a = encode(2, 1, 6, Uint8Array.from([0, 0, 0, 0, 255, 9, 9, 9, 255]));
  const b = encode(2, 1, 6, Uint8Array.from([0, 0, 0, 0, 255, 9, 9, 8, 255]));
  const same = diffPng(a, a);
  assert.equal(same.differingPixels, 0);
  const diff = diffPng(a, b);
  assert.equal(diff.differingPixels, 1);
  assert.equal(diff.totalPixels, 2);
  const wide = encode(3, 1, 6, new Uint8Array(13));
  const mismatch = diffPng(a, wide);
  assert.equal(mismatch.sizeMismatch, true);
  assert.equal(mismatch.differingPixels, 3);
});

test("rejects non-PNG input", () => {
  assert.throws(() => decodePng(Uint8Array.from([1, 2, 3])), /signature/);
});
