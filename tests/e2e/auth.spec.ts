import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { spawnSync } from 'node:child_process'

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

/** Removes the account created by the open signup together with its workspace. */
function deleteSignupData(email: string): void {
  const dbUrl = process.env.SUPABASE_DB_URL
  if (!dbUrl) return
  const result = spawnSync(
    'psql',
    [
      dbUrl,
      '-v',
      'ON_ERROR_STOP=1',
      '-c',
      `delete from public.workspaces where id in (
         select m.workspace_id from public.workspace_members m
         join auth.users u on u.id = m.user_id where u.email = '${email}'
       );`,
      '-c',
      `delete from auth.users where email = '${email}';`,
    ],
    { encoding: 'utf8' },
  )
  if (result.status !== 0) {
    throw new Error(`Cleanup signup fallito: ${result.stderr || result.stdout}`)
  }
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

    // The mode switch sends new users to the signup form (EVO-2).
    await page.getByRole('radio', { name: 'Registrati' }).check()
    await expect(page.getByRole('heading', { name: 'Registrati' })).toBeVisible()
    await page.getByRole('radio', { name: 'Accedi' }).check()

    await page.getByLabel('Email').fill(account.email)
    await page.getByLabel('Password').fill(account.password)
    await page.getByRole('button', { name: 'Accedi' }).click()
    await page.waitForURL(/#\/calculator$/)

    await page.goto('/#/settings')
    await expect(page.getByRole('heading', { name: 'Sincronizzazione' })).toBeVisible()
    await expect(page.getByText(account.email)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Collega Google' })).toBeVisible()
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
    await expect(page.getByRole('radio', { name: 'Registrati' })).toBeVisible()
  } finally {
    await deleteUser(account.id)
  }
})

test('signup: crea un account, apre la sessione e mostra la quota dello spazio', async ({
  page,
}) => {
  const email = `signup-e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.test`
  const password = 'Signup-password-123!'
  try {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/#/login?mode=signup')
    await expect(page.getByRole('heading', { name: 'Registrati' })).toBeVisible()
    await audit(page)

    // Client-side validation with messages tied to the fields.
    await page.getByRole('button', { name: 'Crea account' }).click()
    await expect(page.getByText('Inserisci la tua email.')).toBeVisible()
    await expect(page.getByText('Inserisci una password.')).toBeVisible()
    await page.getByLabel('Email').fill(email)
    await page.getByLabel('Password').fill('abc')
    await page.getByRole('button', { name: 'Crea account' }).click()
    await expect(page.getByText('La password deve avere almeno 6 caratteri.')).toBeVisible()
    await audit(page)

    // Happy path: with auto-confirm the session starts immediately.
    await page.getByLabel('Password').fill(password)
    await page.getByRole('button', { name: 'Crea account' }).click()
    await page.waitForURL(/#\/calculator$/)

    await page.goto('/#/settings')
    await expect(page.getByText(email)).toBeVisible()
    const spazio = page.getByRole('region', { name: 'Spazio' })
    await expect(spazio.getByText('Membri')).toBeVisible()
    await expect(spazio.getByText('1/20')).toBeVisible()
    await expect(spazio.getByText('Preventivi')).toBeVisible()
    await expect(spazio.getByText('0/500')).toBeVisible()
    await audit(page)
  } finally {
    deleteSignupData(email)
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

test('Google: apre il provider e gestisce l’annullamento', async ({ page }) => {
  let authorizeUrl = ''

  await page.goto('/#/login')
  const appOrigin = new URL(page.url()).origin

  await page.route('**/auth/v1/authorize**', async (route) => {
    authorizeUrl = route.request().url()
    await route.fulfill({
      status: 302,
      headers: { location: `${appOrigin}/?error=access_denied` },
    })
  })

  const googleButton = page.getByRole('button', { name: 'Continua con Google' })
  await expect(googleButton).toBeVisible()
  await googleButton.click()

  await page.waitForURL(/#\/login$/)
  await expect(page.getByRole('alert')).toContainText('Accesso con Google annullato.')

  const url = new URL(authorizeUrl)
  expect(url.searchParams.get('provider')).toBe('google')
  expect(url.searchParams.get('redirect_to')).toBe(`${appOrigin}/`)
})
