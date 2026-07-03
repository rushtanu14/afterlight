/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIRMS_MAP_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
