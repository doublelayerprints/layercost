import { mkdirSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { chromium } from '@playwright/test'

const PORT = 5174
const BASE = `http://127.0.0.1:${PORT}`
const OUT = 'public/landing'

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
  const server = spawn(
    'npm',
    ['run', 'dev', '--', '--host', '127.0.0.1', '--port', String(PORT)],
    { stdio: 'ignore', env: process.env, detached: true },
  )

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

    await page.goto(`${BASE}/#/calculator`)
    await page.getByRole('heading', { name: 'Nuovo preventivo' }).first().waitFor()
    const start = page.getByRole('button', { name: 'Ho capito, inizia' })
    if (await start.isVisible().catch(() => false)) await start.click()

    await page.getByRole('button', { name: 'Rinomina preventivo' }).click()
    await page.getByLabel('Nome preventivo').fill('Portachiavi a strati')
    await page.keyboard.press('Enter')
    await page.locator('input[aria-label="Ore"]').first().fill('10')
    await page.locator('input[aria-label="Grammi materiale 1"]').fill('100')
    await page.getByText(/3,70/).first().waitFor({ timeout: 10_000 })
    await page.evaluate(() => (document.activeElement instanceof HTMLElement ? document.activeElement : null)?.blur())
    await page.evaluate(() => document.fonts.ready)
    await page.screenshot({
      path: `${OUT}/calculator.jpg`,
      type: 'jpeg',
      quality: 88,
    })

    await page.getByRole('button', { name: 'Salva preventivo' }).click()
    await page.waitForURL(/#\/quotes\/.+/)
    const closeAlert = page.getByRole('button', { name: 'Chiudi avviso' })
    if (await closeAlert.isVisible().catch(() => false)) await closeAlert.click()
    await page.evaluate(() => (document.activeElement instanceof HTMLElement ? document.activeElement : null)?.blur())
    await page.evaluate(() => document.fonts.ready)
    await page.screenshot({
      path: `${OUT}/quote-detail.jpg`,
      type: 'jpeg',
      quality: 88,
    })

    await page.getByRole('button', { name: 'Condividi' }).first().click()
    const shareUrl = await page.getByLabel('Link').inputValue()
    await page.goto(shareUrl)
    await page.getByText('Preventivo condiviso').first().waitFor()
    await page.evaluate(() => (document.activeElement instanceof HTMLElement ? document.activeElement : null)?.blur())
    await page.evaluate(() => document.fonts.ready)
    await page.screenshot({
      path: `${OUT}/share.jpg`,
      type: 'jpeg',
      quality: 88,
    })

    await page.goto(`${BASE}/#/calculator`)
    await page.getByRole('heading', { name: 'Nuovo preventivo' }).first().waitFor()
    await page.locator('input[type="file"]').first().setInputFiles(
      'tests/fixtures/3mf/anycubic-kobra3-pla.gcode.3mf',
    )
    await page.getByRole('dialog', { name: 'Importa .3mf' }).waitFor()
    await page.evaluate(() => (document.activeElement instanceof HTMLElement ? document.activeElement : null)?.blur())
    await page.evaluate(() => document.fonts.ready)
    await page.screenshot({
      path: `${OUT}/import.jpg`,
      type: 'jpeg',
      quality: 88,
    })

    await context.close()

    const social = await browser.newContext({
      viewport: { width: 1200, height: 630 },
      locale: 'it-IT',
      colorScheme: 'light',
    })
    const socialPage = await social.newPage()
    await socialPage.setContent(`<!doctype html>
      <html lang="it">
        <head>
          <meta charset="utf-8" />
          <style>
            @font-face {
              font-family: 'Archivo';
              src: url('${BASE}/src/assets/fonts/archivo-latin-var.woff2') format('woff2');
              font-weight: 400 600;
              font-style: normal;
              font-display: block;
            }
            * { box-sizing: border-box; }
            html, body { margin: 0; width: 1200px; height: 630px; overflow: hidden; }
            body {
              display: grid;
              grid-template-columns: 560px 640px;
              background: #f4f3f1;
              color: #0a0a0a;
              font-family: 'Archivo', ui-sans-serif, system-ui, sans-serif;
            }
            .copy {
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              padding: 48px 40px 44px 48px;
            }
            .brand { display: flex; align-items: center; gap: 12px; font-size: 21px; font-weight: 600; letter-spacing: -0.02em; }
            .brand svg { width: 30px; height: 30px; }
            h1 { margin: 0; font-size: 52px; line-height: 0.98; letter-spacing: -0.045em; font-weight: 600; }
            p { margin: 20px 0 0; max-width: 420px; font-size: 19px; line-height: 1.45; color: #6b6b6b; }
            .url { margin: 0; font-size: 16px; color: #6b6b6b; letter-spacing: 0.01em; }
            .shot { display: flex; align-items: center; padding: 48px 0 48px 0; }
            .shot img { display: block; width: 620px; height: auto; border-radius: 8px; box-shadow: 0 24px 64px rgb(10 10 10 / 0.14); }
          </style>
        </head>
        <body>
          <div class="copy">
            <div class="brand">
              <svg viewBox="0 0 32 32" aria-hidden="true" fill="currentColor"><rect x="2" y="5" width="20" height="6" rx="2"></rect><rect x="6" y="13" width="20" height="6" rx="2"></rect><rect x="10" y="21" width="20" height="6" rx="2"></rect></svg>
              LayerCost
            </div>
            <div>
              <h1>Il costo vero<br />delle stampe 3D.</h1>
              <p>Materiali, energia, usura e manodopera. Poi ricarico, sconti e IVA. Tutto nel browser.</p>
            </div>
            <p class="url">layercost.vercel.app</p>
          </div>
          <div class="shot"><img src="${BASE}/landing/calculator.jpg" alt="" /></div>
        </body>
      </html>`)
    await socialPage.evaluate(() => document.fonts.ready)
    await socialPage.evaluate(() =>
      Promise.all([...document.images].map((image) => image.decode().catch(() => undefined))),
    )
    await socialPage.screenshot({
      path: 'public/og-image.jpg',
      type: 'jpeg',
      quality: 88,
    })
    await social.close()

    console.log('Screenshot landing generati in public/landing e public/og-image.jpg')
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
