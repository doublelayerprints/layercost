import { expect, test } from '@playwright/test'

test.use({ colorScheme: 'light' })

test('aggiunge una riga dal pulsante largo sotto la card', async ({ page }) => {
  await page.goto('/')

  const cards = page.locator('fieldset[id^="line-"]')
  await expect(cards).toHaveCount(1)

  const add = page.getByRole('button', { name: 'Aggiungi riga', exact: true })
  await expect(add).toHaveCount(1)

  const cardBox = await cards.first().boundingBox()
  const addBox = await add.boundingBox()
  expect(cardBox).not.toBeNull()
  expect(addBox).not.toBeNull()
  expect(addBox!.width).toBeCloseTo(cardBox!.width, 0)
  expect(addBox!.y).toBeGreaterThan(cardBox!.y + cardBox!.height)

  await add.hover()
  await expect
    .poll(() => add.evaluate((element) => getComputedStyle(element).borderColor))
    .toBe('rgb(29, 95, 191)')

  await add.click()
  await expect(cards).toHaveCount(2)

  const secondCard = await cards.nth(1).boundingBox()
  const newAddBox = await add.boundingBox()
  expect(secondCard).not.toBeNull()
  expect(newAddBox).not.toBeNull()
  expect(newAddBox!.y).toBeGreaterThan(secondCard!.y + secondCard!.height)
})
