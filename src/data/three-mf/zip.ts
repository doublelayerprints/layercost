import { unzipSync } from 'fflate'
import { ThreeMfImportError, type ThreeMfImportErrorCode } from './errors'
import type { ThreeMfLimits } from './limits'

const EOCD_SIGNATURE = 0x06054b50
const CENTRAL_DIRECTORY_SIGNATURE = 0x02014b50
const LOCAL_FILE_SIGNATURE = 0x04034b50
const EOCD_MIN_SIZE = 22
const EOCD_MAX_COMMENT = 0xffff

export interface ZipEntry {
  name: string
  flags: number
  compression: number
  compressedSize: number
  uncompressedSize: number
  localHeaderOffset: number
}

export interface ZipIndex {
  entries: ZipEntry[]
  byName: Map<string, ZipEntry>
}

export interface ExtractZipOptions {
  maxEntryBytes?: number
  tooLargeCode?: ThreeMfImportErrorCode
}

function readU16(view: DataView, offset: number): number {
  return view.getUint16(offset, true)
}

function readU32(view: DataView, offset: number): number {
  return view.getUint32(offset, true)
}

function decodeName(bytes: Uint8Array, start: number, length: number): string {
  return new TextDecoder('utf-8', { fatal: false }).decode(bytes.subarray(start, start + length))
}

function isEncrypted(flags: number): boolean {
  // Bit 0: encrypted; bit 6: strong encryption; bit 13: masked local headers.
  return (flags & 0x1) !== 0 || (flags & 0x40) !== 0 || (flags & 0x2000) !== 0
}

export function isSafeZipPath(name: string): boolean {
  if (!name || name.includes('\0') || name.includes('\\')) return false
  if (name.startsWith('/') || /^[a-zA-Z]:/.test(name)) return false
  const segments = name.split('/')
  if (segments.some((segment) => segment === '..')) return false
  // Reject empty intermediate segments such as `a//b`; allow a trailing slash for directories.
  if (segments.some((segment, index) => segment === '' && index < segments.length - 1)) return false
  return true
}

function findEndOfCentralDirectory(view: DataView, length: number): number {
  if (length < EOCD_MIN_SIZE) {
    throw new ThreeMfImportError(
      'NOT_A_ZIP',
      'Questo file non è un archivio ZIP valido. Scegli un file esportato dallo slicer.',
    )
  }
  const minOffset = Math.max(0, length - EOCD_MIN_SIZE - EOCD_MAX_COMMENT)
  for (let offset = length - EOCD_MIN_SIZE; offset >= minOffset; offset -= 1) {
    if (readU32(view, offset) !== EOCD_SIGNATURE) continue
    const commentLength = readU16(view, offset + 20)
    if (offset + EOCD_MIN_SIZE + commentLength <= length) return offset
  }
  throw new ThreeMfImportError(
    'NOT_A_ZIP',
    'Questo file non è un archivio ZIP valido. Scegli un file esportato dallo slicer.',
  )
}

function validateLocalHeader(view: DataView, bytes: Uint8Array, entry: ZipEntry): void {
  const offset = entry.localHeaderOffset
  if (offset + 30 > bytes.length || readU32(view, offset) !== LOCAL_FILE_SIGNATURE) {
    throw new ThreeMfImportError('CORRUPT_ZIP', 'L’archivio .3mf è danneggiato.')
  }
  const localFlags = readU16(view, offset + 6)
  const localCompression = readU16(view, offset + 8)
  const localNameLength = readU16(view, offset + 26)
  const localExtraLength = readU16(view, offset + 28)
  if (isEncrypted(localFlags)) {
    throw new ThreeMfImportError(
      'ENCRYPTED_ENTRY',
      'L’archivio è protetto da password. Esporta un .3mf non cifrato.',
    )
  }
  if (localCompression !== entry.compression) {
    throw new ThreeMfImportError('CORRUPT_ZIP', 'L’archivio .3mf è danneggiato.')
  }
  const localNameStart = offset + 30
  const localDataStart = localNameStart + localNameLength + localExtraLength
  if (localDataStart + entry.compressedSize > bytes.length) {
    throw new ThreeMfImportError('CORRUPT_ZIP', 'L’archivio .3mf è danneggiato.')
  }
  const localName = decodeName(bytes, localNameStart, localNameLength)
  if (localName !== entry.name) {
    throw new ThreeMfImportError('CORRUPT_ZIP', 'L’archivio .3mf è danneggiato.')
  }
}

