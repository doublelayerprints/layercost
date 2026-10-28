import { readFile } from 'node:fs/promises'
import { expect, test } from '@playwright/test'

test.use({ colorScheme: 'light' })

test('esporta e reimporta un backup completo', async ({ page }) => {
  await page.goto('/#/')
  await page.locator('input[aria-label="Ore"]').first().fill('10')
  await page.locator('input[aria-label="Grammi materiale 1"]').fill('100')
  await page.getByRole('button', { name: 'Salva preventivo' }).click()
  await page.waitForURL(/#\/quotes\//)

  await page.goto('/#/settings')
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Esporta JSON' }).click()
  const download = await downloadPromise
  const path = await download.path()
  expect(path).not.toBeNull()

  const backup = JSON.parse(await readFile(path!, 'utf8')) as {
    schemaVersion: number
    data: { quotes: unknown[] }
  }
  expect(backup.schemaVersion).toBe(4)
  expect(backup.data.quotes).toHaveLength(1)

  await page.setInputFiles('input[type="file"]', path!)
  const dialog = page.getByRole('dialog', { name: 'Importare il backup?' })
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Importa e sostituisci' }).click()
  await expect(page.getByText(/Backup importato/)).toBeVisible()

  await page.goto('/#/quotes')
  await expect(page.getByRole('link', { name: 'Nuovo preventivo' })).toBeVisible()
})

test('la stampa produce un PDF A4 chiaro anche con tema scuro', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => localStorage.setItem('layercost:theme', 'dark'))
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')

  await page.locator('input[aria-label="Ore"]').first().fill('10')
  await page.locator('input[aria-label="Grammi materiale 1"]').fill('100')
  await page.getByRole('button', { name: 'Salva preventivo' }).click()
  await page.waitForURL(/#\/quotes\//)
  await page.reload()

  await page.emulateMedia({ media: 'print' })
  await expect(page.getByText('Generato con LayerCost')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Calcolatore' })).toBeHidden()
  await expect(page.getByRole('heading', { name: 'Nuovo preventivo' }).first()).toBeVisible()

  const colors = await page.evaluate(() => {
    const sheet = document.querySelector('[data-testid="quote-print"]')
    if (!sheet) throw new Error('Print sheet not found')
    const style = getComputedStyle(sheet)
    return {
      background: style.backgroundColor,
      text: style.color,
    }
  })
  expect(colors).toEqual({ background: 'rgb(255, 255, 255)', text: 'rgb(0, 0, 0)' })

  const pdf = await page.pdf({ format: 'A4', printBackground: true })
  expect(pdf.subarray(0, 4).toString()).toBe('%PDF')
  expect(pdf.byteLength).toBeGreaterThan(10_000)
})

test('l’app non chiama servizi esterni', async ({ page }) => {
  const external: string[] = []
  page.on('request', (request) => {
    const url = new URL(request.url())
    if (url.protocol === 'data:' || url.protocol === 'blob:') return
    if (url.hostname !== '127.0.0.1') external.push(request.url())
  })

  for (const path of [
    '/#/',
    '/#/quotes',
    '/#/compare',
    '/#/printers',
    '/#/materials',
    '/#/tariffs',
    '/#/extras',
    '/#/settings',
    '/#/nope',
  ]) {
    await page.goto(path)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  }

  expect(external).toEqual([])
})
