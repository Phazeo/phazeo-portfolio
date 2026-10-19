/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GUEST_CSP_EXAMPLE?: string;
  /** Dev-only: set to "45" via `pnpm dev:directory-demo`. Forbidden in production builds. */
  readonly VITE_DIRECTORY_DEMO?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
