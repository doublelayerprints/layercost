import { spawnSync } from 'node:child_process'
import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

const syncEnabled = process.env.E2E_SYNC === '1'
const supabaseUrl = process.env.SUPABASE_URL
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

// The console tests create throwaway accounts and workspaces: serial, like sync.
test.describe.configure({ mode: 'serial' })
test.skip(!syncEnabled, 'Richiede Supabase locale e una build con VITE_SUPABASE_*')

interface Account {
  id: string
  email: string
  password: string
}

function adminHeaders(): Record<string, string> {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY mancante')
  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    'Content-Type': 'application/json',
  }
}

async function admin(path: string, init: RequestInit = {}): Promise<Response> {
  if (!supabaseUrl) throw new Error('SUPABASE_URL mancante')
  return fetch(`${supabaseUrl}${path}`, {
    ...init,
    headers: { ...adminHeaders(), ...(init.headers ?? {}) },
  })
}

async function createUser(label: string, displayName = label): Promise<Account> {
  const email = `admin-e2e-${label}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 7)}@example.test`
  const password = 'Test-password-123!'
  const response = await admin('/auth/v1/admin/users', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: displayName },
    }),
  })
  if (!response.ok) {
    throw new Error(`Creazione utente fallita: ${response.status} ${await response.text()}`)
  }
  const body = (await response.json()) as { id: string }
  return { id: body.id, email, password }
}

/** Marks the account as administrator before the first login (EVO-8 SQL). */
function setAdminFlag(userId: string, isAdmin: boolean): void {
  const dbUrl = process.env.SUPABASE_DB_URL
  if (!dbUrl) throw new Error('SUPABASE_DB_URL mancante')
  const result = spawnSync(
    'psql',
    [
      dbUrl,
      '-v',
      'ON_ERROR_STOP=1',
      '-c',
      `insert into public.profiles (user_id, display_name, is_admin)
       values ('${userId}', 'Admin E2E', ${isAdmin})
       on conflict (user_id) do update set is_admin = ${isAdmin};`,
    ],
    { encoding: 'utf8' },
  )
  if (result.status !== 0) {
    throw new Error(`Impostazione del flag admin fallita: ${result.stderr || result.stdout}`)
  }
}

