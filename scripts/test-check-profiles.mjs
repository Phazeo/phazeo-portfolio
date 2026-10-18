#!/usr/bin/env node
/**
 * Validator tests for guest profile.json schema (no production profile folders).
 * Broken copies are generated in a temp dir; phone digits are assembled at runtime.
 */
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync, cpSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { validateProfileJsonFile } from "./check-profiles.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const EXAMPLE = join(ROOT, "docs/guest-profile.example.json");
const SCHEMA = join(ROOT, "schemas/profile.schema.json");

const schema = JSON.parse(readFileSync(SCHEMA, "utf8"));
const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const validate = ajv.compile(schema);

function loadExample() {
  return JSON.parse(readFileSync(EXAMPLE, "utf8"));
}

/**
 * @param {unknown} data
 * @param {string} name
 * @returns {string[]}
 */
function validateTemp(data, name) {
  const dir = mkdtempSync(join(tmpdir(), "phazeo-profile-test-"));
  try {
    const file = join(dir, `${name}.json`);
    writeFileSync(file, JSON.stringify(data, null, 2));
    return validateProfileJsonFile(file, {
      validate,
      skipAssets: true,
      skipHosts: true,
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// Example must pass (schema + phone scan; skip assets/hosts — docs has no public files).
{
  const errors = validateTemp(loadExample(), "example");
  assert.equal(errors.length, 0, `example should pass, got:\n${errors.join("\n")}`);
  console.log("OK: example-passes");
}

// phone field
{
  const data = loadExample();
  data.basics.phone = "n/a";
  const errors = validateTemp(data, "phone-field");
  assert.ok(
    errors.some((e) => e.includes("Phone numbers and street addresses are not allowed")),
    errors.join("\n")
  );
  console.log("OK: rejects-phone-field");
}

// location.address
{
  const data = loadExample();
  data.basics.location = { address: "1 Example Street" };
  const errors = validateTemp(data, "location-address");
  assert.ok(
    errors.some((e) => e.includes("Phone numbers and street addresses are not allowed")),
    errors.join("\n")
  );
  console.log("OK: rejects-location-address");
}

// unknown field
{
  const data = loadExample();
  data.basics.nickname = "al";
  const errors = validateTemp(data, "unknown-field");
  assert.ok(errors.some((e) => /unknown field/i.test(e)), errors.join("\n"));
  console.log("OK: rejects-unknown-field");
}

// http URL
{
  const data = loadExample();
  data.basics.url = "http://www.example.com";
  const errors = validateTemp(data, "http-url");
  assert.ok(errors.length > 0, "http URL should fail");
  console.log("OK: rejects-http-url");
}

// bad date
{
  const data = loadExample();
  data.work[0].startDate = "2022/03/01";
  const errors = validateTemp(data, "bad-date");
  assert.ok(errors.some((e) => /date/i.test(e)), errors.join("\n"));
  console.log("OK: rejects-bad-date");
}

// 10-digit mobile in summary (assembled at test time)
{
  const data = loadExample();
  const parts = ["98", "76", "54", "32", "10"];
  data.basics.summary = `Reach me somehow ${parts.join("")} thanks`;
  const errors = validateTemp(data, "phone-in-summary");
  assert.ok(
    errors.some((e) => e.includes("Phone numbers and street addresses are not allowed")),
    errors.join("\n")
  );
  console.log("OK: rejects-phone-in-summary");
}

// Also run the full example through a schema-only host skip path with real example.com hosts
{
  const dir = mkdtempSync(join(tmpdir(), "phazeo-profile-hosts-ok-"));
  try {
    mkdirSync(join(dir, ".github"), { recursive: true });
    cpSync(join(ROOT, ".github/allowed-hosts.txt"), join(dir, ".github/allowed-hosts.txt"));
    const file = join(dir, "profile.json");
    writeFileSync(file, readFileSync(EXAMPLE));
    const errors = validateProfileJsonFile(file, {
      validate,
      skipAssets: true,
      skipHosts: false,
    });
    // Host scan uses ROOT allowlist via check-hosts --root tmp which copies allowlist —
    // example.com must be allowlisted.
    assert.equal(errors.length, 0, errors.join("\n"));
    console.log("OK: example-hosts-pass");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

console.log("test-check-profiles: all cases OK");
