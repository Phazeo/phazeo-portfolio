#!/usr/bin/env node
/**
 * Deploy token expiry reminder. Decides whether the weekly workflow should
 * open an issue: from 30 days before the expiry date, unless an open issue
 * with the same title already exists.
 *
 *   --expires <YYYY-MM-DD> --today <YYYY-MM-DD> --open-titles-file <file>
 *
 * The titles file holds one open issue title per line. Prints step outputs
 * (open=, title=, body=) on stdout. Exit 2: missing or malformed input.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const LEAD_DAYS = 30;
const DAY_MS = 86_400_000;
const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** A calendar date as UTC milliseconds, or null unless exactly YYYY-MM-DD and real. */
export function parseIsoDate(value: string): number | null {
  const m = ISO_DATE_RE.exec(value);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const ms = Date.UTC(y, mo - 1, d);
  const back = new Date(ms);
  if (back.getUTCFullYear() !== y || back.getUTCMonth() !== mo - 1 || back.getUTCDate() !== d) return null;
  return ms;
}

export function reminderText(expires: string): { title: string; body: string } {
  const title = `The site deploy token expires on ${expires}`;
  return {
    title,
    body: `${title}; renew it, see the deploy workflow (.github/workflows/deploy.yml).`,
  };
}

export type ReminderDecision = {
  due: boolean;
  alreadyOpen: boolean;
  open: boolean;
  title: string;
  body: string;
};

export function decideReminder(input: {
  expires: string;
  today: string;
  openTitles: readonly string[];
  leadDays?: number;
}): ReminderDecision {
  const expiresMs = parseIsoDate(input.expires);
  const todayMs = parseIsoDate(input.today);
  if (expiresMs === null || todayMs === null) throw new Error("dates must be YYYY-MM-DD");
  const daysLeft = (expiresMs - todayMs) / DAY_MS;
  const due = daysLeft <= (input.leadDays ?? LEAD_DAYS);
  const { title, body } = reminderText(input.expires);
  const alreadyOpen = input.openTitles.some((t) => t.trim() === title);
  return { due, alreadyOpen, open: due && !alreadyOpen, title, body };
}

function flag(argv: readonly string[], name: string): string {
  const i = argv.indexOf(name);
  const v = i >= 0 ? argv[i + 1] : undefined;
  if (v === undefined || v.startsWith("--")) {
    console.error(`token-expiry: missing ${name}`);
    process.exit(2);
  }
  return v;
}

function main(argv: readonly string[]): void {
  const expires = flag(argv, "--expires");
  const today = flag(argv, "--today");
  if (parseIsoDate(expires) === null || parseIsoDate(today) === null) {
    console.error("token-expiry: --expires and --today must be YYYY-MM-DD (is the expiry variable set?)");
    process.exit(2);
  }
  const openTitles = readFileSync(flag(argv, "--open-titles-file"), "utf8").split("\n");
  const d = decideReminder({ expires, today, openTitles });
  console.log(`open=${d.open}`);
  console.log(`title=${d.title}`);
  console.log(`body=${d.body}`);
}

const isDirectRun =
  process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  main(process.argv.slice(2));
}
