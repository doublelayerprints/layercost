import type { MessageKey } from '@/i18n'
import type {
  AllocationMode,
  MaterialFamily,
  PowerSource,
  PricingMode,
  RoundingMode,
  VatMode,
} from '@/domain/types'

export type Translate = (key: MessageKey) => string

/**
 * Canonical ordering for material families. The values are also used as fallback
 * labels by non-UI code; visible labels go through `materialFamilyLabel`.
 */
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

const MATERIAL_KEYS: Record<MaterialFamily, MessageKey> = {
  PLA: 'labels.material.PLA',
  PETG: 'labels.material.PETG',
  TPU: 'labels.material.TPU',
  ABS: 'labels.material.ABS',
  ASA: 'labels.material.ASA',
  PLA_CF: 'labels.material.PLA_CF',
  PETG_CF: 'labels.material.PETG_CF',
  PVA: 'labels.material.PVA',
  PA: 'labels.material.PA',
  PC: 'labels.material.PC',
  HIPS: 'labels.material.HIPS',
  OTHER: 'labels.material.OTHER',
}

const POWER_SOURCE_KEYS: Record<PowerSource, MessageKey> = {
  measured: 'labels.powerSource.measured',
  estimated: 'labels.powerSource.estimated',
  vendor: 'labels.powerSource.vendor',
}

const PRICING_MODE_KEYS: Record<PricingMode, MessageKey> = {
  markup: 'labels.pricingMode.markup',
  margin: 'labels.pricingMode.margin',
}

const ROUNDING_MODE_KEYS: Record<RoundingMode, MessageKey> = {
  up: 'labels.roundingMode.up',
  nearest: 'labels.roundingMode.nearest',
  down: 'labels.roundingMode.down',
}

const VAT_MODE_KEYS: Record<VatMode, MessageKey> = {
  none: 'labels.vatMode.none',
  excluded: 'labels.vatMode.excluded',
  included: 'labels.vatMode.included',
}

const ALLOCATION_MODE_KEYS: Record<AllocationMode, MessageKey> = {
  proportional: 'labels.allocationMode.proportional',
  equalPerUnit: 'labels.allocationMode.equalPerUnit',
}

const EXTRA_UNIT_KEYS: Record<'perUnit' | 'perJob', MessageKey> = {
  perUnit: 'labels.extraUnit.perUnit',
  perJob: 'labels.extraUnit.perJob',
}

export function materialFamilyLabel(family: MaterialFamily, t: Translate): string {
  return t(MATERIAL_KEYS[family])
}

export function powerSourceLabel(source: PowerSource, t: Translate): string {
  return t(POWER_SOURCE_KEYS[source])
}

export function pricingModeLabel(mode: PricingMode, t: Translate): string {
  return t(PRICING_MODE_KEYS[mode])
}

export function roundingModeLabel(mode: RoundingMode, t: Translate): string {
  return t(ROUNDING_MODE_KEYS[mode])
}

export function vatModeLabel(mode: VatMode, t: Translate): string {
  return t(VAT_MODE_KEYS[mode])
}

export function allocationModeLabel(mode: AllocationMode, t: Translate): string {
  return t(ALLOCATION_MODE_KEYS[mode])
}

export function extraUnitLabel(unit: 'perUnit' | 'perJob', t: Translate): string {
  return t(EXTRA_UNIT_KEYS[unit])
}
