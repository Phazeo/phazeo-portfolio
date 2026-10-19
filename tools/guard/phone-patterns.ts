/**
 * Single source of truth for phone regexes (JS + gitleaks RE2 text).
 * Never embed full phone-like literals here - patterns only.
 * Patterns use only RE2-safe features (no lookbehind, no inline flags).
 */

export const PHONE_PATTERN_SOURCES: Readonly<Record<string, string>> = Object.freeze({
  // International: + then 8-15 digits with optional spaces/dots/dashes/brackets.
  "phazeo-phone-intl": String.raw`\+(?:[\s().-]*\d){8,15}\b`,
  // Grouped local-style: (xxx) xxx-xxxx or xxx-xxx-xxxx.
  "phazeo-phone-grouped":
    String.raw`(?:\(\d{2,4}\)[\s-]*\d{2,4}[\s-]+\d{2,4}(?:[\s-]+\d{2,4})?|\b\d{3}-\d{3}-\d{4}\b)`,
  // Indian mobile: digit boundaries; 10 digits starting 6-9; optional +91 / 91 / 0; optional 5-5 or 3-3-4 split.
  "phazeo-phone-in-mobile":
    String.raw`(?:^|\D)(?:\+91[\s.-]?|91[\s.-]?|0)?(?:[6-9]\d{9}|[6-9]\d{4}[\s.-]\d{5}|[6-9]\d{2}[\s.-]\d{3}[\s.-]\d{4})(?:\D|$)`,
  // Indian landline: digit boundaries; 0 + 2-4 digit area code + space/dash + 6-8 digits.
  "phazeo-phone-in-landline": String.raw`(?:^|\D)0\d{2,4}[\s-]\d{6,8}(?:\D|$)`,
});

export const PHONE_REGEXES: Readonly<Record<string, RegExp>> = Object.freeze(
  Object.fromEntries(
    Object.entries(PHONE_PATTERN_SOURCES).map(([id, source]) => [id, new RegExp(source, "g")])
  )
);

export function textMatchesAnyPhone(text: string): boolean {
  for (const re of Object.values(PHONE_REGEXES)) {
    re.lastIndex = 0;
    if (re.test(text)) return true;
  }
  return false;
}
