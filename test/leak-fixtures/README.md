# Leak-guard fixtures (test only)

Obviously fake values used by `scripts/prove-leak-guard.sh`.

Excluded from production `scripts/check-leaks` scans via `.gitleaks.toml` allowlist
and scanner skip lists. Do not copy these into real paths.

| Fixture | Expected |
|---------|----------|
| `private-ip.txt` | fail (private IPv4) |
| `fake-token.txt` | fail (credential assignment) |
| `dotenv-case/.env` | fail (forbidden file) |
| `metadata-case/.../orientation-exif.jpg` | fail (`image-metadata`, orientation-only EXIF) |
| `time-like.txt` (`10:30:00`) | pass (not IPv6) |
| `ula-ipv6.txt` | fail (ULA IPv6) |
