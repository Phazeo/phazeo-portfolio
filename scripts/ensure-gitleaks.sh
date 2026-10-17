#!/usr/bin/env sh
# Download and verify the pinned gitleaks binary. Prints the absolute path on success.
set -eu

ROOT=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
# shellcheck disable=SC1091
. "$ROOT/scripts/gitleaks.pin"

TOOLS="$ROOT/.tools/gitleaks"
BIN="$TOOLS/gitleaks"
MARKER="$TOOLS/.pin"
EXTRACT=tar

sha256_of() {
  file=$1
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$file" | awk '{print $1}'
  elif command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$file" | awk '{print $1}'
  else
    echo "ensure-gitleaks: need sha256sum or shasum -a 256 to verify the download" >&2
    exit 1
  fi
}

os=$(uname -s | tr '[:upper:]' '[:lower:]')
arch=$(uname -m)

is_windows=0
case "$os" in
  mingw*|msys*|cygwin*) is_windows=1 ;;
esac
case "${MSYSTEM:-}" in
  MINGW*|MSYS*) is_windows=1 ;;
esac

if [ "$is_windows" -eq 1 ]; then
  archive=$WINDOWS_X64_ARCHIVE
  expect=$WINDOWS_X64_SHA256
  EXTRACT=zip
  BIN="$TOOLS/gitleaks.exe"
else
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
      echo "ensure-gitleaks: unsupported platform os=$os arch=$arch" >&2
      exit 1
      ;;
  esac
fi

wanted="$VERSION:$archive:$expect"
if { [ -x "$BIN" ] || [ -f "$BIN" ]; } && [ -f "$MARKER" ] && [ "$(cat "$MARKER")" = "$wanted" ]; then
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

got=$(sha256_of "$archive_path")
if [ "$got" != "$expect" ]; then
  echo "ensure-gitleaks: SHA-256 mismatch for $archive" >&2
  echo "  expected: $expect" >&2
  echo "  got:      $got" >&2
  exit 1
fi

if ! grep -E "^${expect}[[:space:]]+${archive}\$" "$checksums_path" >/dev/null; then
  echo "ensure-gitleaks: pin does not match official checksums.txt for $archive" >&2
  exit 1
fi

mkdir -p "$TOOLS"
if [ "$EXTRACT" = zip ]; then
  if ! command -v unzip >/dev/null 2>&1; then
    echo "ensure-gitleaks: unzip is required to extract the Windows gitleaks zip" >&2
    exit 1
  fi
  unzip -o -q "$archive_path" -d "$TOOLS"
  if [ ! -f "$TOOLS/gitleaks.exe" ]; then
    echo "ensure-gitleaks: gitleaks.exe missing after unzip" >&2
    exit 1
  fi
else
  tar -xzf "$archive_path" -C "$TOOLS" gitleaks
  chmod +x "$BIN"
fi

printf '%s\n' "$wanted" >"$MARKER"
printf '%s\n' "$BIN"
