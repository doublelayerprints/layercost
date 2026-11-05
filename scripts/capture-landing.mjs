import { mkdirSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { chromium } from '@playwright/test'

const PORT = 5174
const BASE = `http://127.0.0.1:${PORT}`
const OUT = 'public/landing'

const LOCALES = [
  {
    id: 'it',
    out: OUT,
    og: 'public/og-image.jpg',
    ogHtmlLang: 'it',
    sample: 'Portachiavi a strati',
    ogTitle: 'Il costo vero<br />delle stampe 3D.',
    ogBody: 'Materiali, energia, usura e manodopera. Poi ricarico, sconti e IVA. Tutto nel browser.',
    label: {
      newQuote: 'Nuovo preventivo',
      onboarding: 'Ho capito, inizia',
      rename: 'Rinomina preventivo',
      quoteName: 'Nome preventivo',
      hours: 'Ore',
      grams: 'Grammi materiale 1',
      price: /3,70/,
      save: 'Salva preventivo',
      closeAlert: 'Chiudi avviso',
      share: 'Condividi',
      link: 'Link',
      shared: 'Preventivo condiviso',
      importDialog: 'Importa .3mf',
    },
  },
  {
    id: 'en',
    out: `${OUT}/en`,
    og: 'public/og-image-en.jpg',
    ogHtmlLang: 'en',
    sample: 'Layered keychain',
    ogTitle: 'The real cost<br />of 3D prints.',
    ogBody: 'Materials, energy, wear and labor. Then markup, discounts and VAT. All in the browser.',
    label: {
      newQuote: 'New quote',
      onboarding: 'Got it, start',
      rename: 'Rename quote',
      quoteName: 'Quote name',
      hours: 'Hours',
      grams: 'Material grams 1',
      price: /3\.70/,
      save: 'Save quote',
      closeAlert: 'Close alert',
      share: 'Share',
      link: 'Link',
      shared: 'Shared quote',
      importDialog: 'Import .3mf',
    },
  },
]

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

    // Filter by CLI: `node scripts/capture-landing.mjs en` regenerates a
    // single language without touching the other locales' artifacts.
    const list = process.argv.length > 2 ? LOCALES.filter((locale2) => process.argv.slice(2).includes(locale2.id)) : LOCALES
    for (const locale of list) {
      mkdirSync(locale.out, { recursive: true })
      const context = await browser.newContext({
        viewport: { width: 1440, height: 1000 },
        locale: locale.id === 'it' ? 'it-IT' : 'en-GB',
        colorScheme: 'light',
      })
      // The UI language is a saved preference, not the browser language: seed
      // it before the app boots so every screenshot is in the capture locale.
      await context.addInitScript((value) => {
        localStorage.setItem('layercost:locale', value)
      }, locale.id)
      const page = await context.newPage()
      const label = locale.label

      await page.goto(`${BASE}/#/calculator`)
      await page.getByRole('heading', { name: label.newQuote }).first().waitFor()
      const start = page.getByRole('button', { name: label.onboarding })
      if (await start.isVisible().catch(() => false)) await start.click()

      await page.getByRole('button', { name: label.rename }).click()
      await page.getByLabel(label.quoteName).fill(locale.sample)
      await page.keyboard.press('Enter')
      await page.locator(`input[aria-label="${label.hours}"]`).first().fill('10')
      await page.locator(`input[aria-label="${label.grams}"]`).fill('100')
      await page.getByText(label.price).first().waitFor({ timeout: 10_000 })
      await page.evaluate(() => (document.activeElement instanceof HTMLElement ? document.activeElement : null)?.blur())
      await page.evaluate(() => document.fonts.ready)
      await page.screenshot({
        path: `${locale.out}/calculator.jpg`,
        type: 'jpeg',
        quality: 88,
      })

      await page.getByRole('button', { name: label.save }).click()
      await page.waitForURL(/#\/quotes\/.+/)
      const closeAlert = page.getByRole('button', { name: label.closeAlert })
      if (await closeAlert.isVisible().catch(() => false)) await closeAlert.click()
      await page.evaluate(() => (document.activeElement instanceof HTMLElement ? document.activeElement : null)?.blur())
      await page.evaluate(() => document.fonts.ready)
      await page.screenshot({
        path: `${locale.out}/quote-detail.jpg`,
        type: 'jpeg',
        quality: 88,
      })

      await page.getByRole('button', { name: label.share }).first().click()
      const shareUrl = await page.getByLabel(label.link).inputValue()
      await page.goto(shareUrl)
      await page.getByText(label.shared).first().waitFor()
      await page.evaluate(() => (document.activeElement instanceof HTMLElement ? document.activeElement : null)?.blur())
      await page.evaluate(() => document.fonts.ready)
      await page.screenshot({
        path: `${locale.out}/share.jpg`,
        type: 'jpeg',
        quality: 88,
      })

      await page.goto(`${BASE}/#/calculator`)
      await page.getByRole('heading', { name: label.newQuote }).first().waitFor()
      await page.locator('input[type="file"]').first().setInputFiles(
        'tests/fixtures/3mf/anycubic-kobra3-pla.gcode.3mf',
      )
      await page.getByRole('dialog', { name: label.importDialog }).waitFor()
      await page.evaluate(() => (document.activeElement instanceof HTMLElement ? document.activeElement : null)?.blur())
      await page.evaluate(() => document.fonts.ready)
      await page.screenshot({
        path: `${locale.out}/import.jpg`,
        type: 'jpeg',
        quality: 88,
      })

      await context.close()

      const social = await browser.newContext({
        viewport: { width: 1200, height: 630 },
        locale: locale.id === 'it' ? 'it-IT' : 'en-GB',
        colorScheme: 'light',
      })
      const socialPage = await social.newPage()
      const shot = `${locale.out}/calculator.jpg`
      await socialPage.setContent(`<!doctype html>
      <html lang="${locale.ogHtmlLang}">
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
              <h1>${locale.ogTitle}</h1>
              <p>${locale.ogBody}</p>
            </div>
            <p class="url">layercost.vercel.app</p>
          </div>
          <div class="shot"><img src="${shot.replace('public/', `${BASE}/`)}" alt="" /></div>
        </body>
      </html>`)
      await socialPage.evaluate(() => document.fonts.ready)
      await socialPage.evaluate(() =>
        Promise.all([...document.images].map((image) => image.decode().catch(() => undefined))),
      )
      await socialPage.screenshot({
        path: locale.og,
        type: 'jpeg',
        quality: 88,
      })
      await social.close()

      console.log(`Screenshot landing ${locale.id} generati in ${locale.out} e ${locale.og}`)
    }
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
