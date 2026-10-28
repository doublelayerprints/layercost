import { expect, test } from '@playwright/test'

test('cambia lingua, la persiste e salva preventivi in inglese', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))

  await page.goto('/#/settings')
  const quickLanguage = page
    .locator('aside')
    .getByRole('group', { name: 'Lingua dell’interfaccia' })
  await expect(quickLanguage).toBeVisible()
  await quickLanguage.getByRole('radio', { name: 'English' }).check()

  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.locator('main').getByRole('radio', { name: /English/ })).toBeChecked()
  await expect(page).toHaveTitle('LayerCost — Cost and price for 3D prints')
  await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Calculator' }).first()).toBeVisible()

  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.locator('main').getByRole('radio', { name: /English/ })).toBeChecked()
  await expect(page.locator('aside').getByRole('radio', { name: 'English' })).toBeChecked()

  await page.getByRole('link', { name: 'Calculator' }).first().click()
  await expect(page.getByRole('heading', { name: 'New quote' }).first()).toBeVisible()
  await page.locator('input[aria-label="Hours"]').first().fill('10')
  await page.locator('input[aria-label="Minutes"]').first().fill('0')
  await page.locator('input[aria-label="Material grams 1"]').fill('100')
  await expect(page.getByText(/3\.70/).first()).toBeVisible({ timeout: 10_000 })
  await page.getByRole('button', { name: 'Save quote' }).click()
  await page.waitForURL(/#\/quotes\//)
  await expect(page.getByText('Quote saved').first()).toBeVisible()
  const quoteUrl = page.url()

  const stored = await page.evaluate(() => ({
    data: JSON.parse(localStorage.getItem('layercost:data') ?? 'null') as {
      schemaVersion: number
      quotes: Array<{ locale: string }>
    },
    locale: localStorage.getItem('layercost:locale'),
  }))
  expect(stored.data.schemaVersion).toBe(4)
  expect(stored.data.quotes[0]?.locale).toBe('en')
  expect(stored.locale).toBe('en')

  await page.emulateMedia({ media: 'print' })
  await expect(page.getByText(/Generated with LayerCost/)).toBeVisible()
  await page.emulateMedia({ media: 'screen' })

  await page.goto('/#/settings')
  await page.setInputFiles('input[type="file"]', {
    name: 'bad.json',
    mimeType: 'application/json',
    buffer: Buffer.from('not json'),
  })
  await expect(page.getByText('The file does not contain valid JSON.')).toBeVisible()
  await page
    .locator('main')
    .getByRole('radio', { name: /Italiano/ })
    .check()
  await expect(page.locator('html')).toHaveAttribute('lang', 'it')
  await page.goto(quoteUrl)
  await page.emulateMedia({ media: 'print' })
  await expect(page.getByText(/Generated with LayerCost/)).toBeVisible()
  await expect(page.getByText(/Generato con LayerCost/)).toHaveCount(0)
  await page.emulateMedia({ media: 'screen' })

  expect(errors).toEqual([])
})
