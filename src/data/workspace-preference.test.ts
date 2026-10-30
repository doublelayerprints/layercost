import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  clearActiveWorkspace,
  clearWorkspaceSeeds,
  consumeWorkspaceSeed,
  hasPendingWorkspaceSeed,
  loadActiveWorkspace,
  markWorkspaceForSeed,
  saveActiveWorkspace,
} from './workspace-preference'

const values = new Map<string, string>()

const storage = {
  getItem: (key: string) => values.get(key) ?? null,
  setItem: (key: string, value: string) => {
    values.set(key, value)
  },
  removeItem: (key: string) => {
    values.delete(key)
  },
  clear: () => values.clear(),
  key: () => null,
  length: 0,
} as Storage

beforeEach(() => {
  values.clear()
  ;(globalThis as { window?: unknown }).window = { localStorage: storage }
})

afterEach(() => {
  delete (globalThis as { window?: unknown }).window
})

describe('preferenze degli spazi', () => {
  it('ricorda lo spazio attivo e lo dimentica su richiesta', () => {
    expect(loadActiveWorkspace()).toBeUndefined()
    saveActiveWorkspace('ws-a')
    expect(loadActiveWorkspace()).toBe('ws-a')
    clearActiveWorkspace()
    expect(loadActiveWorkspace()).toBeUndefined()
  })

  it('marca un nuovo spazio per il seed e consuma il marker una sola volta', () => {
    expect(hasPendingWorkspaceSeed('ws-a')).toBe(false)
    markWorkspaceForSeed('ws-a')
    markWorkspaceForSeed('ws-a')
    expect(hasPendingWorkspaceSeed('ws-a')).toBe(true)

    expect(consumeWorkspaceSeed('ws-a')).toBe(true)
    expect(hasPendingWorkspaceSeed('ws-a')).toBe(false)
    expect(consumeWorkspaceSeed('ws-a')).toBe(false)
  })

  it('tiene il marker anche per più spazi', () => {
    markWorkspaceForSeed('ws-a')
    markWorkspaceForSeed('ws-b')

    expect(hasPendingWorkspaceSeed('ws-a')).toBe(true)
    expect(hasPendingWorkspaceSeed('ws-b')).toBe(true)

    clearWorkspaceSeeds()
    expect(hasPendingWorkspaceSeed('ws-a')).toBe(false)
  })
})
