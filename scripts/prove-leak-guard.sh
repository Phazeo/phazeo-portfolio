#!/usr/bin/env sh
# Prove fixtures, staged path, and --commits path fail closed; clean cases pass.
# Reports rule id / file only — never secret values.
set -eu

ROOT=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
cd "$ROOT"
GITLEAKS=$(sh "$ROOT/scripts/ensure-gitleaks.sh")
FIX="$ROOT/test/leak-fixtures"
TMPCFG=$(mktemp)
STAGED_TMP=""
GEN_FIX=""
cleanup() {
  rm -f "$TMPCFG"
  if [ -n "$STAGED_TMP" ] && [ -d "$STAGED_TMP" ]; then
    rm -rf "$STAGED_TMP"
  fi
  if [ -n "$GEN_FIX" ] && [ -d "$GEN_FIX" ]; then
    rm -rf "$GEN_FIX"
  fi
}
trap cleanup EXIT

grep -v 'test/leak-fixtures' "$ROOT/.gitleaks.toml" >"$TMPCFG"

GEN_FIX=$(mktemp -d)
node "$ROOT/scripts/make-leak-fixtures.mjs" "$GEN_FIX" >/dev/null

fail_case() {
  name=$1
  shift
  echo "=== PROVE FAIL: $name ==="
  set +e
  "$@"
  rc=$?
  set -e
  if [ "$rc" -eq 0 ]; then
    echo "PROVE FAILED: expected non-zero for $name" >&2
    exit 1
  fi
  echo "OK: $name failed as expected (exit $rc)"
}

pass_case() {
  name=$1
  shift
  echo "=== PROVE PASS: $name ==="
  "$@"
  echo "OK: $name passed"
}

fail_case "private-ip" \
  "$GITLEAKS" dir --no-banner --redact -c "$TMPCFG" --exit-code 1 "$FIX/private-ip.txt"

fail_case "fake-token" \
  "$GITLEAKS" dir --no-banner --redact -c "$TMPCFG" --exit-code 1 "$FIX/fake-token.txt"

fail_case "phone-intl" \
  "$GITLEAKS" dir --no-banner --redact -c "$TMPCFG" --exit-code 1 "$GEN_FIX/phone-fail/intl.txt"

fail_case "phone-grouped" \
  "$GITLEAKS" dir --no-banner --redact -c "$TMPCFG" --exit-code 1 "$GEN_FIX/phone-fail/grouped.txt"

fail_case "phone-in-mobile-plain" \
  "$GITLEAKS" dir --no-banner --redact -c "$TMPCFG" --exit-code 1 "$GEN_FIX/phone-fail/in-mobile-plain.txt"

fail_case "phone-in-mobile-55" \
  "$GITLEAKS" dir --no-banner --redact -c "$TMPCFG" --exit-code 1 "$GEN_FIX/phone-fail/in-mobile-55.txt"

fail_case "phone-in-mobile-334" \
  "$GITLEAKS" dir --no-banner --redact -c "$TMPCFG" --exit-code 1 "$GEN_FIX/phone-fail/in-mobile-334.txt"

fail_case "phone-in-mobile-prefix91" \
  "$GITLEAKS" dir --no-banner --redact -c "$TMPCFG" --exit-code 1 "$GEN_FIX/phone-fail/in-mobile-prefix91.txt"

fail_case "phone-in-landline" \
  "$GITLEAKS" dir --no-banner --redact -c "$TMPCFG" --exit-code 1 "$GEN_FIX/phone-fail/in-landline.txt"

fail_case "phone-ph-colon-mobile" \
  "$GITLEAKS" dir --no-banner --redact -c "$TMPCFG" --exit-code 1 "$GEN_FIX/phone-fail/ph-colon-mobile.txt"

fail_case "phone-plus91-dash-55" \
  "$GITLEAKS" dir --no-banner --redact -c "$TMPCFG" --exit-code 1 "$GEN_FIX/phone-fail/plus91-dash-55.txt"

fail_case "phone-zero-prefix-mobile" \
  "$GITLEAKS" dir --no-banner --redact -c "$TMPCFG" --exit-code 1 "$GEN_FIX/phone-fail/zero-prefix-mobile.txt"

fail_case "phone-mobile-file-start" \
  "$GITLEAKS" dir --no-banner --redact -c "$TMPCFG" --exit-code 1 "$GEN_FIX/phone-fail/mobile-file-start.txt"

fail_case "phone-mobile-file-end" \
  "$GITLEAKS" dir --no-banner --redact -c "$TMPCFG" --exit-code 1 "$GEN_FIX/phone-fail/mobile-file-end.txt"

fail_case "phone-landline-line-start" \
  "$GITLEAKS" dir --no-banner --redact -c "$TMPCFG" --exit-code 1 "$GEN_FIX/phone-fail/landline-line-start.txt"

