import { DomainError, assertSafeInteger } from './units'

export function assertSafe(value: number, label = 'valore'): void {
  if (!Number.isFinite(value) || Math.abs(value) > Number.MAX_SAFE_INTEGER) {
    throw new DomainError('UNSAFE_NUMBER', `${label} è troppo grande o non finito.`)
  }
}

/**
 * Arrotondamento half-up, simmetrico per i numeri negativi.
 * I costi sono non negativi; il margine effettivo può essere negativo.
 */
export function roundHalfUp(value: number): number {
  assertSafe(value)
  return value >= 0 ? Math.floor(value + 0.5) : Math.ceil(value - 0.5)
}

export function roundToStep(value: number, step: number, mode: 'up' | 'nearest' | 'down'): number {
  assertSafe(value)
  assertSafeInteger(step, 'Passo di arrotondamento')
  if (step <= 0)
    throw new DomainError('INVALID_STEP', 'Il passo di arrotondamento deve essere positivo.')
  if (step % 10_000 !== 0) {
    throw new DomainError('INVALID_STEP', 'Il passo deve essere un multiplo di un centesimo.')
  }

  const ratio = value / step
  const rounded =
    mode === 'up' ? Math.ceil(ratio) : mode === 'down' ? Math.floor(ratio) : Math.floor(ratio + 0.5)

  return rounded * step
}

/**
 * Ripartisce un totale intero in quote intere con il metodo dei resti più grandi.
 * I pesi vengono normalizzati per evitare overflow; se sono tutti zero, la
 * ripartizione è uguale.
 */
export function allocateLargestRemainder(total: number, weights: number[]): number[] {
  assertSafeInteger(total, 'Totale da ripartire')
  if (total < 0)
    throw new DomainError('INVALID_TOTAL', 'Il totale da ripartire non può essere negativo.')
  if (weights.length === 0) return []
  if (total === 0) return weights.map(() => 0)

  const cleanWeights = weights.map((weight) => (Number.isFinite(weight) && weight > 0 ? weight : 0))
  const maxWeight = Math.max(...cleanWeights)
  const effectiveWeights =
    maxWeight > 0 ? cleanWeights.map((weight) => weight / maxWeight) : weights.map(() => 1)
  const weightSum = effectiveWeights.reduce((sum, weight) => sum + weight, 0)

  const exactShares = effectiveWeights.map((weight) => (total * weight) / weightSum)
  const shares = exactShares.map((share) => Math.floor(share))
  const assigned = shares.reduce((sum, share) => sum + share, 0)
  let remaining = total - assigned

  const order = exactShares
    .map((share, index) => ({
      index,
      fraction: share - Math.floor(share),
      weight: effectiveWeights[index] ?? 0,
    }))
    .sort((a, b) => b.fraction - a.fraction || b.weight - a.weight || a.index - b.index)

  let cursor = 0
  while (remaining > 0) {
    const entry = order[cursor % order.length]
    if (!entry) break
    shares[entry.index] = (shares[entry.index] ?? 0) + 1
    remaining -= 1
    cursor += 1
  }

  return shares
}

export function sumNumbers(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0)
}
