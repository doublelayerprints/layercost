import { spawnSync } from 'node:child_process'
import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Browser, type Page } from '@playwright/test'

const syncEnabled = process.env.E2E_SYNC === '1'
const supabaseUrl = process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

// A throwaway workspace reuses the seed IDs, so the tests must not run in parallel.
test.describe.configure({ mode: 'serial' })
test.skip(!syncEnabled, 'Richiede Supabase locale e una build con VITE_SUPABASE_*')

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

async function createUser(label: string): Promise<Account> {
  const email = `sync-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.test`
  const password = 'Test-password-123!'
  const response = await admin('/auth/v1/admin/users', {
    method: 'POST',
    body: JSON.stringify({ email, password, email_confirm: true }),
  })
  if (!response.ok) {
    throw new Error(`Creazione utente fallita: ${response.status} ${await response.text()}`)
  }
  const body = (await response.json()) as { id: string }
  return { id: body.id, email, password }
}

async function createWorkspace(accounts: Account[]): Promise<string> {
  const workspaceId = `ws-e2e-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  const workspace = await admin('/rest/v1/workspaces', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ id: workspaceId, name: 'E2E workspace' }),
  })
  if (!workspace.ok) {
    throw new Error(`Creazione workspace fallita: ${workspace.status} ${await workspace.text()}`)
  }

  const members = await admin('/rest/v1/workspace_members', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify(
      accounts.map((account) => ({
        workspace_id: workspaceId,
        user_id: account.id,
        role: 'owner',
      })),
    ),
  })
  if (!members.ok) {
    throw new Error(`Creazione membership fallita: ${members.status} ${await members.text()}`)
  }
  return workspaceId
}

async function seedOtherWorkspace(workspaceId: string): Promise<void> {
  const settings = await admin('/rest/v1/settings', {
    method: 'POST',
    body: JSON.stringify({ workspace_id: workspaceId }),
  })
  if (!settings.ok) {
    throw new Error(`Creazione settings fallita: ${settings.status} ${await settings.text()}`)
  }

  const quote = await admin('/rest/v1/quotes', {
    method: 'POST',
    body: JSON.stringify({
      id: `q-other-${Date.now()}`,
      workspace_id: workspaceId,
      status: 'saved',
      name: 'Altro workspace',
      quote_date: '2026-10-28',
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
  // The admin trigger path allows removing the last owner when there is no JWT
  // subject, so the normal workspace cascade can clean up all children.
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
  await page.goto('/#/login')
  await page.getByLabel('Email').fill(account.email)
  await page.getByLabel('Password').fill(account.password)
  await page.getByRole('button', { name: 'Accedi' }).click()
  await page.waitForURL(/#\/calculator$/)
}

async function waitForSynced(page: Page): Promise<void> {
  await expect(page.getByText('Sincronizzato', { exact: true }).first()).toBeVisible({
    timeout: 20_000,
  })
}

async function audit(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([])
}

test('primo login: importa i dati locali dopo aver scaricato un backup', async ({ page }) => {
  const account = await createUser('first')
  const workspaceId = await createWorkspace([account])

  try {
    await page.goto('/#/calculator')
    await page.locator('input[aria-label="Ore"]').first().fill('10')
    await page.locator('input[aria-label="Grammi materiale 1"]').fill('100')
    await page.getByRole('button', { name: 'Salva preventivo' }).click()
    await page.waitForURL(/#\/quotes\/.+/)
    const quoteName = await page.getByRole('heading', { level: 1 }).first().textContent()
    expect(quoteName).toBeTruthy()

    await login(page, account)
    const dialog = page.getByRole('dialog', { name: 'Carica i dati locali nel cloud' })
    await expect(dialog).toBeVisible()
    await audit(page)

    const downloadPromise = page.waitForEvent('download')
    await dialog.getByRole('button', { name: 'Importa i dati locali' }).click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/^layercost-backup-\d{4}-\d{2}-\d{2}\.json$/)

    await page.goto('/#/settings')
    await waitForSynced(page)
    await page.goto('/#/quotes')
    await expect(page.getByText(quoteName ?? 'Nuovo preventivo').first()).toBeVisible()

    // The guest copy is never overwritten by the connected-mode cache.
    const localRaw = await page.evaluate(() => localStorage.getItem('layercost:data'))
    expect(localRaw).toContain(quoteName)
  } finally {
    deleteWorkspace(workspaceId)
    await deleteUser(account.id)
  }
})

test('due dispositivi condividono un preventivo e risolvono un conflitto offline', async ({
  browser,
  page,
}) => {
  const accounts = [await createUser('a'), await createUser('b')]
  const workspaceId = await createWorkspace(accounts)
  const secondContext = await (browser as Browser).newContext()
  const secondPage = await secondContext.newPage()

  try {
    await page.setViewportSize({ width: 1440, height: 900 })
    await login(page, accounts[0]!)
    await page.goto('/#/settings')
    await waitForSynced(page)
    await audit(page)

    await page.goto('/#/calculator')
    await page.locator('input[aria-label="Ore"]').first().fill('10')
    await page.locator('input[aria-label="Grammi materiale 1"]').fill('100')
    await page.getByRole('button', { name: 'Salva preventivo' }).click()
    await page.waitForURL(/#\/quotes\/.+/)
    const quoteUrl = page.url()
    await page.goto('/#/settings')
    await waitForSynced(page)

    await secondPage.setViewportSize({ width: 1440, height: 900 })
    await login(secondPage, accounts[1]!)
    await secondPage.goto('/#/settings')
    await waitForSynced(secondPage)
    await secondPage.goto('/#/quotes')
    await expect(secondPage.getByText('Nuovo preventivo').first()).toBeVisible()

    await page.goto(quoteUrl)
    await expect(page.getByRole('heading', { name: 'Nuovo preventivo' }).first()).toBeVisible()
    const auditRegion = page.getByRole('region', { name: 'Workspace condiviso' })
    await expect(auditRegion.getByText('te', { exact: true }).first()).toBeVisible()
    await audit(page)

    await secondPage.goto(quoteUrl)
    await expect(
      secondPage.getByRole('heading', { name: 'Nuovo preventivo' }).first(),
    ).toBeVisible()
    await expect(
      secondPage
        .getByRole('region', { name: 'Workspace condiviso' })
        .getByText('un altro membro', { exact: true })
        .first(),
    ).toBeVisible()

    // A edits offline; B edits and saves while A is still offline.
    await page.context().setOffline(true)
    await page.getByRole('button', { name: 'Modifica preventivo' }).click()
    await page.waitForURL(/#\/calculator$/)
    await page.getByRole('button', { name: 'Rinomina preventivo' }).click()
    await page.getByLabel('Nome preventivo').fill('Versione A offline')
    await page.keyboard.press('Enter')
    await page.getByRole('button', { name: 'Salva modifiche' }).click()
    await page.waitForURL(/#\/quotes\/.+/)

    await secondPage.getByRole('button', { name: 'Modifica preventivo' }).click()
    await secondPage.waitForURL(/#\/calculator$/)
    await secondPage.getByRole('button', { name: 'Rinomina preventivo' }).click()
    await secondPage.getByLabel('Nome preventivo').fill('Versione B online')
    await secondPage.keyboard.press('Enter')
    await secondPage.getByRole('button', { name: 'Salva modifiche' }).click()
    await secondPage.waitForURL(/#\/quotes\/.+/)
    await secondPage.goto('/#/settings')
    await waitForSynced(secondPage)

    // A reconnects: the online event pushes the queued change, the server
    // rejects it and the conflict dialog opens by itself.
    await page.context().setOffline(false)
    const dialog = page.getByRole('dialog', { name: 'Conflitto di sincronizzazione' })
    await expect(dialog).toBeVisible({ timeout: 20_000 })
    await audit(page)

    await dialog.getByRole('button', { name: 'Ricarica la versione remota' }).click()
    await page.getByRole('link', { name: 'Impostazioni' }).first().click()
    await waitForSynced(page)

    await page.goto(quoteUrl)
    await expect(page.getByRole('heading', { name: 'Versione B online' }).first()).toBeVisible()
    await expect(
      page
        .getByRole('region', { name: 'Workspace condiviso' })
        .getByText('un altro membro', { exact: true })
        .first(),
    ).toBeVisible()
  } finally {
    await secondContext.close()
    deleteWorkspace(workspaceId)
    await Promise.all(accounts.map((account) => deleteUser(account.id)))
  }
})

test('crea un secondo spazio e isola i preventivi', async ({ page }) => {
  const account = await createUser('multi')
  const workspaceId = await createWorkspace([account])

  try {
    await page.setViewportSize({ width: 1440, height: 900 })
    await login(page, account)
    await page.goto('/#/settings')
    await waitForSynced(page)

    await page.getByRole('button', { name: 'Nuovo spazio' }).click()
    const createDialog = page.getByRole('dialog', { name: 'Crea uno spazio' })
    await createDialog.getByLabel('Nome dello spazio').fill('Secondo spazio')
    await createDialog.getByRole('button', { name: 'Crea spazio' }).click()
    await expect(page.getByLabel('Spazio attivo').first()).toHaveValue(/.+/)
    await waitForSynced(page)
    await expect(
      page.getByRole('main').getByText('Secondo spazio', { exact: true }).first(),
    ).toBeVisible()

    await page.goto('/#/calculator')
    await page.getByRole('button', { name: 'Rinomina preventivo' }).click()
    await page.getByLabel('Nome preventivo').fill('Solo secondo spazio')
    await page.keyboard.press('Enter')
    await page.locator('input[aria-label="Ore"]').first().fill('1')
    await page.locator('input[aria-label="Grammi materiale 1"]').fill('10')
    await page.getByRole('button', { name: 'Salva preventivo' }).click()
    await page.waitForURL(/#\/quotes\/.+/)

    await page.goto('/#/settings')
    await page.getByLabel('Spazio attivo').first().selectOption({ label: 'E2E workspace' })
    await waitForSynced(page)
    await page.goto('/#/quotes')
    await expect(page.getByText('Solo secondo spazio')).toHaveCount(0)

    await page.goto('/#/settings')
    await page.getByLabel('Spazio attivo').first().selectOption({ label: 'Secondo spazio' })
    await waitForSynced(page)
    await page.goto('/#/quotes')
    await expect(page.getByText('Solo secondo spazio').first()).toBeVisible()
  } finally {
    deleteWorkspace(workspaceId)
    await deleteUser(account.id)
  }
})

test('un invito aggiunge un utente allo spazio condiviso', async ({ browser, page }) => {
  const owner = await createUser('invite-owner')
  const guest = await createUser('invite-guest')
  const workspaceId = await createWorkspace([owner])
  const guestContext = await (browser as Browser).newContext()
  const guestPage = await guestContext.newPage()

  try {
    await page.setViewportSize({ width: 1440, height: 900 })
    await login(page, owner)
    await page.goto('/#/settings')
    await waitForSynced(page)

    await page.goto('/#/calculator')
    await page.getByRole('button', { name: 'Rinomina preventivo' }).click()
    await page.getByLabel('Nome preventivo').fill('Visibile agli invitati')
    await page.keyboard.press('Enter')
    await page.locator('input[aria-label="Ore"]').first().fill('1')
    await page.locator('input[aria-label="Grammi materiale 1"]').fill('10')
    await page.getByRole('button', { name: 'Salva preventivo' }).click()
    await page.waitForURL(/#\/quotes\/.+/)

    await page.goto('/#/settings')
    await waitForSynced(page)
    await page.getByRole('button', { name: 'Crea invito' }).click()
    const token = (await page.locator('code').first().textContent())?.trim()
    expect(token).toBeTruthy()

    await guestPage.setViewportSize({ width: 1440, height: 900 })
    await login(guestPage, guest)
    await guestPage.goto('/#/settings')
    await waitForSynced(guestPage)

    await guestPage.getByRole('button', { name: 'Hai un codice invito?' }).click()
    const redeemDialog = guestPage.getByRole('dialog', { name: 'Usa un codice invito' })
    await redeemDialog.getByLabel('Codice invito').fill(token ?? '')
    await redeemDialog.getByRole('button', { name: 'Entra nello spazio' }).click()
    await waitForSynced(guestPage)

    await guestPage.goto('/#/quotes')
    await expect(guestPage.getByText('Visibile agli invitati').first()).toBeVisible()
  } finally {
    await guestContext.close()
    deleteWorkspace(workspaceId)
    await Promise.all([deleteUser(owner.id), deleteUser(guest.id)])
  }
})

test('un utente senza membership o di un altro workspace non vede i dati condivisi', async ({
  browser,
  page,
}) => {
  const sharedOwner = await createUser('shared-owner')
  const sharedPeer = await createUser('shared-peer')
  const outsider = await createUser('outsider')
  const otherOwner = await createUser('other-owner')
  const sharedWorkspace = await createWorkspace([sharedOwner, sharedPeer])
  const otherWorkspace = await createWorkspace([otherOwner])
  await seedOtherWorkspace(otherWorkspace)
  const outsiderContext = await (browser as Browser).newContext()
  const otherContext = await (browser as Browser).newContext()
  const outsiderPage = await outsiderContext.newPage()
  const otherPage = await otherContext.newPage()

  try {
    await page.setViewportSize({ width: 1440, height: 900 })
    await login(page, sharedOwner)
    await page.goto('/#/settings')
    await waitForSynced(page)

    await page.goto('/#/calculator')
    await page.getByRole('button', { name: 'Rinomina preventivo' }).click()
    await page.getByLabel('Nome preventivo').fill('Solo workspace condiviso')
    await page.keyboard.press('Enter')
    await page.locator('input[aria-label="Ore"]').first().fill('10')
    await page.locator('input[aria-label="Grammi materiale 1"]').fill('100')
    await page.getByRole('button', { name: 'Salva preventivo' }).click()
    await page.waitForURL(/#\/quotes\/.+/)
    await page.goto('/#/settings')
    await waitForSynced(page)

    // Authenticated without an admin workspace: the app creates a personal one.
    await outsiderPage.setViewportSize({ width: 1440, height: 900 })
    await login(outsiderPage, outsider)
    await outsiderPage.goto('/#/settings')
    await waitForSynced(outsiderPage)
    await expect(outsiderPage.getByLabel('Spazio attivo').first()).toBeVisible()
    await audit(outsiderPage)
    await outsiderPage.goto('/#/quotes')
    await expect(outsiderPage.getByText('Solo workspace condiviso')).toHaveCount(0)

    // A member of another workspace only sees that workspace's archive.
    await otherPage.setViewportSize({ width: 1440, height: 900 })
    await login(otherPage, otherOwner)
    await otherPage.goto('/#/settings')
    await waitForSynced(otherPage)
    await otherPage.goto('/#/quotes')
    await expect(otherPage.getByText('Solo workspace condiviso')).toHaveCount(0)
    await expect(otherPage.getByText('Altro workspace').first()).toBeVisible()
  } finally {
    await outsiderContext.close()
    await otherContext.close()
    deleteWorkspace(sharedWorkspace)
    deleteWorkspace(otherWorkspace)
    await Promise.all(
      [sharedOwner, sharedPeer, outsider, otherOwner].map((account) => deleteUser(account.id)),
    )
  }
})
