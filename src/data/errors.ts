export type StorageErrorCode =
  | 'invalidBackup'
  | 'futureBackup'
  | 'invalidJson'
  | 'invalidSchemaVersion'
  | 'futureSchema'
  | 'unsupportedSchema'
  | 'saveFailed'
  | 'invalidData'

export class StorageError extends Error {
  readonly code: StorageErrorCode

  constructor(code: StorageErrorCode, message: string) {
    super(message)
    this.name = 'StorageError'
    this.code = code
  }
}
