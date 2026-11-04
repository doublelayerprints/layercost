import { describe, expect, it } from 'vitest'
import type {
  AdminGateway,
  AdminOverview,
  AdminUser,
  AdminWorkspace,
  AdminWorkspaceMember,
  WorkspaceErrorCode,
} from '@/data/cloud/gateway'
import { WorkspaceError } from '@/data/cloud/gateway'
import { createAdminStore } from './admin-store'

const overview: AdminOverview = {
  totalUsers: 3,
  maxUsersLimit: 1000,
  totalPersonalWorkspaces: 2,
  totalSharedWorkspaces: 1,
  totalQuotes: 12,
  totalMemberships: 4,
}

const users: AdminUser[] = [
  {
    userId: 'u-1',
    email: 'admin@example.test',
    displayName: 'Admin',
    providers: ['email', 'google'],
    workspaceCount: 2,
    createdAt: '2026-10-28T00:00:00.000Z',
    lastSignInAt: '2026-11-04T00:00:00.000Z',
  },
  {
    userId: 'u-2',
    email: 'other@example.test',
    providers: ['email'],
    workspaceCount: 1,
    createdAt: '2026-11-03T00:00:00.000Z',
  },
]

const workspaces: AdminWorkspace[] = [
  {
    id: 'ws-a',
    name: 'Shared',
    kind: 'shared',
    members: 2,
    maxMembers: 20,
    quotes: 12,
    maxQuotes: 500,
    createdAt: '2026-10-28T00:00:00.000Z',
  },
  {
    id: 'ws-b',
    name: 'Personal',
    kind: 'personal',
    members: 1,
    maxMembers: 20,
    quotes: 0,
    maxQuotes: 500,
    createdAt: '2026-10-30T00:00:00.000Z',
  },
]

const members: AdminWorkspaceMember[] = [
  {
    userId: 'u-1',
    email: 'admin@example.test',
    displayName: 'Admin',
    role: 'owner',
    joinedAt: '2026-10-28T00:00:00.000Z',
  },
]

interface GatewayOptions {
  isAdmin?: boolean
  failCheck?: WorkspaceErrorCode
  failLoad?: WorkspaceErrorCode
  failMembers?: WorkspaceErrorCode
  failLimits?: WorkspaceErrorCode
}

function createGateway(options: GatewayOptions = {}): {
  gateway: AdminGateway
  limitUpdates: Array<{ workspaceId: string; maxMembers: number; maxQuotes: number }>
} {
  const limitUpdates: Array<{
    workspaceId: string
    maxMembers: number
    maxQuotes: number
  }> = []
  return {
    limitUpdates,
    gateway: {
      isAdmin: async () => {
        if (options.failCheck) throw new WorkspaceError(options.failCheck)
        return options.isAdmin ?? false
      },
      adminOverview: async () => {
        if (options.failLoad) throw new WorkspaceError(options.failLoad)
        return overview
      },
      adminListUsers: async () => {
        if (options.failLoad) throw new WorkspaceError(options.failLoad)
        return users
      },
      adminListWorkspaces: async () => {
        if (options.failLoad) throw new WorkspaceError(options.failLoad)
        return workspaces
      },
      adminWorkspaceMembers: async (workspaceId) => {
        if (options.failMembers) throw new WorkspaceError(options.failMembers)
        return workspaceId === 'ws-a' ? members : []
      },
      adminUpdateWorkspaceLimits: async (workspaceId, maxMembers, maxQuotes) => {
        if (options.failLimits) throw new WorkspaceError(options.failLimits)
        limitUpdates.push({ workspaceId, maxMembers, maxQuotes })
        return { maxMembers, maxQuotes }
      },
    },
  }
}

function setup(options: GatewayOptions = {}) {
  const fake = createGateway(options)
  const store = createAdminStore({
    isConfigured: () => true,
    createGateway: async () => fake.gateway,
  })
  return { store, fake }
}

