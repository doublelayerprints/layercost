import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const authEnabled = process.env.E2E_AUTH === '1'
const supabaseUrl = process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

test.skip(!authEnabled, 'Richiede Supabase locale e una build con VITE_SUPABASE_*')

async function createUser(): Promise<{ id: string; email: string; password: string }> {
  if (!supabaseUrl || !serviceRoleKey) throw new Error('Supabase admin env mancante')
  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.test`
  const password = 'Test-password-123!'
  const response = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password, email_confirm: true }),
  })
  if (!response.ok) {
    throw new Error(`Creazione utente fallita: ${response.status} ${await response.text()}`)
  }
  const body = (await response.json()) as { id: string }
  return { id: body.id, email, password }
}

async function deleteUser(id: string): Promise<void> {
  if (!supabaseUrl || !serviceRoleKey) return
  await fetch(`${supabaseUrl}/auth/v1/admin/users/${id}`, {
    method: 'DELETE',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
  })
}

async function audit(page: import('@playwright/test').Page) {
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([])
}

test('login, sessione persistente, impostazioni sync e logout', async ({ page }) => {
  const account = await createUser()
  try {
    await page.setViewportSize({ width: 375, height: 844 })
    await page.goto('/#/login')
    await expect(page.getByRole('heading', { name: 'Accedi' })).toBeVisible()
    await audit(page)
    await page.setViewportSize({ width: 1440, height: 900 })
    await audit(page)

    await page.getByLabel('Email').fill(account.email)
    await page.getByLabel('Password').fill(account.password)
    await page.getByRole('button', { name: 'Accedi' }).click()
    await page.waitForURL(/#\/$/)

    await page.goto('/#/settings')
    await expect(page.getByRole('heading', { name: 'Sincronizzazione' })).toBeVisible()
    await expect(page.getByText(account.email)).toBeVisible()
    await audit(page)

    await page.reload()
    await expect(page.getByText(account.email)).toBeVisible()

    await page.setViewportSize({ width: 1440, height: 900 })
    await expect(page.getByText(account.email)).toBeVisible()
    await audit(page)

    await page.getByRole('button', { name: 'Esci', exact: true }).first().click()
    const logoutDialog = page.getByRole('dialog', { name: 'Uscire dall’account?' })
    if (await logoutDialog.isVisible()) {
      await logoutDialog.getByRole('button', { name: 'Esci' }).click()
    }
    await expect(page.getByRole('button', { name: 'Accedi' })).toBeVisible()
  } finally {
    await deleteUser(account.id)
  }
})

test('mostra un errore con credenziali errate', async ({ page }) => {
  const account = await createUser()
  try {
    await page.goto('/#/login')
    await page.getByLabel('Email').fill(account.email)
    await page.getByLabel('Password').fill('Password-sbagliata-123!')
    await page.getByRole('button', { name: 'Accedi' }).click()
    await expect(page.getByRole('alert')).toContainText('Email o password non corretti.')
    await expect(page.getByRole('heading', { name: 'Accedi' })).toBeVisible()
  } finally {
    await deleteUser(account.id)
  }
})
