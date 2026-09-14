/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  /** Which shared board this deployment reads/writes (defaults to "default"). */
  readonly VITE_BOARD_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

/** Build-time version stamp: "<pkg version>+<git short sha>" (see vite.config.ts). */
declare const __APP_VERSION__: string
/** Build date, YYYY-MM-DD. */
declare const __BUILD_DATE__: string
