import { describe, expect, it } from 'vitest'
import type {
  CloudGateway,
  WorkspaceErrorCode,
  WorkspaceSummary,
} from '@/data/cloud/gateway'
import { WorkspaceError } from '@/data/cloud/gateway'
import { createWorkspaceStore, pickActiveWorkspace } from './workspace-store'

function summary(
  id: string,
  name: string,
  role: 'owner' | 'editor' = 'owner',
  kind: 'personal' | 'shared' = 'shared',
): WorkspaceSummary {
  return { id, name, role, kind, joinedAt: '2026-10-30T00:00:00.000Z' }
}

function createGateway(options: {
  workspaces: WorkspaceSummary[]
  personal?: string | null
  created?: string
  redeemed?: string
  failCreate?: WorkspaceErrorCode
  failSave?: WorkspaceErrorCode
  profile?: string
}): { gateway: CloudGateway; created: string[]; savedProfiles: string[] } {
  let workspaces = [...options.workspaces]
  const created: string[] = []
  const savedProfiles: string[] = []

  return {
    created,
    savedProfiles,
    gateway: {
      listWorkspaces: async () => workspaces,
      ensurePersonalWorkspace: async () => {
        if (options.personal) {
          workspaces = [
            ...workspaces,
            summary(options.personal, 'Spazio personale', 'owner', 'personal'),
          ]
        }
        return options.personal ?? null
      },
      createWorkspace: async (name) => {
        if (options.failCreate) throw new WorkspaceError(options.failCreate)
        const id = options.created ?? 'ws-new'
        created.push(name)
        workspaces = [...workspaces, summary(id, name)]
        return id
      },
      renameWorkspace: async (id, name) => {
        workspaces = workspaces.map((workspace) =>
          workspace.id === id ? { ...workspace, name } : workspace,
        )
      },
      listMembers: async () => [],
      listInvites: async () => [],
      createInvite: async () => 'token',
      revokeInvite: async () => {},
      redeemInvite: async () => {
        const id = options.redeemed ?? 'ws-shared'
        workspaces = [...workspaces, summary(id, 'Spazio condiviso', 'editor')]
        return id
      },
      leaveWorkspace: async (id) => {
        workspaces = workspaces.filter((workspace) => workspace.id !== id)
      },
      getProfile: async () => options.profile ?? null,
      saveProfile: async (displayName) => {
        if (options.failSave) throw new WorkspaceError(options.failSave)
        savedProfiles.push(displayName)
        options.profile = displayName
        return displayName
      },
      pull: async () => {
        throw new Error('not used')
      },
      push: async () => {
        throw new Error('not used')
      },
      importAll: async () => {
        throw new Error('not used')
      },
    },
  }
}

function setup(options: Parameters<typeof createGateway>[0], preferred?: string) {
  const fake = createGateway(options)
  const marks: string[] = []
  let preference = preferred
  const store = createWorkspaceStore({
    isConfigured: () => true,
    createGateway: async () => fake.gateway,
    preference: {
      load: () => preference,
      save: (id) => {
        preference = id
      },
    },
    seed: {
      mark: (id) => marks.push(id),
    },
  })
  return { store, marks, preference: () => preference, fake }
}

