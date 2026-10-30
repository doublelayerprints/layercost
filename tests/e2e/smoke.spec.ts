import { expect, test } from '@playwright/test'

test('calcola, salva e ricarica un preventivo', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))

  await page.goto('/#/calculator')
  await expect(page.getByRole('heading', { name: 'Configura LayerCost' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Nuovo preventivo' }).first()).toBeVisible()

  const hours = page.locator('input[aria-label="Ore"]')
  const minutes = page.locator('input[aria-label="Minuti"]')

  await hours.first().fill('10')
  await minutes.first().fill('0')
  await page.locator('input[aria-label="Grammi materiale 1"]').fill('100')

  await expect(page.getByText(/3,70/).first()).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText('Guadagno').first()).toBeVisible()
  await expect(page.getByText('Prezzo netto').first()).toBeVisible()

  await page.getByRole('button', { name: 'Salva preventivo' }).click()
  await page.waitForURL(/#\/quotes\//)
  await expect(page.getByRole('heading', { name: 'Nuovo preventivo' }).first()).toBeVisible()
  await expect(page.getByText(/3,70/).first()).toBeVisible()
  await expect(page.getByText('Guadagno').first()).toBeVisible()
  await expect(page.getByText('Preventivo salvato')).toBeVisible()
  await page.getByRole('button', { name: 'Chiudi avviso' }).click()
  await expect(page.getByText('Preventivo salvato')).toHaveCount(0)

  await page.reload()
  await expect(page.getByRole('heading', { name: 'Nuovo preventivo' }).first()).toBeVisible()
  await expect(page.getByText(/3,70/).first()).toBeVisible()
  await expect(page.getByText('Preventivo salvato')).toHaveCount(0)

  await page.emulateMedia({ media: 'print' })
  const print = page.getByTestId('quote-print')
  await expect(print.getByText('Generato con LayerCost')).toBeVisible()
  await expect(print.getByText('Costo pieno')).toHaveCount(0)
  await expect(print.getByText('Margine effettivo')).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Calcolatore' })).toBeHidden()
  await page.emulateMedia({ media: 'screen' })

  await page.evaluate(() => {
    window.print = () => {}
  })
  await page.getByRole('button', { name: 'Stampa interna' }).click()
  await page.emulateMedia({ media: 'print' })
  await expect(print.getByText('Uso interno')).toBeVisible()
  await expect(print.getByText('Costo pieno').first()).toBeVisible()
  await expect(print.getByText('Guadagno').first()).toBeVisible()
  await page.emulateMedia({ media: 'screen' })

  await page.goto('/#/quotes')
  await expect(page.getByRole('button', { name: 'Apri' })).toHaveCount(0)
  await page.locator('tbody tr').first().click()
  await page.waitForURL(/#\/quotes\/.+/)
  await expect(page.getByRole('heading', { name: 'Nuovo preventivo' }).first()).toBeVisible()

  expect(errors).toEqual([])
})

test('condivide e importa un preventivo in un contesto pulito', async ({ page }) => {
  await page.goto('/#/calculator')
  await page.locator('input[aria-label="Ore"]').first().fill('10')
  await page.locator('input[aria-label="Minuti"]').first().fill('0')
  await page.locator('input[aria-label="Grammi materiale 1"]').fill('100')
  await expect(page.getByText(/3,70/).first()).toBeVisible({ timeout: 10_000 })
  await page.getByRole('button', { name: 'Salva preventivo' }).click()
  await page.waitForURL(/#\/quotes\//)

  await page.getByRole('button', { name: 'Condividi' }).first().click()
  const link = await page.getByLabel('Link').inputValue()
  expect(link).toContain('#/share?d=')

  const browser = page.context().browser()
  expect(browser).not.toBeNull()
  const otherContext = await browser!.newContext()
  const otherPage = await otherContext.newPage()
  await otherPage.goto(link)
  await expect(otherPage.getByRole('heading', { name: 'Nuovo preventivo' }).first()).toBeVisible()
  await expect(otherPage.getByText(/3,70/).first()).toBeVisible()
  await expect(otherPage.getByText('Costo pieno')).toHaveCount(0)
  await expect(otherPage.getByText('Margine effettivo')).toHaveCount(0)
  await expect(otherPage.getByText('Guadagno')).toHaveCount(0)
  await expect(otherPage.getByText('Prezzo netto')).toHaveCount(0)
  await expect(otherPage.getByText('Composizione del costo')).toHaveCount(0)

  await otherPage.emulateMedia({ media: 'print' })
  await expect(otherPage.getByText('Generato con LayerCost')).toBeVisible()
  await expect(otherPage.getByText('Costo pieno')).toHaveCount(0)
  await expect(otherPage.getByText('Margine effettivo')).toHaveCount(0)
  await otherPage.emulateMedia({ media: 'screen' })

  await otherPage.getByRole('button', { name: 'Importa nel mio archivio' }).click()
  await otherPage.waitForURL(/#\/quotes\//)
  await expect(otherPage.getByRole('heading', { name: /Nuovo preventivo/ }).first()).toBeVisible()
  await expect(otherPage.getByText('Preventivo salvato')).toBeVisible()
  await otherContext.close()
})

test('naviga le sezioni principali', async ({ page }) => {
  await page.goto('/#/calculator')
  for (const label of [
    'Preventivi',
    'Stampanti',
    'Materiali',
    'Tariffe energia',
    'Extra',
    'Impostazioni',
    'Confronto',
  ]) {
    await page.getByRole('link', { name: label }).first().click()
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  }
})
