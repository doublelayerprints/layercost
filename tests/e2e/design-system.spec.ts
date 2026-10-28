import { expect, test } from '@playwright/test'

test.use({ colorScheme: 'light' })

test('carica i font e i token della direzione Strato', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => document.fonts.ready)

  const data = await page.evaluate(async () => {
    const root = getComputedStyle(document.documentElement)
    await document.fonts.load('600 34px "Source Serif 4"')
    return {
      ground: root.getPropertyValue('--color-ground').trim(),
      data: root.getPropertyValue('--color-data').trim(),
      control: root.getPropertyValue('--color-control').trim(),
      bodyFont: getComputedStyle(document.body).fontFamily,
      archivo: document.fonts.check('16px Archivo'),
      serif: document.fonts.check('600 34px "Source Serif 4"'),
    }
  })

  expect(data.ground).toBe('#f4f3f1')
  expect(data.data).toBe('#5b21b6')
  expect(data.control).toBe('#8a8a8a')
  expect(data.bodyFont).toContain('Archivo')
  expect(data.archivo).toBe(true)
  expect(data.serif).toBe(true)

  await test.info().attach('home-1440', {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  })
})

test('i controlli usano i token, il focus è visibile e non c’è overflow a 375', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/')

  const nameInput = page.getByLabel('Nome preventivo')
  await expect(nameInput).toBeVisible()

  const inputStyles = await nameInput.evaluate((element) => {
    const styles = getComputedStyle(element)
    return {
      borderColor: styles.borderTopColor,
      borderWidth: styles.borderTopWidth,
      height: styles.height,
    }
  })
  expect(inputStyles.borderColor).toBe('rgb(138, 138, 138)')
  expect(inputStyles.borderWidth).toBe('1px')
  expect(inputStyles.height).toBe('44px')

  await nameInput.click()
  const focus = await nameInput.evaluate((element) => {
    const styles = getComputedStyle(element)
    return {
      outlineColor: styles.outlineColor,
      outlineWidth: styles.outlineWidth,
      outlineStyle: styles.outlineStyle,
    }
  })
  expect(focus.outlineColor).toBe('rgb(91, 33, 182)')
  expect(focus.outlineWidth).toBe('2px')
  expect(focus.outlineStyle).toBe('solid')

  const save = page.getByRole('button', { name: 'Salva preventivo' })
  const saveStyles = await save.evaluate((element) => {
    const styles = getComputedStyle(element)
    return {
      background: styles.backgroundColor,
      radius: styles.borderRadius,
      shadow: styles.boxShadow,
    }
  })
  expect(saveStyles.background).toBe('rgb(10, 10, 10)')
  expect(saveStyles.radius).toBe('6px')
  expect(saveStyles.shadow).toBe('none')

  const scroll = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth,
  }))
  expect(scroll.documentWidth).toBeLessThanOrEqual(scroll.viewportWidth + 1)

  await page.getByRole('button', { name: 'Menu' }).click()
  const mobileNav = page.locator('#mobile-navigation')
  await expect(mobileNav).toBeVisible()
  await expect(mobileNav.getByRole('link', { name: 'Tariffe energia' })).toBeVisible()
  await expect(mobileNav.getByRole('group', { name: 'Tema dell’interfaccia' })).toBeVisible()
  await expect(mobileNav.getByRole('group', { name: 'Lingua dell’interfaccia' })).toBeVisible()
  await page.getByRole('button', { name: 'Chiudi' }).click()
  await expect(mobileNav).toHaveCount(0)

  await test.info().attach('home-375', {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  })
})
