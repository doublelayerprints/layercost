import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

test.use({ colorScheme: 'light' })

async function audit(page: Page, label: string) {
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()
  const violations = results.violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    help: violation.help,
    nodes: violation.nodes.map((node) => node.target.join(' ')),
  }))
  expect(
    violations,
    `${label}: ${violations.length} violazioni WCAG\n${JSON.stringify(violations, null, 2)}`,
  ).toEqual([])
}

async function openLanding(page: Page) {
  await page.goto('/')
  await expect(
    page.getByRole('heading', { level: 1, name: 'Il costo vero delle stampe 3D.' }),
  ).toBeVisible()
}

async function emulateColorScheme(page: Page, scheme: 'light' | 'dark') {
  await page.emulateMedia({ colorScheme: scheme })
  await expect(page.locator('html')).toHaveAttribute('data-theme', scheme)
}

test.beforeEach(async ({ page }) => {
  // The first navigation of each test starts as a brand-new visitor. Later
  // navigations keep what the test deliberately wrote.
  await page.addInitScript(() => {
    if (sessionStorage.getItem('landing-test-cleared')) return
    localStorage.clear()
    sessionStorage.setItem('landing-test-cleared', '1')
  })
})

test('la prima visita mostra la landing e non crea dati locali', async ({ page }) => {
  await page.goto('/')
  await expect(
    page.getByRole('heading', { level: 1, name: 'Il costo vero delle stampe 3D.' }),
  ).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Tutto quello che serve al prezzo.' }),
  ).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Tre passi, nessun foglio di calcolo.' }),
  ).toBeVisible()
  await expect(page.getByRole('heading', { name: 'I tuoi numeri restano tuoi.' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Domande prima di iniziare.' })).toBeVisible()
  await expect(page.locator('aside')).toHaveCount(0)
  await expect(page).toHaveTitle('LayerCost — Il costo vero delle stampe 3D')

  const stored = await page.evaluate(() => ({
    data: localStorage.getItem('layercost:data'),
    marker: localStorage.getItem('layercost:hasVisited'),
  }))
  expect(stored).toEqual({ data: null, marker: null })
})

test('la CTA apre il calcolatore e lascia il marker di visita', async ({ page }) => {
  await openLanding(page)
  await page.getByRole('link', { name: 'Apri il calcolatore' }).first().click()
  await page.waitForURL(/#\/calculator$/)
  await expect(page.getByRole('heading', { name: 'Nuovo preventivo' }).first()).toBeVisible()

  expect(await page.evaluate(() => localStorage.getItem('layercost:hasVisited'))).toBe('1')
})

test('un utente esistente viene riportato al calcolatore, /welcome resta la landing', async ({
  page,
}) => {
  await page.goto('/#/calculator')
  await expect(page.getByRole('heading', { name: 'Nuovo preventivo' }).first()).toBeVisible()

  await page.goto('/')
  await page.waitForURL(/#\/calculator$/)

  await page.goto('/#/welcome')
  await page.waitForURL(/#\/welcome$/)
  await expect(
    page.getByRole('heading', { level: 1, name: 'Il costo vero delle stampe 3D.' }),
  ).toBeVisible()
})

test('i dati locali bastano per saltare la landing', async ({ page }) => {
  await page.goto('/#/calculator')
  await page.locator('input[aria-label="Ore"]').first().fill('10')
  await page.locator('input[aria-label="Grammi materiale 1"]').fill('100')
  await expect(page.getByText(/3,70/).first()).toBeVisible({ timeout: 10_000 })
  await expect
    .poll(() => page.evaluate(() => Boolean(localStorage.getItem('layercost:data'))))
    .toBe(true)

  await page.goto('/')
  await page.waitForURL(/#\/calculator$/)
  await expect(page.getByRole('heading', { name: 'Nuovo preventivo' }).first()).toBeVisible()
})

test('la sidebar include la Panoramica e riapre la landing', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/#/calculator')
  await page.getByRole('link', { name: 'Panoramica' }).click()
  await page.waitForURL(/#\/welcome$/)
  await expect(
    page.getByRole('heading', { level: 1, name: 'Il costo vero delle stampe 3D.' }),
  ).toBeVisible()
})

test('login e richiesta accesso sono raggiungibili dalla landing', async ({ page }) => {
  await openLanding(page)

  await page.getByRole('link', { name: 'Accedi' }).first().click()
  await page.waitForURL(/#\/login$/)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

  await page.goto('/#/welcome')
  await page.getByRole('link', { name: 'Richiedi accesso' }).first().click()
  await expect(page.getByRole('heading', { name: 'Richiedi accesso' })).toBeVisible()
})

test('la lingua cambia, si persiste e aggiorna titolo e lang', async ({ page }) => {
  await openLanding(page)
  await page.getByRole('radio', { name: 'English' }).check()

  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(
    page.getByRole('heading', { level: 1, name: 'The real cost of 3D prints.' }),
  ).toBeVisible()
  await expect(page).toHaveTitle('LayerCost — The real cost of 3D prints')
  await expect(page.getByRole('heading', { name: 'Everything the price needs.' })).toBeVisible()

  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(
    page.getByRole('heading', { level: 1, name: 'The real cost of 3D prints.' }),
  ).toBeVisible()
  await expect(page.getByRole('radio', { name: 'English' })).toBeChecked()
  await expect(page.getByRole('radio', { name: 'Italiano' })).not.toBeChecked()
})

test('il tema si può cambiare dalla landing e persiste', async ({ page }) => {
  await openLanding(page)
  await page.getByRole('radio', { name: 'Scuro' }).check()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')

  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(page.getByRole('radio', { name: 'Scuro' })).toBeChecked()

  await page.getByRole('radio', { name: 'Chiaro' }).check()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
})

test('axe WCAG 2.2 AA a 375 e 1440 px in italiano e inglese', async ({ page }) => {
  // Below-the-fold sections use the progressive entrance. Audit the reduced
  // motion rendering so the contrast check reads the final, always-visible
  // content instead of elements waiting for their observer.
  await page.emulateMedia({ reducedMotion: 'reduce' })

  for (const locale of ['it', 'en']) {
    await page.setViewportSize({ width: 375, height: 844 })
    await page.goto('/')
    await page.evaluate((value) => localStorage.setItem('layercost:locale', value), locale)
    await page.reload()
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await audit(page, `${locale} · mobile chiaro`)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375)

    await emulateColorScheme(page, 'dark')
    await audit(page, `${locale} · mobile scuro`)

    await page.setViewportSize({ width: 1440, height: 900 })
    await audit(page, `${locale} · desktop scuro`)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      1440,
    )

    await emulateColorScheme(page, 'light')
    await audit(page, `${locale} · desktop chiaro`)
  }
})

test('la landing non chiama servizi esterni e non monta la sidebar', async ({ page }) => {
  const external: string[] = []
  page.on('request', (request) => {
    const url = new URL(request.url())
    if (url.protocol === 'data:' || url.protocol === 'blob:') return
    if (url.hostname !== '127.0.0.1') external.push(request.url())
  })

  await openLanding(page)
  await expect(page.locator('aside')).toHaveCount(0)
  expect(external).toEqual([])
})

test('la landing è pre-renderizzata in italiano nell’HTML iniziale', async ({ request }) => {
  const response = await request.get('/')
  const html = await response.text()
  expect(html).toContain('<h1')
  expect(html).toContain('Il costo vero delle stampe 3D.')
  expect(html).toContain('Tutto quello che serve al prezzo.')
  expect(html).toContain('rel="canonical" href="https://layercost.vercel.app/"')
  expect(html).toContain('property="og:title"')
  expect(html).not.toContain('content="noindex"')
  expect(html).toContain('href="#/calculator"')
})
