import type { AppData } from '@/data/storage'
import type { EnergyTariff, Extra, Material, Printer, Quote, Settings } from '@/domain/types'
import { loadSupabaseClient } from './client'
import type { Tables } from './database.types'
import {
  extraToRow,
  materialToRow,
  printerToRow,
  quoteToRow,
  settingsToRow,
  tariffToRow,
} from './mappers'
import type { CloudSnapshot, SyncOperation } from './sync'

export type CloudErrorCode =
  | 'network'
  | 'auth'
  | 'noWorkspace'
  | 'rateLimited'
  | 'limit'
  | 'unknown'

export class CloudError extends Error {
  readonly code: CloudErrorCode

  constructor(code: CloudErrorCode, message: string = code) {
    super(message)
    this.name = 'CloudError'
    this.code = code
  }
}

export type CloudConflictReason = 'updated' | 'deleted' | 'exists' | 'locked'

export interface CloudConflictResult {
  reason: CloudConflictReason
  remote?: unknown
}

export type CloudPushResult =
  | { ok: true; updatedAt: string; row?: unknown }
  | { ok: false; conflict: CloudConflictResult }

export interface CloudGateway {
  resolveWorkspace: () => Promise<string>
  pull: (workspaceId: string) => Promise<CloudSnapshot>
  push: (workspaceId: string, operation: SyncOperation) => Promise<CloudPushResult>
  importAll: (workspaceId: string, data: AppData) => Promise<CloudSnapshot>
}

