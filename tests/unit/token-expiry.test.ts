/**
 * Deploy token expiry reminder: due 30 days before the expiry date, one open
 * issue at a time, and bad or missing dates fail loudly.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { decideReminder, parseIsoDate, reminderText } from "../../tools/deploy/token-expiry.ts";

const ROOT = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const SCRIPT = join(ROOT, "tools", "deploy", "token-expiry.ts");
const EXPIRES = "2027-10-15";
const TITLE = "The site deploy token expires on 2027-10-15";

const dirs: string[] = [];
afterEach(() => {
  while (dirs.length > 0) {
    const d = dirs.pop();
    if (d) rmSync(d, { recursive: true, force: true });
  }
});

function titlesFile(text: string): string {
  const d = mkdtempSync(join(tmpdir(), "token-expiry-"));
  dirs.push(d);
  const f = join(d, "titles.txt");
  writeFileSync(f, text);
  return f;
}

function run(...args: string[]) {
  return spawnSync(process.execPath, [SCRIPT, ...args], { encoding: "utf8", timeout: 20_000 });
}

describe("parseIsoDate", () => {
  it("accepts a real calendar date", () => {
    assert.equal(parseIsoDate("2027-10-15"), Date.UTC(2027, 9, 15));
    assert.equal(parseIsoDate("2028-02-29"), Date.UTC(2028, 1, 29));
  });

  for (const bad of ["", " 2027-10-15", "2027-10-15 ", "2027-1-15", "2027/10/15", "2027-02-30", "2027-13-01", "15-10-2027", "2027-10-15T00:00:00Z"]) {
    it(`refuses ${JSON.stringify(bad)}`, () => {
      assert.equal(parseIsoDate(bad), null);
    });
  }
});

describe("reminderText", () => {
  it("is neutral and points at the deploy workflow", () => {
    const { title, body } = reminderText(EXPIRES);
    assert.equal(title, TITLE);
    assert.match(body, /^The site deploy token expires on 2027-10-15; renew it, see the deploy workflow/);
    assert.match(body, /\.github\/workflows\/deploy\.yml/);
  });
});

describe("decideReminder", () => {
  const cases: [string, string, boolean][] = [
    ["31 days before", "2027-09-14", false],
    ["30 days before", "2027-09-15", true],
    ["1 day before", "2027-10-14", true],
    ["on the day", "2027-10-15", true],
    ["after expiry", "2027-11-01", true],
    ["a year before", "2026-10-20", false],
  ];
  for (const [label, today, due] of cases) {
    it(`${label}: due=${due}`, () => {
      const d = decideReminder({ expires: EXPIRES, today, openTitles: [] });
      assert.equal(d.due, due);
      assert.equal(d.open, due);
      assert.equal(d.title, TITLE);
    });
  }

  it("does not open a second issue while one with the same title is open", () => {
    const d = decideReminder({ expires: EXPIRES, today: "2027-10-01", openTitles: ["Other", TITLE] });
    assert.equal(d.due, true);
    assert.equal(d.alreadyOpen, true);
    assert.equal(d.open, false);
  });

  it("an open issue for an older date does not count", () => {
    const d = decideReminder({
      expires: EXPIRES,
      today: "2027-10-01",
      openTitles: ["The site deploy token expires on 2026-10-15"],
    });
    assert.equal(d.open, true);
  });

  it("throws on a bad date", () => {
    assert.throws(() => decideReminder({ expires: "soon", today: "2027-10-01", openTitles: [] }));
    assert.throws(() => decideReminder({ expires: EXPIRES, today: "", openTitles: [] }));
  });
});

describe("token-expiry CLI", { timeout: 60_000 }, () => {
  it("prints step outputs when due", () => {
    const r = run("--expires", EXPIRES, "--today", "2027-09-20", "--open-titles-file", titlesFile(""));
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /^open=true$/m);
    assert.match(r.stdout, new RegExp(`^title=${TITLE}$`, "m"));
    assert.match(r.stdout, /^body=The site deploy token expires on 2027-10-15; /m);
  });

  it("prints open=false when not due", () => {
    const r = run("--expires", EXPIRES, "--today", "2027-01-01", "--open-titles-file", titlesFile(""));
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /^open=false$/m);
  });

  it("prints open=false when the issue is already open", () => {
    const r = run("--expires", EXPIRES, "--today", "2027-10-10", "--open-titles-file", titlesFile(`${TITLE}\n`));
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /^open=false$/m);
  });

  it("exits 2 when the expiry date is missing (variable not set)", () => {
    const r = run("--expires", "", "--today", "2027-10-10", "--open-titles-file", titlesFile(""));
    assert.equal(r.status, 2);
    assert.match(r.stderr, /YYYY-MM-DD/);
  });

  it("exits 2 on a malformed expiry date", () => {
    const r = run("--expires", "2027-10-15\nopen=true", "--today", "2027-10-10", "--open-titles-file", titlesFile(""));
    assert.equal(r.status, 2);
    assert.equal(r.stdout, "");
  });
});
