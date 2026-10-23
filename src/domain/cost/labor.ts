import type { MicroEur, Seconds } from '../units'
import { DomainError, asMicroEur } from '../units'
import { roundHalfUp } from '../money'

export function calculateLineLabor(
  finishingSecondsPerUnit: Seconds,
  hourlyRate: MicroEur,
): MicroEur {
  if (finishingSecondsPerUnit < 0) {
    throw new DomainError('INVALID_LABOR', 'I minuti di finitura non possono essere negativi.')
  }
  if (hourlyRate < 0) {
    throw new DomainError('INVALID_LABOR', 'La tariffa oraria non può essere negativa.')
  }
  return asMicroEur(roundHalfUp((finishingSecondsPerUnit * hourlyRate) / 3600))
}

export interface JobLaborResult {
  setup: MicroEur
  design: MicroEur
  total: MicroEur
}

export function calculateJobLabor(
  setupSeconds: Seconds,
  designSeconds: Seconds,
  hourlyRate: MicroEur,
): JobLaborResult {
  if (setupSeconds < 0 || designSeconds < 0) {
    throw new DomainError('INVALID_LABOR', 'I tempi di lavoro non possono essere negativi.')
  }
  if (hourlyRate < 0) {
    throw new DomainError('INVALID_LABOR', 'La tariffa oraria non può essere negativa.')
  }

  const setup = asMicroEur(roundHalfUp((setupSeconds * hourlyRate) / 3600))
  const design = asMicroEur(roundHalfUp((designSeconds * hourlyRate) / 3600))
  return { setup, design, total: asMicroEur(setup + design) }
}
