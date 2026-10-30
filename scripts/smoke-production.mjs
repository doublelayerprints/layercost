import { chromium, expect } from '@playwright/test'

const supabaseUrl = process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const appUrl = process.env.PROD_URL ?? 'https://layercost.vercel.app'

if (!supabaseUrl || !serviceRoleKey) {
  console.error('SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY sono obbligatori.')
  process.exit(1)
}

if (!appUrl.startsWith('https://') && !appUrl.startsWith('http://127.0.0.1')) {
  console.error('PROD_URL deve essere un URL https (o http://127.0.0.1 per una prova locale).')
  process.exit(1)
}

const adminHeaders = {
  apikey: serviceRoleKey,
  Authorization: `Bearer ${serviceRoleKey}`,
  'Content-Type': 'application/json',
}

async function admin(path, init = {}) {
  const response = await fetch(`${supabaseUrl}${path}`, {
    ...init,
    headers: { ...adminHeaders, ...(init.headers ?? {}) },
  })
  if (!response.ok) {
    throw new Error(`${path}: ${response.status} ${await response.text()}`)
  }
  return response
}

async function createUser() {
  const email = `smoke-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.test`
  const password = `Smoke-${crypto.randomUUID()}`
  const response = await admin('/auth/v1/admin/users', {
    method: 'POST',
    body: JSON.stringify({ email, password, email_confirm: true }),
  })
  const body = await response.json()
  return { id: body.id, email, password }
}

async function createWorkspace(userId) {
  const workspaceId = `ws-smoke-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  await admin('/rest/v1/workspaces', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ id: workspaceId, name: 'Production smoke test' }),
  })
  await admin('/rest/v1/workspace_members', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ workspace_id: workspaceId, user_id: userId, role: 'owner' }),
  })
  return workspaceId
}

async function deleteWorkspace(workspaceId) {
  await admin(`/rest/v1/workspaces?id=eq.${encodeURIComponent(workspaceId)}`, {
    method: 'DELETE',
    headers: { Prefer: 'return=minimal' },
  })
}

async function deleteUser(userId) {
  await admin(`/auth/v1/admin/users/${encodeURIComponent(userId)}`, { method: 'DELETE' })
}

/**
 * Entity IDs are global primary keys, so a new workspace cannot import the
 * same seed IDs that already exist in ws-doublelayer. Rename the guest seed
 * once in this disposable browser context: the smoke keeps its own workspace,
 * tests the first-login import and never touches production rows.
 */
async function renameGuestIds(page) {
  await page.addInitScript(() => {
    const marker = 'layercost:smoke-ids'
    if (localStorage.getItem(marker)) return
    const raw = localStorage.getItem('layercost:data')
    if (!raw) return
    try {
      const data = JSON.parse(raw)
      const suffix = `-smoke-${Date.now().toString(36)}`
      const ids = new Map()
      const rename = (id) => {
        if (!id) return id
        if (!ids.has(id)) ids.set(id, `${id}${suffix}`)
        return ids.get(id)
      }
      const config = data.config ?? {}
      const tariffs = config.settings?.tariffs ?? []
      for (const tariff of tariffs) tariff.id = rename(tariff.id)
      for (const printer of config.printers ?? []) {
        printer.id = rename(printer.id)
        if (printer.energyTariffId) printer.energyTariffId = rename(printer.energyTariffId)
      }
      for (const material of config.materials ?? []) material.id = rename(material.id)
      for (const extra of config.extras ?? []) extra.id = rename(extra.id)

      const renameQuote = (quote) => {
        for (const line of quote.lines ?? []) {
          if (line.printerId) line.printerId = rename(line.printerId)
          for (const usage of line.materials ?? []) {
            if (usage.materialId) usage.materialId = rename(usage.materialId)
          }
          line.extraIds = (line.extraIds ?? []).map(rename)
        }
        quote.job.extraIds = (quote.job?.extraIds ?? []).map(rename)
      }
      if (data.draft) renameQuote(data.draft)
      for (const quote of data.quotes ?? []) renameQuote(quote)

      localStorage.setItem('layercost:data', JSON.stringify(data))
      localStorage.setItem(marker, '1')
    } catch {
      // Leave the data untouched; the smoke will fail with a clear sync error.
    }
  })
  await page.reload()
}

const user = await createUser()
let workspaceId
let browser

try {
  workspaceId = await createWorkspace(user.id)
  browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

  await page.goto(`${appUrl}/#/login`)
  await expect(page.getByRole('heading', { name: 'Accedi' })).toBeVisible()
  await renameGuestIds(page)
  await expect(page.getByRole('heading', { name: 'Accedi' })).toBeVisible()
  await page.getByLabel('Email').fill(user.email)
  await page.getByLabel('Password').fill(user.password)
  await page.getByRole('button', { name: 'Accedi' }).click()
  await page.waitForURL(/#\/calculator$/)

  const importDialog = page.getByRole('dialog', { name: 'Carica i dati locali nel cloud' })
  const needsImport = await importDialog
    .waitFor({ state: 'visible', timeout: 10_000 })
    .then(() => true)
    .catch(() => false)
  if (needsImport) {
    const downloadPromise = page.waitForEvent('download')
    await importDialog.getByRole('button', { name: 'Importa i dati locali' }).click()
    await downloadPromise
  }

  await page.goto(`${appUrl}/#/settings`)
  await expect(page.getByText('Sincronizzato', { exact: true }).first()).toBeVisible({
    timeout: 30_000,
  })

  const quoteName = `Smoke ${Date.now()}`
  await page.goto(`${appUrl}/#/calculator`)
  await page.getByRole('button', { name: 'Rinomina preventivo' }).click()
  await page.getByLabel('Nome preventivo').fill(quoteName)
  await page.keyboard.press('Enter')
  await page.locator('input[aria-label="Ore"]').first().fill('1')
  await page.locator('input[aria-label="Grammi materiale 1"]').fill('10')
  await page.getByRole('button', { name: 'Salva preventivo' }).click()
  await page.waitForURL(/#\/quotes\/.+/)

  await page.goto(`${appUrl}/#/settings`)
  await expect(page.getByText('Sincronizzato', { exact: true }).first()).toBeVisible({
    timeout: 30_000,
  })
  await page.goto(`${appUrl}/#/quotes`)
  await expect(page.getByText(quoteName).first()).toBeVisible()

  console.log(`Smoke test produzione OK: ${appUrl} (${quoteName})`)
} finally {
  await browser?.close()
  if (workspaceId) {
    try {
      await deleteWorkspace(workspaceId)
    } catch (error) {
      console.error('Cleanup workspace fallito:', error)
    }
  }
  try {
    await deleteUser(user.id)
  } catch (error) {
    console.error('Cleanup utente fallito:', error)
  }
}
