import type { ThreeMfSummary } from '@/domain/three-mf'
import { ThreeMfImportError, fromThreeMfErrorPayload } from './errors'
import { resolveThreeMfLimits, type ThreeMfLimits } from './limits'
import { parseThreeMf } from './parse'
import type { ThreeMfWorkerRequest, ThreeMfWorkerResponse } from './worker-protocol'

export interface ParseThreeMfFileOptions {
  limits?: Partial<ThreeMfLimits>
}

let nextRequestId = 1

function assertFileSize(file: File, limits: ThreeMfLimits): void {
  if (file.size === 0) {
    throw new ThreeMfImportError(
      'NOT_A_ZIP',
      'Questo file è vuoto. Scegli un file esportato dallo slicer.',
    )
  }
  if (file.size > limits.maxCompressedBytes) {
    throw new ThreeMfImportError(
      'ARCHIVE_TOO_LARGE',
      `Il file supera ${Math.round(limits.maxCompressedBytes / (1024 * 1024))} MB. Esporta un solo piatto o riduci il progetto.`,
    )
  }
}

/**
 * Lettura sincrona, utile per test e come fallback quando i Web Worker non sono disponibili.
 * La UI usa `parseThreeMfInWorker`.
 */
export async function parseThreeMfFile(
  file: File,
  options: ParseThreeMfFileOptions = {},
): Promise<ThreeMfSummary> {
  const limits = resolveThreeMfLimits(options.limits)
  assertFileSize(file, limits)
  const buffer = await file.arrayBuffer()
  return parseThreeMf(file.name, new Uint8Array(buffer), { limits })
}

/**
 * Legge e normalizza il file in un Web Worker per non bloccare la UI.
 * Il buffer viene trasferito al worker e non viene riutilizzato nel thread principale.
 */
export async function parseThreeMfInWorker(
  file: File,
  options: ParseThreeMfFileOptions = {},
): Promise<ThreeMfSummary> {
  const limits = resolveThreeMfLimits(options.limits)
  assertFileSize(file, limits)
  const buffer = await file.arrayBuffer()

  if (typeof Worker === 'undefined') {
    throw new ThreeMfImportError(
      'UNKNOWN',
      'Il browser non supporta il parsing in background. Aggiorna il browser e riprova.',
    )
  }

  let worker: Worker
  try {
    worker = new Worker(new URL('./three-mf.worker.ts', import.meta.url), { type: 'module' })
  } catch (error) {
    throw new ThreeMfImportError(
      'UNKNOWN',
      'Impossibile avviare il parser in background. Aggiorna il browser e riprova.',
      { cause: error },
    )
  }

  const id = nextRequestId
  nextRequestId += 1

  return new Promise<ThreeMfSummary>((resolve, reject) => {
    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      worker.terminate()
    }

    worker.onmessage = (event: MessageEvent<ThreeMfWorkerResponse>) => {
      const response = event.data
      if (!response || response.id !== id) return
      if (response.ok) {
        finish()
        resolve(response.summary)
        return
      }
      finish()
      reject(fromThreeMfErrorPayload(response.error))
    }
    worker.onerror = (event) => {
      finish()
      reject(
        new ThreeMfImportError(
          'UNKNOWN',
          'Importazione non riuscita. Scegli un file esportato dallo slicer e riprova.',
          { cause: event },
        ),
      )
    }
    worker.onmessageerror = () => {
      finish()
      reject(
        new ThreeMfImportError(
          'UNKNOWN',
          'Importazione non riuscita: il worker non ha restituito dati leggibili.',
        ),
      )
    }

    const request: ThreeMfWorkerRequest = {
      id,
      fileName: file.name,
      bytes: buffer,
      limits: options.limits,
    }
    try {
      worker.postMessage(request, [buffer])
    } catch (error) {
      finish()
      reject(
        new ThreeMfImportError(
          'UNKNOWN',
          'Importazione non riuscita. Scegli un file esportato dallo slicer e riprova.',
          { cause: error },
        ),
      )
    }
  })
}
