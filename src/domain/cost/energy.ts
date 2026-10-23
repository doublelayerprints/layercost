import type { EnergyTariff, Material, MaterialUsage, Printer, Settings } from '../types'
import type { MicroEur, Seconds, Watts, Wh } from '../units'
import { DomainError, asMicroEur, asSeconds, asWatts, asWh } from '../units'
import { roundHalfUp } from '../money'

export interface EnergyResult {
  cost: MicroEur
  energyWh: Wh
  avgWatts: Watts
  tariff: EnergyTariff
}

export function resolveTariff(
  printer: Printer,
  settings: Settings,
  quoteDate: string,
): EnergyTariff {
  const eligible = settings.tariffs
    .filter((tariff) => tariff.effectiveFrom <= quoteDate)
    .sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom))

  if (printer.energyTariffId) {
    const override = eligible.find((tariff) => tariff.id === printer.energyTariffId)
    if (!override) {
      throw new DomainError(
        'TARIFF_NOT_FOUND',
        `La tariffa associata alla stampante ${printer.name} non è valida alla data ${quoteDate}.`,
      )
    }
    return override
  }

  const current = eligible.at(-1)
  if (!current) {
    throw new DomainError(
      'TARIFF_NOT_FOUND',
      `Nessuna tariffa energia valida alla data ${quoteDate}.`,
    )
  }
  return current
}

export function pickPower(
  printer: Printer,
  usages: MaterialUsage[],
  materials: Material[],
  overrideW?: Watts,
): Watts {
  if (overrideW !== undefined) {
    if (overrideW <= 0) {
      throw new DomainError('INVALID_POWER', 'La potenza media deve essere maggiore di zero.')
    }
    return overrideW
  }

  const activeUsages = usages.filter((usage) => usage.grams > 0)
  if (activeUsages.length === 0) {
    if (printer.defaultAvgWatts <= 0) {
      throw new DomainError('INVALID_POWER', 'Potenza media non configurata.')
    }
    return printer.defaultAvgWatts
  }

  let maxWatts = 0
  for (const usage of activeUsages) {
    const material = materials.find((candidate) => candidate.id === usage.materialId)
    if (!material) {
      throw new DomainError('MATERIAL_NOT_FOUND', `Materiale non trovato: ${usage.materialId}.`)
    }
    const profile = printer.powerProfiles[material.family]
    const watts = profile?.avgWatts ?? printer.defaultAvgWatts
    if (watts <= 0) {
      throw new DomainError(
        'INVALID_POWER',
        `Potenza media non valida per ${material.family} su ${printer.name}.`,
      )
    }
    maxWatts = Math.max(maxWatts, watts)
  }

  return asWatts(maxWatts)
}

export function effectiveSeconds(
  slicerSeconds: Seconds,
  overheadBp: number,
  startupMinutes: number,
): Seconds {
  if (slicerSeconds <= 0) {
    throw new DomainError('INVALID_TIME', 'Il tempo di stampa deve essere maggiore di zero.')
  }
  if (overheadBp < 0 || overheadBp > 10_000) {
    throw new DomainError('INVALID_OVERHEAD', 'La maggiorazione tempo non è valida.')
  }
  if (startupMinutes < 0) {
    throw new DomainError('INVALID_STARTUP', 'I minuti di avvio non possono essere negativi.')
  }

  const adjusted = roundHalfUp((slicerSeconds * (10_000 + overheadBp)) / 10_000)
  return asSeconds(adjusted + startupMinutes * 60)
}

export function calculateEnergy(
  printer: Printer,
  usages: MaterialUsage[],
  materials: Material[],
  settings: Settings,
  quoteDate: string,
  seconds: Seconds,
  overrideWh?: Wh,
  overrideW?: Watts,
): EnergyResult {
  const tariff = resolveTariff(printer, settings, quoteDate)
  const avgWatts = pickPower(printer, usages, materials, overrideW)
  const rawEnergyWh = overrideWh ?? (avgWatts * seconds) / 3600

  if (rawEnergyWh < 0) {
    throw new DomainError('INVALID_ENERGY', 'L’energia non può essere negativa.')
  }

  const cost = asMicroEur(roundHalfUp((rawEnergyWh * tariff.pricePerKWh) / 1000))
  return {
    cost,
    energyWh: asWh(roundHalfUp(rawEnergyWh)),
    avgWatts,
    tariff,
  }
}
