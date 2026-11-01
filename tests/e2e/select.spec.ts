import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

test.use({ colorScheme: 'light' })

async function openFixedCosts(page: import('@playwright/test').Page) {
  const combobox = page.getByRole('combobox', { name: 'Ripartizione costi fissi' })
  await combobox.click()
  const listbox = page.getByRole('listbox')
  await expect(listbox).toBeVisible()
  return { combobox, listbox }
}

test('il menu della select si apre e si naviga da tastiera', async ({ page }) => {
  await page.goto('/#/settings')
  const combobox = page.getByRole('combobox', { name: 'Ripartizione costi fissi' })
  await expect(combobox).toContainText('Proporzionale al costo')

  await combobox.focus()
  await page.keyboard.press('ArrowDown')
  await expect(combobox).toHaveAttribute('aria-expanded', 'true')
  const listbox = page.getByRole('listbox')
  await expect(listbox).toBeVisible()
  await expect(listbox.getByRole('option', { name: 'Proporzionale al costo' })).toHaveAttribute(
    'aria-selected',
    'true',
  )

  await page.keyboard.press('End')
  const activeId = await combobox.getAttribute('aria-activedescendant')
  expect(activeId).toBeTruthy()
  await expect(page.locator(`[id="${activeId}"]`)).toHaveText('Uguale per pezzo')

  await page.keyboard.press('Enter')
  await expect(combobox).toContainText('Uguale per pezzo')
  await expect(combobox).toHaveAttribute('aria-expanded', 'false')
  await expect(page.getByRole('listbox')).toHaveCount(0)
})

test('Escape e il click fuori chiudono il menu senza cambiare valore', async ({ page }) => {
  await page.goto('/#/settings')
  const combobox = page.getByRole('combobox', { name: 'Ripartizione costi fissi' })

  await openFixedCosts(page)
  await expect(combobox).toContainText('Proporzionale al costo')
  await page.keyboard.press('Escape')
  await expect(combobox).toHaveAttribute('aria-expanded', 'false')
  await expect(page.getByRole('listbox')).toHaveCount(0)
  await expect(combobox).toContainText('Proporzionale al costo')

  await openFixedCosts(page)
  await page.getByRole('heading', { name: 'Impostazioni' }).click()
  await expect(page.getByRole('listbox')).toHaveCount(0)
  await expect(combobox).toContainText('Proporzionale al costo')
})

test('il type-ahead seleziona l’opzione cercata', async ({ page }) => {
  await page.goto('/#/settings')
  const combobox = page.getByRole('combobox', { name: 'Ripartizione costi fissi' })

  await combobox.focus()
  await page.keyboard.press('u')
  await expect(combobox).toHaveAttribute('aria-expanded', 'true')
  const activeId = await combobox.getAttribute('aria-activedescendant')
  expect(activeId).toBeTruthy()
  await expect(page.locator(`[id="${activeId}"]`)).toHaveText('Uguale per pezzo')
  await page.keyboard.press('Enter')
  await expect(combobox).toContainText('Uguale per pezzo')
})

test('Escape chiude il menu dentro il modale senza chiudere il modale', async ({ page }) => {
  await page.goto('/#/calculator')
  await page
    .locator('input[type="file"]')
    .setInputFiles('tests/fixtures/3mf/anycubic-kobra3-pla.gcode.3mf')
  const dialog = page.getByRole('dialog', { name: 'Importa .3mf' })
  await expect(dialog).toBeVisible()

  const printer = dialog.getByLabel('Stampante')
  await printer.click()
  await expect(page.getByRole('listbox')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('listbox')).toHaveCount(0)
  await expect(dialog).toBeVisible()
  await expect(printer).toHaveAttribute('aria-expanded', 'false')
})

test('il menu aperto non ha violazioni axe', async ({ page }) => {
  await page.goto('/#/settings')
  await openFixedCosts(page)

  const results = await new AxeBuilder({ page })
    .include('[role="listbox"]')
    .withTags(WCAG_TAGS)
    .analyze()
  expect(results.violations).toEqual([])
})
