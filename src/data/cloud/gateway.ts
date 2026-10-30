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

export type WorkspaceRole = 'owner' | 'editor'

export interface WorkspaceSummary {
  id: string
  name: string
  role: WorkspaceRole
  joinedAt: string
}

export interface WorkspaceMember {
  userId: string
  role: WorkspaceRole
  /** Only owners receive the email; editors get `undefined`. */
  email?: string
  joinedAt: string
}

export interface WorkspaceInvite {
  id: string
  role: WorkspaceRole
  expiresAt: string
  maxUses: number
  usedCount: number
  revokedAt?: string
  createdAt: string
}

export type WorkspaceErrorCode =
  | 'network'
  | 'auth'
  | 'workspaceLimit'
  | 'memberLimit'
  | 'invalidName'
  | 'inviteInvalid'
  | 'inviteExpired'
  | 'inviteRevoked'
  | 'inviteExhausted'
  | 'lastOwner'
  | 'notOwner'
  | 'notMember'
  | 'unknown'

export class WorkspaceError extends Error {
  readonly code: WorkspaceErrorCode

  constructor(code: WorkspaceErrorCode, message: string = code) {
    super(message)
    this.name = 'WorkspaceError'
    this.code = code
  }
}

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
  listWorkspaces: () => Promise<WorkspaceSummary[]>
  ensurePersonalWorkspace: () => Promise<string | null>
  createWorkspace: (name: string) => Promise<string>
  renameWorkspace: (workspaceId: string, name: string) => Promise<void>
  listMembers: (workspaceId: string) => Promise<WorkspaceMember[]>
  listInvites: (workspaceId: string) => Promise<WorkspaceInvite[]>
  createInvite: (workspaceId: string, role: WorkspaceRole, days: number) => Promise<string>
  revokeInvite: (inviteId: string) => Promise<void>
  redeemInvite: (token: string) => Promise<string>
  leaveWorkspace: (workspaceId: string) => Promise<void>
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

const WORKSPACE_ERRORS: Record<string, WorkspaceErrorCode> = {
  workspace_limit: 'workspaceLimit',
  member_limit: 'memberLimit',
  invalid_name: 'invalidName',
  invalid_role: 'invalidName',
  invalid_expiry: 'invalidName',
  invite_invalid: 'inviteInvalid',
  invite_expired: 'inviteExpired',
  invite_revoked: 'inviteRevoked',
  invite_exhausted: 'inviteExhausted',
  last_owner: 'lastOwner',
  not_owner: 'notOwner',
  not_member: 'notMember',
  not_authenticated: 'auth',
}

