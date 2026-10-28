import { readFileSync, readdirSync, statSync } from 'node:fs'
import { basename, join } from 'node:path'
import { gzipSync } from 'node:zlib'

const ASSETS_DIR = 'dist/assets'
const KB = 1024

function gzipBytes(path) {
  return gzipSync(readFileSync(path)).length
}

function gzipFiles(files) {
  return files.reduce((total, file) => total + gzipBytes(join(ASSETS_DIR, file)), 0)
}

const files = readdirSync(ASSETS_DIR).filter((file) => statSync(join(ASSETS_DIR, file)).isFile())
const html = readFileSync('dist/index.html', 'utf8')
const initialFiles = new Set(
  [...html.matchAll(/(?:src|href)="([^"]+\.js)"/g)].map((match) => basename(match[1])),
)

if (initialFiles.size === 0) {
  console.error('Budget: nessun JavaScript iniziale trovato in dist/index.html.')
  process.exit(1)
}

const jsFiles = files.filter((file) => file.endsWith('.js'))
const workerFiles = jsFiles.filter((file) => file.includes('worker'))
const lazyFiles = jsFiles.filter(
  (file) => !initialFiles.has(file) && !workerFiles.includes(file),
)
const initialJsFiles = jsFiles.filter((file) => initialFiles.has(file))

const initialJsBytes = gzipFiles(initialJsFiles)
const workerBytes = gzipFiles(workerFiles)
const lazyBytes = gzipFiles(lazyFiles)
const cssBytes = gzipFiles(files.filter((file) => file.endsWith('.css')))
const fontBytes = gzipFiles(files.filter((file) => file.endsWith('.woff2')))
const htmlBytes = gzipBytes('dist/index.html')

const checks = [
  {
    label: 'JS iniziale',
    bytes: initialJsBytes,
    limit: 205 * KB,
  },
  {
    label: 'Chunk lazy (cloud)',
    bytes: lazyBytes,
    limit: 80 * KB,
  },
  {
    label: 'Worker .3mf',
    bytes: workerBytes,
    limit: 40 * KB,
  },
  { label: 'CSS', bytes: cssBytes, limit: 20 * KB },
  { label: 'Font WOFF2', bytes: fontBytes, limit: 120 * KB },
  { label: 'HTML', bytes: htmlBytes, limit: 4 * KB },
  {
    label: 'Totale iniziale',
    bytes: initialJsBytes + cssBytes + fontBytes,
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
