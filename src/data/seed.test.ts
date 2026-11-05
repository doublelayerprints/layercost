import { describe, expect, it } from 'vitest'
import { createSeedConfig, seedIds } from './seed'
import { createInitialData } from './storage'

describe('il seed italiano resta il default', () => {
  it('mantiene nomi, note e fornitore italiani', () => {
    const config = createSeedConfig()
    expect(config.extras.map((extra) => extra.name)).toEqual([
      'Sacchetto zip',
      'Scatola',
      'Etichetta',
      'Imbottitura',
      'Spedizione',
    ])
    expect(config.extras[0]?.category).toBe('Imballaggio')
    expect(config.materials[0]?.supplier).toBe('Generico')
    expect(config.settings.tariffs[0]?.label).toBe('Tariffa attuale')
    expect(config.printers[0]?.notes).toContain('stime modificabili')
  })

  it('mantiene invariati tutti i valori economici', () => {
    const itConfig = createSeedConfig('it')
    const enConfig = createSeedConfig('en')
    expect(enConfig.settings.markupBp).toBe(itConfig.settings.markupBp)
    expect(enConfig.materials.map((material) => material.pricePerKg)).toEqual(
      itConfig.materials.map((material) => material.pricePerKg),
    )
    expect(enConfig.extras.map((extra) => extra.amount)).toEqual(
      itConfig.extras.map((extra) => extra.amount),
    )
    expect(enConfig.printers.map((printer) => printer.purchasePrice)).toEqual(
      itConfig.printers.map((printer) => printer.purchasePrice),
    )
  })
})

describe('il seed inglese localizza nomi e note senza toccare gli ID', () => {
  it('traduce extra, categorie e fornitore', () => {
    const config = createSeedConfig('en')
    expect(config.extras.map((extra) => extra.name)).toEqual([
      'Zip bag',
      'Box',
      'Label',
      'Padding',
      'Shipping',
    ])
    expect(config.extras[0]?.category).toBe('Packaging')
    expect(config.extras[4]?.category).toBe('Shipping')
    expect(config.materials.every((material) => material.supplier === 'Generic')).toBe(true)
    expect(config.settings.tariffs[0]?.label).toBe('Current tariff')
    expect(config.settings.tariffs[0]?.notes).toContain('energy bill')
    expect(config.printers[0]?.notes).toContain('editable estimates')
    expect(config.printers[0]?.powerProfiles.PLA?.note).toContain('180–205 W')
  })

  it('espone gli stessi ID dell’italiano', () => {
    const collect = (locale: 'it' | 'en') => {
      const config = createSeedConfig(locale)
      return {
        printers: config.printers.map((printer) => printer.id).sort(),
        materials: config.materials.map((material) => material.id).sort(),
        extras: config.extras.map((extra) => extra.id).sort(),
        tariffs: config.settings.tariffs.map((tariff) => tariff.id).sort(),
      }
    }
    expect(collect('en')).toEqual(collect('it'))
    expect(collect('en').extras).toContain(seedIds.shipping)
  })
})

describe('createInitialData onora la lingua richiesta', () => {
  it('seme inglese: configurazione e bozza in inglese', () => {
    const data = createInitialData('en')
    expect(data.config.extras[0]?.name).toBe('Zip bag')
    expect(data.draft.name).toBe('New quote')
    expect(data.draft.locale).toBe('en')
    expect(data.schemaVersion).toBe(4)
  })

  it('default italiano quando nessuna lingua è richiesta', () => {
    const data = createInitialData()
    expect(data.config.extras[0]?.name).toBe('Sacchetto zip')
  })
})
