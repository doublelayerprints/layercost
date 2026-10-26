import { expect, test } from '@playwright/test'

test('modifica un preventivo salvato e lo blocca dopo invio e completamento', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))

  await page.goto('/')
  await page.locator('input[aria-label="Ore"]').first().fill('10')
  await page.locator('input[aria-label="Grammi materiale 1"]').fill('100')
  await page.getByRole('button', { name: 'Salva preventivo' }).click()
  await page.waitForURL(/#\/quotes\//)
  const quoteUrl = page.url()
  const beforeEdit = await page.evaluate(() => {
    const data = JSON.parse(localStorage.getItem('layercost:data') ?? 'null')
    const quote = data?.quotes?.[0]
    return { id: quote?.id, snapshotAt: quote?.snapshot?.capturedAt }
  })

  const manageBox = await page
    .getByRole('heading', { name: 'Gestione del preventivo' })
    .boundingBox()
  const priceBox = await page.getByText('Prezzo totale').first().boundingBox()
  expect(manageBox?.y).toBeLessThan(priceBox?.y ?? Number.POSITIVE_INFINITY)

  await page.getByRole('button', { name: 'Modifica preventivo' }).click()
  await page.waitForURL(/#\/$/)
  await expect(page.getByText(/Stai modificando/)).toBeVisible()
  await page.getByLabel('Quantità').fill('2')
  await page.getByRole('button', { name: 'Salva modifiche' }).click()
  await page.waitForURL(/#\/quotes\//)
  await expect(page.getByText('Modifiche salvate')).toBeVisible()

  const afterEdit = await page.evaluate(() => {
    const data = JSON.parse(localStorage.getItem('layercost:data') ?? 'null')
    const quotes = data?.quotes ?? []
    return {
      count: quotes.length,
      id: quotes[0]?.id,
      quantity: quotes[0]?.lines?.[0]?.quantity,
      status: quotes[0]?.status,
      snapshotAt: quotes[0]?.snapshot?.capturedAt,
    }
  })
  expect(afterEdit.count).toBe(1)
  expect(afterEdit.id).toBe(beforeEdit.id)
  expect(afterEdit.snapshotAt).toBe(beforeEdit.snapshotAt)
  expect(afterEdit.quantity).toBe(2)
  expect(afterEdit.status).toBe('saved')

  await page.getByRole('button', { name: 'Segna come inviato' }).click()
  const sentDialog = page.getByRole('dialog', { name: 'Segnare come inviato?' })
  await expect(sentDialog).toBeVisible()
  await sentDialog.getByRole('button', { name: 'Segna come inviato' }).click()
  await expect(page.getByText('Inviato', { exact: true }).first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Modifica preventivo' })).toHaveCount(0)
  await expect(page.getByText(/Inviato al cliente: non è più modificabile/)).toBeVisible()

  await page.getByRole('button', { name: 'Segna come completato' }).click()
  const completedDialog = page.getByRole('dialog', { name: 'Segnare come completato?' })
  await expect(completedDialog).toBeVisible()
  await completedDialog.getByRole('button', { name: 'Segna come completato' }).click()
  await expect(page.getByText('Completato', { exact: true }).first()).toBeVisible()
  await expect(page.getByText(/Completato e concluso: non è più modificabile/)).toBeVisible()

  const completed = await page.evaluate(() => {
    const data = JSON.parse(localStorage.getItem('layercost:data') ?? 'null')
    return {
      count: data?.quotes?.length,
      status: data?.quotes?.[0]?.status,
    }
  })
  expect(completed).toEqual({ count: 1, status: 'completed' })

  await page.goto(quoteUrl)
  await expect(page.getByRole('button', { name: 'Duplica nel calcolatore' })).toBeVisible()

  expect(errors).toEqual([])
})
