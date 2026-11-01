import { expect, test } from '@playwright/test'

test.use({ colorScheme: 'light' })

test('carica i font e i token della direzione Strato', async ({ page }) => {
  await page.goto('/#/calculator')
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
  await page.goto('/#/calculator')

  const customerInput = page.getByLabel('Cliente (opzionale)')
  await expect(customerInput).toBeVisible()

  const inputStyles = await customerInput.evaluate((element) => {
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

  const select = page.getByRole('combobox', { name: 'Materiale 1' }).first()
  const selectStyles = await select.evaluate((element) => {
    const styles = getComputedStyle(element)
    return {
      height: styles.height,
      paddingLeft: styles.paddingLeft,
      paddingRight: styles.paddingRight,
      haspopup: element.getAttribute('aria-haspopup'),
    }
  })
  expect(selectStyles.height).toBe('44px')
  expect(selectStyles.paddingLeft).toBe('12px')
  expect(selectStyles.paddingRight).toBe('12px')
  expect(selectStyles.haspopup).toBe('listbox')
  await expect(select.locator('svg')).toHaveCount(1)

  await select.click()
  await expect(select).toHaveAttribute('aria-expanded', 'true')
  const listbox = page.getByRole('listbox')
  await expect(listbox).toBeVisible()
  const listboxStyles = await listbox.evaluate((element) => {
    const styles = getComputedStyle(element)
    const rect = element.getBoundingClientRect()
    return {
      background: styles.backgroundColor,
      radius: styles.borderRadius,
      shadow: styles.boxShadow,
      left: rect.left,
      width: rect.width,
      viewportWidth: window.innerWidth,
    }
  })
  expect(listboxStyles.background).toBe('rgb(255, 255, 255)')
  expect(listboxStyles.radius).toBe('8px')
  expect(listboxStyles.shadow).not.toBe('none')
  expect(listboxStyles.left).toBeGreaterThanOrEqual(0)
  expect(listboxStyles.left + listboxStyles.width).toBeLessThanOrEqual(listboxStyles.viewportWidth)
  await expect(listbox.locator('[role="option"][aria-selected="true"]')).toHaveCount(1)
  await page.keyboard.press('Escape')
  await expect(select).toHaveAttribute('aria-expanded', 'false')

  await customerInput.click()
  const focus = await customerInput.evaluate((element) => {
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
  await expect(mobileNav.getByRole('group', { name: 'Lavoro' })).toBeVisible()
  await expect(mobileNav.getByRole('group', { name: 'Configurazione' })).toBeVisible()
  await expect(mobileNav.getByRole('group', { name: 'Aiuto' })).toBeVisible()
  await expect(mobileNav.getByRole('group', { name: 'Tema dell’interfaccia' })).toBeVisible()
  await expect(mobileNav.getByRole('group', { name: 'Lingua dell’interfaccia' })).toBeVisible()
  await page.getByRole('button', { name: 'Chiudi' }).click()
  await expect(mobileNav).toHaveCount(0)

  await test.info().attach('home-375', {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  })
})
