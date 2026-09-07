import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'
import { execSync } from 'node:child_process'
import { createRequire } from 'node:module'
import react from '@vitejs/plugin-react'

const require = createRequire(import.meta.url)
const pkgVersion = require('./package.json').version as string

// A human-readable build stamp: <pkg version>+<git short sha>, baked in so every
// deploy is identifiable in the UI. Falls back when git isn't available.
function gitSha(): string {
  for (const cmd of ['git rev-parse --short HEAD', 'echo $VERCEL_GIT_COMMIT_SHA']) {
    try {
      const out = execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
      if (out) return out.slice(0, 7)
    } catch {
      /* try next */
    }
  }
  return 'local'
}
const APP_VERSION = `${pkgVersion}+${gitSha()}`
const BUILD_DATE = new Date().toISOString().slice(0, 10)

// Vite configuration for GameDayOps NFL.
// `base: './'` keeps asset paths relative so the built bundle can be served
// from any path on a TV kiosk (file://, subfolder, or root) without changes.
// The alias points the shared engine package at its TypeScript source so the
// monorepo builds with no separate compile step for @gamedayops/core.
export default defineConfig({
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(APP_VERSION),
    __BUILD_DATE__: JSON.stringify(BUILD_DATE),
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@gamedayops/core': fileURLToPath(new URL('../../packages/core/src', import.meta.url)),
    },
  },
  server: { host: true, port: 5173 },
  preview: { host: true, port: 4173 },
})
