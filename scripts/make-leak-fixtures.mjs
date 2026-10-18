#!/usr/bin/env node
/**
 * Generate phone/PDF leak fixtures into a temp directory at test time.
 * Builds every number from concatenated parts so no full phone-like literal
 * exists in this committed file. Writes paths to stdout (one per line) for
 * the caller; never prints the generated phone values.
 *
 * Usage: node scripts/make-leak-fixtures.mjs <out-dir>
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { deflateSync } from "node:zlib";

const outDir = process.argv[2];
if (!outDir) {
  console.error("make-leak-fixtures: out-dir required");
  process.exit(2);
}

/** Digits only — concatenated at runtime; never a complete phone literal here. */
const D = {
  a: "98",
  b: "76",
  c: "54",
  d: "32",
  e: "10",
  // landline area (2) + subscriber parts
  area: "44",
  sub1: "26",
  sub2: "48",
  sub3: "90",
  // intl country-ish prefix digits after +
  intl1: "44",
  intl2: "20",
  intl3: "7946",
  intl4: "0958",
  // grouped NANP-style parts
  g1: "415",
  g2: "555",
  g3: "0133",
};

function mobile10() {
  return D.a + D.b + D.c + D.d + D.e;
}

function write(rel, body) {
  const abs = join(outDir, rel);
  mkdirSync(join(abs, ".."), { recursive: true });
  writeFileSync(abs, body);
  console.log(rel);
}

mkdirSync(outDir, { recursive: true });
mkdirSync(join(outDir, "phone-fail"), { recursive: true });
mkdirSync(join(outDir, "phone-pass"), { recursive: true });

const m = mobile10();

// Fail: intl (+ then digits with separators)
write(
  "phone-fail/intl.txt",
  `contact +${D.intl1} ${D.intl2} ${D.intl3} ${D.intl4}\n`
);

// Fail: grouped
write("phone-fail/grouped.txt", `call (${D.g1}) ${D.g2}-${D.g3}\n`);

// Fail: in-mobile layouts
write("phone-fail/in-mobile-plain.txt", `mobile ${m}\n`);
write("phone-fail/in-mobile-55.txt", `mobile ${m.slice(0, 5)}-${m.slice(5)}\n`);
write(
  "phone-fail/in-mobile-334.txt",
  `mobile ${m.slice(0, 3)}.${m.slice(3, 6)}.${m.slice(6)}\n`
);
write("phone-fail/in-mobile-prefix91.txt", `mobile +91 ${m}\n`);

// Fail: in-landline
write(
  "phone-fail/in-landline.txt",
  `landline 0${D.area}-${D.sub1}${D.sub2}${D.sub3}\n`
);

// Pass: clean counter-examples (no phone-like values)
write(
  "phone-pass/hex-sha.txt",
  `sha ${"a".repeat(20)}${"b".repeat(20)}\n`
);
// 13 digits using only 0–5 so no [6-9]\d{9} mobile substring matches.
write("phone-pass/epoch-ms.txt", `ts ${"12".repeat(6)}0\n`);
write("phone-pass/version.txt", `version 1.2.3-beta.4\n`);
write(
  "phone-pass/integrity.txt",
  `integrity sha512-${"A".repeat(20)}+${"B".repeat(20)}/xx==\n`
);
write("phone-pass/leading-1to5.txt", `id ${"1"}${"2".repeat(9)}\n`);

function minimalPdfWithStream(streamBuf, filterLine) {
  // Minimal PDF 1.4 with one page and one content stream (text operator).
  const stream = streamBuf;
  const objects = [];
  objects.push("1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n");
  objects.push("2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj\n");
  objects.push(
    "3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Contents 4 0 R /Resources<< /Font<< /F1 5 0 R >> >> >>endobj\n"
  );
  const streamHeader = filterLine
    ? `4 0 obj<< /Length ${stream.length} /Filter ${filterLine} >>stream\n`
    : `4 0 obj<< /Length ${stream.length} >>stream\n`;
  objects.push(streamHeader);
  // stream bytes appended separately
  objects.push("endstream\nendobj\n");
  objects.push("5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\n");

  const header = "%PDF-1.4\n";
  const parts = [Buffer.from(header, "ascii")];
  const offsets = [0];
  let pos = Buffer.byteLength(header);
  // obj 1,2,3
  for (let i = 0; i < 3; i++) {
    offsets.push(pos);
    const b = Buffer.from(objects[i], "ascii");
    parts.push(b);
    pos += b.length;
  }
  // obj 4 header + stream + end
  offsets.push(pos);
  const h = Buffer.from(objects[3], "ascii");
  parts.push(h);
  pos += h.length;
  parts.push(stream);
  pos += stream.length;
  const end = Buffer.from(objects[4], "ascii");
  parts.push(end);
  pos += end.length;
  // obj 5
  offsets.push(pos);
  const f = Buffer.from(objects[5], "ascii");
  parts.push(f);
  pos += f.length;

  const xrefStart = pos;
  let xref = `xref\n0 6\n0000000000 65535 f \n`;
  for (let i = 1; i <= 5; i++) {
    xref += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  const trailer = `trailer<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
  parts.push(Buffer.from(xref + trailer, "ascii"));
  return Buffer.concat(parts);
}

// Uncompressed text stream containing mobile digits (BT/ET text)
const uncompressedContent = Buffer.from(
  `BT /F1 12 Tf 10 100 Td (${m}) Tj ET\n`,
  "ascii"
);
write(
  "pdf-pii-phone-plain.pdf",
  minimalPdfWithStream(uncompressedContent, null)
);

// FlateDecode compressed stream with same text
const compressed = deflateSync(uncompressedContent);
write(
  "pdf-pii-phone-flate.pdf",
  minimalPdfWithStream(compressed, "/FlateDecode")
);
