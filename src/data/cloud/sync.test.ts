import { describe, expect, it } from 'vitest'
import type { AppData } from '@/data/storage'
import { createInitialData } from '@/data/storage'
import { createSeedConfig } from '@/data/seed'
import { asBasisPoints, asMicroEur, asSeconds } from '@/domain/units'
import type { Tables } from './database.types'
import { quoteToRow, settingsToRow } from './mappers'
import {
  ackOperation,
  ackPushedOperation,
  decideFirstLogin,
  diffAppData,
  emptySyncState,
  enqueueChanges,
  hasMeaningfulData,
  isCloudEmpty,
  metadataFromSnapshot,
  nextPendingOperation,
  snapshotToData,
  type CloudSnapshot,
  type SyncLocalState,
  type SyncOperation,
} from './sync'

function clone(data: AppData): AppData {
  return structuredClone(data)
}

function savedQuote(data: AppData, name: string): AppData {
  const next = clone(data)
  const quote = structuredClone(next.draft)
  quote.id = `quote-${name}`
  quote.name = name
  quote.status = 'saved'
  next.quotes.push(quote)
  return next
}

function settingsRow(): Tables<'settings'> {
  return {
    ...settingsToRow(createSeedConfig().settings, 'ws-1'),
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    created_by: null,
    updated_by: null,
  } as unknown as Tables<'settings'>
}

function snapshot(overrides: Partial<CloudSnapshot> = {}): CloudSnapshot {
  return {
    workspaceId: 'ws-1',
    settings: settingsRow(),
    tariffs: [],
    printers: [],
    materials: [],
    extras: [],
    quotes: [],
    ...overrides,
  }
}

function operation(overrides: Partial<SyncOperation> = {}): SyncOperation {
  return {
    id: 'op-1',
    entity: 'printer',
    entityId: 'printer-1',
    kind: 'upsert',
    createdAt: '2026-01-01T00:00:00.000Z',
    attempts: 0,
    ...overrides,
  }
}

describe('diffAppData', () => {
  it('rileva impostazioni, configurazione e preventivi senza toccare la bozza', () => {
    const before = createInitialData()
    const next = savedQuote(before, 'Uno')
    next.config.settings = { ...next.config.settings, failureRateBp: asBasisPoints(700) }
    next.config.printers[0] = { ...next.config.printers[0]!, name: 'Kobra rinominata' }
    next.draft.name = 'Bozza non sincronizzata'

    const changes = diffAppData(before, next)

    expect(changes.map((change) => `${change.entity}:${change.id}:${change.kind}`)).toEqual([
      'settings:settings:upsert',
      'printer:printer-kobra-3:upsert',
      'quote:quote-Uno:upsert',
    ])
  })

  it('genera delete per le entità rimosse', () => {
    const before = savedQuote(createInitialData(), 'Da eliminare')
    const next = clone(before)
    next.quotes = []
    next.config.extras = []

    const changes = diffAppData(before, next)

    expect(changes).toContainEqual({
      entity: 'quote',
      id: 'quote-Da eliminare',
      kind: 'delete',
    })
    expect(changes.filter((change) => change.entity === 'extra')).toHaveLength(
      before.config.extras.length,
    )
  })
})