async function createWorkspace(account: Account): Promise<string> {
  const workspaceId = `ws-admin-e2e-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  const workspace = await admin('/rest/v1/workspaces', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ id: workspaceId, name: 'E2E admin' }),
  })
  if (!workspace.ok) {
    throw new Error(`Creazione workspace fallita: ${workspace.status} ${await workspace.text()}`)
  }
  const members = await admin('/rest/v1/workspace_members', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ workspace_id: workspaceId, user_id: account.id, role: 'owner' }),
  })
  if (!members.ok) {
    throw new Error(`Creazione membership fallita: ${members.status} ${await members.text()}`)
  }
  return workspaceId
}

async function seedQuote(workspaceId: string, id: string, name: string): Promise<void> {
  const quote = await admin('/rest/v1/quotes', {
    method: 'POST',
    body: JSON.stringify({
      id,
      workspace_id: workspaceId,
      status: 'saved',
      name,
      quote_date: '2026-11-04',
      locale: 'it',
      lines: [],
      job: { setupSeconds: 0, designSeconds: 0, extraIds: [] },
      pricing: {
        mode: 'markup',
        markupBp: 3000,
        marginBp: 2500,
        roundingStep: 100000,
        roundingMode: 'up',
        vatMode: 'none',
        vatRateBp: 0,
      },
      schema_version: 4,
    }),
  })
  if (!quote.ok) {
    throw new Error(`Creazione preventivo fallita: ${quote.status} ${await quote.text()}`)
  }
}

function deleteWorkspace(workspaceId: string): void {
  const dbUrl = process.env.SUPABASE_DB_URL
  if (!dbUrl) return
  const result = spawnSync(
    'psql',
    [
      dbUrl,
      '-v',
      'ON_ERROR_STOP=1',
      '-c',
      `delete from public.workspaces where id = '${workspaceId}';`,
    ],
    { encoding: 'utf8' },
  )
  if (result.status !== 0) {
    throw new Error(`Cleanup workspace fallito: ${result.stderr || result.stdout}`)
  }
}

async function deleteUser(id: string): Promise<void> {
  await admin(`/auth/v1/admin/users/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

async function login(page: Page, account: Account): Promise<void> {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/#/login')
  await page.getByLabel('Email').fill(account.email)
  await page.getByLabel('Password').fill(account.password)
  await page.getByRole('button', { name: 'Accedi' }).click()
  await page.waitForURL(/#\/calculator$/)
}

async function waitForSynced(page: Page): Promise<void> {
  await expect(
    page.getByRole('link', { name: 'Stato sincronizzazione: Sincronizzato' }).first(),
  ).toBeVisible({ timeout: 30_000 })
}

async function audit(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([])
}

test('la console admin mostra utenti, spazi e tetti e permette la modifica', async ({
  page,
}) => {
  const adminAccount = await createUser('flagged', 'Admin E2E')
  const plainAccount = await createUser('plain', 'Bruno')
  let workspaceId: string | undefined

  try {
    // The flag must exist before the first login: SyncController checks it at
    // bootstrap and the lazy profile creation must not overwrite it.
    setAdminFlag(adminAccount.id, true)
    workspaceId = await createWorkspace(adminAccount)
    await seedQuote(workspaceId, `q-admin-e2e-1-${Date.now()}`, 'Prima stampa')
    await seedQuote(workspaceId, `q-admin-e2e-2-${Date.now()}`, 'Seconda stampa')

    await login(page, adminAccount)
    await waitForSynced(page)

    // Sidebar group and link appear only for the administrator.
    const adminLink = page.getByRole('link', { name: 'Console admin' })
    await expect(adminLink).toBeVisible()
    await adminLink.click()
    await page.waitForURL(/#\/admin$/)

    // Overview: two accounts exist, the signup cap comes from max_users().
    await expect(page.getByText('Tetto di registrazione: 1000')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Utenti', level: 2 })).toBeVisible()

    // Users: both emails are visible to the admin, with the email provider.
    await expect(page.getByText(adminAccount.email).first()).toBeVisible()
    await expect(page.getByText(plainAccount.email).first()).toBeVisible()

    // Workspaces: the shared workspace shows usage against the defaults.
    await expect(page.getByText('E2E admin').first()).toBeVisible()
    await expect(page.getByText('1/20').first()).toBeVisible()
    await expect(page.getByText('2/500').first()).toBeVisible()

    await audit(page)

    // Details panel of the shared workspace (the list is newest first, so the
    // personal workspace of the admin comes before it): members with role,
    // then the caps editor.
    const sharedRow = page.locator('tr', { hasText: 'E2E admin' }).first()
    await sharedRow.getByRole('button', { name: /Dettagli/ }).click()
    const panel = page.locator(`#admin-ws-details-table-${workspaceId}`)
    await expect(panel.getByText(adminAccount.email)).toBeVisible()
    await expect(panel.getByText('Owner', { exact: true })).toBeVisible()

    const membersInput = panel.getByLabel('Membri max')
    const quotesInput = panel.getByLabel('Preventivi max')
    await expect(membersInput).toHaveValue('20')
    await expect(quotesInput).toHaveValue('500')

    // Lowering a cap under the current usage warns before saving.
    await quotesInput.fill('1')
    await expect(panel.getByText('Il valore è sotto l’uso attuale')).toBeVisible()
    await quotesInput.fill('800')
    await expect(panel.getByText('Il valore è sotto l’uso attuale')).toBeHidden()

    await membersInput.fill('30')
    await panel.getByRole('button', { name: 'Salva tetti' }).click()
    await expect(panel.getByText('Tetti aggiornati.')).toBeVisible()
    await expect(page.getByText('1/30').first()).toBeVisible()
    await expect(page.getByText('2/800').first()).toBeVisible()

    // The owner-facing quota follows the new caps immediately.
    await page.goto('/#/settings')
    await waitForSynced(page)
    await expect(page.getByText('1/30')).toBeVisible()
    await expect(page.getByText('2/800')).toBeVisible()
  } finally {
    if (workspaceId) deleteWorkspace(workspaceId)
    await deleteUser(adminAccount.id)
    await deleteUser(plainAccount.id)
  }
})

test('un utente senza flag non vede la console né la voce in sidebar', async ({ page }) => {
  const plainAccount = await createUser('noadmin', 'Chiara')

  try {
    await login(page, plainAccount)
    await waitForSynced(page)

    await expect(page.getByRole('link', { name: 'Console admin' })).toHaveCount(0)

    // Direct navigation renders the reserved state; the RPCs refuse anyway.
    await page.goto('/#/admin')
    await expect(page.getByText('Area riservata')).toBeVisible()
    await audit(page)
  } finally {
    await deleteUser(plainAccount.id)
  }
})
