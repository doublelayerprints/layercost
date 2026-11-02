import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

test('la lista stampanti è una tabella compatta con dettagli espandibili', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/#/printers')

  await expect(page.getByRole('heading', { name: 'Stampanti', level: 1 })).toBeVisible()
  await expect(page.getByText('29 modelli pronti all’uso')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Sfoglia il catalogo' })).toBeVisible()

  const table = page.getByRole('table', { name: 'Elenco stampanti' })
  await expect(table).toBeVisible()
  await expect(table.getByRole('columnheader', { name: 'Usura/h' })).toBeVisible()
  await expect(page.getByRole('rowheader', { name: /Kobra 3/ })).toBeVisible()
  await expect(page.getByRole('rowheader', { name: /Kobra X/ })).toBeVisible()

  const details = table.getByText('Valore residuo').first()
  const toggle = page.getByRole('button', { name: 'Dettagli Kobra 3' })
  await expect(details).not.toBeVisible()
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')
  await expect(details).toBeVisible()

  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await expect(details).not.toBeVisible()
})

test('la lista stampanti è una card compatta e accessibile a 375 px', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 844 })
  await page.goto('/#/printers')

  await expect(page.getByRole('heading', { name: 'Kobra 3', level: 2 })).toBeVisible()
  await expect(page.getByRole('table', { name: 'Elenco stampanti' })).not.toBeVisible()

  const card = page
    .getByRole('heading', { name: 'Kobra 3', level: 2 })
    .locator('xpath=ancestor::li[1]')
  await expect(card.getByText('Usura/h', { exact: true })).toBeVisible()
  await expect(card.getByText('Prezzo', { exact: true })).toBeVisible()
  await expect(card.getByText(/250×250×260 mm/)).toBeVisible()

  await card.getByRole('button', { name: 'Dettagli Kobra 3' }).click()
  await expect(card.getByText('Valore residuo')).toBeVisible()
  await expect(card.getByRole('button', { name: 'Modifica' })).toBeVisible()

  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()
  const violations = results.violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    help: violation.help,
    nodes: violation.nodes.map((node) => node.target.join(' ')),
  }))
  expect(violations, JSON.stringify(violations, null, 2)).toEqual([])

  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375)
})