# PASS: gitleaks + PDF text-scanner logic (textMatchesAnyPhone must be false)
phone_pass_both() {
  label=$1
  file=$2
  pass_case "phone-${label}-gitleaks" \
    "$GITLEAKS" dir --no-banner --redact -c "$TMPCFG" --exit-code 1 "$file"
  echo "=== PROVE PASS: phone-${label}-pdf-logic ==="
  PHONE_PATTERNS_JS="$ROOT/scripts/phone-patterns.mjs" PHONE_PASS_FILE="$file" node --input-type=module <<'NODE'
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
const mod = await import(pathToFileURL(process.env.PHONE_PATTERNS_JS).href);
const t = readFileSync(process.env.PHONE_PASS_FILE, "utf8");
if (mod.textMatchesAnyPhone(t)) {
  console.error("PROVE FAILED: pdf-logic matched");
  process.exit(1);
}
NODE
  echo "OK: phone-${label}-pdf-logic passed"
}

phone_pass_both "epoch-ms" "$GEN_FIX/phone-pass/epoch-ms.txt"
phone_pass_both "long-id" "$GEN_FIX/phone-pass/long-id.txt"
phone_pass_both "eleven-leading-1" "$GEN_FIX/phone-pass/eleven-leading-1.txt"
phone_pass_both "twelve-digit" "$GEN_FIX/phone-pass/twelve-digit.txt"
phone_pass_both "iso-datetime" "$GEN_FIX/phone-pass/iso-datetime.txt"
phone_pass_both "date-range" "$GEN_FIX/phone-pass/date-range.txt"
phone_pass_both "version" "$GEN_FIX/phone-pass/version.txt"
phone_pass_both "hex-sha" "$GEN_FIX/phone-pass/hex-sha.txt"

pdf_fail() {
  name=$1
  pdf=$2
  fail_case "$name" \
    sh -c 'd=$(mktemp -d) && cp -f "$0" "$d/" && node "$1/scripts/check-forbidden-files.mjs" --include-fixtures --root "$d"; rc=$?; rm -rf "$d"; exit $rc' "$pdf" "$ROOT"
}

pdf_fail "pdf-pii-phone-plain" "$GEN_FIX/pdf-pii-phone-plain.pdf"
pdf_fail "pdf-pii-phone-flate" "$GEN_FIX/pdf-pii-phone-flate.pdf"
pdf_fail "pdf-pii-ph-colon-plain" "$GEN_FIX/pdf-pii-ph-colon-plain.pdf"
pdf_fail "pdf-pii-ph-colon-flate" "$GEN_FIX/pdf-pii-ph-colon-flate.pdf"
pdf_fail "pdf-pii-plus91-55-plain" "$GEN_FIX/pdf-pii-plus91-55-plain.pdf"
pdf_fail "pdf-pii-plus91-55-flate" "$GEN_FIX/pdf-pii-plus91-55-flate.pdf"
pass_case "pdf-clean" \
  sh -c 'd=$(mktemp -d) && cp -f "$0/pdf-clean.pdf" "$d/" && node "$1/scripts/check-forbidden-files.mjs" --include-fixtures --root "$d"; rc=$?; rm -rf "$d"; exit $rc' "$FIX" "$ROOT"

fail_case "pdf-metadata" \
  sh -c 'd=$(mktemp -d) && cp -f "$0/pdf-metadata-dirty.pdf" "$d/" && node "$1/scripts/check-forbidden-files.mjs" --include-fixtures --root "$d"; rc=$?; rm -rf "$d"; exit $rc' "$FIX" "$ROOT"

fail_case "dotenv-file" \
  node "$ROOT/scripts/check-forbidden-files.mjs" --include-fixtures --root "$FIX/dotenv-case"

fail_case "orientation-exif" \
  node "$ROOT/scripts/check-forbidden-files.mjs" --include-fixtures --root "$FIX/metadata-case"

pass_case "time-like-not-ipv6" \
  "$GITLEAKS" dir --no-banner --redact -c "$TMPCFG" --exit-code 1 "$FIX/time-like.txt"

fail_case "ula-ipv6" \
  "$GITLEAKS" dir --no-banner --redact -c "$TMPCFG" --exit-code 1 "$FIX/ula-ipv6.txt"

fail_case "bare-internal-phazeo" \
  node "$ROOT/scripts/check-hosts.mjs" --include-fixtures --root "$FIX/host-fail-bare"

fail_case "url-admin-phazeo" \
  node "$ROOT/scripts/check-hosts.mjs" --include-fixtures --root "$FIX/host-fail-url"