describe('admin store', () => {
  it('un utente senza flag resta negato e non carica i dati', async () => {
    const { store } = setup({ isAdmin: false })
    await store.getState().checkAdmin()
    expect(store.getState().status).toBe('denied')
    expect(store.getState().isAdmin).toBe(false)
    await store.getState().load()
    expect(store.getState().dataStatus).toBe('idle')
    expect(store.getState().overview).toBeUndefined()
  })

  it('un errore di sessione o di permesso è fail-closed', async () => {
    const denied = setup({ failCheck: 'notAdmin' })
    await denied.store.getState().checkAdmin()
    expect(denied.store.getState().status).toBe('denied')

    const expired = setup({ failCheck: 'auth' })
    await expired.store.getState().checkAdmin()
    expect(expired.store.getState().status).toBe('denied')

    const network = setup({ failCheck: 'network' })
    await network.store.getState().checkAdmin()
    expect(network.store.getState().status).toBe('error')
    expect(network.store.getState().isAdmin).toBe(false)
  })

  it('il bootstrap senza cloud è negato senza chiamare il gateway', () => {
    let created = 0
    const store = createAdminStore({
      isConfigured: () => false,
      createGateway: () => {
        created += 1
        throw new Error('not used')
      },
    })
    void store.getState().checkAdmin()
    expect(store.getState().status).toBe('denied')
    expect(created).toBe(0)
  })

  it('l’admin carica panoramica, utenti e spazi', async () => {
    const { store } = setup({ isAdmin: true })
    await store.getState().checkAdmin()
    expect(store.getState().status).toBe('ready')
    expect(store.getState().isAdmin).toBe(true)

    await store.getState().load()
    expect(store.getState().dataStatus).toBe('ready')
    expect(store.getState().overview).toEqual(overview)
    expect(store.getState().users).toEqual(users)
    expect(store.getState().workspaces).toEqual(workspaces)
  })

  it('un not_admin durante il load nasconde la console', async () => {
    const { store } = setup({ isAdmin: true, failLoad: 'notAdmin' })
    await store.getState().checkAdmin()
    await store.getState().load()
    expect(store.getState().isAdmin).toBe(false)
    expect(store.getState().status).toBe('denied')
  })

  it('selectWorkspace carica i membri dello spazio scelto', async () => {
    const { store } = setup({ isAdmin: true })
    await store.getState().selectWorkspace('ws-a')
    expect(store.getState().membersStatus).toBe('ready')
    expect(store.getState().members).toEqual(members)
    expect(store.getState().membersWorkspaceId).toBe('ws-a')

    await store.getState().selectWorkspace('ws-b')
    expect(store.getState().members).toEqual([])
  })

  it('un errore sui membri non perde lo stato admin', async () => {
    const { store } = setup({ isAdmin: true, failMembers: 'notMember' })
    await store.getState().checkAdmin()
    await store.getState().selectWorkspace('ws-missing')
    expect(store.getState().membersStatus).toBe('error')
    expect(store.getState().membersError).toBe('notMember')
    expect(store.getState().isAdmin).toBe(true)
  })

  it('updateLimits salva e rinfusc overview e spazi in silenzio', async () => {
    const { store, fake } = setup({ isAdmin: true })
    await store.getState().checkAdmin()
    await store.getState().load()
    const ok = await store.getState().updateLimits('ws-a', 30, 800)
    expect(ok).toBe(true)
    expect(fake.limitUpdates).toEqual([
      { workspaceId: 'ws-a', maxMembers: 30, maxQuotes: 800 },
    ])
    expect(store.getState().limitsStatus).toBe('saved')
    expect(store.getState().limitsWorkspaceId).toBe('ws-a')
    // The refresh keeps the page ready without a loading flash.
    expect(store.getState().dataStatus).toBe('ready')
  })

  it('un errore di validazione segnala invalidLimit senza perdere i dati', async () => {
    const { store } = setup({ isAdmin: true, failLimits: 'invalidLimit' })
    await store.getState().checkAdmin()
    await store.getState().load()
    const ok = await store.getState().updateLimits('ws-a', 0, 800)
    expect(ok).toBe(false)
    expect(store.getState().limitsStatus).toBe('error')
    expect(store.getState().limitsError).toBe('invalidLimit')
    expect(store.getState().dataStatus).toBe('ready')
  })

  it('clearLimitsFeedback e reset riportano lo store allo stato iniziale', async () => {
    const { store } = setup({ isAdmin: true })
    await store.getState().checkAdmin()
    await store.getState().load()
    await store.getState().updateLimits('ws-a', 30, 800)
    store.getState().clearLimitsFeedback()
    expect(store.getState().limitsStatus).toBe('idle')
    expect(store.getState().limitsWorkspaceId).toBeUndefined()

    store.getState().reset()
    expect(store.getState().status).toBe('idle')
    expect(store.getState().isAdmin).toBe(false)
    expect(store.getState().users).toEqual([])
    expect(store.getState().workspaces).toEqual([])
    expect(store.getState().overview).toBeUndefined()
    expect(store.getState().dataStatus).toBe('idle')
  })
})
