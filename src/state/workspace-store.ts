import { create } from 'zustand'
import {
  createSupabaseCloudGateway,
  WorkspaceError,
  type CloudGateway,
  type WorkspaceErrorCode,
  type WorkspaceInvite,
  type WorkspaceMember,
  type WorkspaceRole,
  type WorkspaceSummary,
} from '@/data/cloud/gateway'
import { isCloudConfigured } from '@/data/cloud/client'
import {
  loadActiveWorkspace,
  markWorkspaceForSeed,
  saveActiveWorkspace,
} from '@/data/workspace-preference'

export type WorkspaceStatus = 'idle' | 'loading' | 'ready' | 'error'
export type DetailsStatus = 'idle' | 'loading' | 'ready' | 'error'

export interface WorkspaceState {
  status: WorkspaceStatus
  workspaces: WorkspaceSummary[]
  activeId?: string
  error?: WorkspaceErrorCode
  members: WorkspaceMember[]
  invites: WorkspaceInvite[]
  detailsStatus: DetailsStatus
  detailsError?: WorkspaceErrorCode

  load: () => Promise<void>
  refresh: () => Promise<void>
  activate: (workspaceId: string) => void
  create: (name: string) => Promise<string | undefined>
  redeem: (token: string) => Promise<string | undefined>
  leave: (workspaceId: string) => Promise<boolean>
  rename: (workspaceId: string, name: string) => Promise<boolean>
  loadDetails: () => Promise<void>
  createInvite: (role: WorkspaceRole, days: number) => Promise<string | undefined>
  revokeInvite: (inviteId: string) => Promise<boolean>
  reset: () => void
  clearError: () => void
}

export interface WorkspaceStoreDeps {
  isConfigured: () => boolean
  createGateway: () => Promise<CloudGateway>
  preference: {
    load: () => string | undefined
    save: (workspaceId: string) => void
  }
  seed: {
    mark: (workspaceId: string) => void
  }
}

function errorCode(error: unknown): WorkspaceErrorCode {
  return error instanceof WorkspaceError ? error.code : 'unknown'
}

export function pickActiveWorkspace(
  workspaces: WorkspaceSummary[],
  preferred: string | undefined,
): string | undefined {
  if (preferred && workspaces.some((workspace) => workspace.id === preferred)) return preferred
  return workspaces[0]?.id
}

