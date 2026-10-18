#!/usr/bin/env node
/**
 * Fails if husky or CI invoke any leak scanner other than scripts/check-leaks.
 */
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));

const FILES = [
  ".husky/pre-commit",
  ".husky/pre-push",
  ".github/workflows/leak-guard.yml",
  "scripts/check-leaks-on-push.sh",
];

const FORBIDDEN = [
  /gitleaks(?!-)/i,
  /trufflehog/i,
  /detect-secrets/i,
  /ggshield/i,
  /gacts\/gitleaks/i,
  /zricethezav\/gitleaks-action/i,
];

const REQUIRED = /scripts\/check-leaks/;

let failed = false;

for (const rel of FILES) {
  const text = readFileSync(join(ROOT, rel), "utf8");
  if (!REQUIRED.test(text)) {
    console.error(`[wiring] ${rel}: must call scripts/check-leaks`);
    failed = true;
  }
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
      if (re.test(line)) {
        console.error(
          `[wiring] ${rel}:${i + 1}: must not call scanners other than scripts/check-leaks`
        );
        failed = true;
      }
    }
  }
}

const workflow = readFileSync(join(ROOT, ".github/workflows/leak-guard.yml"), "utf8");
if (!/fetch-depth:\s*0/.test(workflow)) {
  console.error("[wiring] leak-guard.yml: checkout must use fetch-depth: 0");
  failed = true;
}
if (!/scripts\/check-leaks-on-push\.sh/.test(workflow)) {
  console.error("[wiring] leak-guard.yml: push path must call scripts/check-leaks-on-push.sh");
  failed = true;
}

const onPush = readFileSync(join(ROOT, "scripts/check-leaks-on-push.sh"), "utf8");
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
  if (!re.test(onPush)) {
    console.error(`[wiring] check-leaks-on-push.sh: missing fail-closed fallback (${re})`);
    failed = true;
  }
}

// Phone regexes in .gitleaks.toml must equal scripts/phone-patterns.mjs.
const { PHONE_PATTERN_SOURCES } = await import("./phone-patterns.mjs");
const gitleaksToml = readFileSync(join(ROOT, ".gitleaks.toml"), "utf8");
for (const [id, source] of Object.entries(PHONE_PATTERN_SOURCES)) {
  const block = gitleaksToml.split(`id = "${id}"`)[1];
  if (!block) {
    console.error(`[wiring] .gitleaks.toml: missing rule id ${id}`);
    failed = true;
    continue;
  }
  const m = block.match(/regex\s*=\s*'''([\s\S]*?)'''/);
  if (!m) {
    console.error(`[wiring] .gitleaks.toml: missing regex for ${id}`);
    failed = true;
    continue;
  }
  const tomlRegex = m[1];
  if (tomlRegex !== source) {
    console.error(`[wiring] .gitleaks.toml regex != phone-patterns.mjs for ${id}`);
    failed = true;
  }
}

if (failed) process.exit(1);
console.log("test-leak-guard-wiring: OK");