export function readZipIndex(bytes: Uint8Array, limits: ThreeMfLimits): ZipIndex {
  if (bytes.length === 0) {
    throw new ThreeMfImportError(
      'NOT_A_ZIP',
      'Questo file non è un archivio ZIP valido. Scegli un file esportato dallo slicer.',
    )
  }
  if (bytes.length > limits.maxCompressedBytes) {
    throw new ThreeMfImportError(
      'ARCHIVE_TOO_LARGE',
      `Il file supera ${Math.round(limits.maxCompressedBytes / (1024 * 1024))} MB. Esporta un solo piatto o riduci il progetto.`,
    )
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const eocdOffset = findEndOfCentralDirectory(view, bytes.length)
  const diskNumber = readU16(view, eocdOffset + 4)
  const centralDirectoryDisk = readU16(view, eocdOffset + 6)
  const entriesOnDisk = readU16(view, eocdOffset + 8)
  const totalEntries = readU16(view, eocdOffset + 10)
  const centralDirectorySize = readU32(view, eocdOffset + 12)
  const centralDirectoryOffset = readU32(view, eocdOffset + 16)

  if (diskNumber !== 0 || centralDirectoryDisk !== 0) {
    throw new ThreeMfImportError(
      'UNSUPPORTED_MULTI_DISK',
      'L’archivio .3mf è diviso in più parti. Esportalo come file singolo.',
    )
  }
  if (entriesOnDisk !== totalEntries) {
    throw new ThreeMfImportError('CORRUPT_ZIP', 'L’archivio .3mf è danneggiato.')
  }
  if (
    totalEntries === 0xffff ||
    centralDirectorySize === 0xffffffff ||
    centralDirectoryOffset === 0xffffffff
  ) {
    throw new ThreeMfImportError(
      'UNSUPPORTED_ZIP64',
      'Il file usa un formato ZIP64 non supportato. Esporta un progetto più piccolo.',
    )
  }
  if (totalEntries > limits.maxEntries) {
    throw new ThreeMfImportError(
      'TOO_MANY_ENTRIES',
      `L’archivio contiene più di ${limits.maxEntries} file. Esporta un solo piatto.`,
    )
  }

  const centralDirectoryEnd = centralDirectoryOffset + centralDirectorySize
  if (
    centralDirectoryOffset > bytes.length ||
    centralDirectoryEnd > bytes.length ||
    centralDirectoryEnd > eocdOffset
  ) {
    throw new ThreeMfImportError('CORRUPT_ZIP', 'L’archivio .3mf è danneggiato.')
  }

  const entries: ZipEntry[] = []
  const byName = new Map<string, ZipEntry>()
  let totalUncompressed = 0
  let offset = centralDirectoryOffset

  for (let index = 0; index < totalEntries; index += 1) {
    if (
      offset + 46 > centralDirectoryEnd ||
      readU32(view, offset) !== CENTRAL_DIRECTORY_SIGNATURE
    ) {
      throw new ThreeMfImportError('CORRUPT_ZIP', 'L’archivio .3mf è danneggiato.')
    }

    const flags = readU16(view, offset + 8)
    const compression = readU16(view, offset + 10)
    const compressedSize = readU32(view, offset + 20)
    const uncompressedSize = readU32(view, offset + 24)
    const nameLength = readU16(view, offset + 28)
    const extraLength = readU16(view, offset + 30)
    const commentLength = readU16(view, offset + 32)
    const localHeaderOffset = readU32(view, offset + 42)
    const nameStart = offset + 46
    const nextOffset = nameStart + nameLength + extraLength + commentLength

    if (nextOffset > centralDirectoryEnd) {
      throw new ThreeMfImportError('CORRUPT_ZIP', 'L’archivio .3mf è danneggiato.')
    }

    const name = decodeName(bytes, nameStart, nameLength)
    if (!isSafeZipPath(name)) {
      throw new ThreeMfImportError(
        'UNSAFE_PATH',
        'L’archivio contiene percorsi non sicuri e non può essere importato.',
      )
    }
    if (byName.has(name)) {
      throw new ThreeMfImportError('DUPLICATE_ENTRY', 'L’archivio .3mf contiene file duplicati.')
    }
    if (isEncrypted(flags)) {
      throw new ThreeMfImportError(
        'ENCRYPTED_ENTRY',
        'L’archivio è protetto da password. Esporta un .3mf non cifrato.',
      )
    }
    if (compression !== 0 && compression !== 8) {
      throw new ThreeMfImportError(
        'UNSUPPORTED_COMPRESSION',
        'L’archivio usa una compressione non supportata. Riesporta il file dallo slicer.',
      )
    }
    if (
      compressedSize === 0xffffffff ||
      uncompressedSize === 0xffffffff ||
      localHeaderOffset === 0xffffffff
    ) {
      throw new ThreeMfImportError(
        'UNSUPPORTED_ZIP64',
        'Il file usa un formato ZIP64 non supportato. Esporta un progetto più piccolo.',
      )
    }
    if (uncompressedSize > limits.maxTotalUncompressedBytes) {
      throw new ThreeMfImportError(
        'ARCHIVE_TOO_LARGE',
        'Il contenuto decompresso del file supera i limiti di sicurezza. Esporta un solo piatto.',
      )
    }
    totalUncompressed += uncompressedSize
    if (totalUncompressed > limits.maxTotalUncompressedBytes) {
      throw new ThreeMfImportError(
        'ARCHIVE_TOO_LARGE',
        'Il contenuto decompresso del file supera i limiti di sicurezza. Esporta un solo piatto.',
      )
    }

    const entry: ZipEntry = {
      name,
      flags,
      compression,
      compressedSize,
      uncompressedSize,
      localHeaderOffset,
    }
    validateLocalHeader(view, bytes, entry)
    entries.push(entry)
    byName.set(name, entry)
    offset = nextOffset
  }

  if (offset > centralDirectoryEnd) {
    throw new ThreeMfImportError('CORRUPT_ZIP', 'L’archivio .3mf è danneggiato.')
  }

  return { entries, byName }
}

export function extractZipEntries(
  bytes: Uint8Array,
  index: ZipIndex,
  names: readonly string[],
  options: ExtractZipOptions = {},
): Map<string, Uint8Array> {
  const wanted = new Set(names)
  for (const name of names) {
    const entry = index.byName.get(name)
    if (
      entry &&
      options.maxEntryBytes !== undefined &&
      entry.uncompressedSize > options.maxEntryBytes
    ) {
      throw new ThreeMfImportError(
        options.tooLargeCode ?? 'METADATA_TOO_LARGE',
        `Il file ${name} supera il limite di lettura. Riesporta il progetto dallo slicer.`,
      )
    }
  }

  let unzipped: Record<string, Uint8Array>
  try {
    unzipped = unzipSync(bytes, { filter: (file) => wanted.has(file.name) })
  } catch (error) {
    throw new ThreeMfImportError('CORRUPT_ZIP', 'L’archivio .3mf è danneggiato.', {
      cause: error,
    })
  }

  const result = new Map<string, Uint8Array>()
  for (const name of names) {
    const entry = index.byName.get(name)
    if (!entry) continue
    const data = unzipped[name]
    if (!data || data.length !== entry.uncompressedSize) {
      throw new ThreeMfImportError('CORRUPT_ZIP', 'L’archivio .3mf è danneggiato.')
    }
    result.set(name, data)
  }
  return result
}
