import { expect, test } from '@playwright/test'

test('calcola, salva e ricarica un preventivo', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))

  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Configura LayerCost' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Nuovo preventivo' }).first()).toBeVisible()

  const hours = page.locator('input[aria-label="Ore"]')
  const minutes = page.locator('input[aria-label="Minuti"]')

  await hours.first().fill('10')
  await minutes.first().fill('0')
  await page.locator('input[aria-label="Grammi materiale 1"]').fill('100')

  await expect(page.getByText(/5,20/).first()).toBeVisible({ timeout: 10_000 })

  await page.getByRole('button', { name: 'Salva preventivo' }).click()
  await page.waitForURL(/#\/quotes\//)
  await expect(page.getByRole('heading', { name: 'Nuovo preventivo' }).first()).toBeVisible()
  await expect(page.getByText(/5,20/).first()).toBeVisible()

  await page.reload()
  await expect(page.getByRole('heading', { name: 'Nuovo preventivo' }).first()).toBeVisible()
  await expect(page.getByText(/5,20/).first()).toBeVisible()

  await page.emulateMedia({ media: 'print' })
  await expect(page.getByText('Documento generato con LayerCost')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Calcolatore' })).toBeHidden()
  await page.emulateMedia({ media: 'screen' })

  expect(errors).toEqual([])
})

test('condivide e importa un preventivo in un contesto pulito', async ({ page }) => {
  await page.goto('/')
  await page.locator('input[aria-label="Ore"]').first().fill('10')
  await page.locator('input[aria-label="Minuti"]').first().fill('0')
  await page.locator('input[aria-label="Grammi materiale 1"]').fill('100')
  await expect(page.getByText(/5,20/).first()).toBeVisible({ timeout: 10_000 })
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
  await expect(otherPage.getByText(/5,20/).first()).toBeVisible()
  await otherPage.getByRole('button', { name: 'Importa nel mio archivio' }).click()
  await otherPage.waitForURL(/#\/quotes\//)
  await expect(otherPage.getByRole('heading', { name: /Nuovo preventivo/ }).first()).toBeVisible()
  await otherContext.close()
})

test('naviga le sezioni principali', async ({ page }) => {
  await page.goto('/')
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
