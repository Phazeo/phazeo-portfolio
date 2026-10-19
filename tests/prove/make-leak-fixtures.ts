#!/usr/bin/env node
/**
 * Generate phone/PDF leak fixtures into a temp directory at test time.
 * Builds every number from concatenated parts so no full phone-like literal
 * exists in this committed file. Writes paths to stdout (one per line) for
 * the caller; never prints the generated phone values.
 *
 * Usage: node tests/prove/make-leak-fixtures.ts <out-dir>
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { deflateSync } from "node:zlib";

const outArg = process.argv[2];
if (!outArg) {
  console.error("make-leak-fixtures: out-dir required");
  process.exit(2);
}
const outDir: string = outArg;

/** Digits and fragments - concatenated at runtime; never a complete phone literal here. */
const D = {
  a: "98",
  b: "76",
  c: "54",
  d: "32",
  e: "10",
  area: "44",
  sub1: "26",
  sub2: "48",
  sub3: "90",
  intl1: "44",
  intl2: "20",
  intl3: "7946",
  intl4: "0958",
  g1: "415",
  g2: "555",
  g3: "0133",
  // fragments for pass / boundary cases
  y: "2026",
  mo: "10",
  da: "18",
  hh: "09",
  mm: "30",
  ss: "00",
  y1: "2015",
  y2: "2019",
};

function mobile10(): string {
  return D.a + D.b + D.c + D.d + D.e;
}

function write(rel: string, body: string | Buffer): void {
  const abs = join(outDir, rel);
  mkdirSync(join(abs, ".."), { recursive: true });
  writeFileSync(abs, body);
  console.log(rel);
}

mkdirSync(outDir, { recursive: true });
mkdirSync(join(outDir, "phone-fail"), { recursive: true });
mkdirSync(join(outDir, "phone-pass"), { recursive: true });

const m = mobile10();
const landline = `0${D.area}-${D.sub1}${D.sub2}${D.sub3}`;

// --- FAIL (text) ---
write(
  "phone-fail/intl.txt",
  `contact +${D.intl1} ${D.intl2} ${D.intl3} ${D.intl4}\n`
);
write("phone-fail/grouped.txt", `call (${D.g1}) ${D.g2}-${D.g3}\n`);
write("phone-fail/in-mobile-plain.txt", `mobile ${m}\n`);
write("phone-fail/in-mobile-55.txt", `mobile ${m.slice(0, 5)}-${m.slice(5)}\n`);
write(
  "phone-fail/in-mobile-334.txt",
  `mobile ${m.slice(0, 3)}.${m.slice(3, 6)}.${m.slice(6)}\n`
);
write("phone-fail/in-mobile-prefix91.txt", `mobile +91 ${m}\n`);
write("phone-fail/in-landline.txt", `landline ${landline}\n`);

// Extra FAIL cases
write("phone-fail/ph-colon-mobile.txt", `Ph:${m}\n`);
write(
  "phone-fail/plus91-dash-55.txt",
  `+91-${m.slice(0, 5)}-${m.slice(5)}\n`
);
write("phone-fail/zero-prefix-mobile.txt", `id 0${m}\n`);
write("phone-fail/mobile-file-start.txt", `${m} trailing note\n`);
write("phone-fail/mobile-file-end.txt", `leading ${m}`); // no trailing newline
write("phone-fail/landline-line-start.txt", `note\n${landline} end\n`);

// --- PASS (text) ---
// 13-digit epoch-ms; last 10 digits start with 7
write(
  "phone-pass/epoch-ms.txt",
  `ts ${"1"}${"70"}${D.a.slice(0, 1)}${"0".repeat(9)}\n`
);
// 15-digit numeric ID starting with 9
write("phone-pass/long-id.txt", `id ${"9"}${"0".repeat(14)}\n`);
// 11-digit starting with 1; last 10 start with 6-9 (mobile body)
write("phone-pass/eleven-leading-1.txt", `n ${"1"}${m}\n`);
// 12-digit not starting with 91 or 0
write("phone-pass/twelve-digit.txt", `n ${"2"}${"3".repeat(11)}\n`);
write(
  "phone-pass/iso-datetime.txt",
  `at ${D.y}-${D.mo}-${D.da}T${D.hh}:${D.mm}:${D.ss}Z\n`
);
write("phone-pass/date-range.txt", `years ${D.y1}-${D.y2}\n`);
write("phone-pass/version.txt", `version 1.2.3-beta.4\n`);
// 40-char hex with mixed letters and digits
write("phone-pass/hex-sha.txt", `sha ${"a1".repeat(20)}\n`);

function minimalPdfWithStream(streamBuf: Buffer, filterLine: string | null): Buffer {
  const stream = streamBuf;
  const objects: string[] = [];
  objects.push("1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n");
  objects.push("2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj\n");
  objects.push(
    "3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Contents 4 0 R /Resources<< /Font<< /F1 5 0 R >> >> >>endobj\n"
  );
  const streamHeader = filterLine
    ? `4 0 obj<< /Length ${stream.length} /Filter ${filterLine} >>stream\n`
    : `4 0 obj<< /Length ${stream.length} >>stream\n`;
  objects.push(streamHeader);
  objects.push("endstream\nendobj\n");
  objects.push("5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\n");

  const header = "%PDF-1.4\n";
  const parts: Buffer[] = [Buffer.from(header, "ascii")];
  const offsets: number[] = [0];
  let pos = Buffer.byteLength(header);
  for (let i = 0; i < 3; i++) {
    offsets.push(pos);
    const b = Buffer.from(objects[i] ?? "", "ascii");
    parts.push(b);
    pos += b.length;
  }
  offsets.push(pos);
  const h = Buffer.from(objects[3] ?? "", "ascii");
  parts.push(h);
  pos += h.length;
  parts.push(stream);
  pos += stream.length;
  const end = Buffer.from(objects[4] ?? "", "ascii");
  parts.push(end);
  pos += end.length;
  offsets.push(pos);
  const f = Buffer.from(objects[5] ?? "", "ascii");
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

function writePhonePdf(relBase: string, textInPage: string): void {
  const content = Buffer.from(`BT /F1 12 Tf 10 100 Td (${textInPage}) Tj ET\n`, "ascii");
  write(`${relBase}-plain.pdf`, minimalPdfWithStream(content, null));
  write(`${relBase}-flate.pdf`, minimalPdfWithStream(deflateSync(content), "/FlateDecode"));
}

// Base mobile PDFs
writePhonePdf("pdf-pii-phone", m);
// First two extra FAIL cases as PDFs
writePhonePdf("pdf-pii-ph-colon", `Ph:${m}`);
writePhonePdf("pdf-pii-plus91-55", `+91-${m.slice(0, 5)}-${m.slice(5)}`);
