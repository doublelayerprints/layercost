import path from 'node:path'
import { readFileSync } from 'node:fs'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

const STATIC_LANDING = path.resolve(
  import.meta.dirname,
  'src/features/landing/landing-static.html',
)

/**
 * Injects the complete Italian landing into `#root` at build time. Crawlers and
 * visitors without JavaScript get the public page; the first React render
 * replaces it with the interactive version.
 */
function landingPrerender(): Plugin {
  return {
    name: 'layercost-landing-prerender',
    apply: 'build',
    transformIndexHtml(html) {
      const landing = readFileSync(STATIC_LANDING, 'utf8')
      return html.replace('<div id="root"></div>', `<div id="root">${landing}</div>`)
    },
  }
}

export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [react(), tailwindcss(), landingPrerender()],
  build: {
    // The gzip budget is enforced by scripts/check-budget.mjs. The raw-size warning
    // is only a Vite hint: the i18n dictionaries, the landing, the XLSX writer,
    // the auth UI and the sync engine push the initial chunk past 800 KB raw.
    // The Supabase client remains a lazy chunk.
    chunkSizeWarningLimit: 860,
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
})
