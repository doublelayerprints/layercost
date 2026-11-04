import { spawnSync } from 'node:child_process'
import { expect, test, type Page } from '@playwright/test'

// Cloud screens need a backend: baselines are generated on Linux in CI with
// the local Supabase stack (see .github/workflows/visual-baselines.yml) and
// compared in the `database` job, which runs this spec through the sync
// runner right after the database reset. Volatile data (timestamps, dates)
// is masked via the `data-volatile` attributes in the components.
const syncEnabled = process.env.E2E_SYNC === '1'
test.skip(!process.env.CI || !syncEnabled, 'Baseline cloud generate su Linux in CI con Supabase locale')

// One worker for both viewports: the fixtures use fixed emails and workspace
// id, and the beforeAll must run exactly once.
test.describe.configure({ mode: 'serial' })

const supabaseUrl = process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
]

const ADMIN = {
  email: 'visual-admin@layercost.test',
  password: 'Baseline-Admin-2026!',
  displayName: 'Verifica Visuale',
}
const MEMBER = {
  email: 'visual-member@layercost.test',
  password: 'Baseline-Member-2026!',
  displayName: 'Altro Membro',
}
const WORKSPACE_ID = 'ws-visual-baseline'

interface Account {
  id: string
  email: string
  password: string
}

function adminHeaders(): Record<string, string> {
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

async function createUser(account: Omit<Account, 'id'> & { displayName: string }): Promise<Account> {
  const response = await admin('/auth/v1/admin/users', {
    method: 'POST',
    body: JSON.stringify({
      email: account.email,
      password: account.password,
      email_confirm: true,
      user_metadata: { display_name: account.displayName },
    }),
  })
  if (!response.ok) {
    throw new Error(`Creazione utente fallita: ${response.status} ${await response.text()}`)
  }
  const body = (await response.json()) as { id: string }
  return { id: body.id, email: account.email, password: account.password }
}

function psql(sql: string): void {
  const dbUrl = process.env.SUPABASE_DB_URL
  if (!dbUrl) throw new Error('SUPABASE_DB_URL mancante')
  const result = spawnSync('psql', [dbUrl, '-v', 'ON_ERROR_STOP=1', '-c', sql], {
    encoding: 'utf8',
  })
  if (result.status !== 0) {
    throw new Error(`SQL fallito: ${result.stderr || result.stdout}`)
  }
}

async function deleteUser(id: string): Promise<void> {
  await admin(`/auth/v1/admin/users/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

async function login(page: Page, account: Account): Promise<void> {
  await page.goto('/#/login')
  await page.getByLabel('Email').fill(account.email)
  await page.getByLabel('Password').fill(account.password)
  await page.getByRole('button', { name: 'Accedi' }).click()
  await page.waitForURL(/#\/calculator$/, { timeout: 60_000 })
}

async function waitForSynced(page: Page): Promise<void> {
  await expect(
    page.getByRole('link', { name: 'Stato sincronizzazione: Sincronizzato' }).first(),
  ).toBeVisible({ timeout: 30_000 })
}

async function screenshot(page: Page, name: string): Promise<void> {
  await page.evaluate(() => document.fonts.ready)
  await page.mouse.move(0, 0)
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
  await page.addStyleTag({ content: 'input[type="date"] { color: transparent !important; }' })
  await expect(page).toHaveScreenshot(name, {
    animations: 'disabled',
    mask: [page.locator('[data-volatile]')],
  })
}

let adminAccount: Account
let memberAccount: Account

test.beforeAll(async () => {
  // The sync runner resets the database before this suite, so the overview
  // numbers depend only on these fixtures.
  adminAccount = await createUser(ADMIN)
  memberAccount = await createUser(MEMBER)

  psql(`
    insert into public.workspaces (id, name, kind) values ('${WORKSPACE_ID}', 'Spazio visual', 'shared');
    insert into public.workspace_members (workspace_id, user_id, role) values
      ('${WORKSPACE_ID}', '${adminAccount.id}', 'owner'),
      ('${WORKSPACE_ID}', '${memberAccount.id}', 'editor');
    insert into public.quotes (id, workspace_id, status, name, quote_date, locale, lines, job, pricing)
    values ('quote-visual-1', '${WORKSPACE_ID}', 'saved', 'Preventivo visual', '2026-11-04', 'it', '[]'::jsonb,
            '{}'::jsonb, '{}'::jsonb);
  `)
})

test.afterAll(async () => {
  // Cascade removes members, quotes and limits with the workspace.
  psql(`delete from public.workspaces where id = '${WORKSPACE_ID}';`)
  await deleteUser(adminAccount.id)
  await deleteUser(memberAccount.id)
})

for (const viewport of viewports) {
  test(`schermate cloud a ${viewport.width} px`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    await login(page, adminAccount)
    await waitForSynced(page)

    await page.goto('/#/settings')
    await expect(page.getByText('Verifica Visuale').first()).toBeVisible()
    await screenshot(page, `cloud-impostazioni-${viewport.name}.png`)

    await page.goto('/#/admin')
    await page.getByText('Tetto di registrazione: 1000').waitFor({ timeout: 30_000 })
    await expect(page.getByRole('heading', { name: 'Spazi', level: 2 })).toBeVisible()
    await screenshot(page, `cloud-admin-${viewport.name}.png`)

    if (viewport.name === 'desktop') {
      const sharedRow = page.locator('tr', { hasText: 'Spazio visual' }).first()
      await sharedRow.getByRole('button', { name: /Dettagli/ }).click()
      const panel = page.locator(`#admin-ws-details-table-${WORKSPACE_ID}`)
      await expect(panel.getByText(ADMIN.email)).toBeVisible()
      await expect(panel.getByText(MEMBER.email)).toBeVisible()
      await screenshot(page, 'cloud-admin-dettagli-desktop.png')
    }
  })
}
