import type { Material, MaterialCostDetail, MaterialUsage } from '../types'
import type { MicroEur } from '../units'
import { DomainError, asMicroEur, cgToGrams } from '../units'
import { roundHalfUp } from '../money'

export interface MaterialCostResult {
  total: MicroEur
  details: MaterialCostDetail[]
}

export function calculateMaterialCost(
  usages: MaterialUsage[],
  materials: Material[],
): MaterialCostResult {
  let total = 0
  const details: MaterialCostDetail[] = []

  for (const usage of usages) {
    if (usage.grams < 0) {
      throw new DomainError('INVALID_GRAMS', 'I grammi non possono essere negativi.')
    }
    if (usage.grams === 0) continue

    const material = materials.find((candidate) => candidate.id === usage.materialId)
    if (!material) {
      throw new DomainError('MATERIAL_NOT_FOUND', `Materiale non trovato: ${usage.materialId}.`)
    }

    const grams = cgToGrams(usage.grams)
    const cost = asMicroEur(roundHalfUp((grams * material.pricePerKg) / 1000))
    total += cost
    details.push({
      materialId: material.id,
      name: material.name,
      grams: usage.grams,
      cost,
    })
  }

  return { total: asMicroEur(total), details }
}