describe('outbox', () => {
  it('deduplica per entità e conserva il timestamp remoto', () => {
    const printer = createSeedConfig().printers[0]!
    const base: SyncLocalState = {
      ...emptySyncState(),
      metadata: { [`printer:${printer.id}`]: { updatedAt: 't1', deleted: false } },
    }
    const first = enqueueChanges(
      base,
      [{ entity: 'printer', id: printer.id, kind: 'upsert', payload: printer }],
      { workspaceId: 'ws-1', now: 'now', newId: () => 'op-1' },
    )
    const second = enqueueChanges(
      first,
      [
        {
          entity: 'printer',
          id: printer.id,
          kind: 'upsert',
          payload: { ...printer, name: 'B' },
        },
      ],
      { workspaceId: 'ws-1', now: 'later', newId: () => 'op-2' },
    )

    expect(second.operations).toHaveLength(1)
    expect(second.operations[0]).toMatchObject({
      id: 'op-1',
      expectedUpdatedAt: 't1',
      payload: { id: printer.id, name: 'B' },
    })
  })

  it('ignora i delete di entità mai arrivate al cloud', () => {
    const state = enqueueChanges(
      emptySyncState(),
      [{ entity: 'material', id: 'material-1', kind: 'delete' }],
      { workspaceId: 'ws-1', now: 'now', newId: () => 'op-1' },
    )

    expect(state.operations).toEqual([])
  })

  it('mette gli upsert prima dei delete e rispetta le dipendenze', () => {
    const state: SyncLocalState = {
      ...emptySyncState(),
      operations: [
        operation({ id: 'delete-tariff', entity: 'energyTariff', kind: 'delete' }),
        operation({ id: 'upsert-printer', entity: 'printer' }),
        operation({ id: 'upsert-tariff', entity: 'energyTariff' }),
        operation({ id: 'delete-quote', entity: 'quote', kind: 'delete' }),
      ],
    }

    expect(nextPendingOperation(state)?.id).toBe('upsert-tariff')
    const afterFirst = { ...state, operations: state.operations.filter((op) => op.id !== 'upsert-tariff') }
    expect(nextPendingOperation(afterFirst)?.id).toBe('upsert-printer')
    const afterSecond = {
      ...afterFirst,
      operations: afterFirst.operations.filter((op) => op.id !== 'upsert-printer'),
    }
    expect(nextPendingOperation(afterSecond)?.id).toBe('delete-quote')
  })

  it('riconosce il payload cambiato durante il push e lo lascia in coda', () => {
    const printer = createSeedConfig().printers[0]!
    const pushed = operation({
      entityId: printer.id,
      expectedUpdatedAt: 't1',
      payload: { ...printer, name: 'A' },
    })
    const current: SyncLocalState = {
      ...emptySyncState(),
      operations: [
        operation({
          entityId: printer.id,
          expectedUpdatedAt: 't1',
          payload: { ...printer, name: 'B' },
        }),
      ],
    }

    const acked = ackPushedOperation(current, pushed, 't2')

    expect(acked.operations).toHaveLength(1)
    expect(acked.operations[0]).toMatchObject({
      payload: { id: printer.id, name: 'B' },
      expectedUpdatedAt: 't2',
    })
    expect(acked.metadata[`printer:${printer.id}`]?.updatedAt).toBe('t2')
  })

  it('rimuove l’operazione quando il payload non è cambiato', () => {
    const printer = createSeedConfig().printers[0]!
    const pushed = operation({
      entityId: printer.id,
      expectedUpdatedAt: 't1',
      payload: printer,
    })
    const current: SyncLocalState = { ...emptySyncState(), operations: [pushed] }

    const acked = ackPushedOperation(current, pushed, 't2')

    expect(acked.operations).toEqual([])
    expect(acked.metadata[`printer:${printer.id}`]).toEqual({
      updatedAt: 't2',
      deleted: false,
    })
  })

  it('ackOperation registra il tombstone', () => {
    const state: SyncLocalState = {
      ...emptySyncState(),
      operations: [operation({ kind: 'delete' })],
    }

    const acked = ackOperation(state, 'op-1', 't3')

    expect(acked.operations).toEqual([])
    expect(acked.metadata['printer:printer-1']).toEqual({ updatedAt: 't3', deleted: true })
  })
})

describe('snapshot e primo login', () => {
  it('riconosce un cloud vuoto', () => {
    expect(isCloudEmpty(snapshot({ settings: null }))).toBe(true)
    expect(isCloudEmpty(snapshot())).toBe(false)
  })

  it('estrae i metadati anche dai tombstone', () => {
    const quote = savedQuote(createInitialData(), 'Tombstone').quotes[0]!
    const row = {
      ...quoteToRow(quote, 'ws-1'),
      created_at: quote.createdAt,
      updated_at: 't2',
      deleted_at: 't3',
      created_by: null,
      updated_by: null,
    } as Tables<'quotes'>
    const metadata = metadataFromSnapshot(snapshot({ quotes: [row] }))

    expect(metadata['settings:ws-1']).toEqual({
      updatedAt: '2026-01-01T00:00:00.000Z',
      deleted: false,
    })
    expect(metadata[`quote:${quote.id}`]).toEqual({ updatedAt: 't2', deleted: true })
  })

  it('mappa il cloud in AppData conservando la bozza', () => {
    const draft = createInitialData().draft
    const data = snapshotToData(snapshot(), draft)

    expect(data.schemaVersion).toBe(4)
    expect(data.quotes).toEqual([])
    expect(data.draft).toBe(draft)
    expect(data.config.printers).toEqual([])
  })

  it('decide il primo login senza sovrascrivere dati in silenzio', () => {
    expect(
      decideFirstLogin({ cloudEmpty: true, hasCache: false, localHasData: false }),
    ).toBe('importCurrent')
    expect(
      decideFirstLogin({ cloudEmpty: true, hasCache: false, localHasData: true }),
    ).toBe('promptImport')
    expect(decideFirstLogin({ cloudEmpty: true, hasCache: true, localHasData: true })).toBe(
      'importCache',
    )
    expect(
      decideFirstLogin({ cloudEmpty: false, hasCache: false, localHasData: false }),
    ).toBe('useCloud')
    expect(
      decideFirstLogin({ cloudEmpty: false, hasCache: false, localHasData: true }),
    ).toBe('promptCloudWins')
    expect(decideFirstLogin({ cloudEmpty: false, hasCache: true, localHasData: true })).toBe(
      'useCache',
    )
  })

  it('distingue una bozza vuota da dati locali significativi', () => {
    const initial = createInitialData()
    expect(hasMeaningfulData(initial)).toBe(false)

    const withQuote = savedQuote(initial, 'Uno')
    expect(hasMeaningfulData(withQuote)).toBe(true)

    const withConfig = clone(initial)
    withConfig.config.printers[0] = {
      ...withConfig.config.printers[0]!,
      purchasePrice: asMicroEur(1),
    }
    expect(hasMeaningfulData(withConfig)).toBe(true)

    const withDraft = clone(initial)
    withDraft.draft.lines[0] = {
      ...withDraft.draft.lines[0]!,
      timeSeconds: asSeconds(10),
    }
    expect(hasMeaningfulData(withDraft)).toBe(true)
  })
})
