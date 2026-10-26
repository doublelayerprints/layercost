import { StorageError, type StorageErrorCode } from '@/data/errors'
import type { MessageKey } from '@/i18n'

type Translate = (key: MessageKey, params?: Record<string, string | number>) => string

const STORAGE_ERROR_KEYS: Record<StorageErrorCode, MessageKey> = {
  invalidBackup: 'errors.storage.invalidBackup',
  futureBackup: 'errors.storage.futureBackup',
  invalidJson: 'errors.storage.invalidJson',
  invalidSchemaVersion: 'errors.storage.invalidSchemaVersion',
  futureSchema: 'errors.storage.futureSchema',
  unsupportedSchema: 'errors.storage.unsupportedSchema',
  saveFailed: 'errors.storage.saveFailed',
  invalidData: 'errors.storage.invalidData',
}

/** Translates a storage or backup error by code; unknown errors keep the caller's fallback. */
export function storageErrorMessage(error: unknown, t: Translate): string | undefined {
  if (!(error instanceof StorageError)) return undefined
  return t(STORAGE_ERROR_KEYS[error.code])
}
