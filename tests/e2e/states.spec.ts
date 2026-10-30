import { expect, test } from '@playwright/test'

test.use({ colorScheme: 'light' })

test('la bozza chiede conferma prima di essere sostituita', async ({ page }) => {
  await page.goto('/#/calculator')

  const grams = page.locator('input[aria-label="Grammi materiale 1"]')
  await grams.fill('100')
  await expect(grams).toHaveValue('100')

  await page.getByRole('button', { name: 'Nuovo', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Iniziare un nuovo preventivo?' })
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText('non è ancora nello storico')

  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Nuovo', exact: true })).toBeFocused()

  await page.getByRole('button', { name: 'Nuovo', exact: true }).click()
  await dialog.getByRole('button', { name: 'Continua a modificare' }).click()
  await expect(dialog).toHaveCount(0)
  await expect(grams).toHaveValue('100')

  await page.getByRole('button', { name: 'Nuovo', exact: true }).click()
  await page.getByRole('button', { name: 'Scarta la bozza' }).click()
  await expect(page.getByRole('heading', { name: 'Nuovo preventivo' }).first()).toBeVisible()
  await expect(grams).toHaveValue('0')
})

test('il titolo del preventivo si rinomina in alto', async ({ page }) => {
  await page.goto('/#/calculator')

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Nuovo preventivo')

  await page.getByRole('button', { name: 'Rinomina preventivo' }).click()
  const name = page.getByRole('textbox', { name: 'Nome preventivo' })
  await expect(name).toBeVisible()
  await expect(name).toBeFocused()
  await name.fill('Titolo modificabile')
  await page.keyboard.press('Enter')

  await expect(page.getByRole('heading', { level: 1, name: 'Titolo modificabile' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Rinomina preventivo' })).toBeFocused()

  await page.reload()
  await expect(page.getByRole('heading', { level: 1, name: 'Titolo modificabile' })).toBeVisible()

  await page.getByRole('button', { name: 'Rinomina preventivo' }).click()
  await page.getByRole('textbox', { name: 'Nome preventivo' }).fill('Da annullare')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('heading', { level: 1, name: 'Titolo modificabile' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Rinomina preventivo' })).toBeFocused()

  await page.getByRole('button', { name: 'Rinomina preventivo' }).click()
  await page.getByRole('textbox', { name: 'Nome preventivo' }).fill('')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { level: 1, name: 'Titolo modificabile' })).toBeVisible()
})

test('un preventivo salvato offre di aprire la copia senza perdere la bozza', async ({ page }) => {
  await page.goto('/#/calculator')
  await page.locator('input[aria-label="Ore"]').first().fill('10')
  await page.locator('input[aria-label="Grammi materiale 1"]').fill('100')
  await page.getByRole('button', { name: 'Salva preventivo' }).click()
  await page.waitForURL(/#\/quotes\//)

  await page.getByRole('link', { name: 'Calcolatore' }).first().click()
  await page.locator('input[aria-label="Grammi materiale 1"]').fill('50')

  await page.getByRole('link', { name: 'Preventivi' }).first().click()
  await page.getByRole('link', { name: 'Nuovo preventivo' }).first().click()
  await page.getByRole('button', { name: 'Duplica nel calcolatore' }).click()

  const dialog = page.getByRole('dialog', { name: 'Sostituire la bozza corrente?' })
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Annulla' }).click()
  await expect(dialog).toHaveCount(0)

  await page.getByRole('button', { name: 'Duplica nel calcolatore' }).click()
  await dialog.getByRole('button', { name: 'Sostituisci la bozza' }).click()
  await expect(
    page.getByRole('heading', { name: 'Nuovo preventivo (copia)' }).first(),
  ).toBeVisible()
})
