import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'

const ASSETS_DIR = 'dist/assets'
const KB = 1024

function gzipBytes(path) {
  return gzipSync(readFileSync(path)).length
}

function totalBytes(files, extension) {
  return files
    .filter((file) => file.endsWith(extension))
    .reduce((total, file) => total + gzipBytes(join(ASSETS_DIR, file)), 0)
}

const files = readdirSync(ASSETS_DIR).filter((file) => statSync(join(ASSETS_DIR, file)).isFile())
const jsBytes = totalBytes(files, '.js')
const cssBytes = totalBytes(files, '.css')
const fontBytes = totalBytes(files, '.woff2')
const htmlBytes = gzipBytes('dist/index.html')

const checks = [
  // 225 KB: the i18n dictionaries (220 KB) plus the XLSX writer and export labels.
  { label: 'JavaScript', bytes: jsBytes, limit: 225 * KB },
  { label: 'CSS', bytes: cssBytes, limit: 20 * KB },
  { label: 'Font WOFF2', bytes: fontBytes, limit: 120 * KB },
  { label: 'HTML', bytes: htmlBytes, limit: 4 * KB },
  {
    label: 'Totale JS + CSS + font',
    bytes: jsBytes + cssBytes + fontBytes,
    limit: 350 * KB,
  },
]

let failed = false
for (const check of checks) {
  const used = (check.bytes / KB).toFixed(1)
  const limit = (check.limit / KB).toFixed(0)
  const status = check.bytes <= check.limit ? 'ok' : 'SFIDATO'
  if (check.bytes > check.limit) failed = true
  console.log(`${status.padEnd(8)} ${check.label.padEnd(22)} ${used.padStart(7)} KB / ${limit} KB`)
}

if (failed) {
  console.error(
    '\nBudget di performance superato: riduci il bundle o aggiorna il budget con una motivazione.',
  )
  process.exit(1)
}
