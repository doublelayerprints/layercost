import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [react(), tailwindcss()],
  build: {
    // The gzip budget is enforced by scripts/check-budget.mjs. The raw-size warning
    // is only a Vite hint: the i18n dictionaries, the XLSX writer, the auth UI and
    // the sync engine push the initial chunk past 720 KB raw. The Supabase client
    // remains a lazy chunk.
    chunkSizeWarningLimit: 760,
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
})
