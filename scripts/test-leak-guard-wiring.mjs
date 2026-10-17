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
  ".github/workflows/leak-guard.yml",
];

const FORBIDDEN = [
  /gitleaks(?!-)/i, // bare gitleaks invocations (allow "gitleaks" only inside comments about pin)
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
    // Allow ensure-gitleaks / gitleaks.pin references in comments only - already skipped.
    // Disallow direct scanner binaries or alternate actions in active lines.
    if (/ensure-gitleaks|gitleaks\.pin|check-leaks|install hint|gitleaks binary/i.test(line)) {
      continue;
    }
    for (const re of FORBIDDEN) {
      if (re.test(line)) {
        console.error(`[wiring] ${rel}:${i + 1}: must not call scanners other than scripts/check-leaks`);
        failed = true;
      }
    }
  }
}

if (failed) process.exit(1);
console.log("test-leak-guard-wiring: OK");
