import { expect, test } from '@playwright/test'

test('cerca, filtra e aggiunge stampanti dal catalogo', async ({ page }) => {
  await page.goto('/#/printers')
  await page.getByRole('link', { name: 'Catalogo stampanti' }).click()

  await expect(page).toHaveURL(/#\/printers\/catalog$/)
  await expect(page.getByRole('heading', { name: 'Catalogo stampanti', level: 1 })).toBeVisible()
  await expect(page.getByText('29 modelli')).toBeVisible()

  await page.getByRole('combobox', { name: 'Marca' }).click()
  await page.getByRole('option', { name: 'Bambu Lab', exact: true }).click()
  await expect(page.getByText('11 modelli')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'A1 mini', level: 2 })).toBeVisible()

  await page.getByRole('searchbox', { name: 'Cerca' }).fill('ender')
  await expect(page.getByText('0 modelli')).toBeVisible()
  await expect(page.getByText('Nessun modello trovato')).toBeVisible()
  await page.getByRole('button', { name: 'Azzera filtri' }).first().click()
  await expect(page.getByText('29 modelli')).toBeVisible()

  await page.getByRole('searchbox', { name: 'Cerca' }).fill('ender 3 v3')
  await expect(page.getByText('1 modello')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Ender-3 V3 KE', level: 2 })).toBeVisible()

  await page.getByRole('searchbox', { name: 'Cerca' }).fill('a1 mini')
  await page.getByRole('button', { name: 'Aggiungi A1 mini' }).click()
  await expect(page.getByText('A1 mini aggiunta')).toBeVisible()
  await expect(page.getByText('Già presente')).toBeVisible()

  await page.getByRole('button', { name: 'Aggiungi un’altra A1 mini' }).click()
  await page.getByRole('link', { name: 'Vai alle stampanti' }).click()

  await expect(page).toHaveURL(/#\/printers$/)
  await expect(page.getByRole('heading', { name: 'A1 mini', level: 2 })).toHaveCount(2)
  await expect(page.getByText(/179,00/)).toHaveCount(2)

  await page.reload()
  await expect(page.getByRole('heading', { name: 'A1 mini', level: 2 })).toHaveCount(2)
  await expect(page.getByText('Base price without AMS Lite')).toHaveCount(0)
  await expect(page.getByText(/Prezzo base senza AMS Lite/)).toHaveCount(2)
})

test('il catalogo è usabile a 375 px e mostra i dettagli', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 844 })
  await page.goto('/#/printers/catalog')
  await expect(page.getByRole('heading', { name: 'Catalogo stampanti', level: 1 })).toBeVisible()

  const card = page
    .getByRole('heading', { name: 'A1 mini', level: 2 })
    .locator('xpath=ancestor::li[1]')
  await card.getByText('Dettagli, potenze e fonte').click()
  await expect(card.getByText('PLA stimato')).toBeVisible()
  await expect(card.getByText(/specifiche ufficiali del produttore/)).toBeVisible()
  await expect(card.getByText(/rilevato il 02\/11\/2026/)).toBeVisible()

  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375)
})

test('il catalogo segue la lingua inglese', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('layercost:locale', 'en'))
  await page.goto('/#/printers/catalog')

  await expect(page.getByRole('heading', { name: 'Printer catalog', level: 1 })).toBeVisible()
  await expect(page.getByText('29 models')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Back to printers' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Add A1 mini' })).toBeVisible()
})
