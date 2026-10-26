export type ThreeMfImportErrorCode =
  | 'NOT_A_ZIP'
  | 'NOT_A_3MF'
  | 'ARCHIVE_TOO_LARGE'
  | 'TOO_MANY_ENTRIES'
  | 'UNSAFE_PATH'
  | 'ENCRYPTED_ENTRY'
  | 'UNSUPPORTED_COMPRESSION'
  | 'UNSUPPORTED_ZIP64'
  | 'UNSUPPORTED_MULTI_DISK'
  | 'DUPLICATE_ENTRY'
  | 'CORRUPT_ZIP'
  | 'METADATA_TOO_LARGE'
  | 'INVALID_TEXT'
  | 'INVALID_XML'
  | 'UNSAFE_XML'
  | 'INVALID_PROJECT_SETTINGS'
  | 'INVALID_SLICE_INFO'
  | 'NOT_SLICED'
  | 'TOO_MANY_PLATES'
  | 'NO_USABLE_PLATES'
  | 'GCODE_FALLBACK_TOO_LARGE'
  | 'XML_PARSER_UNAVAILABLE'
  | 'UNKNOWN'

export class ThreeMfImportError extends Error {
  readonly code: ThreeMfImportErrorCode

  constructor(code: ThreeMfImportErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'ThreeMfImportError'
    this.code = code
  }
}

export interface ThreeMfErrorPayload {
  name: 'ThreeMfImportError'
  code: ThreeMfImportErrorCode
  message: string
}

export function toThreeMfErrorPayload(error: unknown): ThreeMfErrorPayload {
  if (error instanceof ThreeMfImportError) {
    return { name: 'ThreeMfImportError', code: error.code, message: error.message }
  }
  return {
    name: 'ThreeMfImportError',
    code: 'UNKNOWN',
    message: 'Importazione non riuscita. Scegli un file esportato dallo slicer e riprova.',
  }
}

export function fromThreeMfErrorPayload(payload: ThreeMfErrorPayload): ThreeMfImportError {
  return new ThreeMfImportError(payload.code, payload.message)
}
