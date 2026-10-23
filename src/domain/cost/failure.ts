import type { Material, MaterialUsage, PrintLine, Settings } from '../types'
import type { BasisPoints, MicroEur } from '../units'
import { DomainError, asBasisPoints, asMicroEur } from '../units'
import { roundHalfUp } from '../money'

export function validateFailureRate(bp: BasisPoints): BasisPoints {
  if (bp < 0 || bp > 5_000) {
    throw new DomainError(
      'INVALID_FAILURE_RATE',
      'Il tasso guasti deve essere compreso tra 0% e 50%.',
    )
  }
  return bp
}

export function resolveFailureRate(
  line: PrintLine,
  usages: MaterialUsage[],
  materials: Material[],
  settings: Settings,
): BasisPoints {
  if (line.overrides.failureRateBp !== undefined) {
    return validateFailureRate(line.overrides.failureRateBp)
  }

  const activeRates = usages
    .filter((usage) => usage.grams > 0)
    .map((usage) => {
      const material = materials.find((candidate) => candidate.id === usage.materialId)
      if (!material) {
        throw new DomainError('MATERIAL_NOT_FOUND', `Materiale non trovato: ${usage.materialId}.`)
      }
      return material.failureRateBp ?? settings.failureRateBp
    })

  if (activeRates.length === 0) {
    return validateFailureRate(settings.failureRateBp)
  }

  return validateFailureRate(asBasisPoints(Math.max(...activeRates)))
}

export function calculateFailureReserve(base: MicroEur, failureRateBp: BasisPoints): MicroEur {
  const rate = validateFailureRate(failureRateBp)
  if (rate === 0) return asMicroEur(0)
  return asMicroEur(roundHalfUp((base * rate) / (10_000 - rate)))
}
