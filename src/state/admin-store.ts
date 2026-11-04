import { create } from 'zustand'
import {
  createSupabaseCloudGateway,
  WorkspaceError,
  type AdminGateway,
  type AdminOverview,
  type AdminUser,
  type AdminWorkspace,
  type AdminWorkspaceMember,
  type WorkspaceErrorCode,
} from '@/data/cloud/gateway'
import { isCloudConfigured } from '@/data/cloud/client'

export type AdminStatus = 'idle' | 'checking' | 'ready' | 'denied' | 'error'
export type AdminDataStatus = 'idle' | 'loading' | 'ready' | 'error'
export type AdminMembersStatus = 'idle' | 'loading' | 'ready' | 'error'
export type AdminLimitsStatus = 'idle' | 'saving' | 'saved' | 'error'

export interface AdminState {
  /** `denied` means checked and not an admin: the console stays hidden. */
  status: AdminStatus
  isAdmin: boolean
  error?: WorkspaceErrorCode
  dataStatus: AdminDataStatus
  overview?: AdminOverview
  users: AdminUser[]
  workspaces: AdminWorkspace[]
  membersWorkspaceId?: string
  members: AdminWorkspaceMember[]
  membersStatus: AdminMembersStatus
  membersError?: WorkspaceErrorCode
  limitsStatus: AdminLimitsStatus
  limitsError?: WorkspaceErrorCode
  /** Workspace the last limits save targeted, so the UI scopes the feedback. */
  limitsWorkspaceId?: string

  checkAdmin: () => Promise<void>
  load: () => Promise<void>
  selectWorkspace: (workspaceId: string) => Promise<void>
  updateLimits: (
    workspaceId: string,
    maxMembers: number,
    maxQuotes: number,
  ) => Promise<boolean>
  clearLimitsFeedback: () => void
  reset: () => void
  clearError: () => void
}

export interface AdminStoreDeps {
  isConfigured: () => boolean
  createGateway: () => Promise<AdminGateway>
}

function errorCode(error: unknown): WorkspaceErrorCode {
  return error instanceof WorkspaceError ? error.code : 'unknown'
}

export function createAdminStore(deps: AdminStoreDeps) {
  let gateway: AdminGateway | undefined
  let gatewayPromise: Promise<AdminGateway> | undefined
  let checkRequest = 0
  let membersRequest = 0

  const ensureGateway = (): Promise<AdminGateway> => {
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

  return create<AdminState>()((set, get) => {
    async function fetchWorkspaceData(client: AdminGateway): Promise<void> {
      const [overview, users, workspaces] = await Promise.all([
        client.adminOverview(),
        client.adminListUsers(),
        client.adminListWorkspaces(),
      ])
      set({ overview, users, workspaces })
    }

    return {
      status: 'idle',
      isAdmin: false,
      dataStatus: 'idle',
      users: [],
      workspaces: [],
      members: [],
      membersStatus: 'idle',
      limitsStatus: 'idle',

      checkAdmin: async () => {
        if (!deps.isConfigured()) {
          set({ status: 'denied', isAdmin: false })
          return
        }
        const request = ++checkRequest
        set({ status: 'checking', error: undefined })
        try {
          const client = await ensureGateway()
          const isAdmin = await client.isAdmin()
          if (request !== checkRequest) return
          if (isAdmin) {
            set({ isAdmin: true, status: 'ready' })
          } else {
            set({ isAdmin: false, status: 'denied' })
          }
        } catch (error) {
          if (request !== checkRequest) return
          const code = errorCode(error)
          // Fail-closed: a session problem hides the console like a missing
          // flag; only unexpected errors surface as retryable.
          if (code === 'notAdmin' || code === 'auth') {
            set({ isAdmin: false, status: 'denied', error: code })
          } else {
            set({ isAdmin: false, status: 'error', error: code })
          }
        }
      },

      load: async () => {
        if (!get().isAdmin) return
        set({ dataStatus: 'loading', error: undefined })
        try {
          const client = await ensureGateway()
          await fetchWorkspaceData(client)
          set({ dataStatus: 'ready' })
        } catch (error) {
          const code = errorCode(error)
          if (code === 'notAdmin') {
            set({
              isAdmin: false,
              status: 'denied',
              dataStatus: 'error',
              error: code,
            })
            return
          }
          set({ dataStatus: 'error', error: code })
        }
      },

      selectWorkspace: async (workspaceId) => {
        const request = ++membersRequest
        set({
          membersWorkspaceId: workspaceId,
          membersStatus: 'loading',
          membersError: undefined,
        })
        try {
          const client = await ensureGateway()
          const members = await client.adminWorkspaceMembers(workspaceId)
          if (request !== membersRequest) return
          set({ members, membersStatus: 'ready' })
        } catch (error) {
          if (request !== membersRequest) return
          set({ membersStatus: 'error', membersError: errorCode(error) })
        }
      },

      updateLimits: async (workspaceId, maxMembers, maxQuotes) => {
        set({
          limitsStatus: 'saving',
          limitsError: undefined,
          limitsWorkspaceId: workspaceId,
        })
        try {
          const client = await ensureGateway()
          await client.adminUpdateWorkspaceLimits(workspaceId, maxMembers, maxQuotes)
          // Silent refresh: only the numbers change, the page does not flash.
          const [overview, workspaces] = await Promise.all([
            client.adminOverview(),
            client.adminListWorkspaces(),
          ])
          set({ overview, workspaces, limitsStatus: 'saved' })
          return true
        } catch (error) {
          const code = errorCode(error)
          if (code === 'notAdmin') {
            set({
              isAdmin: false,
              status: 'denied',
              limitsStatus: 'error',
              limitsError: code,
            })
            return false
          }
          set({ limitsStatus: 'error', limitsError: code })
          return false
        }
      },

      clearLimitsFeedback: () => {
        set({
          limitsStatus: 'idle',
          limitsError: undefined,
          limitsWorkspaceId: undefined,
        })
      },

      reset: () => {
        checkRequest += 1
        membersRequest += 1
        set({
          status: 'idle',
          isAdmin: false,
          error: undefined,
          dataStatus: 'idle',
          overview: undefined,
          users: [],
          workspaces: [],
          membersWorkspaceId: undefined,
          members: [],
          membersStatus: 'idle',
          membersError: undefined,
          limitsStatus: 'idle',
          limitsError: undefined,
          limitsWorkspaceId: undefined,
        })
      },

      clearError: () => set({ error: undefined }),
    }
  })
}

export const useAdminStore = createAdminStore({
  isConfigured: isCloudConfigured,
  createGateway: createSupabaseCloudGateway,
})
