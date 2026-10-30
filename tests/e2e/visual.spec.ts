import { expect, test, type Page } from '@playwright/test'

// Baselines are generated on Linux in CI (see .github/workflows/visual-baselines.yml).
// Pixel rendering differs on macOS, so local runs skip this suite.
test.skip(!process.env.CI, 'Baseline visuali generate su Linux in CI')

const FIXED_TIME = new Date('2026-10-24T10:00:00Z')

const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 390, height: 844 },
]

async function seedQuote(page: Page, english = false) {
  await page.goto('/#/calculator')
  await page
    .locator(`input[aria-label="${english ? 'Hours' : 'Ore'}"]`)
    .first()
    .fill('10')
  await page
    .locator(`input[aria-label="${english ? 'Material grams 1' : 'Grammi materiale 1'}"]`)
    .fill('100')
  await page
    .getByRole('button', { name: english ? 'Save quote' : 'Salva preventivo' })
    .click()
  await page.waitForURL(/#\/quotes\//)
  await page.reload()
  await page.evaluate(() => document.fonts.ready)
  const hash = new URL(page.url()).hash
  return `/${hash}`
}

async function screenshot(page: Page, name: string) {
  await page.evaluate(() => document.fonts.ready)
  await page.mouse.move(0, 0)
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
  // Native date inputs follow the OS locale; hide their text so baselines stay locale-independent.
  await page.addStyleTag({ content: 'input[type="date"] { color: transparent !important; }' })
  await expect(page).toHaveScreenshot(name, { animations: 'disabled' })
}

async function screenshotLanding(page: Page, name: string) {
  await page.evaluate(() => {
    for (const element of document.querySelectorAll<HTMLElement>('[data-reveal]')) {
      element.setAttribute('data-reveal', 'in')
    }
    for (const image of document.images) image.loading = 'eager'
  })
  await page.evaluate(() => document.fonts.ready)
  await page.evaluate(async () => {
    const pending = [...document.images].map((image) => {
      if (image.complete && image.naturalWidth > 0) return Promise.resolve()
      return new Promise<void>((resolve) => {
        image.addEventListener('load', () => resolve(), { once: true })
        image.addEventListener('error', () => resolve(), { once: true })
      })
    })
    await Promise.race([
      Promise.all(pending),
      new Promise<void>((resolve) => setTimeout(resolve, 5000)),
    ])
  })
  await page.mouse.move(0, 0)
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
  await expect(page).toHaveScreenshot(name, { animations: 'disabled' })
}

for (const viewport of viewports) {
  test(`regressione visiva a ${viewport.width} px`, async ({ page }) => {
    await page.clock.setFixedTime(FIXED_TIME)
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    await page.goto('/#/calculator')
    const quotePath = await seedQuote(page)

    await page.goto('/#/calculator')
    await screenshot(page, `${viewport.name}-calcolatore.png`)

    await page
      .locator('input[type="file"]')
      .setInputFiles('tests/fixtures/3mf/anycubic-kobra3-pla.gcode.3mf')
    await expect(page.getByRole('dialog', { name: 'Importa .3mf' })).toBeVisible()
    await screenshot(page, `${viewport.name}-import-3mf.png`)
    await page.keyboard.press('Escape')

    await page.goto(quotePath)
    await screenshot(page, `${viewport.name}-dettaglio.png`)

    await page.goto('/#/quotes')
    await screenshot(page, `${viewport.name}-preventivi.png`)

    await page.goto('/#/materials')
    await screenshot(page, `${viewport.name}-materiali.png`)

    await page.goto('/#/settings')
    await screenshot(page, `${viewport.name}-impostazioni.png`)
  })

  test(`regressione visiva inglese a ${viewport.width} px`, async ({ page }) => {
    await page.clock.setFixedTime(FIXED_TIME)
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    await page.addInitScript(() => localStorage.setItem('layercost:locale', 'en'))
    await page.goto('/#/calculator')
    const quotePath = await seedQuote(page, true)

    await page.goto('/#/calculator')
    await screenshot(page, `en-${viewport.name}-calcolatore.png`)

    await page
      .locator('input[type="file"]')
      .setInputFiles('tests/fixtures/3mf/anycubic-kobra3-pla.gcode.3mf')
    await expect(page.getByRole('dialog', { name: 'Import .3mf' })).toBeVisible()
    await screenshot(page, `en-${viewport.name}-import-3mf.png`)
    await page.keyboard.press('Escape')

    await page.goto(quotePath)
    await screenshot(page, `en-${viewport.name}-dettaglio.png`)

    await page.goto('/#/quotes')
    await screenshot(page, `en-${viewport.name}-preventivi.png`)

    await page.goto('/#/materials')
    await screenshot(page, `en-${viewport.name}-materiali.png`)

    await page.goto('/#/settings')
    await screenshot(page, `en-${viewport.name}-impostazioni.png`)
  })

  test(`landing a ${viewport.width} px`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    await page.addInitScript(() => {
      localStorage.clear()
      localStorage.setItem('layercost:locale', 'it')
    })
    await page.goto('/')
    await expect(
      page.getByRole('heading', { level: 1, name: 'Il costo vero delle stampe 3D.' }),
    ).toBeVisible()
    await screenshotLanding(page, `landing-${viewport.name}.png`)
  })

  test(`landing inglese a ${viewport.width} px`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    await page.addInitScript(() => {
      localStorage.clear()
      localStorage.setItem('layercost:locale', 'en')
    })
    await page.goto('/')
    await expect(
      page.getByRole('heading', { level: 1, name: 'The real cost of 3D prints.' }),
    ).toBeVisible()
    await screenshotLanding(page, `landing-en-${viewport.name}.png`)
  })
}
