import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const feedbackEnabled = process.env.E2E_FEEDBACK === '1'
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

test.skip(feedbackEnabled, 'Richiede una build senza VITE_FEEDBACK_ENDPOINT')

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
    await page.goto('/#/feedback')
    await page.evaluate((value) => localStorage.setItem('layercost:locale', value), locale)
    await page.reload()

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(
      page.getByText(
        locale === 'it'
          ? 'Il modulo non è configurato in questa build. Puoi scrivere all’amministratore.'
          : 'The form is not configured in this build. You can contact the administrator.',
      ),
    ).toBeVisible()
    await expect(page.getByLabel(locale === 'it' ? 'Titolo' : 'Title')).toBeDisabled()
    await expect(
      page.getByRole('button', {
        name: locale === 'it' ? 'Invia suggerimento' : 'Send suggestion',
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
