/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_PUBLIC_API_URL: string;
  readonly VITE_PUBLIC_REALTIME_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
