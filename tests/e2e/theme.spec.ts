import { expect, test } from '@playwright/test'

test.use({ colorScheme: 'light' })

test('il tema è esplicito, persistente e segue il sistema', async ({ page }) => {
  await page.goto('/#/settings')

  const html = page.locator('html')
  await expect(html).toHaveAttribute('data-theme', 'light')

  const themeGroup = page.getByRole('group', { name: 'Tema dell’interfaccia' })
  await expect(themeGroup).toBeVisible()
  await expect(page.getByRole('radio', { name: /Sistema/ })).toBeChecked()

  await page.getByRole('radio', { name: /Scuro/ }).check()
  await expect(html).toHaveAttribute('data-theme', 'dark')

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

  await page.getByRole('radio', { name: /Chiaro/ }).check()
  await expect(html).toHaveAttribute('data-theme', 'light')
  await expect
    .poll(() =>
      page.evaluate(() =>
        document.querySelector('meta[name="theme-color"]')?.getAttribute('content'),
      ),
    )
    .toBe('#f4f3f1')

  await page.getByRole('radio', { name: /Sistema/ }).check()
  await page.emulateMedia({ colorScheme: 'dark' })
  await expect(html).toHaveAttribute('data-theme', 'dark')

  await page.emulateMedia({ colorScheme: 'light' })
  await expect(html).toHaveAttribute('data-theme', 'light')

  await page.emulateMedia({ colorScheme: 'dark' })
  await page.goto('/')
  await expect(html).toHaveAttribute('data-theme', 'dark')
  await expect(page.getByRole('heading', { name: 'Nuovo preventivo' }).first()).toBeVisible()

  await test.info().attach('home-dark-1440', {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  })
})
