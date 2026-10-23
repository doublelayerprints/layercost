import type { Printer } from '../types'
import type { MicroEur, Seconds } from '../units'
import { DomainError, asMicroEur } from '../units'
import { roundHalfUp } from '../money'

export interface WearResult {
  depreciation: MicroEur
  maintenance: MicroEur
  hourlyDepreciation: MicroEur
  hourlyMaintenance: MicroEur
}

export function calculateWear(printer: Printer, seconds: Seconds): WearResult {
  if (printer.expectedLifeHours <= 0) {
    throw new DomainError('INVALID_LIFE', 'La vita utile della stampante deve essere positiva.')
  }
  if (printer.residualValueBp < 0 || printer.residualValueBp > 10_000) {
    throw new DomainError('INVALID_RESIDUAL', 'Il valore residuo deve essere tra 0% e 100%.')
  }

  const residual = asMicroEur(
    roundHalfUp((printer.purchasePrice * printer.residualValueBp) / 10_000),
  )
  if (residual > printer.purchasePrice) {
    throw new DomainError('INVALID_RESIDUAL', 'Il valore residuo supera il prezzo di acquisto.')
  }

  const fraction = seconds / (printer.expectedLifeHours * 3600)
  const depreciation = asMicroEur(roundHalfUp((printer.purchasePrice - residual) * fraction))
  const maintenance = asMicroEur(roundHalfUp((printer.maintenancePerHour * seconds) / 3600))
  const hourlyDepreciation = asMicroEur(
    roundHalfUp((printer.purchasePrice - residual) / printer.expectedLifeHours),
  )

  return {
    depreciation,
    maintenance,
    hourlyDepreciation,
    hourlyMaintenance: printer.maintenancePerHour,
  }
}
