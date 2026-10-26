import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'

const KOBRA3 = 'tests/fixtures/3mf/anycubic-kobra3-pla.gcode.3mf'
const KOBRAX_2PLATES = 'tests/fixtures/3mf/anycubic-kobrax-2plates.gcode.3mf'
const UNSLICED = 'tests/fixtures/3mf/anycubic-unsliced-project.3mf'
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

test.use({ colorScheme: 'light' })

test('importa un .3mf, compila la riga, la salva e la ricarica', async ({ page }) => {
  await page.goto('/')

  await page.locator('input[type="file"]').setInputFiles(KOBRA3)
  const dialog = page.getByRole('dialog', { name: 'Importa .3mf' })
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText('anycubic-kobra3-pla.gcode.3mf')
  await expect(dialog).toContainText('Anycubic Slicer Next')
  await expect(dialog.getByLabel('Stampante')).toHaveValue('printer-kobra-3')
  await expect(dialog.getByLabel(/Materiale per PLA/)).toHaveValue('material-pla')

  const results = await new AxeBuilder({ page })
    .include('[role="dialog"]')
    .withTags(WCAG_TAGS)
    .analyze()
  expect(results.violations).toEqual([])

  await dialog.getByRole('button', { name: 'Importa 1 riga' }).click()
  await expect(dialog).toHaveCount(0)
  await expect(page.getByText('1 riga importata da anycubic-kobra3-pla.gcode.3mf')).toBeVisible()

  const name = page.locator('input[aria-label="Nome della stampa"]').first()
  await expect(name).toHaveValue('anycubic-kobra3-pla — piatto 1')
  await expect(name).toBeFocused()
  await expect(page.locator('select[aria-label="Materiale 1"]').first()).toHaveValue('material-pla')
  await expect(page.locator('input[aria-label="Grammi materiale 1"]').first()).toHaveValue('1,46')

  await page.getByRole('button', { name: 'Salva preventivo' }).click()
  await page.waitForURL(/#\/quotes\//)
  await expect(page.getByText('anycubic-kobra3-pla — piatto 1').first()).toBeVisible()
  await expect(page.getByText('1,46 g').first()).toBeVisible()

  await page.reload()
  await expect(page.getByText('anycubic-kobra3-pla — piatto 1').first()).toBeVisible()
})

test('importa più piatti come righe separate', async ({ page }) => {
  await page.goto('/')
  await page.locator('input[type="file"]').setInputFiles(KOBRAX_2PLATES)
  const dialog = page.getByRole('dialog', { name: 'Importa .3mf' })
  await expect(dialog.getByRole('checkbox')).toHaveCount(2)
  await dialog.getByRole('button', { name: 'Importa 2 righe' }).click()

  await expect(page.locator('input[aria-label="Nome della stampa"]')).toHaveCount(2)
  await expect(page.locator('input[aria-label="Grammi materiale 1"]').nth(0)).toHaveValue('38,41')
  await expect(page.locator('input[aria-label="Grammi materiale 1"]').nth(1)).toHaveValue('13,79')
})

test('richiede la scelta quando più materiali corrispondono', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Ho capito, inizia' }).click()
  await page.evaluate(() => {
    const raw = localStorage.getItem('layercost:data')
    if (!raw) throw new Error('Dati locali non trovati')
    const data = JSON.parse(raw) as {
      config: { materials: Array<Record<string, unknown> & { id: string }> }
    }
    const pla = data.config.materials.find((material) => material.id === 'material-pla')
    if (!pla) throw new Error('PLA di seed non trovato')
    data.config.materials.push({
      ...pla,
      id: 'material-pla-2',
      name: 'PLA bianco',
      color: 'Bianco',
    })
    localStorage.setItem('layercost:data', JSON.stringify(data))
  })
  await page.reload()

  await page.locator('input[type="file"]').setInputFiles(KOBRA3)
  const dialog = page.getByRole('dialog', { name: 'Importa .3mf' })
  const material = dialog.getByLabel(/Materiale per PLA/)
  await expect(material).toHaveValue('')
  await expect(dialog.getByRole('button', { name: 'Importa 1 riga' })).toBeDisabled()

  await material.selectOption('material-pla-2')
  await expect(dialog.getByRole('button', { name: 'Importa 1 riga' })).toBeEnabled()
  await dialog.getByRole('button', { name: 'Importa 1 riga' }).click()
  await expect(page.locator('select[aria-label="Materiale 1"]')).toHaveValue('material-pla-2')
})

