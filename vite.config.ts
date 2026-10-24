import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [react(), tailwindcss()],
  build: {
    // PLAN targets < 500 KB gzip for the initial load; the single chunk is ~145 KB gzip.
    // The raw-size warning at 500 KB is not the budget that matters for this app.
    chunkSizeWarningLimit: 600,
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
})