describe('workspace store', () => {
  it('crea e attiva lo spazio personale di un nuovo utente', async () => {
    const { store, marks } = setup({ workspaces: [], personal: 'ws-personal' })

    await store.getState().load()

    expect(store.getState().activeId).toBe('ws-personal')
    expect(store.getState().workspaces).toHaveLength(1)
    expect(marks).toEqual(['ws-personal'])
  })

  it('rispetta lo spazio preferito se è ancora accessibile', async () => {
    const { store, preference } = setup(
      { workspaces: [summary('ws-a', 'A'), summary('ws-b', 'B')] },
      'ws-b',
    )

    await store.getState().load()

    expect(store.getState().activeId).toBe('ws-b')
    expect(preference()).toBe('ws-b')
  })

  it('crea uno spazio, lo marca per il seed e lo attiva', async () => {
    const { store, marks, preference } = setup({
      workspaces: [summary('ws-a', 'A')],
      created: 'ws-new',
    })
    await store.getState().load()

    const id = await store.getState().create('Nuovo')

    expect(id).toBe('ws-new')
    expect(store.getState().activeId).toBe('ws-new')
    expect(store.getState().workspaces.map((workspace) => workspace.id)).toEqual([
      'ws-a',
      'ws-new',
    ])
    expect(marks).toEqual(['ws-new'])
    expect(preference()).toBe('ws-new')
  })

  it('riscatta un invito e non marca lo spazio per il seed', async () => {
    const { store, marks } = setup({
      workspaces: [summary('ws-a', 'A')],
      redeemed: 'ws-shared',
    })
    await store.getState().load()
    marks.length = 0

    const id = await store.getState().redeem('token')

    expect(id).toBe('ws-shared')
    expect(store.getState().activeId).toBe('ws-shared')
    expect(marks).toEqual([])
  })

  it('dopo l’uscita sceglie un altro spazio disponibile', async () => {
    const { store } = setup({
      workspaces: [summary('ws-a', 'A'), summary('ws-b', 'B', 'editor')],
    })
    await store.getState().load()
    store.getState().activate('ws-b')

    const ok = await store.getState().leave('ws-b')

    expect(ok).toBe(true)
    expect(store.getState().workspaces.map((workspace) => workspace.id)).toEqual(['ws-a'])
    expect(store.getState().activeId).toBe('ws-a')
  })

  it('mappa il tetto degli spazi in un codice traducibile', async () => {
    const { store } = setup({
      workspaces: [summary('ws-a', 'A')],
      failCreate: 'workspaceLimit',
    })
    await store.getState().load()

    const id = await store.getState().create('Troppi')

    expect(id).toBeUndefined()
    expect(store.getState().error).toBe('workspaceLimit')
  })

  it('carica il nome visibile dell’utente', async () => {
    const { store } = setup({
      workspaces: [summary('ws-a', 'A')],
      profile: 'Marco Rossi',
    })

    await store.getState().load()
    await store.getState().loadProfile()

    expect(store.getState().profileStatus).toBe('ready')
    expect(store.getState().profileName).toBe('Marco Rossi')
  })

  it('salva il nome visibile e ne conserva il valore', async () => {
    const { store, fake } = setup({ workspaces: [summary('ws-a', 'A')] })
    await store.getState().load()

    const ok = await store.getState().saveProfile('Giulia')

    expect(ok).toBe(true)
    expect(store.getState().profileName).toBe('Giulia')
    expect(store.getState().profileStatus).toBe('ready')
    expect(fake.savedProfiles).toEqual(['Giulia'])
  })

  it('mappa un nome non valido in un codice traducibile', async () => {
    const { store } = setup({
      workspaces: [summary('ws-a', 'A')],
      failSave: 'invalidName',
    })
    await store.getState().load()

    const ok = await store.getState().saveProfile('x')

    expect(ok).toBe(false)
    expect(store.getState().profileError).toBe('invalidName')
  })

  it('azzera profilo e directory al reset', async () => {
    const { store } = setup({
      workspaces: [summary('ws-a', 'A')],
      profile: 'Marco',
    })
    await store.getState().load()
    await store.getState().loadProfile()

    store.getState().reset()

    expect(store.getState().profileStatus).toBe('idle')
    expect(store.getState().profileName).toBeUndefined()
    expect(store.getState().members).toEqual([])
    expect(store.getState().activeId).toBeUndefined()
  })

  it('sceglie il primo spazio quando la preferenza non è più valida', () => {
    expect(pickActiveWorkspace([summary('ws-a', 'A')], 'missing')).toBe('ws-a')
    expect(pickActiveWorkspace([], 'ws-a')).toBeUndefined()
  })
})
