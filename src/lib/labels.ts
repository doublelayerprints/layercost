import type {
  AllocationMode,
  MaterialFamily,
  PowerSource,
  PricingMode,
  RoundingMode,
  VatMode,
} from '@/domain/types'

export const materialFamilyLabels: Record<MaterialFamily, string> = {
  PLA: 'PLA',
  PETG: 'PETG',
  TPU: 'TPU',
  ABS: 'ABS',
  ASA: 'ASA',
  PLA_CF: 'PLA-CF',
  PETG_CF: 'PETG-CF',
  PVA: 'PVA',
  PA: 'PA',
  PC: 'PC',
  HIPS: 'HIPS',
  OTHER: 'Altro',
}

export const powerSourceLabels: Record<PowerSource, string> = {
  measured: 'Misurato',
  estimated: 'Stimato',
  vendor: 'Dichiarato',
}

export const pricingModeLabels: Record<PricingMode, string> = {
  markup: 'Ricarico sul costo',
  margin: 'Margine sul prezzo',
}

export const roundingModeLabels: Record<RoundingMode, string> = {
  up: 'Per eccesso',
  nearest: 'Al più vicino',
  down: 'Per difetto',
}

export const vatModeLabels: Record<VatMode, string> = {
  none: 'Nessuna IVA',
  excluded: 'IVA esclusa',
  included: 'IVA inclusa',
}

export const allocationModeLabels: Record<AllocationMode, string> = {
  proportional: 'Proporzionale al costo',
  equalPerUnit: 'Uguale per pezzo',
}

export function labelExtraUnit(unit: 'perUnit' | 'perJob'): string {
  return unit === 'perUnit' ? 'Per pezzo' : 'Per lavoro'
}
