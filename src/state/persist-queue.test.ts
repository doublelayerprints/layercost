import { describe, expect, it, vi } from 'vitest'
import { createInitialData } from '@/data/storage'
import { createPersistQueue } from './persist-queue'

describe('persist queue', () => {
  it('avvia subito la prima scrittura e serializza le successive', async () => {
    const started: string[] = []
    let release: () => void = () => {}
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    const queue = createPersistQueue(async (data) => {
      started.push(data.draft.name)
      await gate
    }, vi.fn())

    const first = createInitialData()
    first.draft.name = 'Uno'
    const second = createInitialData()
    second.draft.name = 'Due'

    queue.enqueue(first)
    expect(started).toEqual(['Uno'])
    queue.enqueue(second)
    expect(started).toEqual(['Uno'])
    expect(queue.pending()).toBe(2)

    release()
    await queue.flush()
    expect(started).toEqual(['Uno', 'Due'])
    expect(queue.pending()).toBe(0)
  })

  it('continua dopo un errore e notifica il chiamante', async () => {
    const onError = vi.fn()
    let calls = 0
    const queue = createPersistQueue(async () => {
      calls += 1
      if (calls === 1) throw new Error('disco pieno')
    }, onError)

    queue.enqueue(createInitialData())
    await queue.flush()
    expect(calls).toBe(1)
    expect(onError).toHaveBeenCalledTimes(1)

    queue.enqueue(createInitialData())
    await queue.flush()
    expect(calls).toBe(2)
    expect(queue.pending()).toBe(0)
  })

  it('flush risolve anche con la coda vuota', async () => {
    const queue = createPersistQueue(async () => {}, vi.fn())
    await expect(queue.flush()).resolves.toBeUndefined()
    expect(queue.pending()).toBe(0)
  })

  it('separa le scritture accodate dopo uno flush', async () => {
    const saved: string[] = []
    const queue = createPersistQueue(async (data) => {
      saved.push(data.draft.name)
    }, vi.fn())

    const first = createInitialData()
    first.draft.name = 'Prima'
    queue.enqueue(first)
    await queue.flush()

    const second = createInitialData()
    second.draft.name = 'Dopo'
    queue.enqueue(second)
    await queue.flush()

    expect(saved).toEqual(['Prima', 'Dopo'])
  })
})
