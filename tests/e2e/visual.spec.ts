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

async function seedQuote(page: Page) {
  await page.goto('/')
  await page.locator('input[aria-label="Ore"]').first().fill('10')
  await page.locator('input[aria-label="Grammi materiale 1"]').fill('100')
  await page.getByRole('button', { name: 'Salva preventivo' }).click()
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
  // Native date inputs follow the OS locale; mask them so baselines are locale-independent.
  const dateInputs = page.locator('input[type="date"]')
  const mask = (await dateInputs.count()) > 0 ? [dateInputs] : []
  await expect(page).toHaveScreenshot(name, {
    animations: 'disabled',
    mask,
    maskColor: '#f4f3f1',
  })
}

for (const viewport of viewports) {
  test(`regressione visiva a ${viewport.width} px`, async ({ page }) => {
    await page.clock.setFixedTime(FIXED_TIME)
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    await page.goto('/')
    const quotePath = await seedQuote(page)

    await page.goto('/')
    await screenshot(page, `${viewport.name}-calcolatore.png`)

    await page.goto(quotePath)
    await screenshot(page, `${viewport.name}-dettaglio.png`)

    await page.goto('/#/quotes')
    await screenshot(page, `${viewport.name}-preventivi.png`)

    await page.goto('/#/materials')
    await screenshot(page, `${viewport.name}-materiali.png`)

    await page.goto('/#/settings')
    await screenshot(page, `${viewport.name}-impostazioni.png`)
  })
}
