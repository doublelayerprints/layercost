import type { AppData } from '@/data/storage'

export type PersistErrorHandler = (error: unknown) => void

export interface PersistQueue {
  /** Accoda una scrittura. Se la coda è libera, la avvia subito. */
  enqueue: (data: AppData) => void
  /** Attende tutte le scritture accodate fino a questo momento. */
  flush: () => Promise<void>
  /** Scritture in corso o accodate. */
  pending: () => number
}

/**
 * Serializza le scritture del repository.
 *
 * Con l'adapter locale la prima scrittura parte in modo sincrono (il body
 * dell'adapter viene eseguito prima del primo await), quindi il comportamento
 * percepito resta quello di prima. Con un adapter cloud le scritture vengono
 * messe in ordine e non si sovrappongono.
 */
export function createPersistQueue(
  save: (data: AppData) => Promise<void>,
  onError: PersistErrorHandler,
): PersistQueue {
  let tail: Promise<void> | null = null
  let pending = 0

  const report = (error: unknown) => {
    try {
      onError(error)
    } catch {
      // Un handler di errore non deve interrompere la coda.
    }
  }

  const run = (data: AppData): Promise<void> => {
    let operation: Promise<void>
    try {
      operation = save(data)
    } catch (error) {
      report(error)
      pending -= 1
      return Promise.resolve()
    }

    return operation
      .catch((error) => {
        report(error)
      })
      .finally(() => {
        pending -= 1
      })
  }

  return {
    enqueue(data) {
      pending += 1
      if (tail) {
        tail = tail.then(() => run(data))
        return
      }

      const operation = run(data)
      tail = operation
      void operation.finally(() => {
        if (tail === operation) tail = null
      })
    },

    flush() {
      return tail ?? Promise.resolve()
    },

    pending: () => pending,
  }
}
