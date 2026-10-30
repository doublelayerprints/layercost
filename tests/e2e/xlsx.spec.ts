import { readFile } from 'node:fs/promises'
import { expect, test } from '@playwright/test'
import { strFromU8, unzipSync } from 'fflate'

test.use({ colorScheme: 'light' })

test('esporta i preventivi in .xlsx, inclusi gli archiviati', async ({ page }, testInfo) => {
  await page.goto('/#/calculator')
  await page.locator('input[aria-label="Ore"]').first().fill('10')
  await page.locator('input[aria-label="Grammi materiale 1"]').fill('100')
  await page.getByRole('button', { name: 'Salva preventivo' }).click()
  await page.waitForURL(/#\/quotes\//)

  await page.getByRole('button', { name: 'Archivia' }).click()
  await expect(page.getByText('Archiviato').first()).toBeVisible()

  await page.goto('/#/quotes')
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Esporta .xlsx' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/^layercost-quotes-\d{4}-\d{2}-\d{2}\.xlsx$/)

  const path = await download.path()
  expect(path).not.toBeNull()
  await download.saveAs(testInfo.outputPath('layercost-quotes.xlsx'))

  const files = unzipSync(new Uint8Array(await readFile(path!))) as Record<string, Uint8Array>
  const workbook = strFromU8(files['xl/workbook.xml']!)
  expect(workbook).toContain('name="Preventivi"')
  expect(workbook).toContain('name="Righe"')
  expect(workbook).toContain('name="Materiali"')

  const quotes = strFromU8(files['xl/worksheets/sheet1.xml']!)
  expect(quotes).toContain('Nuovo preventivo')
  expect(quotes).toContain('Archiviato')
  expect(quotes).toContain('Sì')

  const lines = strFromU8(files['xl/worksheets/sheet2.xml']!)
  expect(lines).toContain('Kobra 3')
  expect(lines).toContain('100')

  const materials = strFromU8(files['xl/worksheets/sheet3.xml']!)
  expect(materials).toContain('PLA')
})

test('disabilita l’export senza preventivi', async ({ page }) => {
  await page.goto('/#/quotes')
  await expect(page.getByRole('button', { name: 'Esporta .xlsx' })).toBeDisabled()
})
