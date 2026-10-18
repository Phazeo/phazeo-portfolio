/**
 * Single source of truth for phone regexes (JS + gitleaks RE2 text).
 * Never embed full phone-like literals here — patterns only.
 */

/** @type {Readonly<Record<string, string>>} */
export const PHONE_PATTERN_SOURCES = Object.freeze({
  // International: + then 8–15 digits with optional spaces/dots/dashes/brackets.
  "phazeo-phone-intl": String.raw`\+(?:[\s().-]*\d){8,15}\b`,
  // Grouped local-style: (xxx) xxx-xxxx or xxx-xxx-xxxx.
  "phazeo-phone-grouped":
    String.raw`(?:\(\d{2,4}\)[\s-]*\d{2,4}[\s-]+\d{2,4}(?:[\s-]+\d{2,4})?|\b\d{3}-\d{3}-\d{4}\b)`,
  // Indian mobile: 10 digits starting 6–9; optional +91 / 91 / 0; optional 5-5 or 3-3-4 split.
  "phazeo-phone-in-mobile":
    String.raw`(?:\+91[\s.-]?|91[\s.-]?|0)?(?:[6-9]\d{9}|[6-9]\d{4}[\s.-]\d{5}|[6-9]\d{2}[\s.-]\d{3}[\s.-]\d{4})\b`,
  // Indian landline: 0 + 2–4 digit area code + space/dash + 6–8 digits.
  "phazeo-phone-in-landline": String.raw`0\d{2,4}[\s-]\d{6,8}\b`,
});

/** @type {Readonly<Record<string, RegExp>>} */
export const PHONE_REGEXES = Object.freeze(
  Object.fromEntries(
    Object.entries(PHONE_PATTERN_SOURCES).map(([id, source]) => [id, new RegExp(source, "g")])
  )
);

/**
 * @param {string} text
 * @returns {boolean}
 */
export function textMatchesAnyPhone(text) {
  for (const re of Object.values(PHONE_REGEXES)) {
    re.lastIndex = 0;
    if (re.test(text)) return true;
  }
  return false;
}
