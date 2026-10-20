/**
 * Validator tests for guest profile.json schema (no production profile folders).
 * Broken copies are generated in a temp dir; phone digits are assembled at runtime.
 */
import assert from "node:assert/strict";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { validateProfileJsonFile } from "../../tools/checks/check-profiles.ts";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const EXAMPLE = join(ROOT, "docs/guest-profile.example.json");
const SCHEMA = join(ROOT, "schemas/profile.schema.json");

type ExampleProfile = {
  basics: {
    phone?: string;
    location?: { address: string };
    nickname?: string;
    url?: string;
    summary?: string;
  };
  work: Array<{ startDate?: string }>;
};

const schema = JSON.parse(readFileSync(SCHEMA, "utf8"));
const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const validate = ajv.compile(schema);

function loadExample(): ExampleProfile {
  return JSON.parse(readFileSync(EXAMPLE, "utf8"));
}

function validateTemp(data: unknown, name: string): string[] {
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

const PHONE_MSG = "Phone numbers and street addresses are not allowed";

describe("check-profiles", () => {
  // Example must pass (schema + phone scan; skip assets/hosts - docs has no public files).
  it("example-passes", () => {
    const errors = validateTemp(loadExample(), "example");
    assert.equal(errors.length, 0, `example should pass, got:\n${errors.join("\n")}`);
  });

  it("rejects-phone-field", () => {
    const data = loadExample();
    data.basics.phone = "n/a";
    const errors = validateTemp(data, "phone-field");
    assert.ok(
      errors.some((e) => e.includes(PHONE_MSG)),
      errors.join("\n")
    );
  });

  it("rejects-location-address", () => {
    const data = loadExample();
    data.basics.location = { address: "1 Example Street" };
    const errors = validateTemp(data, "location-address");
    assert.ok(
      errors.some((e) => e.includes(PHONE_MSG)),
      errors.join("\n")
    );
  });

  it("rejects-unknown-field", () => {
    const data = loadExample();
    data.basics.nickname = "al";
    const errors = validateTemp(data, "unknown-field");
    assert.ok(
      errors.some((e) => /unknown field/i.test(e)),
      errors.join("\n")
    );
  });

  it("rejects-http-url", () => {
    const data = loadExample();
    data.basics.url = "http://www.example.com";
    const errors = validateTemp(data, "http-url");
    assert.ok(errors.length > 0, "http URL should fail");
  });

  it("rejects-bad-date", () => {
    const data = loadExample();
    const first = data.work[0];
    assert.ok(first, "example must have a work entry");
    first.startDate = "2022/03/01";
    const errors = validateTemp(data, "bad-date");
    assert.ok(
      errors.some((e) => /date/i.test(e)),
      errors.join("\n")
    );
  });

  // 10-digit mobile in summary (assembled at test time)
  it("rejects-phone-in-summary", () => {
    const data = loadExample();
    const parts = ["98", "76", "54", "32", "10"];
    data.basics.summary = `Reach me somehow ${parts.join("")} thanks`;
    const errors = validateTemp(data, "phone-in-summary");
    assert.ok(
      errors.some((e) => e.includes(PHONE_MSG)),
      errors.join("\n")
    );
  });

  // Run the full example through the host scan with real example.com hosts.
  it("example-hosts-pass", () => {
    const dir = mkdtempSync(join(tmpdir(), "phazeo-profile-hosts-ok-"));
    try {
      mkdirSync(join(dir, "config/policy"), { recursive: true });
      cpSync(
        join(ROOT, "config/policy/allowed-hosts.txt"),
        join(dir, "config/policy/allowed-hosts.txt")
      );
      const file = join(dir, "profile.json");
      writeFileSync(file, readFileSync(EXAMPLE));
      const errors = validateProfileJsonFile(file, {
        validate,
        skipAssets: true,
        skipHosts: false,
      });
      // The host scan copies the ROOT allowlist into its own temp root; example.com must be allowlisted.
      assert.equal(errors.length, 0, errors.join("\n"));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