pass_case "portfolio-phazeo-host" \
  node "$ROOT/scripts/check-hosts.mjs" --include-fixtures --root "$FIX/host-pass"

fail_case "tool-cache" \
  node "$ROOT/scripts/check-forbidden-files.mjs" --include-fixtures --root "$FIX/tool-cache-case"

fail_case "binary-file" \
  node "$ROOT/scripts/check-forbidden-files.mjs" --include-fixtures --root "$FIX/binary-case"

fail_case "file-too-large" \
  node "$ROOT/scripts/check-forbidden-files.mjs" --include-fixtures --root "$FIX/large-case"

pass_case "clean-tree" sh "$ROOT/scripts/check-leaks" --tree

# --- Staged path ---
echo "=== PROVE STAGED (throwaway repo) ==="
STAGED_TMP=$(mktemp -d)
mkdir -p "$STAGED_TMP/scripts" "$STAGED_TMP/.github"
cp -a "$ROOT/scripts/." "$STAGED_TMP/scripts/"
cp -a "$ROOT/.gitleaks.toml" "$STAGED_TMP/.gitleaks.toml"
cp -a "$ROOT/.github/." "$STAGED_TMP/.github/"
cd "$STAGED_TMP"
git init -q
git config user.name "$(git -C "$ROOT" config user.name)"
git config user.email "$(git -C "$ROOT" config user.email)"
git config core.hooksPath /dev/null
printf '# prove\n' >README.md
git add README.md scripts .gitleaks.toml .github
git commit -q -m "init"

stage_and_expect_fail() {
  name=$1
  shift
  git reset -q --hard HEAD
  git clean -fdq
  "$@"
  echo "=== PROVE FAIL staged: $name ==="
  set +e
  sh scripts/check-leaks --staged
  rc=$?
  set -e
  if [ "$rc" -eq 0 ]; then
    echo "PROVE FAILED: staged $name expected non-zero" >&2
    exit 1
  fi
  echo "OK: staged $name failed as expected (exit $rc)"
}

stage_and_expect_fail "private-ip" \
  sh -c 'printf "bind = %s\n" "$(printf "%d.%d.%d.%d" 10 42 0 99)" >bad-ip.txt && git add bad-ip.txt'

stage_and_expect_fail "dotenv" \
  sh -c 'printf "FAKE=1\n" >.env && git add -f .env'

stage_and_expect_fail "exif-image" \
  sh -c "cp '$FIX/metadata-case/public/orientation-exif.jpg' ./photo.jpg && git add photo.jpg"

# Staged rename of a blocked file must fail (--no-renames exposes the added side).
git reset -q --hard HEAD
git clean -fdq
printf '\177ELF\002\001\001\000prove-bin\n' >blocked.bin
git add blocked.bin
git commit -q -m "add blocked binary"
git mv blocked.bin renamed.bin
echo "=== PROVE FAIL staged: rename-blocked-binary ==="
set +e
sh scripts/check-leaks --staged
rc=$?
set -e
if [ "$rc" -eq 0 ]; then
  echo "PROVE FAILED: staged rename-blocked-binary expected non-zero" >&2
  exit 1
fi
echo "OK: staged rename-blocked-binary failed as expected (exit $rc)"

# Staged typechange (T) of a forbidden-name file to a symlink must fail (ACMT).
git reset -q --hard HEAD
git clean -fdq
printf 'not-a-real-key\n' >staged-secret.pem
git add staged-secret.pem
git commit -q -m "add pem"
rm -f staged-secret.pem
ln -s "missing-target" staged-secret.pem
git add staged-secret.pem
echo "=== PROVE FAIL staged: typechange-pem-to-symlink ==="
set +e
# Confirm git sees a typechange when possible
tc_lines=$(git diff --cached --name-only --no-renames --diff-filter=T || true)
sh scripts/check-leaks --staged
rc=$?
set -e
if [ -z "$tc_lines" ]; then
  echo "PROVE NOTE: git did not report diff-filter=T for pem→symlink on this platform; closest ACMT path still required to fail"
fi
if [ "$rc" -eq 0 ]; then
  echo "PROVE FAILED: staged typechange-pem-to-symlink expected non-zero" >&2
  exit 1
fi
echo "OK: staged typechange-pem-to-symlink failed as expected (exit $rc)"

git reset -q --hard HEAD
git clean -fdq
printf 'ok note\n' >note.txt
git add note.txt
echo "=== PROVE PASS staged: clean ==="
sh scripts/check-leaks --staged
echo "OK: staged clean passed"
# --- --commits: binary added then deleted must still fail ---
echo "=== PROVE FAIL commits: binary-then-deleted ==="
COMMITS_BASE=$(git rev-parse HEAD)
git reset -q --hard HEAD
git clean -fdq
# POSIX printf: use octal escapes (\\x is not portable).
printf '\177ELF\002\001\001\000prove-bin\n' >prove.bin
git add prove.bin
git commit -q -m "add fake binary"
git rm -q prove.bin
git commit -q -m "delete fake binary"
set +e
sh scripts/check-leaks --commits HEAD~2..HEAD
rc=$?
set -e
if [ "$rc" -eq 0 ]; then
  echo "PROVE FAILED: --commits over binary-then-deleted expected non-zero" >&2
  exit 1