export function createWorkspaceStore(deps: WorkspaceStoreDeps) {
  let gateway: CloudGateway | undefined
  let gatewayPromise: Promise<CloudGateway> | undefined
  let loading: Promise<void> | undefined

  const ensureGateway = (): Promise<CloudGateway> => {
    if (gateway) return Promise.resolve(gateway)
    if (!gatewayPromise) {
      gatewayPromise = deps
        .createGateway()
        .then((created) => {
          gateway = created
          return created
        })
        .catch((error: unknown) => {
          gatewayPromise = undefined
          throw error
        })
    }
    return gatewayPromise
  }

  return create<WorkspaceState>()((set, get) => {
    const setActive = (workspaceId: string | undefined) => {
      if (workspaceId) deps.preference.save(workspaceId)
      set({
        activeId: workspaceId,
        members: [],
        invites: [],
        detailsStatus: 'idle',
        detailsError: undefined,
      })
    }

    const load = async (): Promise<void> => {
      if (!deps.isConfigured()) {
        set({ status: 'idle', workspaces: [], activeId: undefined })
        return
      }
      if (loading) return loading

      loading = (async () => {
        set({ status: 'loading', error: undefined })
        try {
          const client = await ensureGateway()
          const created = await client.ensurePersonalWorkspace()
          if (created) deps.seed.mark(created)

          const workspaces = await client.listWorkspaces()
          const active = pickActiveWorkspace(workspaces, deps.preference.load())
          if (!active) {
            set({ status: 'error', error: 'unknown', workspaces, activeId: undefined })
            return
          }

          deps.preference.save(active)
          set({
            status: 'ready',
            workspaces,
            activeId: active,
            error: undefined,
            members: [],
            invites: [],
            detailsStatus: 'idle',
            detailsError: undefined,
          })
        } catch (error) {
          set({ status: 'error', error: errorCode(error) })
        }
      })().finally(() => {
        loading = undefined
      })

      return loading
    }

    const refresh = async (): Promise<void> => {
      const client = await ensureGateway()
      const workspaces = await client.listWorkspaces()
      const current = get().activeId
      const active = pickActiveWorkspace(workspaces, current)
      if (active) deps.preference.save(active)
      set({ workspaces, activeId: active })
    }

    return {
      status: 'idle',
      workspaces: [],
      activeId: undefined,
      error: undefined,
      members: [],
      invites: [],
      detailsStatus: 'idle',
      detailsError: undefined,

      load,

      refresh: async () => {
        try {
          await refresh()
        } catch (error) {
          set({ error: errorCode(error) })
        }
      },

      activate: (workspaceId) => {
        const { workspaces } = get()
        if (!workspaces.some((workspace) => workspace.id === workspaceId)) return
        setActive(workspaceId)
      },

      create: async (name) => {
        set({ error: undefined })
        try {
          const client = await ensureGateway()
          const id = await client.createWorkspace(name)
          deps.seed.mark(id)
          const workspaces = await client.listWorkspaces()
          set({ workspaces })
          setActive(id)
          return id
        } catch (error) {
          set({ error: errorCode(error) })
          return undefined
        }
      },

      redeem: async (token) => {
        set({ error: undefined })
        try {
          const client = await ensureGateway()
          const id = await client.redeemInvite(token)
          const workspaces = await client.listWorkspaces()
          set({ workspaces })
          setActive(id)
          return id
        } catch (error) {
          set({ error: errorCode(error) })
          return undefined
        }
      },

      leave: async (workspaceId) => {
        set({ error: undefined })
        try {
          const client = await ensureGateway()
          await client.leaveWorkspace(workspaceId)

          let workspaces = await client.listWorkspaces()
          if (workspaces.length === 0) {
            // An editor who leaves the last shared space gets a personal one.
            const created = await client.ensurePersonalWorkspace()
            if (created) deps.seed.mark(created)
            workspaces = await client.listWorkspaces()
          }

          const active = pickActiveWorkspace(workspaces, get().activeId)
          set({ workspaces })
          setActive(active)
          return true
        } catch (error) {
          set({ error: errorCode(error) })
          return false
        }
      },

      rename: async (workspaceId, name) => {
        set({ error: undefined })
        try {
          const client = await ensureGateway()
          await client.renameWorkspace(workspaceId, name)
          set((state) => ({
            workspaces: state.workspaces.map((workspace) =>
              workspace.id === workspaceId ? { ...workspace, name: name.trim() } : workspace,
            ),
          }))
          return true
        } catch (error) {
          set({ error: errorCode(error) })
          return false
        }
      },

      loadDetails: async () => {
        const { activeId, workspaces } = get()
        if (!activeId) return
        const role = workspaces.find((workspace) => workspace.id === activeId)?.role

        set({ detailsStatus: 'loading', detailsError: undefined })
        try {
          const client = await ensureGateway()
          const members = await client.listMembers(activeId)
          const invites = role === 'owner' ? await client.listInvites(activeId) : []
          if (get().activeId !== activeId) return
          set({ members, invites, detailsStatus: 'ready' })
        } catch (error) {
          if (get().activeId !== activeId) return
          set({ detailsStatus: 'error', detailsError: errorCode(error) })
        }
      },

      createInvite: async (role, days) => {
        const activeId = get().activeId
        if (!activeId) return undefined
        set({ detailsError: undefined })
        try {
          const client = await ensureGateway()
          const token = await client.createInvite(activeId, role, days)
          await get().loadDetails()
          return token
        } catch (error) {
          set({ detailsError: errorCode(error) })
          return undefined
        }
      },

      revokeInvite: async (inviteId) => {
        set({ detailsError: undefined })
        try {
          const client = await ensureGateway()
          await client.revokeInvite(inviteId)
          await get().loadDetails()
          return true
        } catch (error) {
          set({ detailsError: errorCode(error) })
          return false
        }
      },

      reset: () =>
        set({
          status: 'idle',
          workspaces: [],
          activeId: undefined,
          error: undefined,
          members: [],
          invites: [],
          detailsStatus: 'idle',
          detailsError: undefined,
        }),

      clearError: () => set({ error: undefined }),
    }
  })
}

export const useWorkspaceStore = createWorkspaceStore({
  isConfigured: isCloudConfigured,
  createGateway: createSupabaseCloudGateway,
  preference: {
    load: loadActiveWorkspace,
    save: saveActiveWorkspace,
  },
  seed: {
    mark: markWorkspaceForSeed,
  },
})
