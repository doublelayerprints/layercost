import type { ThreeMfSummary } from '@/domain/three-mf'
import type { ThreeMfErrorPayload } from './errors'
import type { ThreeMfLimits } from './limits'

export interface ThreeMfWorkerRequest {
  id: number
  fileName: string
  bytes: ArrayBuffer
  limits?: Partial<ThreeMfLimits>
}

export type ThreeMfWorkerResponse =
  | { id: number; ok: true; summary: ThreeMfSummary }
  | { id: number; ok: false; error: ThreeMfErrorPayload }
