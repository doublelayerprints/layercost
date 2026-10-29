import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page, type Route } from '@playwright/test'

const accessEnabled = process.env.E2E_ACCESS === '1'
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

test.skip(!accessEnabled, 'Richiede una build con VITE_ACCESS_REQUEST_ENDPOINT')

async function audit(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()
  const violations = results.violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    help: violation.help,
    nodes: violation.nodes.map((node) => node.target.join(' ')),
  }))
  expect(violations, JSON.stringify(violations, null, 2)).toEqual([])
}

async function fulfillCors(route: Route, status: number, body = '') {
  await route.fulfill({
    status,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'accept, content-type',
      'Access-Control-Max-Age': '600',
      'Content-Type': 'application/json',
    },
    body,
  })
}

async function fillValidForm(page: Page) {
  await page.getByLabel('Email').fill('mario@example.com')
  await page.getByLabel('Nome').fill('Mario')
  await page.getByLabel('Messaggio').fill('Vorrei usare il cloud condiviso.')
  await page.getByRole('checkbox').check()
}

test.describe('richiesta di accesso con endpoint configurato', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#/request-access')
    await expect(page.getByRole('heading', { name: 'Richiedi accesso' })).toBeVisible()
  })

  test('invia il payload a Formspree e mostra la conferma senza creare account', async ({
    page,
  }) => {
    let submitted: { method: string; url: string; body: string; accept?: string } | undefined
    const accountWrites: string[] = []

    page.on('request', (request) => {
      const url = request.url()
      if (
        request.method() !== 'GET' &&
        (url.includes('/auth/v1/') || url.includes('/rest/v1/')) &&
        !url.includes('/auth/v1/token')
      ) {
        accountWrites.push(`${request.method()} ${url}`)
      }
    })

    await page.route('https://formspree.io/f/**', async (route) => {
      if (route.request().method() === 'OPTIONS') {
        await fulfillCors(route, 204)
        return
      }
      submitted = {
        method: route.request().method(),
        url: route.request().url(),
        body: route.request().postData() ?? '',
        accept: route.request().headers().accept,
      }
      await fulfillCors(route, 200, '{"ok":true}')
    })

    await fillValidForm(page)
    await page.getByRole('button', { name: 'Invia richiesta' }).click()

    await expect(page.getByRole('status')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Richiesta inviata' })).toBeFocused()
    await expect(page.getByRole('link', { name: 'Torna al calcolatore' })).toBeVisible()
    await expect(page.getByText(/Non riceverai un’email automatica/)).toBeVisible()

    expect(submitted?.method).toBe('POST')
    expect(submitted?.url).toBe('https://formspree.io/f/layercost-e2e')
    expect(submitted?.accept).toContain('application/json')
    expect(JSON.parse(submitted!.body)).toEqual({
      email: 'mario@example.com',
      name: 'Mario',
      message: 'Vorrei usare il cloud condiviso.',
      privacy: true,
      _subject: 'LayerCost — richiesta accesso cloud',
      _replyto: 'mario@example.com',
      _gotcha: '',
    })
    expect(accountWrites).toEqual([])
  })

  test('mostra l’errore, conserva i campi e permette di riprovare', async ({ page }) => {
    let attempts = 0
    await page.route('https://formspree.io/f/**', async (route) => {
      if (route.request().method() === 'OPTIONS') {
        await fulfillCors(route, 204)
        return
      }
      attempts += 1
      await fulfillCors(route, attempts === 1 ? 500 : 200, '{"ok":true}')
    })

    await fillValidForm(page)
    await page.getByRole('button', { name: 'Invia richiesta' }).click()

    await expect(page.getByRole('alert')).toContainText(
      'Il servizio non è disponibile in questo momento',
    )
    await expect(page.getByLabel('Email')).toHaveValue('mario@example.com')
    await expect(page.getByLabel('Nome')).toHaveValue('Mario')
    await expect(page.getByLabel('Messaggio')).toHaveValue('Vorrei usare il cloud condiviso.')
    await expect(page.getByRole('checkbox')).toBeChecked()

    await page.getByRole('button', { name: 'Riprova' }).click()
    await expect(page.getByRole('heading', { name: 'Richiesta inviata' })).toBeVisible()
    expect(attempts).toBe(2)
  })

  test('valida email e consenso senza chiamare Formspree', async ({ page }) => {
    let calls = 0
    await page.route('https://formspree.io/f/**', async (route) => {
      calls += 1
      await fulfillCors(route, 200, '{"ok":true}')
    })

    await page.getByRole('button', { name: 'Invia richiesta' }).click()
    await expect(page.getByText('Inserisci la tua email.')).toBeVisible()
    await expect(
      page.getByText('Devi acconsentire al trattamento dei dati per inviare la richiesta.'),
    ).toBeVisible()
    await expect(page.getByLabel('Email')).toBeFocused()

    await page.getByLabel('Email').fill('non-valida')
    await page.getByRole('button', { name: 'Invia richiesta' }).click()
    await expect(page.getByText('Inserisci un indirizzo email valido.')).toBeVisible()
    expect(calls).toBe(0)
  })

  test('un honeypot compilato mostra la conferma senza inviare nulla', async ({ page }) => {
    let calls = 0
    await page.route('https://formspree.io/f/**', async (route) => {
      calls += 1
      await fulfillCors(route, 200, '{"ok":true}')
    })

    await page.getByLabel('Email').fill('mario@example.com')
    await page.getByRole('checkbox').check()
    await page.locator('input[name="_gotcha"]').evaluate((element) => {
      const input = element as HTMLInputElement
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
      setter?.call(input, 'bot')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })

    await page.getByRole('button', { name: 'Invia richiesta' }).click()
    await expect(page.getByRole('heading', { name: 'Richiesta inviata' })).toBeVisible()
    expect(calls).toBe(0)
  })

  test('axe a 375 e 1440 px in italiano e inglese', async ({ page }) => {
    for (const locale of ['it', 'en']) {
      await page.setViewportSize({ width: 375, height: 844 })
      await page.goto('/#/request-access')
      await page.evaluate((value) => localStorage.setItem('layercost:locale', value), locale)
      await page.reload()
      await expect(
        page.getByRole('heading', {
          level: 1,
          name: locale === 'it' ? 'Richiedi accesso' : 'Request access',
        }),
      ).toBeVisible()
      await audit(page)
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        375,
      )

      await page.setViewportSize({ width: 1440, height: 900 })
      await audit(page)
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        1440,
      )
    }
  })
})
