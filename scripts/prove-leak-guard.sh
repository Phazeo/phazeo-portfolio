#!/usr/bin/env sh
# Prove each fixture makes the relevant check fail, then that the clean tree passes.
# Reports rule id / file only — never secret values.
set -eu

ROOT=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
cd "$ROOT"
GITLEAKS=$(sh "$ROOT/scripts/ensure-gitleaks.sh")
FIX="$ROOT/test/leak-fixtures"
TMPCFG=$(mktemp)
trap 'rm -f "$TMPCFG"' EXIT

# Config without the fixtures allowlist path so gitleaks can see them.
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

# 1) Fake private IP (10/8) — not documentation range
fail_case "private-ip" \
  "$GITLEAKS" dir --no-banner --redact -c "$TMPCFG" --exit-code 1 "$FIX/private-ip.txt"

# 2) Fake token assignment
fail_case "fake-token" \
  "$GITLEAKS" dir --no-banner --redact -c "$TMPCFG" --exit-code 1 "$FIX/fake-token.txt"

# 3) .env file
fail_case "dotenv-file" \
  node "$ROOT/scripts/check-forbidden-files.mjs" --include-fixtures --root "$FIX/dotenv-case"

# 4) GPS-tagged image
fail_case "gps-image" \
  node "$ROOT/scripts/check-forbidden-files.mjs" --include-fixtures --root "$FIX/gps-case"

# Clean tree must still pass (fixtures excluded)
pass_case "clean-tree" sh "$ROOT/scripts/check-leaks" --tree

echo "prove-leak-guard: all cases OK"
