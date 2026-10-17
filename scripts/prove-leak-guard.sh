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
cleanup() {
  rm -f "$TMPCFG"
  if [ -n "$STAGED_TMP" ] && [ -d "$STAGED_TMP" ]; then
    rm -rf "$STAGED_TMP"
  fi
}
trap cleanup EXIT

grep -v 'test/leak-fixtures' "$ROOT/.gitleaks.toml" >"$TMPCFG"

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

git reset -q --hard HEAD
git clean -fdq
printf 'ok note\n' >note.txt
git add note.txt
echo "=== PROVE PASS staged: clean ==="
sh scripts/check-leaks --staged
echo "OK: staged clean passed"

# --- --commits: binary added then deleted must still fail ---
echo "=== PROVE FAIL commits: binary-then-deleted ==="
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

cd "$ROOT"
echo "prove-leak-guard: all cases OK"
