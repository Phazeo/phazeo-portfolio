# Reference snapshot (non-runnable)

This folder is a **stale snapshot** copied from the private `phazeo-portfolio` monorepo for historical reference.

- It is **not** imported by the Vite app.
- Biome ignores it (`!**/reference` in `biome.json`).
- Imports under `reference/registry.ts` point at paths that do not exist here.
- The live contribution pattern uses `componentLoader` in `profiles/<slug>/v1/` — see `profiles/sriram/` and the root README.
- A former `structure.txt` listing absolute local paths (including private resume filenames) was removed to avoid leaking private-repo layout.

Do not treat this folder as a working example when adding new profiles.
Do not add new copies of private profiles here.
