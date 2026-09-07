// Build stamp surfaced in the admin footer so any running deployment is
// identifiable at a glance (and a rollback is unambiguous). The values are
// injected per-app at build time by Vite's `define` (see each app's
// vite.config.ts). Reading them is guarded with `typeof` so the shared engine
// still compiles and runs in an app that hasn't defined them.

declare const __APP_VERSION__: string
declare const __BUILD_DATE__: string

export const APP_VERSION: string =
  typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev'

export const BUILD_DATE: string =
  typeof __BUILD_DATE__ !== 'undefined' ? __BUILD_DATE__ : ''

/** e.g. "v1.0.0+1a2b3c4 · built 2026-08-28" */
export const buildLabel = (): string =>
  `v${APP_VERSION}${BUILD_DATE ? ` · built ${BUILD_DATE}` : ''}`
