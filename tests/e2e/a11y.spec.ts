import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

async function seedQuote(page: Page) {
  await page.goto('/')
  await page.locator('input[aria-label="Ore"]').first().fill('10')
  await page.locator('input[aria-label="Grammi materiale 1"]').fill('100')
  await page.getByRole('button', { name: 'Salva preventivo' }).click()
  await page.waitForURL(/#\/quotes\//)
  const hash = new URL(page.url()).hash
  return `/${hash}`
}

async function audit(page: Page, label: string) {
  await page.locator('main').waitFor()
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

async function auditRoutes(page: Page, quotePath: string, label: string) {
  const routes = [
    ['calcolatore', '/#/'],
    ['preventivi', '/#/quotes'],
    ['dettaglio', quotePath],
    ['condivisione non valida', '/#/share'],
    ['stampanti', '/#/printers'],
    ['materiali', '/#/materials'],
    ['tariffe', '/#/tariffs'],
    ['extra', '/#/extras'],
    ['impostazioni', '/#/settings'],
    ['confronto', '/#/compare'],
    ['pagina non trovata', '/#/nope'],
  ] as const

  for (const [name, path] of routes) {
    await page.goto(path)
    await audit(page, `${label} · ${name}`)
  }
}

test.describe('accessibilità WCAG 2.2 AA', () => {
  test.describe('desktop, tema chiaro', () => {
    test.use({ colorScheme: 'light', viewport: { width: 1440, height: 900 } })

    test('tutte le schermate passano axe', async ({ page }) => {
      const quotePath = await seedQuote(page)
      await auditRoutes(page, quotePath, 'desktop chiaro')
    })
  })

  test.describe('mobile, tema scuro', () => {
    test.use({ colorScheme: 'dark', viewport: { width: 390, height: 844 } })

    test('tutte le schermate passano axe, menu e modali inclusi', async ({ page }) => {
      const quotePath = await seedQuote(page)
      await auditRoutes(page, quotePath, 'mobile scuro')

      await page.goto('/')
      await page.getByRole('button', { name: 'Menu' }).click()
      await expect(page.locator('#mobile-navigation')).toBeVisible()
      await audit(page, 'mobile scuro · menu aperto')
      await page.getByRole('button', { name: 'Chiudi' }).click()

      await page.locator('input[aria-label="Grammi materiale 1"]').fill('50')
      await page.getByRole('button', { name: 'Nuovo', exact: true }).click()
      await expect(
        page.getByRole('dialog', { name: 'Iniziare un nuovo preventivo?' }),
      ).toBeVisible()
      await audit(page, 'mobile scuro · modale bozza')
      await page.keyboard.press('Escape')

      await page.goto('/#/settings')
      await page.getByRole('button', { name: 'Ripristina dati iniziali' }).click()
      await expect(
        page.getByRole('dialog', { name: 'Ripristinare i dati iniziali?' }),
      ).toBeVisible()
      await audit(page, 'mobile scuro · modale reset')
    })
  })
})
