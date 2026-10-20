#!/usr/bin/env sh
# Push-event leak scan: use BEFORE..HEAD when safe; otherwise fail closed to --history
# plus a per-commit scan. Never skip the scan.
# Usage: sh tools/guard/check-leaks-on-push.sh <before_sha> <head_sha>
set -eu

ROOT=$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)
cd "$ROOT"

BEFORE=${1:-}
HEAD_SHA=${2:-}

if [ -z "$HEAD_SHA" ]; then
  echo "check-leaks-on-push: HEAD sha is required" >&2
  exit 2
fi

# Fail closed: always run history AND a per-commit scan; any non-zero fails the job.
fallback_scans() {
  reason=$1
  failed=0
  echo "check-leaks-on-push: falling back to full history scan ($reason)" >&2
  set +e
  sh "$ROOT/tools/guard/check-leaks.sh" --history
  hist_rc=$?
  set -e
  if [ "$hist_rc" -ne 0 ]; then
    failed=1
  fi

  set +e
  if git rev-parse --verify origin/main >/dev/null 2>&1 \
    && [ "${GITHUB_REF_NAME:-}" != "main" ]; then
    echo "check-leaks-on-push: fallback per-commit scan origin/main..${HEAD_SHA}" >&2
    sh "$ROOT/tools/guard/check-leaks.sh" --commits "origin/main..${HEAD_SHA}"
    commits_rc=$?
  else
    echo "check-leaks-on-push: fallback per-commit scan (all commits reachable from HEAD)" >&2
    sh "$ROOT/tools/guard/check-leaks.sh" --commits "${HEAD_SHA}"
    commits_rc=$?
  fi
  set -e
  if [ "$commits_rc" -ne 0 ]; then
    failed=1
  fi

  if [ "$failed" -ne 0 ]; then
    exit 1
  fi
}

if [ -z "$BEFORE" ] || [ "$BEFORE" = "0000000000000000000000000000000000000000" ]; then
  fallback_scans "before missing or all-zeros"
  exit 0
fi

set +e
git cat-file -e "${BEFORE}^{commit}" 2>/dev/null
present=$?
set -e
if [ "$present" -ne 0 ]; then
  fallback_scans "before not present in clone"
  exit 0
fi

set +e
git merge-base --is-ancestor "$BEFORE" "$HEAD_SHA" 2>/dev/null
ancestor=$?
set -e
if [ "$ancestor" -ne 0 ]; then
  fallback_scans "before is not an ancestor of HEAD"
  exit 0
fi

echo "check-leaks-on-push: scanning commits ${BEFORE}..${HEAD_SHA}" >&2
sh "$ROOT/tools/guard/check-leaks.sh" --commits "${BEFORE}..${HEAD_SHA}"
