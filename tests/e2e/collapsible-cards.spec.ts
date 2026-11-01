import { expect, test } from '@playwright/test'

test.use({ colorScheme: 'light' })

test('comprime ed espande le card del calcolatore', async ({ page }) => {
  await page.goto('/#/calculator')

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
  await expect(page.getByLabel('Cliente (opzionale)')).toBeHidden()
  await expect(page.getByRole('button', { name: 'Espandi Preventivo' })).toBeFocused()
})

test('un nome lungo resta dentro la card compressa', async ({ page }) => {
  const longName =
    '1101-1646-gardevoir(1)_plate(04)_PLA_0.08_2h57m22s_SENZA_SPAZI_ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/#/calculator')

  const lineName = page.locator('input[aria-label="Nome della stampa"]').first()
  await lineName.fill(longName)
  await page.getByRole('button', { name: 'Comprimi stampa 1' }).click({ position: { x: 6, y: 6 } })
  await expect(page.getByRole('button', { name: 'Espandi stampa 1' })).toHaveAttribute(
    'aria-expanded',
    'false',
  )

  const layout = await page.evaluate((name) => {
    const card = document.querySelector('fieldset[id^="line-"]') as HTMLElement | null
    const label = [...(card?.querySelectorAll('span') ?? [])].find(
      (element) => element.textContent === name,
    )
    return {
      pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      cardWidth: card?.getBoundingClientRect().width ?? null,
      parentWidth: card?.parentElement?.getBoundingClientRect().width ?? null,
      labelClientWidth: label?.clientWidth ?? null,
      labelScrollWidth: label?.scrollWidth ?? null,
    }
  }, longName)

  expect(layout.pageOverflow).toBe(0)
  expect(layout.cardWidth).not.toBeNull()
  expect(layout.parentWidth).not.toBeNull()
  expect(layout.cardWidth!).toBeLessThanOrEqual(layout.parentWidth! + 1)
  expect(layout.labelScrollWidth!).toBeGreaterThan(layout.labelClientWidth!)
})