interface PostgrestErrorLike {
  code?: string
  message?: string
  status?: number
  name?: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function asPostgrestError(value: unknown): PostgrestErrorLike | undefined {
  return isRecord(value) ? value : undefined
}

function isNetworkMessage(message: string): boolean {
  return /failed to fetch|networkerror|network request failed|load failed|fetch failed/i.test(
    message,
  )
}

export function mapCloudError(error: unknown): CloudError {
  if (error instanceof CloudError) return error
  if (error instanceof TypeError) return new CloudError('network', error.message)

  const candidate = asPostgrestError(error)
  if (candidate) {
    if (candidate.name === 'AuthRetryableFetchError') return new CloudError('network')
    const message = typeof candidate.message === 'string' ? candidate.message : ''
    if (isNetworkMessage(message)) return new CloudError('network', message)
    if (candidate.status === 401 || candidate.status === 403) {
      return new CloudError('auth', message || 'auth')
    }
    if (candidate.status === 429) return new CloudError('rateLimited', message || 'rateLimited')
    if (candidate.code === 'PGRST301') return new CloudError('auth', message || 'auth')
    return new CloudError('unknown', message || 'unknown')
  }

  return new CloudError('unknown', error instanceof Error ? error.message : 'unknown')
}

function isDuplicate(error: PostgrestErrorLike | undefined): boolean {
  return error?.code === '23505'
}

function isLockedQuote(error: PostgrestErrorLike | undefined): boolean {
  return error?.code === 'P0001' && (error.message ?? '').includes('quote_locked')
}

function result(row: { updated_at: string }): CloudPushResult {
  return { ok: true, updatedAt: row.updated_at, row }
}

function conflict(reason: CloudConflictReason, remote?: unknown): CloudPushResult {
  return { ok: false, conflict: { reason, remote } }
}

export async function createSupabaseCloudGateway(): Promise<CloudGateway> {
  const client = await loadSupabaseClient()

  async function fetchSettings(workspaceId: string): Promise<Tables<'settings'> | null> {
    const { data, error } = await client
      .from('settings')
      .select('*')
      .eq('workspace_id', workspaceId)
      .maybeSingle()
    if (error) throw mapCloudError(error)
    return data
  }

  async function fetchTariff(id: string): Promise<Tables<'energy_tariffs'> | null> {
    const { data, error } = await client
      .from('energy_tariffs')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (error) throw mapCloudError(error)
    return data
  }

  async function fetchPrinter(id: string): Promise<Tables<'printers'> | null> {
    const { data, error } = await client.from('printers').select('*').eq('id', id).maybeSingle()
    if (error) throw mapCloudError(error)
    return data
  }

  async function fetchMaterial(id: string): Promise<Tables<'materials'> | null> {
    const { data, error } = await client.from('materials').select('*').eq('id', id).maybeSingle()
    if (error) throw mapCloudError(error)
    return data
  }

  async function fetchExtra(id: string): Promise<Tables<'extras'> | null> {
    const { data, error } = await client.from('extras').select('*').eq('id', id).maybeSingle()
    if (error) throw mapCloudError(error)
    return data
  }

  async function fetchQuote(id: string): Promise<Tables<'quotes'> | null> {
    const { data, error } = await client.from('quotes').select('*').eq('id', id).maybeSingle()
    if (error) throw mapCloudError(error)
    return data
  }

  async function pushSettings(
    workspaceId: string,
    operation: SyncOperation,
  ): Promise<CloudPushResult> {
    const row = settingsToRow(operation.payload as Settings, workspaceId)

    if (operation.expectedUpdatedAt) {
      const { data, error } = await client
        .from('settings')
        .update(row)
        .eq('workspace_id', workspaceId)
        .eq('updated_at', operation.expectedUpdatedAt)
        .select('*')
        .maybeSingle()
      if (error) throw mapCloudError(error)
      if (data) return result(data)
      const remote = await fetchSettings(workspaceId)
      return remote ? conflict('updated', remote) : conflict('deleted')
    }

    const { data, error } = await client.from('settings').insert(row).select('*').single()
    if (error) {
      if (isDuplicate(error)) return conflict('exists', await fetchSettings(workspaceId))
      throw mapCloudError(error)
    }
    return result(data)
  }

  async function pushTariff(
    workspaceId: string,
    operation: SyncOperation,
  ): Promise<CloudPushResult> {
    const row = tariffToRow(operation.payload as EnergyTariff, workspaceId)
    const update = { ...row, ...(operation.resurrect ? { deleted_at: null } : {}) }

    if (operation.expectedUpdatedAt) {
      const { data, error } = await client
        .from('energy_tariffs')
        .update(update)
        .eq('id', operation.entityId)
        .eq('updated_at', operation.expectedUpdatedAt)
        .select('*')
        .maybeSingle()
      if (error) throw mapCloudError(error)
      if (data) return result(data)
      const remote = await fetchTariff(operation.entityId)
      return remote ? conflict('updated', remote) : conflict('deleted')
    }

    const { data, error } = await client.from('energy_tariffs').insert(row).select('*').single()
    if (error) {
      if (isDuplicate(error)) return conflict('exists', await fetchTariff(operation.entityId))
      throw mapCloudError(error)
    }
    return result(data)
  }

  async function pushPrinter(
    workspaceId: string,
    operation: SyncOperation,
  ): Promise<CloudPushResult> {
    const row = printerToRow(operation.payload as Printer, workspaceId)
    const update = { ...row, ...(operation.resurrect ? { deleted_at: null } : {}) }

    if (operation.expectedUpdatedAt) {
      const { data, error } = await client
        .from('printers')
        .update(update)
        .eq('id', operation.entityId)
        .eq('updated_at', operation.expectedUpdatedAt)
        .select('*')
        .maybeSingle()
      if (error) throw mapCloudError(error)
      if (data) return result(data)
      const remote = await fetchPrinter(operation.entityId)
      return remote ? conflict('updated', remote) : conflict('deleted')
    }

    const { data, error } = await client.from('printers').insert(row).select('*').single()
    if (error) {
      if (isDuplicate(error)) return conflict('exists', await fetchPrinter(operation.entityId))
      throw mapCloudError(error)
    }
    return result(data)
  }

  async function pushMaterial(
    workspaceId: string,
    operation: SyncOperation,
  ): Promise<CloudPushResult> {
    const row = materialToRow(operation.payload as Material, workspaceId)
    const update = { ...row, ...(operation.resurrect ? { deleted_at: null } : {}) }

    if (operation.expectedUpdatedAt) {
      const { data, error } = await client
        .from('materials')
        .update(update)
        .eq('id', operation.entityId)
        .eq('updated_at', operation.expectedUpdatedAt)
        .select('*')
        .maybeSingle()
      if (error) throw mapCloudError(error)
      if (data) return result(data)
      const remote = await fetchMaterial(operation.entityId)
      return remote ? conflict('updated', remote) : conflict('deleted')
    }

    const { data, error } = await client.from('materials').insert(row).select('*').single()
    if (error) {
      if (isDuplicate(error)) return conflict('exists', await fetchMaterial(operation.entityId))
      throw mapCloudError(error)
    }
    return result(data)
  }

  async function pushExtra(workspaceId: string, operation: SyncOperation): Promise<CloudPushResult> {
    const row = extraToRow(operation.payload as Extra, workspaceId)
    const update = { ...row, ...(operation.resurrect ? { deleted_at: null } : {}) }

    if (operation.expectedUpdatedAt) {
      const { data, error } = await client
        .from('extras')
        .update(update)
        .eq('id', operation.entityId)
        .eq('updated_at', operation.expectedUpdatedAt)
        .select('*')
        .maybeSingle()
      if (error) throw mapCloudError(error)
      if (data) return result(data)
      const remote = await fetchExtra(operation.entityId)
      return remote ? conflict('updated', remote) : conflict('deleted')
    }

    const { data, error } = await client.from('extras').insert(row).select('*').single()
    if (error) {
      if (isDuplicate(error)) return conflict('exists', await fetchExtra(operation.entityId))
      throw mapCloudError(error)
    }
    return result(data)
  }

  async function pushQuote(workspaceId: string, operation: SyncOperation): Promise<CloudPushResult> {
    const row = quoteToRow(operation.payload as Quote, workspaceId)
    const update = { ...row, ...(operation.resurrect ? { deleted_at: null } : {}) }
    // `created_at` is immutable and checked by protect_locked_quote. It is set
    // only on insert, never resent on update.
    delete update.created_at

    if (operation.expectedUpdatedAt) {
      const { data, error } = await client
        .from('quotes')
        .update(update)
        .eq('id', operation.entityId)
        .eq('updated_at', operation.expectedUpdatedAt)
        .select('*')
        .maybeSingle()
      if (error) {
        if (isLockedQuote(error)) return conflict('locked', await fetchQuote(operation.entityId))
        throw mapCloudError(error)
      }
      if (data) return result(data)
      const remote = await fetchQuote(operation.entityId)
      return remote ? conflict('updated', remote) : conflict('deleted')
    }

    const { data, error } = await client.from('quotes').insert(row).select('*').single()
    if (error) {
      if (isDuplicate(error)) return conflict('exists', await fetchQuote(operation.entityId))
      throw mapCloudError(error)
    }
    return result(data)
  }

  async function deleteTariff(operation: SyncOperation): Promise<CloudPushResult> {
    let expected = operation.expectedUpdatedAt
    if (!expected) {
      const remote = await fetchTariff(operation.entityId)
      if (!remote) return { ok: true, updatedAt: new Date().toISOString() }
      expected = remote.updated_at
    }
    const now = new Date().toISOString()
    const { data, error } = await client
      .from('energy_tariffs')
      .update({ deleted_at: now })
      .eq('id', operation.entityId)
      .eq('updated_at', expected)
      .select('*')
      .maybeSingle()
    if (error) throw mapCloudError(error)
    if (data) return result(data)
    const remote = await fetchTariff(operation.entityId)
    return remote ? conflict('updated', remote) : { ok: true, updatedAt: now }
  }

  async function deletePrinter(operation: SyncOperation): Promise<CloudPushResult> {
    let expected = operation.expectedUpdatedAt
    if (!expected) {
      const remote = await fetchPrinter(operation.entityId)
      if (!remote) return { ok: true, updatedAt: new Date().toISOString() }
      expected = remote.updated_at
    }
    const now = new Date().toISOString()
    const { data, error } = await client
      .from('printers')
      .update({ deleted_at: now })
      .eq('id', operation.entityId)
      .eq('updated_at', expected)
      .select('*')
      .maybeSingle()
    if (error) throw mapCloudError(error)
    if (data) return result(data)
    const remote = await fetchPrinter(operation.entityId)
    return remote ? conflict('updated', remote) : { ok: true, updatedAt: now }
  }

  async function deleteMaterial(operation: SyncOperation): Promise<CloudPushResult> {
    let expected = operation.expectedUpdatedAt
    if (!expected) {
      const remote = await fetchMaterial(operation.entityId)
      if (!remote) return { ok: true, updatedAt: new Date().toISOString() }
      expected = remote.updated_at
    }
    const now = new Date().toISOString()
    const { data, error } = await client
      .from('materials')
      .update({ deleted_at: now })
      .eq('id', operation.entityId)
      .eq('updated_at', expected)
      .select('*')
      .maybeSingle()
    if (error) throw mapCloudError(error)
    if (data) return result(data)
    const remote = await fetchMaterial(operation.entityId)
    return remote ? conflict('updated', remote) : { ok: true, updatedAt: now }
  }

  async function deleteExtra(operation: SyncOperation): Promise<CloudPushResult> {
    let expected = operation.expectedUpdatedAt
    if (!expected) {
      const remote = await fetchExtra(operation.entityId)
      if (!remote) return { ok: true, updatedAt: new Date().toISOString() }
      expected = remote.updated_at
    }
    const now = new Date().toISOString()
    const { data, error } = await client
      .from('extras')
      .update({ deleted_at: now })
      .eq('id', operation.entityId)
      .eq('updated_at', expected)
      .select('*')
      .maybeSingle()
    if (error) throw mapCloudError(error)
    if (data) return result(data)
    const remote = await fetchExtra(operation.entityId)
    return remote ? conflict('updated', remote) : { ok: true, updatedAt: now }
  }

  async function deleteQuote(operation: SyncOperation): Promise<CloudPushResult> {
    let expected = operation.expectedUpdatedAt
    if (!expected) {
      const remote = await fetchQuote(operation.entityId)
      if (!remote) return { ok: true, updatedAt: new Date().toISOString() }
      expected = remote.updated_at
    }
    const now = new Date().toISOString()
    const { data, error } = await client
      .from('quotes')
      .update({ deleted_at: now })
      .eq('id', operation.entityId)
      .eq('updated_at', expected)
      .select('*')
      .maybeSingle()
    if (error) throw mapCloudError(error)
    if (data) return result(data)
    const remote = await fetchQuote(operation.entityId)
    return remote ? conflict('updated', remote) : { ok: true, updatedAt: now }
  }

  async function pullSnapshot(workspaceId: string): Promise<CloudSnapshot> {
    const [settings, tariffs, printers, materials, extras, quotes] = await Promise.all([
      client.from('settings').select('*').eq('workspace_id', workspaceId).maybeSingle(),
      client
        .from('energy_tariffs')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('effective_from', { ascending: false }),
      client.from('printers').select('*').eq('workspace_id', workspaceId),
      client.from('materials').select('*').eq('workspace_id', workspaceId),
      client.from('extras').select('*').eq('workspace_id', workspaceId),
      client
        .from('quotes')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('quote_date', { ascending: false }),
    ])

    const firstError = [settings, tariffs, printers, materials, extras, quotes]
      .map((response) => response.error)
      .find((error) => error !== null)
    if (firstError) throw mapCloudError(firstError)

    return {
      workspaceId,
      settings: settings.data ?? null,
      tariffs: tariffs.data ?? [],
      printers: printers.data ?? [],
      materials: materials.data ?? [],
      extras: extras.data ?? [],
      quotes: quotes.data ?? [],
    }
  }

  return {
    async resolveWorkspace() {
      const { data, error } = await client
        .from('workspace_members')
        .select('workspace_id')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()
      if (error) throw mapCloudError(error)
      if (!data) throw new CloudError('noWorkspace')
      return data.workspace_id
    },

    pull: pullSnapshot,

    async push(workspaceId, operation) {
      try {
        if (operation.entity === 'settings') {
          if (operation.kind === 'delete') {
            return { ok: true, updatedAt: new Date().toISOString() }
          }
          return await pushSettings(workspaceId, operation)
        }
        if (operation.kind === 'delete') {
          switch (operation.entity) {
            case 'energyTariff':
              return await deleteTariff(operation)
            case 'printer':
              return await deletePrinter(operation)
            case 'material':
              return await deleteMaterial(operation)
            case 'extra':
              return await deleteExtra(operation)
            case 'quote':
              return await deleteQuote(operation)
          }
        }
        switch (operation.entity) {
          case 'energyTariff':
            return await pushTariff(workspaceId, operation)
          case 'printer':
            return await pushPrinter(workspaceId, operation)
          case 'material':
            return await pushMaterial(workspaceId, operation)
          case 'extra':
            return await pushExtra(workspaceId, operation)
          case 'quote':
            return await pushQuote(workspaceId, operation)
        }
        throw new CloudError('unknown')
      } catch (error) {
        throw mapCloudError(error)
      }
    },

    async importAll(workspaceId, data) {
      const settings = settingsToRow(data.config.settings, workspaceId)
      const { error: settingsError } = await client
        .from('settings')
        .upsert(settings, { onConflict: 'workspace_id' })
      if (settingsError) throw mapCloudError(settingsError)

      const tariffs = data.config.settings.tariffs
      if (tariffs.length > 0) {
        const { error } = await client
          .from('energy_tariffs')
          .upsert(
            tariffs.map((tariff) => tariffToRow(tariff, workspaceId)),
            { onConflict: 'id' },
          )
        if (error) throw mapCloudError(error)
      }

      if (data.config.printers.length > 0) {
        const { error } = await client
          .from('printers')
          .upsert(
            data.config.printers.map((printer) => printerToRow(printer, workspaceId)),
            { onConflict: 'id' },
          )
        if (error) throw mapCloudError(error)
      }

      if (data.config.materials.length > 0) {
        const { error } = await client
          .from('materials')
          .upsert(
            data.config.materials.map((material) => materialToRow(material, workspaceId)),
            { onConflict: 'id' },
          )
        if (error) throw mapCloudError(error)
      }

      if (data.config.extras.length > 0) {
        const { error } = await client
          .from('extras')
          .upsert(
            data.config.extras.map((extra) => extraToRow(extra, workspaceId)),
            { onConflict: 'id' },
          )
        if (error) throw mapCloudError(error)
      }

      const quotes = data.quotes.filter((quote) => quote.status !== 'draft')
      if (quotes.length > 0) {
        const { error } = await client
          .from('quotes')
          .upsert(
            quotes.map((quote) => quoteToRow(quote, workspaceId)),
            { onConflict: 'id' },
          )
        if (error) throw mapCloudError(error)
      }

      return await pullSnapshot(workspaceId)
    },
  }
}
