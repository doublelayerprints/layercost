import { expect, test } from '@playwright/test'

test.use({ colorScheme: 'light' })

test('WebKit calcola, salva, ricarica e stampa', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))

  await page.goto('/#/calculator')
  await page.locator('input[aria-label="Ore"]').first().fill('10')
  await page.locator('input[aria-label="Grammi materiale 1"]').fill('100')
  await expect(page.getByText(/3,70/).first()).toBeVisible({ timeout: 10_000 })

  await page.getByRole('button', { name: 'Salva preventivo' }).click()
  await page.waitForURL(/#\/quotes\//)
  await expect(page.getByText('Preventivo salvato')).toBeVisible()

  await page.reload()
  await expect(page.getByRole('heading', { name: 'Nuovo preventivo' }).first()).toBeVisible()
  await expect(page.getByText(/3,70/).first()).toBeVisible()
  await expect(page.getByText('Preventivo salvato')).toHaveCount(0)

  await page.emulateMedia({ media: 'print' })
  await expect(page.getByText('Generato con LayerCost')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Calcolatore' })).toBeHidden()
  await page.emulateMedia({ media: 'screen' })

  await page.goto('/#/settings')
  await page.locator('main').getByRole('radio', { name: /Scuro/ }).check()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')

  expect(errors).toEqual([])
})

test('WebKit apre un link condiviso in un contesto pulito', async ({ page }) => {
  await page.goto('/#/calculator')
  await page.locator('input[aria-label="Ore"]').first().fill('10')
  await page.locator('input[aria-label="Grammi materiale 1"]').fill('100')
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
  await expect(otherPage.getByText(/3,70/).first()).toBeVisible()
  await otherPage.getByRole('button', { name: 'Importa nel mio archivio' }).click()
  await otherPage.waitForURL(/#\/quotes\//)
  await expect(otherPage.getByText('Preventivo salvato')).toBeVisible()
  await otherContext.close()
})
