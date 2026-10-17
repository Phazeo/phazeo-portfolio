#!/usr/bin/env sh
# Download and verify the pinned gitleaks binary. Prints the absolute path on success.
set -eu

ROOT=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
# shellcheck disable=SC1091
. "$ROOT/scripts/gitleaks.pin"

TOOLS="$ROOT/.tools/gitleaks"
BIN="$TOOLS/gitleaks"
MARKER="$TOOLS/.pin"

os=$(uname -s | tr '[:upper:]' '[:lower:]')
arch=$(uname -m)
case "$os-$arch" in
  linux-x86_64|linux-amd64)
    archive=$LINUX_X64_ARCHIVE
    expect=$LINUX_X64_SHA256
    ;;
  linux-aarch64|linux-arm64)
    archive=$LINUX_ARM64_ARCHIVE
    expect=$LINUX_ARM64_SHA256
    ;;
  darwin-arm64)
    archive=$DARWIN_ARM64_ARCHIVE
    expect=$DARWIN_ARM64_SHA256
    ;;
  darwin-x86_64)
    archive=$DARWIN_X64_ARCHIVE
    expect=$DARWIN_X64_SHA256
    ;;
  *)
    echo "ensure-gitleaks: unsupported platform $os-$arch" >&2
    exit 1
    ;;
esac

wanted="$VERSION:$archive:$expect"
if [ -x "$BIN" ] && [ -f "$MARKER" ] && [ "$(cat "$MARKER")" = "$wanted" ]; then
  printf '%s\n' "$BIN"
  exit 0
fi

tmpdir=$(mktemp -d)
trap 'rm -rf "$tmpdir"' EXIT
archive_path="$tmpdir/$archive"
checksums_path="$tmpdir/checksums.txt"

echo "ensure-gitleaks: fetching gitleaks $VERSION ($archive)" >&2
curl -fsSL -o "$archive_path" "$RELEASE_BASE/$archive"
curl -fsSL -o "$checksums_path" "$CHECKSUMS_URL"

got=$(sha256sum "$archive_path" | awk '{print $1}')
if [ "$got" != "$expect" ]; then
  echo "ensure-gitleaks: SHA-256 mismatch for $archive" >&2
  echo "  expected: $expect" >&2
  echo "  got:      $got" >&2
  exit 1
fi

# Also confirm the pin matches the official checksums.txt line (defence in depth).
if ! grep -E "^${expect}[[:space:]]+${archive}\$" "$checksums_path" >/dev/null; then
  echo "ensure-gitleaks: pin does not match official checksums.txt for $archive" >&2
  exit 1
fi

mkdir -p "$TOOLS"
tar -xzf "$archive_path" -C "$TOOLS" gitleaks
chmod +x "$BIN"
printf '%s\n' "$wanted" >"$MARKER"
printf '%s\n' "$BIN"
