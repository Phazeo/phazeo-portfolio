#!/usr/bin/env sh
# Push-event leak scan: use BEFORE..HEAD when safe; otherwise fail closed to --history.
# Usage: sh scripts/check-leaks-on-push.sh <before_sha> <head_sha>
#
# Fail closed: if before is all-zeros, missing, empty, or not an ancestor of HEAD,
# run scripts/check-leaks --history. Never skip the scan.
set -eu

ROOT=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
cd "$ROOT"

BEFORE=${1:-}
HEAD_SHA=${2:-}

if [ -z "$HEAD_SHA" ]; then
  echo "check-leaks-on-push: HEAD sha is required" >&2
  exit 2
fi

fallback_history() {
  reason=$1
  echo "check-leaks-on-push: falling back to full history scan ($reason)" >&2
  sh "$ROOT/scripts/check-leaks" --history
  exit $?
}

if [ -z "$BEFORE" ] || [ "$BEFORE" = "0000000000000000000000000000000000000000" ]; then
  fallback_history "before missing or all-zeros"
fi

set +e
git cat-file -e "${BEFORE}^{commit}" 2>/dev/null
present=$?
set -e
if [ "$present" -ne 0 ]; then
  fallback_history "before not present in clone"
fi

set +e
git merge-base --is-ancestor "$BEFORE" "$HEAD_SHA" 2>/dev/null
ancestor=$?
set -e
if [ "$ancestor" -ne 0 ]; then
  fallback_history "before is not an ancestor of HEAD"
fi

echo "check-leaks-on-push: scanning commits ${BEFORE}..${HEAD_SHA}" >&2
sh "$ROOT/scripts/check-leaks" --commits "${BEFORE}..${HEAD_SHA}"
