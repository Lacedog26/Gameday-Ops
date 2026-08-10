import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vite configuration for the Buffalo Bills Pre-Game Operations Dashboard.
// `base: './'` keeps asset paths relative so the built bundle can be served
// from any path on a TV kiosk (file://, subfolder, or root) without changes.
export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
  },
  preview: {
    host: true,
    port: 4173,
  },
})
