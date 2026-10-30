/**
 * Workspace preferences are UI state, but they live in `data/` because only
 * this layer may touch `localStorage` (AGENTS.md §4).
 */

export const ACTIVE_WORKSPACE_KEY = 'layercost:active-workspace'
export const PENDING_SEED_KEY = 'layercost:pending-seed'

function getStorage(): Storage | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null
    return window.localStorage
  } catch {
    return null
  }
}

export function loadActiveWorkspace(): string | undefined {
  const value = getStorage()?.getItem(ACTIVE_WORKSPACE_KEY)
  return value && value.trim() !== '' ? value : undefined
}

export function saveActiveWorkspace(workspaceId: string): void {
  try {
    getStorage()?.setItem(ACTIVE_WORKSPACE_KEY, workspaceId)
  } catch {
    // The preference is a convenience: the first workspace still works.
  }
}

export function clearActiveWorkspace(): void {
  getStorage()?.removeItem(ACTIVE_WORKSPACE_KEY)
}

function loadPendingSeeds(): string[] {
  const raw = getStorage()?.getItem(PENDING_SEED_KEY)
  if (!raw) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((value): value is string => typeof value === 'string')
  } catch {
    return []
  }
}

function savePendingSeeds(ids: string[]): void {
  try {
    const storage = getStorage()
    if (!storage) return
    if (ids.length === 0) storage.removeItem(PENDING_SEED_KEY)
    else storage.setItem(PENDING_SEED_KEY, JSON.stringify(ids))
  } catch {
    // Worst case a new workspace shows the first-login prompt.
  }
}

/**
 * A freshly created workspace must be seeded with the default configuration,
 * never with the data of the space the user was looking at. The marker survives
 * a reload so the seed is not lost if the tab closes before the first pull.
 */
export function markWorkspaceForSeed(workspaceId: string): void {
  const ids = loadPendingSeeds()
  if (!ids.includes(workspaceId)) savePendingSeeds([...ids, workspaceId])
}

export function consumeWorkspaceSeed(workspaceId: string): boolean {
  const ids = loadPendingSeeds()
  if (!ids.includes(workspaceId)) return false
  savePendingSeeds(ids.filter((id) => id !== workspaceId))
  return true
}

export function hasPendingWorkspaceSeed(workspaceId: string): boolean {
  return loadPendingSeeds().includes(workspaceId)
}

export function clearWorkspaceSeeds(): void {
  savePendingSeeds([])
}