fi
echo "OK: commits binary-then-deleted failed as expected (exit $rc)"

# --- --commits: executable bit from git mode (100755), even if later cleared ---
echo "=== PROVE FAIL commits: executable-image-then-fixed ==="
git reset -q --hard HEAD
git clean -fdq
# Minimal JPEG (SOI + EOI) — content is not a binary signature; mode is.
printf '\377\330\377\331' >prove.jpg
git add prove.jpg
chmod +x prove.jpg
git update-index --chmod=+x prove.jpg
git commit -q -m "add executable image"
chmod a-x prove.jpg
git update-index --chmod=-x prove.jpg
git commit -q -m "clear executable bit on image"
set +e
sh scripts/check-leaks --commits HEAD~2..HEAD
rc=$?
set -e
if [ "$rc" -eq 0 ]; then
  echo "PROVE FAILED: --commits over executable-image-then-fixed expected non-zero" >&2
  exit 1
fi
echo "OK: commits executable-image-then-fixed failed as expected (exit $rc)"

# Drop throwaway prove commits before push-fallback (must not pollute origin/main..HEAD).
git reset -q --hard "$COMMITS_BASE"
git clean -fdq

# --- push path: unreachable BEFORE must fall back to --history AND per-commit ---
echo "=== PROVE PASS push: unreachable-before-falls-back-to-history ==="
HEAD_NOW=$(git -C "$ROOT" rev-parse HEAD)
FAKE_BEFORE=00000000000000000000000000000000000000aa
set +e
push_out=$(sh "$ROOT/scripts/check-leaks-on-push.sh" "$FAKE_BEFORE" "$HEAD_NOW" 2>&1)
push_rc=$?
set -e
printf '%s\n' "$push_out" | grep -q 'falling back to full history scan' || {
  echo "PROVE FAILED: expected fallback message for unreachable before" >&2
  exit 1
}
printf '%s\n' "$push_out" | grep -q 'check-leaks: gitleaks (history)' || {
  echo "PROVE FAILED: expected full history scan for unreachable before" >&2
  exit 1
}
printf '%s\n' "$push_out" | grep -q 'fallback per-commit scan' || {
  echo "PROVE FAILED: expected fallback per-commit scan for unreachable before" >&2
  exit 1
}
printf '%s\n' "$push_out" | grep -q 'check-leaks: per-commit scan' || {
  echo "PROVE FAILED: expected per-commit scan invocation for unreachable before" >&2
  exit 1
}
if [ "$push_rc" -ne 0 ]; then
  echo "PROVE FAILED: unreachable-before fallback scan exited $push_rc" >&2
  exit 1
fi
echo "OK: unreachable-before fell back to history+commits (exit $push_rc)"

# --- push fallback must fail when a new branch adds then removes a blocked binary ---
echo "=== PROVE FAIL push: fallback-binary-then-deleted ==="
git reset -q --hard HEAD
git clean -fdq
printf '\177ELF\002\001\001\000prove-bin\n' >branch.bin
git add branch.bin
git commit -q -m "add blocked binary on branch"
git rm -q branch.bin
git commit -q -m "remove blocked binary"
TIP=$(git rev-parse HEAD)
FAKE_BEFORE2=00000000000000000000000000000000000000bb
set +e
push_out2=$(sh scripts/check-leaks-on-push.sh "$FAKE_BEFORE2" "$TIP" 2>&1)
push_rc2=$?
set -e
printf '%s\n' "$push_out2" | grep -q 'falling back to full history scan' || {
  echo "PROVE FAILED: expected fallback message for binary-then-deleted" >&2
  exit 1
}
printf '%s\n' "$push_out2" | grep -q 'fallback per-commit scan' || {
  echo "PROVE FAILED: expected per-commit fallback for binary-then-deleted" >&2
  exit 1
}
if [ "$push_rc2" -eq 0 ]; then
  echo "PROVE FAILED: fallback over binary-then-deleted expected non-zero" >&2
  exit 1
fi
echo "OK: fallback binary-then-deleted failed as expected (exit $push_rc2)"

# Restore branch tip (throwaway prove commits must not remain).
git reset -q --hard "$COMMITS_BASE"
git clean -fdq

cd "$ROOT"
echo "prove-leak-guard: all cases OK"
