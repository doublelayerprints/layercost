import { expect, test } from '@playwright/test'

test.use({ colorScheme: 'light' })

test('comprime ed espande le card del calcolatore', async ({ page }) => {
  await page.goto('/')

  const printsCard = page.locator('[data-dropzone="3mf"]')
  await expect(printsCard.getByRole('heading', { name: 'Stampe' })).toBeVisible()

  const collapsePrints = page.getByRole('button', { name: 'Comprimi Stampe' })
  await expect(collapsePrints).toHaveAttribute('aria-expanded', 'true')
  await collapsePrints.click()

  const expandPrints = page.getByRole('button', { name: 'Espandi Stampe' })
  await expect(expandPrints).toHaveAttribute('aria-expanded', 'false')
  await expect(printsCard.getByText(/1 riga/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Aggiungi riga', exact: true })).toBeHidden()

  await expandPrints.click()
  await expect(page.getByRole('button', { name: 'Aggiungi riga', exact: true })).toBeVisible()

  const lineCard = page.locator('fieldset[id^="line-"]').first()
  const lineChevron = lineCard.locator(':scope > div.group > span[aria-hidden="true"]')
  const lineName = page.locator('input[aria-label="Nome della stampa"]')
  await expect(lineName).toBeVisible()
  await lineChevron.scrollIntoViewIfNeeded()
  const openChevronBox = await lineChevron.boundingBox()
  expect(openChevronBox).not.toBeNull()
  await page.mouse.click(
    openChevronBox!.x + openChevronBox!.width / 2,
    openChevronBox!.y + openChevronBox!.height / 2,
  )
  await expect(lineName).toBeHidden()
  await lineChevron.scrollIntoViewIfNeeded()
  const closedChevronBox = await lineChevron.boundingBox()
  expect(closedChevronBox).not.toBeNull()
  await page.mouse.click(
    closedChevronBox!.x + closedChevronBox!.width / 2,
    closedChevronBox!.y + closedChevronBox!.height / 2,
  )
  await expect(lineName).toBeVisible()

  await expect(page.getByRole('heading', { name: 'Costi di lavoro' })).toBeVisible()
  const jobNotes = page.getByRole('textbox', { name: 'Note del preventivo' })
  await expect(jobNotes).toBeVisible()
  await page.getByRole('button', { name: 'Comprimi Costi di lavoro' }).click()
  await expect(jobNotes).toBeHidden()
  await page.getByRole('button', { name: 'Espandi Costi di lavoro' }).click()
  await expect(jobNotes).toBeVisible()

  const markup = page.getByRole('textbox', { name: 'Valore numerico' })
  await markup.fill('40')
  await page.getByRole('button', { name: 'Comprimi Prezzo' }).click()
  await expect(page.getByRole('button', { name: 'Ripristina default' })).toBeVisible()
  await page.getByRole('button', { name: 'Ripristina default' }).click()
  await expect(page.getByRole('button', { name: 'Espandi Prezzo' })).toHaveAttribute(
    'aria-expanded',
    'false',
  )
  await page.getByRole('button', { name: 'Espandi Prezzo' }).click()
  await expect(markup).toHaveValue('30')

  await page.getByRole('button', { name: 'Comprimi Preventivo' }).focus()
  await page.keyboard.press('Space')
  await expect(page.locator('input[aria-label="Nome preventivo"]')).toBeHidden()
  await expect(page.getByRole('button', { name: 'Espandi Preventivo' })).toBeFocused()
})
