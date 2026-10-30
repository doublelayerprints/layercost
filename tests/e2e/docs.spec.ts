import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

async function audit(page: import('@playwright/test').Page) {
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()
  const violations = results.violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    help: violation.help,
    nodes: violation.nodes.map((node) => node.target.join(' ')),
  }))
  expect(violations, JSON.stringify(violations, null, 2)).toEqual([])
}

test.describe('documentazione', () => {
  test('apre la prima sezione dalla sidebar e naviga nell’indice', async ({ page }) => {
    await page.goto('/#/calculator')
    await page.getByRole('link', { name: 'Documentazione' }).first().click()

    await expect(page).toHaveURL(/#\/docs\/primi-passi$/)
    await expect(page.getByRole('heading', { name: 'Primi passi', level: 1 })).toBeVisible()
    const index = page.getByRole('navigation', { name: 'Sezioni della guida' }).first()
    await expect(index).toBeVisible()
    await expect(index.getByRole('link', { name: 'Primi passi', exact: true })).toHaveAttribute(
      'aria-current',
      'page',
    )

    await index.getByRole('link', { name: 'Materiali', exact: true }).click()
    await expect(page).toHaveURL(/#\/docs\/materiali$/)
    await expect(
      page.getByRole('heading', { name: 'Configurare i materiali', level: 1 }),
    ).toBeFocused()
    await expect(page.getByText('Usa il totale dello slicer')).toBeVisible()

    await page.getByRole('link', { name: 'Successiva' }).click()
    await expect(page).toHaveURL(/#\/docs\/tariffe-extra$/)
    await expect(
      page.getByRole('heading', { name: 'Tariffe energia ed extra', level: 1 }),
    ).toBeVisible()

    await page.getByRole('link', { name: 'Precedente' }).click()
    await expect(page).toHaveURL(/#\/docs\/materiali$/)
  })

  test('apre una sezione profonda e carica gli screenshot', async ({ page }) => {
    await page.goto('/#/docs/import-3mf')
    await expect(
      page.getByRole('heading', { name: 'Importare un file .3mf', level: 1 }),
    ).toBeVisible()
    await expect(
      page
        .getByRole('navigation', { name: 'Sezioni della guida' })
        .first()
        .getByRole('link', { name: 'Import .3mf' }),
    ).toHaveAttribute('aria-current', 'page')

    const image = page.getByRole('img', { name: /Dialogo di importazione/ })
    await expect(image).toBeVisible()
    await expect
      .poll(() => image.evaluate((element) => (element as HTMLImageElement).naturalWidth))
      .toBeGreaterThan(0)
  })

  test('reindirizza una sezione sconosciuta alla prima', async ({ page }) => {
    await page.goto('/#/docs/non-esiste')
    await expect(page).toHaveURL(/#\/docs\/primi-passi$/)
    await expect(page.getByRole('heading', { name: 'Primi passi', level: 1 })).toBeVisible()
  })

  test('è leggibile e navigabile a 375 px senza overflow', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 844 })
    await page.goto('/#/docs/calcolare')
    await expect(
      page.getByRole('heading', { name: 'Calcolare una stampa', level: 1 }),
    ).toBeVisible()
    const index = page.getByRole('navigation', { name: 'Sezioni della guida' }).first()
    await expect(index).toBeVisible()

    await index.getByRole('link', { name: 'Preventivi', exact: true }).click()
    await expect(page).toHaveURL(/#\/docs\/preventivi$/)
    await expect(
      page.getByRole('heading', { name: 'Preventivi, stampa e condivisione', level: 1 }),
    ).toBeVisible()

    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375)
    await audit(page)
  })

  test('mostra la guida in inglese quando la lingua è inglese', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('layercost:locale', 'en'))
    await page.goto('/#/docs/stampanti')
    await expect(
      page.getByRole('heading', { name: 'Configuring printers', level: 1 }),
    ).toBeVisible()
    await expect(
      page
        .getByRole('navigation', { name: 'Guide sections' })
        .first()
        .getByRole('link', { name: 'Printers', exact: true }),
    ).toHaveAttribute('aria-current', 'page')
    await expect(page.getByRole('link', { name: 'Next' })).toBeVisible()
  })
})
