import path from 'node:path'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import { buildEnglishIndexHtml } from './src/features/landing/en-page.ts'

const STATIC_LANDING = path.resolve(
  import.meta.dirname,
  'src/features/landing/landing-static.html',
)
const STATIC_LANDING_EN = path.resolve(
  import.meta.dirname,
  'src/features/landing/landing-static-en.html',
)

/**
 * Injects the complete Italian landing into `#root` at build time, then writes
 * the English twin beside it in `closeBundle` (ADR-0035). Crawlers and
 * visitors without JavaScript get the public pages; the first React render
 * replaces them with the interactive version.
 */
function landingPages(): Plugin {
  return {
    name: 'layercost-landing-pages',
    apply: 'build',
    transformIndexHtml(html) {
      const landing = readFileSync(STATIC_LANDING, 'utf8')
      return html.replace('<div id="root"></div>', `<div id="root">${landing}</div>`)
    },
    closeBundle() {
      const distIndex = path.resolve(import.meta.dirname, 'dist/index.html')
      const enIndex = path.resolve(import.meta.dirname, 'dist/en/index.html')
      const english = buildEnglishIndexHtml(
        readFileSync(distIndex, 'utf8'),
        readFileSync(STATIC_LANDING, 'utf8'),
        readFileSync(STATIC_LANDING_EN, 'utf8'),
      )
      mkdirSync(path.dirname(enIndex), { recursive: true })
      writeFileSync(enIndex, english)
    },
  }
}

export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [react(), tailwindcss(), landingPages()],
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
