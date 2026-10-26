import { DomainError } from '@/domain/units'
import type { MessageKey } from '@/i18n'

type Translate = (key: MessageKey, params?: Record<string, string | number>) => string

const DOMAIN_ERROR_KEYS: Partial<Record<string, MessageKey>> = {
  INVALID_NUMBER: 'errors.domain.INVALID_NUMBER',
  INVALID_COST: 'errors.domain.INVALID_COST',
  INVALID_DISCOUNT: 'errors.domain.INVALID_DISCOUNT',
  INVALID_ENERGY: 'errors.domain.INVALID_ENERGY',
  INVALID_GRAMS: 'errors.domain.INVALID_GRAMS',
  INVALID_LABOR: 'errors.domain.INVALID_LABOR',
  INVALID_LIFE: 'errors.domain.INVALID_LIFE',
  INVALID_MARGIN: 'errors.domain.INVALID_MARGIN',
  INVALID_MARKUP: 'errors.domain.INVALID_MARKUP',
  INVALID_OVERHEAD: 'errors.domain.INVALID_OVERHEAD',
  INVALID_POWER: 'errors.domain.INVALID_POWER',
  INVALID_PRICE: 'errors.domain.INVALID_PRICE',
  INVALID_QUANTITY: 'errors.domain.INVALID_QUANTITY',
  INVALID_RESIDUAL: 'errors.domain.INVALID_RESIDUAL',
  INVALID_STARTUP: 'errors.domain.INVALID_STARTUP',
  INVALID_STEP: 'errors.domain.INVALID_STEP',
  INVALID_TIME: 'errors.domain.INVALID_TIME',
  INVALID_TOTAL: 'errors.domain.INVALID_TOTAL',
  INVALID_VAT: 'errors.domain.INVALID_VAT',
  EXTRA_NOT_FOUND: 'errors.domain.EXTRA_NOT_FOUND',
  MATERIAL_NOT_FOUND: 'errors.domain.MATERIAL_NOT_FOUND',
  NO_GRAMS: 'errors.domain.NO_GRAMS',
  NO_LINES: 'errors.domain.NO_LINES',
  NO_MATERIALS: 'errors.domain.NO_MATERIALS',
  PRINTER_NOT_FOUND: 'errors.domain.PRINTER_NOT_FOUND',
  UNSAFE_NUMBER: 'errors.domain.UNSAFE_NUMBER',
}

/** Translates a domain error by code; unknown errors keep the caller's fallback. */
export function domainErrorMessage(error: unknown, t: Translate): string | undefined {
  if (!(error instanceof DomainError)) return undefined
  const key = DOMAIN_ERROR_KEYS[error.code]
  return key ? t(key) : undefined
}
