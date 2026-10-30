import { expect, test } from '@playwright/test'

test.use({ colorScheme: 'light' })

test('il tema è esplicito, persistente e segue il sistema', async ({ page }) => {
  await page.goto('/#/settings')

  const html = page.locator('html')
  await expect(html).toHaveAttribute('data-theme', 'light')

  const themeGroup = page.locator('main').getByRole('group', { name: 'Tema dell’interfaccia' })
  await expect(themeGroup).toBeVisible()
  await expect(themeGroup.getByRole('radio', { name: /Sistema/ })).toBeChecked()

  await themeGroup.getByRole('radio', { name: 'Scuro' }).check()
  await expect(html).toHaveAttribute('data-theme', 'dark')
  await expect(page.locator('main').getByRole('radio', { name: 'Scuro' })).toBeChecked()

  const dark = await page.evaluate(() => ({
    ground: getComputedStyle(document.documentElement).getPropertyValue('--color-ground').trim(),
    ink: getComputedStyle(document.body).color,
    meta: document.querySelector('meta[name="theme-color"]')?.getAttribute('content'),
    stored: localStorage.getItem('layercost:theme'),
  }))
  expect(dark.ground).toBe('#141413')
  expect(dark.ink).toBe('rgb(243, 242, 239)')
  expect(dark.meta).toBe('#141413')
  expect(dark.stored).toBe('dark')

  await page.reload()
  await expect(html).toHaveAttribute('data-theme', 'dark')
  expect(
    await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--color-ground').trim(),
    ),
  ).toBe('#141413')

  await themeGroup.getByRole('radio', { name: /Chiaro/ }).check()
  await expect(html).toHaveAttribute('data-theme', 'light')
  await expect
    .poll(() =>
      page.evaluate(() =>
        document.querySelector('meta[name="theme-color"]')?.getAttribute('content'),
      ),
    )
    .toBe('#f4f3f1')

  await themeGroup.getByRole('radio', { name: /Sistema/ }).check()
  await page.emulateMedia({ colorScheme: 'dark' })
  await expect(html).toHaveAttribute('data-theme', 'dark')

  await page.emulateMedia({ colorScheme: 'light' })
  await expect(html).toHaveAttribute('data-theme', 'light')

  await page.emulateMedia({ colorScheme: 'dark' })
  await page.goto('/#/calculator')
  await expect(html).toHaveAttribute('data-theme', 'dark')
  await expect(page.getByRole('heading', { name: 'Nuovo preventivo' }).first()).toBeVisible()

  await test.info().attach('home-dark-1440', {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  })
})

test('le preferenze rapide del menu mobile cambiano tema e lingua', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/#/calculator')
  await page.getByRole('button', { name: 'Menu' }).click()

  const nav = page.locator('#mobile-navigation')
  const themeGroup = nav.getByRole('group', { name: 'Tema dell’interfaccia' })
  await themeGroup.getByRole('radio', { name: 'Scuro' }).check()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  expect(await page.evaluate(() => localStorage.getItem('layercost:theme'))).toBe('dark')

  const languageGroup = nav.getByRole('group', { name: 'Lingua dell’interfaccia' })
  await languageGroup.getByRole('radio', { name: 'English' }).check()
  expect(await page.evaluate(() => localStorage.getItem('layercost:locale'))).toBe('en')
  await expect(nav.getByRole('link', { name: 'Calculator' })).toBeVisible()
})
