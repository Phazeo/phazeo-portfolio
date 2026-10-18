/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GUEST_CSP_EXAMPLE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