/** Maps the RPC `raise exception` messages and the PostgREST errors. */
export function mapWorkspaceError(error: unknown): WorkspaceError {
  if (error instanceof WorkspaceError) return error
  const candidate = asPostgrestError(error)
  if (candidate) {
    const message = typeof candidate.message === 'string' ? candidate.message : ''
    if (isNetworkMessage(message)) return new WorkspaceError('network', message)
    // Business errors carry a specific message; check it before the HTTP status
    // so `not_owner`/`not_member` are not collapsed into a generic auth error.
    const code = WORKSPACE_ERRORS[message.trim()]
    if (code) return new WorkspaceError(code, message)
    if (candidate.status === 401 || candidate.status === 403) {
      return new WorkspaceError('auth', message || 'auth')
    }
    if (candidate.code === 'PGRST301') return new WorkspaceError('auth', message || 'auth')
    return new WorkspaceError('unknown', message || 'unknown')
  }
  return mapWorkspaceError({ message: error instanceof Error ? error.message : 'unknown' })
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

function toRole(value: string): WorkspaceRole {
  return value === 'owner' ? 'owner' : 'editor'
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

  async function fetchTariff(
    workspaceId: string,
    id: string,
  ): Promise<Tables<'energy_tariffs'> | null> {
    const { data, error } = await client
      .from('energy_tariffs')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('id', id)
      .maybeSingle()
    if (error) throw mapCloudError(error)
    return data
  }

  async function fetchPrinter(
    workspaceId: string,
    id: string,
  ): Promise<Tables<'printers'> | null> {
    const { data, error } = await client
      .from('printers')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('id', id)
      .maybeSingle()
    if (error) throw mapCloudError(error)
    return data
  }

  async function fetchMaterial(
    workspaceId: string,
    id: string,
  ): Promise<Tables<'materials'> | null> {
    const { data, error } = await client
      .from('materials')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('id', id)
      .maybeSingle()
    if (error) throw mapCloudError(error)
    return data
  }

  async function fetchExtra(workspaceId: string, id: string): Promise<Tables<'extras'> | null> {
    const { data, error } = await client
      .from('extras')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('id', id)
      .maybeSingle()
    if (error) throw mapCloudError(error)
    return data
  }

  async function fetchQuote(workspaceId: string, id: string): Promise<Tables<'quotes'> | null> {
    const { data, error } = await client
      .from('quotes')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('id', id)
      .maybeSingle()
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
        .eq('workspace_id', workspaceId)
        .eq('id', operation.entityId)
        .eq('updated_at', operation.expectedUpdatedAt)
        .select('*')
        .maybeSingle()
      if (error) throw mapCloudError(error)
      if (data) return result(data)
      const remote = await fetchTariff(workspaceId, operation.entityId)
      return remote ? conflict('updated', remote) : conflict('deleted')
    }

    const { data, error } = await client.from('energy_tariffs').insert(row).select('*').single()
    if (error) {
      if (isDuplicate(error)) return conflict('exists', await fetchTariff(workspaceId, operation.entityId))
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
        .eq('workspace_id', workspaceId)
        .eq('id', operation.entityId)
        .eq('updated_at', operation.expectedUpdatedAt)
        .select('*')
        .maybeSingle()
      if (error) throw mapCloudError(error)
      if (data) return result(data)
      const remote = await fetchPrinter(workspaceId, operation.entityId)
      return remote ? conflict('updated', remote) : conflict('deleted')
    }

    const { data, error } = await client.from('printers').insert(row).select('*').single()
    if (error) {
      if (isDuplicate(error)) return conflict('exists', await fetchPrinter(workspaceId, operation.entityId))
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
        .eq('workspace_id', workspaceId)
        .eq('id', operation.entityId)
        .eq('updated_at', operation.expectedUpdatedAt)
        .select('*')
        .maybeSingle()
      if (error) throw mapCloudError(error)
      if (data) return result(data)
      const remote = await fetchMaterial(workspaceId, operation.entityId)
      return remote ? conflict('updated', remote) : conflict('deleted')
    }

    const { data, error } = await client.from('materials').insert(row).select('*').single()
    if (error) {
      if (isDuplicate(error)) return conflict('exists', await fetchMaterial(workspaceId, operation.entityId))
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
        .eq('workspace_id', workspaceId)
        .eq('id', operation.entityId)
        .eq('updated_at', operation.expectedUpdatedAt)
        .select('*')
        .maybeSingle()
      if (error) throw mapCloudError(error)
      if (data) return result(data)
      const remote = await fetchExtra(workspaceId, operation.entityId)
      return remote ? conflict('updated', remote) : conflict('deleted')
    }

    const { data, error } = await client.from('extras').insert(row).select('*').single()
    if (error) {
      if (isDuplicate(error)) return conflict('exists', await fetchExtra(workspaceId, operation.entityId))
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
        .eq('workspace_id', workspaceId)
        .eq('id', operation.entityId)
        .eq('updated_at', operation.expectedUpdatedAt)
        .select('*')
        .maybeSingle()
      if (error) {
        if (isLockedQuote(error)) {
          return conflict('locked', await fetchQuote(workspaceId, operation.entityId))
        }
        throw mapCloudError(error)
      }
      if (data) return result(data)
      const remote = await fetchQuote(workspaceId, operation.entityId)
      return remote ? conflict('updated', remote) : conflict('deleted')
    }

    const { data, error } = await client.from('quotes').insert(row).select('*').single()
    if (error) {
      if (isDuplicate(error)) return conflict('exists', await fetchQuote(workspaceId, operation.entityId))
      throw mapCloudError(error)
    }
    return result(data)
  }

  async function deleteTariff(
    workspaceId: string,
    operation: SyncOperation,
  ): Promise<CloudPushResult> {
    let expected = operation.expectedUpdatedAt
    if (!expected) {
      const remote = await fetchTariff(workspaceId, operation.entityId)
      if (!remote) return { ok: true, updatedAt: new Date().toISOString() }
      expected = remote.updated_at
    }
    const now = new Date().toISOString()
    const { data, error } = await client
      .from('energy_tariffs')
      .update({ deleted_at: now })
      .eq('workspace_id', workspaceId)
      .eq('id', operation.entityId)
      .eq('updated_at', expected)
      .select('*')
      .maybeSingle()
    if (error) throw mapCloudError(error)
    if (data) return result(data)
    const remote = await fetchTariff(workspaceId, operation.entityId)
    return remote ? conflict('updated', remote) : { ok: true, updatedAt: now }
  }

  async function deletePrinter(
    workspaceId: string,
    operation: SyncOperation,
  ): Promise<CloudPushResult> {
    let expected = operation.expectedUpdatedAt
    if (!expected) {
      const remote = await fetchPrinter(workspaceId, operation.entityId)
      if (!remote) return { ok: true, updatedAt: new Date().toISOString() }
      expected = remote.updated_at
    }
    const now = new Date().toISOString()
    const { data, error } = await client
      .from('printers')
      .update({ deleted_at: now })
      .eq('workspace_id', workspaceId)
      .eq('id', operation.entityId)
      .eq('updated_at', expected)
      .select('*')
      .maybeSingle()
    if (error) throw mapCloudError(error)
    if (data) return result(data)
    const remote = await fetchPrinter(workspaceId, operation.entityId)
    return remote ? conflict('updated', remote) : { ok: true, updatedAt: now }
  }

  async function deleteMaterial(
    workspaceId: string,
    operation: SyncOperation,
  ): Promise<CloudPushResult> {
    let expected = operation.expectedUpdatedAt
    if (!expected) {
      const remote = await fetchMaterial(workspaceId, operation.entityId)
      if (!remote) return { ok: true, updatedAt: new Date().toISOString() }
      expected = remote.updated_at
    }
    const now = new Date().toISOString()
    const { data, error } = await client
      .from('materials')
      .update({ deleted_at: now })
      .eq('workspace_id', workspaceId)
      .eq('id', operation.entityId)
      .eq('updated_at', expected)
      .select('*')
      .maybeSingle()
    if (error) throw mapCloudError(error)
    if (data) return result(data)
    const remote = await fetchMaterial(workspaceId, operation.entityId)
    return remote ? conflict('updated', remote) : { ok: true, updatedAt: now }
  }

  async function deleteExtra(
    workspaceId: string,
    operation: SyncOperation,
  ): Promise<CloudPushResult> {
    let expected = operation.expectedUpdatedAt
    if (!expected) {
      const remote = await fetchExtra(workspaceId, operation.entityId)
      if (!remote) return { ok: true, updatedAt: new Date().toISOString() }
      expected = remote.updated_at
    }
    const now = new Date().toISOString()
    const { data, error } = await client
      .from('extras')
      .update({ deleted_at: now })
      .eq('workspace_id', workspaceId)
      .eq('id', operation.entityId)
      .eq('updated_at', expected)
      .select('*')
      .maybeSingle()
    if (error) throw mapCloudError(error)
    if (data) return result(data)
    const remote = await fetchExtra(workspaceId, operation.entityId)
    return remote ? conflict('updated', remote) : { ok: true, updatedAt: now }
  }

  async function deleteQuote(
    workspaceId: string,
    operation: SyncOperation,
  ): Promise<CloudPushResult> {
    let expected = operation.expectedUpdatedAt
    if (!expected) {
      const remote = await fetchQuote(workspaceId, operation.entityId)
      if (!remote) return { ok: true, updatedAt: new Date().toISOString() }
      expected = remote.updated_at
    }
    const now = new Date().toISOString()
    const { data, error } = await client
      .from('quotes')
      .update({ deleted_at: now })
      .eq('workspace_id', workspaceId)
      .eq('id', operation.entityId)
      .eq('updated_at', expected)
      .select('*')
      .maybeSingle()
    if (error) throw mapCloudError(error)
    if (data) return result(data)
    const remote = await fetchQuote(workspaceId, operation.entityId)
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
    async listWorkspaces() {
      const { data, error } = await client.rpc('list_my_workspaces')
      if (error) throw mapWorkspaceError(error)
      return (data ?? []).map((row) => ({
        id: row.workspace_id,
        name: row.name,
        role: toRole(row.role),
        joinedAt: row.joined_at,
      }))
    },

    async ensurePersonalWorkspace() {
      const { data, error } = await client.rpc('ensure_personal_workspace')
      if (error) throw mapWorkspaceError(error)
      return data ?? null
    },

    async createWorkspace(name) {
      const { data, error } = await client.rpc('create_workspace', { p_name: name })
      if (error) throw mapWorkspaceError(error)
      if (!data) throw new WorkspaceError('unknown')
      return data
    },

    async renameWorkspace(workspaceId, name) {
      const { error } = await client
        .from('workspaces')
        .update({ name: name.trim() })
        .eq('id', workspaceId)
      if (error) throw mapWorkspaceError(error)
    },

    async listMembers(workspaceId) {
      const { data, error } = await client.rpc('list_workspace_members', {
        p_workspace_id: workspaceId,
      })
      if (error) throw mapWorkspaceError(error)
      return (data ?? []).map((row) => ({
        userId: row.user_id,
        role: toRole(row.role),
        email: row.email ?? undefined,
        joinedAt: row.joined_at,
      }))
    },

    async listInvites(workspaceId) {
      const { data, error } = await client.rpc('list_workspace_invites', {
        p_workspace_id: workspaceId,
      })
      if (error) throw mapWorkspaceError(error)
      return (data ?? []).map((row) => ({
        id: row.id,
        role: toRole(row.role),
        expiresAt: row.expires_at,
        maxUses: row.max_uses,
        usedCount: row.used_count,
        revokedAt: row.revoked_at ?? undefined,
        createdAt: row.created_at,
      }))
    },

    async createInvite(workspaceId, role, days) {
      const { data, error } = await client.rpc('create_invite', {
        p_workspace_id: workspaceId,
        p_role: role,
        p_days: days,
      })
      if (error) throw mapWorkspaceError(error)
      if (!data) throw new WorkspaceError('unknown')
      return data
    },

    async revokeInvite(inviteId) {
      const { error } = await client.rpc('revoke_invite', { p_invite_id: inviteId })
      if (error) throw mapWorkspaceError(error)
    },

    async redeemInvite(token) {
      const { data, error } = await client.rpc('redeem_invite', { p_token: token.trim() })
      if (error) throw mapWorkspaceError(error)
      if (!data) throw new WorkspaceError('inviteInvalid')
      return data
    },

    async leaveWorkspace(workspaceId) {
      const { error } = await client.rpc('leave_workspace', { p_workspace_id: workspaceId })
      if (error) throw mapWorkspaceError(error)
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
              return await deleteTariff(workspaceId, operation)
            case 'printer':
              return await deletePrinter(workspaceId, operation)
            case 'material':
              return await deleteMaterial(workspaceId, operation)
            case 'extra':
              return await deleteExtra(workspaceId, operation)
            case 'quote':
              return await deleteQuote(workspaceId, operation)
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
            { onConflict: 'workspace_id,id' },
          )
        if (error) throw mapCloudError(error)
      }

      if (data.config.printers.length > 0) {
        const { error } = await client
          .from('printers')
          .upsert(
            data.config.printers.map((printer) => printerToRow(printer, workspaceId)),
            { onConflict: 'workspace_id,id' },
          )
        if (error) throw mapCloudError(error)
      }

      if (data.config.materials.length > 0) {
        const { error } = await client
          .from('materials')
          .upsert(
            data.config.materials.map((material) => materialToRow(material, workspaceId)),
            { onConflict: 'workspace_id,id' },
          )
        if (error) throw mapCloudError(error)
      }

      if (data.config.extras.length > 0) {
        const { error } = await client
          .from('extras')
          .upsert(
            data.config.extras.map((extra) => extraToRow(extra, workspaceId)),
            { onConflict: 'workspace_id,id' },
          )
        if (error) throw mapCloudError(error)
      }

      const quotes = data.quotes.filter((quote) => quote.status !== 'draft')
      if (quotes.length > 0) {
        const { error } = await client
          .from('quotes')
          .upsert(
            quotes.map((quote) => quoteToRow(quote, workspaceId)),
            { onConflict: 'workspace_id,id' },
          )
        if (error) throw mapCloudError(error)
      }

      return await pullSnapshot(workspaceId)
    },
  }
}
