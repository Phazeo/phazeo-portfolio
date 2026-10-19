/**
 * Fails if husky or CI invoke any leak scanner other than tools/guard/check-leaks.sh.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { PHONE_PATTERN_SOURCES } from "../../tools/guard/phone-patterns.ts";

const ROOT = resolve(fileURLToPath(new URL("../..", import.meta.url)));

const FILES = [
  ".husky/pre-commit",
  ".husky/pre-push",
  ".github/workflows/leak-guard.yml",
  "tools/guard/check-leaks-on-push.sh",
];

const FORBIDDEN: readonly RegExp[] = [
  /gitleaks(?!-)/i,
  /trufflehog/i,
  /detect-secrets/i,
  /ggshield/i,
  /gacts\/gitleaks/i,
  /zricethezav\/gitleaks-action/i,
];

const REQUIRED = /tools\/guard\/check-leaks/;

describe("leak-guard wiring", () => {
  for (const rel of FILES) {
    it(`${rel} calls only tools/guard/check-leaks.sh`, () => {
      const text = readFileSync(join(ROOT, rel), "utf8");
      assert.match(text, REQUIRED, `${rel}: must call tools/guard/check-leaks`);
      const lines = text.split(/\r?\n/);
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i] ?? "";
        const trimmed = line.trim();
        if (trimmed.startsWith("#") || trimmed.startsWith("//")) continue;
        if (
          /ensure-gitleaks|gitleaks\.pin|check-leaks|install hint|gitleaks binary|leak guard/i.test(
            line
          )
        ) {
          continue;
        }
        for (const re of FORBIDDEN) {
          assert.ok(
            !re.test(line),
            `${rel}:${i + 1}: must not call scanners other than tools/guard/check-leaks`
          );
        }
      }
    });
  }

  it("leak-guard.yml checks out full history and uses the push wrapper", () => {
    const workflow = readFileSync(join(ROOT, ".github/workflows/leak-guard.yml"), "utf8");
    assert.match(workflow, /fetch-depth:\s*0/, "leak-guard.yml: checkout must use fetch-depth: 0");
    assert.match(
      workflow,
      /tools\/guard\/check-leaks-on-push\.sh/,
      "leak-guard.yml: push path must call tools/guard/check-leaks-on-push.sh"
    );
  });

  it("check-leaks-on-push.sh has fail-closed fallbacks", () => {
    const onPush = readFileSync(join(ROOT, "tools/guard/check-leaks-on-push.sh"), "utf8");
    const fallbackNeedles = [
      /falling back to full history scan/,
      /--history/,
      /fallback per-commit scan/,
      /origin\/main\.\./,
      /before not present in clone/,
      /before is not an ancestor of HEAD/,
      /before missing or all-zeros/,
    ];
    for (const re of fallbackNeedles) {
      assert.match(onPush, re, `check-leaks-on-push.sh: missing fail-closed fallback (${re})`);
    }
  });

  // Phone regexes in .gitleaks.toml must equal tools/guard/phone-patterns.ts.
  it(".gitleaks.toml phone regexes match phone-patterns.ts", () => {
    const gitleaksToml = readFileSync(join(ROOT, ".gitleaks.toml"), "utf8");
    for (const [id, source] of Object.entries(PHONE_PATTERN_SOURCES)) {
      const block = gitleaksToml.split(`id = "${id}"`)[1];
      assert.ok(block, `.gitleaks.toml: missing rule id ${id}`);
      const m = block.match(/regex\s*=\s*'''([\s\S]*?)'''/);
      assert.ok(m, `.gitleaks.toml: missing regex for ${id}`);
      assert.equal(m[1], source, `.gitleaks.toml regex != phone-patterns.ts for ${id}`);
    }
  });
});
