import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [react(), tailwindcss()],
  build: {
    // The gzip budget is enforced by scripts/check-budget.mjs. The raw-size warning
    // is only a Vite hint: the i18n dictionaries, the XLSX writer and the auth UI
    // push the initial chunk past 700 KB raw. The Supabase client is a lazy chunk.
    chunkSizeWarningLimit: 720,
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
})
