import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'

// Vite configuration for GameDayOps NFL.
// `base: './'` keeps asset paths relative so the built bundle can be served
// from any path on a TV kiosk (file://, subfolder, or root) without changes.
// The alias points the shared engine package at its TypeScript source so the
// monorepo builds with no separate compile step for @gamedayops/core.
export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: {
    alias: {
      '@gamedayops/core': fileURLToPath(new URL('../../packages/core/src', import.meta.url)),
    },
  },
  server: { host: true, port: 5173 },
  preview: { host: true, port: 4173 },
})
