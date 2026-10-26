import { expect, test } from '@playwright/test'

test('imposta, conserva e rimuove il colore del filamento', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))

  await page.goto('/')
  const colorInput = page.getByLabel('Colore filamento della stampa 1')
  await colorInput.fill('#ff0000')
  await expect(page.locator('[data-line-color="#ff0000"]').first()).toBeVisible()

  await page.locator('input[aria-label="Ore"]').first().fill('10')
  await page.locator('input[aria-label="Grammi materiale 1"]').fill('100')
  await page.getByRole('button', { name: 'Salva preventivo' }).click()
  await page.waitForURL(/#\/quotes\//)

  await expect(page.locator('[data-line-color="#ff0000"]').first()).toBeVisible()
  await page.emulateMedia({ media: 'print' })
  await expect(page.locator('[data-line-color="#ff0000"]:visible').first()).toBeVisible()
  await page.emulateMedia({ media: 'screen' })

  const stored = await page.evaluate(() => {
    const data = JSON.parse(localStorage.getItem('layercost:data') ?? 'null')
    return data?.quotes?.[0]?.lines?.[0]?.color
  })
  expect(stored).toBe('#ff0000')

  await page.getByRole('button', { name: 'Modifica preventivo' }).click()
  await page.waitForURL(/#\/$/)
  await expect(page.getByLabel('Colore filamento della stampa 1')).toHaveValue('#ff0000')

  await page.getByRole('button', { name: 'Rimuovi colore filamento' }).click()
  await expect(page.locator('[data-line-color]')).toHaveCount(0)
  await page.getByRole('button', { name: 'Salva modifiche' }).click()
  await page.waitForURL(/#\/quotes\//)

  const cleared = await page.evaluate(() => {
    const data = JSON.parse(localStorage.getItem('layercost:data') ?? 'null')
    return 'color' in (data?.quotes?.[0]?.lines?.[0] ?? {})
  })
  expect(cleared).toBe(false)
  await expect(page.locator('[data-line-color]')).toHaveCount(0)

  expect(errors).toEqual([])
})