test('chiede conferma e aggiunge alla bozza esistente', async ({ page }) => {
  await page.goto('/')
  const grams = page.locator('input[aria-label="Grammi materiale 1"]')
  await grams.fill('100')

  await page.locator('input[type="file"]').setInputFiles(KOBRA3)
  const preview = page.getByRole('dialog', { name: 'Importa .3mf' })
  await preview.getByRole('button', { name: 'Importa 1 riga' }).click()

  const confirm = page.getByRole('dialog', { name: 'Aggiungere o sostituire?' })
  await expect(confirm).toBeVisible()
  await expect(confirm).toContainText('La bozza corrente non è ancora nello storico')
  const append = confirm.getByRole('button', { name: 'Aggiungi alla bozza' })
  await expect(append).toBeFocused()
  await append.click()

  await expect(page.getByText('1 riga importata da anycubic-kobra3-pla.gcode.3mf')).toBeVisible()
  await expect(page.locator('input[aria-label="Grammi materiale 1"]')).toHaveCount(2)
  await expect(page.locator('input[aria-label="Grammi materiale 1"]').nth(0)).toHaveValue('100')
  await expect(page.locator('input[aria-label="Grammi materiale 1"]').nth(1)).toHaveValue('1,46')
})

test('sostituisce le righe della bozza su richiesta', async ({ page }) => {
  await page.goto('/')
  await page.locator('input[aria-label="Grammi materiale 1"]').fill('100')

  await page.locator('input[type="file"]').setInputFiles(KOBRA3)
  await page
    .getByRole('dialog', { name: 'Importa .3mf' })
    .getByRole('button', { name: 'Importa 1 riga' })
    .click()
  await page
    .getByRole('dialog', { name: 'Aggiungere o sostituire?' })
    .getByRole('button', { name: 'Sostituisci le righe' })
    .click()

  await expect(page.locator('input[aria-label="Grammi materiale 1"]')).toHaveCount(1)
  await expect(page.locator('input[aria-label="Grammi materiale 1"]')).toHaveValue('1,46')
})

test('rifiuta un progetto non slicato senza aprire il dialogo', async ({ page }) => {
  await page.goto('/')
  await page.locator('input[type="file"]').setInputFiles(UNSLICED)

  await expect(page.getByRole('alert')).toContainText('Il file non contiene un preventivo slicato')
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('accetta il drag & drop di un .3mf', async ({ page }) => {
  const bytes = readFileSync(KOBRA3)
  await page.goto('/')
  await page.evaluate(
    ({ data, name }) => {
      const binary = atob(data)
      const array = new Uint8Array(binary.length)
      for (let index = 0; index < binary.length; index += 1) {
        array[index] = binary.charCodeAt(index)
      }
      const file = new File([array], name, { type: 'application/zip' })
      const transfer = new DataTransfer()
      transfer.items.add(file)
      const zone = document.querySelector('[data-dropzone="3mf"]')
      if (!zone) throw new Error('Drop zone non trovata')
      zone.dispatchEvent(
        new DragEvent('dragenter', { bubbles: true, cancelable: true, dataTransfer: transfer }),
      )
      zone.dispatchEvent(
        new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: transfer }),
      )
      zone.dispatchEvent(
        new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: transfer }),
      )
    },
    { data: bytes.toString('base64'), name: 'dragged.gcode.3mf' },
  )

  const dialog = page.getByRole('dialog', { name: 'Importa .3mf' })
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText('dragged.gcode.3mf')
})

test('il dialogo non crea overflow orizzontale a 375 px', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/')
  await page.locator('input[type="file"]').setInputFiles(KOBRA3)
  await expect(page.getByRole('dialog', { name: 'Importa .3mf' })).toBeVisible()

  const hasOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  )
  expect(hasOverflow).toBe(false)
})
