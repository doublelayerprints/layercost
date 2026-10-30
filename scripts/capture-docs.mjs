import { mkdirSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { chromium } from '@playwright/test'

const PORT = 5175
const BASE = `http://127.0.0.1:${PORT}`
const OUT = 'public/docs'

async function waitForServer(timeoutMs = 60_000) {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(`${BASE}/`)
      if (response.ok) return
    } catch {
      // The dev server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  throw new Error('Il server di sviluppo non è partito in tempo.')
}

async function main() {
  mkdirSync(OUT, { recursive: true })
  const server = spawn('npm', ['run', 'dev', '--', '--host', '127.0.0.1', '--port', String(PORT)], {
    stdio: 'ignore',
    env: process.env,
    detached: true,
  })

  let browser
  try {
    await waitForServer()
    browser = await chromium.launch({ channel: 'chrome' })
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      locale: 'it-IT',
      colorScheme: 'light',
    })
    const page = await context.newPage()

    const shots = [
      ['printers', 'Stampanti'],
      ['materials', 'Materiali'],
      ['tariffs', 'Tariffe energia'],
      ['settings', 'Impostazioni'],
    ]

    for (const [file, heading] of shots) {
      await page.goto(`${BASE}/#/${file}`)
      await page.getByRole('heading', { name: heading, level: 1 }).waitFor()
      await page.evaluate(() =>
        document.activeElement instanceof HTMLElement ? document.activeElement.blur() : undefined,
      )
      await page.evaluate(() => document.fonts.ready)
      await page.screenshot({
        path: `${OUT}/${file}.jpg`,
        type: 'jpeg',
        quality: 85,
      })
    }

    await context.close()
    console.log('Screenshot documentazione generati in public/docs')
  } finally {
    await browser?.close()
    try {
      if (server.pid) process.kill(-server.pid, 'SIGTERM')
    } catch {
      server.kill('SIGTERM')
    }
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
