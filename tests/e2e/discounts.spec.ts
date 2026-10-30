import { expect, test } from '@playwright/test'

test('applica sconti di riga e di preventivo e li conserva', async ({ page }) => {
  await page.goto('/#/calculator')
  await page.locator('input[aria-label="Ore"]').first().fill('10')
  await page.locator('input[aria-label="Grammi materiale 1"]').fill('100')
  await expect(page.getByText(/3,70/).first()).toBeVisible({ timeout: 10_000 })

  await page.getByLabel('Sconto sulla stampa').selectOption('amount')
  await page.getByLabel('Valore sconto').first().fill('1')
  await expect(page.getByText('Sconto applicato: 1,00 €').first()).toBeVisible()
  await expect(page.getByText(/2,70/).first()).toBeVisible()

  await page.getByLabel('Sconto sul preventivo').selectOption('percent')
  await page.getByLabel('Valore sconto').nth(1).fill('10')
  await expect(page.getByText(/2,40/).first()).toBeVisible()
  await expect(page.getByText('Sconti').first()).toBeVisible()

  await page.getByRole('button', { name: 'Salva preventivo' }).click()
  await page.waitForURL(/#\/quotes\//)
  await page.reload()
  await expect(page.getByText(/2,40/).first()).toBeVisible()
  await expect(page.getByText(/Sconto/).first()).toBeVisible()
})

test('limita a zero uno sconto di riga superiore al prezzo', async ({ page }) => {
  await page.goto('/#/calculator')
  await page.locator('input[aria-label="Ore"]').first().fill('10')
  await page.locator('input[aria-label="Grammi materiale 1"]').fill('100')
  await expect(page.getByText(/3,70/).first()).toBeVisible({ timeout: 10_000 })

  await page.getByLabel('Sconto sulla stampa').selectOption('amount')
  await page.getByLabel('Valore sconto').first().fill('100')

  await expect(page.getByText(/L’importo supera il prezzo della riga/).first()).toBeVisible()
  await expect(page.locator('aside').getByText('0,00 €', { exact: true }).first()).toBeVisible()
})
