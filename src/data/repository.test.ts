import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildExportEnvelope, createInitialData, STORAGE_KEY } from './storage'
import { localRepository, type DataRepository } from './repository'

let values: Map<string, string>
let click: ReturnType<typeof vi.fn>
let appendChild: ReturnType<typeof vi.fn>
let anchor: {
  href: string
  download: string
  click: ReturnType<typeof vi.fn>
  remove: ReturnType<typeof vi.fn>
}

function installLocalStorage() {
  const localStorage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value)
    },
    removeItem: (key: string) => {
      values.delete(key)
    },
    clear: () => values.clear(),
    key: () => null,
    length: 0,
  }
  vi.stubGlobal('window', { localStorage })
}

function installDocument() {
  anchor = { href: '', download: '', click, remove: vi.fn() }
  appendChild = vi.fn()
  vi.stubGlobal('document', {
    createElement: vi.fn(() => anchor),
    body: { appendChild },
  })
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:layercost-test')
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
}

function createMemoryRepository(): DataRepository {
  let data = createInitialData()
  return {
    load: async () => ({ data: structuredClone(data) }),
    save: async (next) => {
      data = structuredClone(next)
    },
    export: async () => {},
    import: async (file) => {
      data = await localRepository.import(file)
      return structuredClone(data)
    },
    reset: async () => {
      data = createInitialData()
      return structuredClone(data)
    },
  }
}

function runContract(repository: DataRepository) {
  return async () => {
    const data = createInitialData()
    data.draft.name = 'Contratto asincrono'

    await repository.save(data)
    const loaded = await repository.load()
    expect(loaded.data.draft.name).toBe('Contratto asincrono')

    const fileData = createInitialData()
    fileData.draft.name = 'Import contratto'
    const file = new File([JSON.stringify(buildExportEnvelope(fileData))], 'backup.json', {
      type: 'application/json',
    })
    const imported = await repository.import(file)
    expect(imported.draft.name).toBe('Import contratto')

    const reset = await repository.reset()
    expect(reset.quotes).toEqual([])
    expect(reset.draft.status).toBe('draft')
  }
}

beforeEach(() => {
  values = new Map()
  click = vi.fn()
  installLocalStorage()
  installDocument()
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('localRepository', () => {
  it('espone un contratto asincrono', async () => {
    const loaded = localRepository.load()
    expect(loaded).toBeInstanceOf(Promise)
    await loaded

    const data = createInitialData()
    const saved = localRepository.save(data)
    expect(saved).toBeInstanceOf(Promise)
    await saved

    const exported = localRepository.export(data)
    expect(exported).toBeInstanceOf(Promise)
    await exported

    const reset = localRepository.reset()
    expect(reset).toBeInstanceOf(Promise)
    await reset
  })

  it('salva e rilegge i dati', async () => {
    const data = createInitialData()
    data.draft.name = 'Persistito'
    await localRepository.save(data)

    const result = await localRepository.load()
    expect(result.warning).toBeUndefined()
    expect(result.data.draft.name).toBe('Persistito')
  })

  it('importa un backup e ripristina i dati iniziali', async () => {
    const data = createInitialData()
    data.draft.name = 'Importato'
    const file = new File([JSON.stringify(buildExportEnvelope(data))], 'backup.json', {
      type: 'application/json',
    })

    const imported = await localRepository.import(file)
    expect(imported.draft.name).toBe('Importato')

    await localRepository.save(imported)
    const reset = await localRepository.reset()
    expect(values.has(STORAGE_KEY)).toBe(false)
    expect(reset.quotes).toEqual([])
  })

  it('esporta un envelope con il nome file atteso', async () => {
    await localRepository.export(createInitialData())

    expect(URL.createObjectURL).toHaveBeenCalledTimes(1)
    expect(appendChild).toHaveBeenCalledWith(anchor)
    expect(click).toHaveBeenCalledTimes(1)
    expect(anchor.download).toMatch(/^layercost-backup-\d{4}-\d{2}-\d{2}\.json$/)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:layercost-test')
  })
})

describe.each([
  ['locale', localRepository],
  ['in memoria', createMemoryRepository()],
] as const)('contratto del repository (%s)', (_name, repository) => {
  it('rispetta load, save, import e reset', runContract(repository))
})
