import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const accessEnabled = process.env.E2E_ACCESS === '1'
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

test.skip(accessEnabled, 'Richiede una build senza VITE_ACCESS_REQUEST_ENDPOINT')

async function audit(page: import('@playwright/test').Page) {
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()
  const violations = results.violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    help: violation.help,
    nodes: violation.nodes.map((node) => node.target.join(' ')),
  }))
  expect(violations, JSON.stringify(violations, null, 2)).toEqual([])
}

test('senza endpoint mostra il modulo disabilitato e passa axe a 375/1440', async ({ page }) => {
  for (const locale of ['it', 'en']) {
    await page.setViewportSize({ width: 375, height: 844 })
    await page.goto('/#/request-access')
    await page.evaluate((value) => localStorage.setItem('layercost:locale', value), locale)
    await page.reload()

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(
      page.getByText(
        locale === 'it'
          ? 'Il modulo non è disponibile in questa build. Contatta l’amministratore.'
          : 'The form is not available in this build. Contact the administrator.',
      ),
    ).toBeVisible()
    await expect(page.getByLabel('Email')).toBeDisabled()
    await expect(
      page.getByRole('button', {
        name: locale === 'it' ? 'Invia richiesta' : 'Send request',
      }),
    ).toBeDisabled()
    await expect(page.getByRole('checkbox')).toBeDisabled()
    await audit(page)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375)

    await page.setViewportSize({ width: 1440, height: 900 })
    await audit(page)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      1440,
    )
  }
})
