# Leak-guard fixtures (test only)

Obviously fake values used by `scripts/prove-leak-guard.sh`.
Excluded from production scans. Do not copy into real paths.

| Fixture | Expected |
|---------|----------|
| `private-ip.txt` | fail (private IPv4) |
| `fake-token.txt` | fail (credential assignment) |
| `dotenv-case/.env` | fail (`forbidden-file`) |
| `metadata-case/.../orientation-exif.jpg` | fail (`image-metadata`) |
| `time-like.txt` | pass (not IPv6) |
| `ula-ipv6.txt` | fail (ULA IPv6) |
| `host-fail-bare/` | fail (`disallowed-bare-phazeo-host`) |
| `host-fail-url/` | fail (`disallowed-host`) |
| `host-pass/` | pass |
| `tool-cache-case/.tools/...` | fail (`tool-cache`) |
| `binary-case/fake.elf` | fail (`binary-file`) |
| `large-case/big.bin` | fail (`file-too-large`) |
