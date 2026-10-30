import { calculateQuote, pricingFromSettings } from '../../domain/cost/quote'
import type { PrintLine, Quote } from '../../domain/types'
import { asCentigrams, asSeconds } from '../../domain/units'
import { createSeedConfig, seedIds } from '../../data/seed'

export const PREVIEW_DEFAULTS = { grams: 100, hours: 10 } as const
export const PREVIEW_MAX_GRAMS = 5000
export const PREVIEW_MAX_HOURS = 100

export interface PreviewResult {
  totalCost: number
  netPriceCents: number
  gainMicro: number
}

const QUOTE_DATE = '2026-01-01'
const CREATED_AT = '2026-01-01T00:00:00.000Z'

function previewQuote(grams: number, hours: number): Quote | undefined {
  const config = createSeedConfig()
  const printer = config.printers.find((candidate) => candidate.id === seedIds.kobra3)
  const material = config.materials.find((candidate) => candidate.id === seedIds.pla)
  if (!printer || !material) return undefined

  const line: PrintLine = {
    id: 'landing-preview-line',
    name: 'LayerCost preview',
    printerId: printer.id,
    timeSeconds: asSeconds(Math.round(hours * 3600)),
    materials: [
      {
        materialId: material.id,
        grams: asCentigrams(Math.round(grams * 100)),
      },
    ],
    quantity: 1,
    finishingSecondsPerUnit: asSeconds(0),
    extraIds: [],
    overrides: {},
  }

  return {
    id: 'landing-preview',
    name: 'LayerCost preview',
    quoteDate: QUOTE_DATE,
    locale: 'it',
    status: 'draft',
    lines: [line],
    job: {
      setupSeconds: asSeconds(0),
      designSeconds: asSeconds(0),
      extraIds: [],
    },
    pricing: pricingFromSettings(config.settings),
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
  }
}

/**
 * Runs the real engine on the seed configuration. The landing never writes the
 * quote anywhere: this is a read-only example built from fixed IDs and dates.
 */
export function calculatePreview(grams: number, hours: number): PreviewResult | undefined {
  if (!Number.isFinite(grams) || !Number.isFinite(hours) || grams <= 0 || hours <= 0) {
    return undefined
  }

  const quote = previewQuote(grams, hours)
  if (!quote) return undefined

  try {
    const result = calculateQuote(quote, createSeedConfig())
    return {
      totalCost: result.totalCost,
      netPriceCents: result.netPriceCents,
      gainMicro: result.netPriceCents * 10_000 - result.totalCost,
    }
  } catch {
    return undefined
  }
}
