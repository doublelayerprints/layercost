import { create } from 'zustand'
import type {
  CostConfig,
  Extra,
  JobCosts,
  Material,
  PrintLine,
  Printer,
  Quote,
  QuoteLocale,
  QuotePricing,
  QuoteStatus,
  Settings,
} from '@/domain/types'
import { calculateQuote } from '@/domain/cost/quote'
import { ENGINE_VERSION } from '@/domain/version'
import { nowIso } from '@/lib/date'
import { newId } from '@/lib/id'
import { draftHasContent } from '@/lib/draft'
import { canTransitionQuoteStatus, isQuoteEditable } from '@/lib/quote-status'
import {
  EMPTY_DRAFT_NAMES,
  EMPTY_LINE_NAMES,
  QUOTE_COPY_SUFFIX,
  QUOTE_IMPORT_SUFFIX,
  QUOTE_REFRESH_SUFFIX,
} from '@/lib/quote-defaults'
import { createEmptyDraft, createEmptyLine, createSeedConfig } from '@/data/seed'
import { SCHEMA_VERSION, type AppData } from '@/data/storage'
import { localRepository, type DataRepository } from '@/data/repository'
import { cloudCacheRepository } from '@/data/cloud-cache'
import { createPersistQueue } from './persist-queue'

function toAppData(state: Pick<AppState, 'config' | 'quotes' | 'draft'>): AppData {
  return {
    schemaVersion: SCHEMA_VERSION,
    config: state.config,
    quotes: state.quotes,
    draft: state.draft,
  }
}

function recomputeQuote(quote: Quote, fallbackConfig: CostConfig): Quote {
  const config = quote.snapshot?.config ?? fallbackConfig
  try {
    const result = calculateQuote({ ...quote, snapshot: undefined, result: undefined }, config)
    return { ...quote, result, engineVersion: result.engineVersion }
  } catch {
    return { ...quote, result: undefined, engineVersion: undefined }
  }
}

function recomputeQuotes(quotes: Quote[], config: CostConfig): Quote[] {
  return quotes.map((quote) =>
    quote.result && quote.engineVersion === ENGINE_VERSION ? quote : recomputeQuote(quote, config),
  )
}

function cloneLineWithNewIds(line: PrintLine): PrintLine {
  return {
    ...structuredClone(line),
    id: newId(),
    materials: line.materials.map((usage) => ({ ...usage })),
  }
}

function cloneQuoteForDraft(quote: Quote, suffix: string): Quote {
  const now = nowIso()
  return {
    ...structuredClone(quote),
    id: newId(),
    name: `${quote.name}${suffix}`,
    status: 'draft',
    lines: quote.lines.map(cloneLineWithNewIds),
    snapshot: undefined,
    result: undefined,
    engineVersion: undefined,
    createdAt: now,
    updatedAt: now,
    createdBy: undefined,
    updatedBy: undefined,
  }
}

export type AppWarning =
  | 'storageUnavailable'
  | 'corruptData'
  | 'saveFailed'
  | 'loadFailed'
  | 'exportFailed'
  | 'resetFailed'

export type AppMode = 'guest' | 'cloud'

export interface AppState {
  config: CostConfig
  quotes: Quote[]
  draft: Quote
  mode: AppMode
  hydrated: boolean
  hydrating: boolean
  hydrateError?: AppWarning
  warning?: AppWarning

  hydrate: () => Promise<void>
  persist: () => void
  flushPersistence: () => Promise<void>
  pendingWrites: () => number
  setWarning: (warning?: AppWarning) => void

  enterCloudMode: (data: AppData) => Promise<AppData>
  applyCloudData: (data: AppData) => Promise<AppData>
  exitCloudMode: () => Promise<AppData>

  updateSettings: (patch: Partial<Settings>) => void

  addTariff: (input: Omit<Settings['tariffs'][number], 'id'> & { id?: string }) => void
  updateTariff: (id: string, patch: Partial<Settings['tariffs'][number]>) => void
  removeTariff: (id: string) => void

  addPrinter: (input: Omit<Printer, 'id'> & { id?: string }) => void
  updatePrinter: (id: string, patch: Partial<Printer>) => void
  archivePrinter: (id: string) => void

  addMaterial: (input: Omit<Material, 'id'> & { id?: string }) => void
  updateMaterial: (id: string, patch: Partial<Material>) => void
  archiveMaterial: (id: string) => void

  addExtra: (input: Omit<Extra, 'id'> & { id?: string }) => void
  updateExtra: (id: string, patch: Partial<Extra>) => void
  archiveExtra: (id: string) => void

  updateDraftMeta: (patch: Partial<Pick<Quote, 'name' | 'quoteDate' | 'customer'>>) => void
  updatePricing: (patch: Partial<QuotePricing>) => void
  updateJob: (patch: Partial<JobCosts>) => void
  toggleJobExtra: (extraId: string) => void

  updateLine: (lineId: string, patch: Partial<PrintLine>) => void
  addLine: () => void
  importLines: (lines: PrintLine[], mode: 'append' | 'replace') => void
  duplicateLine: (lineId: string) => void
  removeLine: (lineId: string) => void
  updateLineMaterial: (
    lineId: string,
    index: number,
    patch: Partial<PrintLine['materials'][number]>,
  ) => void
  addLineMaterial: (lineId: string) => void
  removeLineMaterial: (lineId: string, index: number) => void
  toggleLineExtra: (lineId: string, extraId: string) => void

  saveDraft: () => {
    quote?: Quote
    error?: string
    errorCode?: 'missingName' | 'missingLineName' | 'saveFailed' | 'locked'
  }
  editQuote: (quoteId: string) => boolean
  cancelEdit: () => void
  setQuoteStatus: (quoteId: string, status: QuoteStatus) => boolean
  duplicateQuote: (quoteId: string) => void
  refreshQuote: (quoteId: string) => void
  archiveQuote: (quoteId: string) => void
  deleteQuote: (quoteId: string) => void
  importSharedQuote: (quote: Quote) => string

  importData: (data: AppData) => void
  exportData: () => Promise<boolean>
  reset: () => Promise<boolean>
  completeOnboarding: () => void
  newDraft: (locale?: QuoteLocale) => void
  adoptLocale: (locale: QuoteLocale) => void
}

const initialData = (() => {
  const config = createSeedConfig()
  return {
    config,
    quotes: [] as Quote[],
    draft: createEmptyDraft(config),
  }
})()

export const useAppStore = create<AppState>()((set, get) => {
  let activeRepository: DataRepository = localRepository
  const persistQueue = createPersistQueue(
    (data) => activeRepository.save(data),
    () => set({ warning: 'saveFailed' }),
  )

  const applyData = (data: AppData): AppData => {
    const quotes = recomputeQuotes(data.quotes, data.config)
    const next: AppData = {
      schemaVersion: SCHEMA_VERSION,
      config: data.config,
      quotes,
      draft: data.draft,
    }
    set({
      config: next.config,
      quotes: next.quotes,
      draft: next.draft,
      warning: undefined,
    })
    return next
  }

  return {
    ...initialData,
    mode: 'guest',
    hydrated: false,
    hydrating: false,
    hydrateError: undefined,
    warning: undefined,

    hydrate: async () => {
      if (get().hydrated || get().hydrating) return
      set({ hydrating: true, hydrateError: undefined })
      try {
        activeRepository = localRepository
        const { data, warning } = await localRepository.load()
        const quotes = recomputeQuotes(data.quotes, data.config)
        set({
          config: data.config,
          quotes,
          draft: data.draft,
          mode: 'guest',
          hydrated: true,
          hydrating: false,
          warning,
        })
      } catch {
        set({ hydrating: false, hydrateError: 'loadFailed' })
      }
    },

    persist: () => {
      persistQueue.enqueue(toAppData(get()))
    },

    flushPersistence: () => persistQueue.flush(),

    pendingWrites: () => persistQueue.pending(),

    setWarning: (warning) => set({ warning }),

    enterCloudMode: async (data) => {
      await persistQueue.flush()
      activeRepository = cloudCacheRepository
      const next = applyData(data)
      set({ mode: 'cloud' })
      persistQueue.enqueue(next)
      await persistQueue.flush()
      return next
    },

    applyCloudData: async (data) => {
      const next = applyData(data)
      persistQueue.enqueue(next)
      await persistQueue.flush()
      return next
    },

    exitCloudMode: async () => {
      await persistQueue.flush()
      activeRepository = localRepository
      const { data, warning } = await localRepository.load()
      const next = applyData(data)
      set({ mode: 'guest', warning })
      return next
    },

    updateSettings: (patch) => {
      set((state) => ({
        config: {
          ...state.config,
          settings: { ...state.config.settings, ...patch },
        },
      }))
      get().persist()
    },

    addTariff: (input) => {
      const tariff = { ...input, id: input.id ?? newId() }
      set((state) => ({
        config: {
          ...state.config,
          settings: {
            ...state.config.settings,
            tariffs: [...state.config.settings.tariffs, tariff],
          },
        },
      }))
      get().persist()
    },

    updateTariff: (id, patch) => {
      set((state) => ({
        config: {
          ...state.config,
          settings: {
            ...state.config.settings,
            tariffs: state.config.settings.tariffs.map((tariff) =>
              tariff.id === id ? { ...tariff, ...patch } : tariff,
            ),
          },
        },
      }))
      get().persist()
    },

    removeTariff: (id) => {
      set((state) => ({
        config: {
          ...state.config,
          settings: {
            ...state.config.settings,
            tariffs: state.config.settings.tariffs.filter((tariff) => tariff.id !== id),
          },
          printers: state.config.printers.map((printer) =>
            printer.energyTariffId === id ? { ...printer, energyTariffId: undefined } : printer,
          ),
        },
      }))
      get().persist()
    },

    addPrinter: (input) => {
      const printer = { ...input, id: input.id ?? newId() }
      set((state) => ({
        config: { ...state.config, printers: [...state.config.printers, printer] },
      }))
      get().persist()
    },

    updatePrinter: (id, patch) => {
      set((state) => ({
        config: {
          ...state.config,
          printers: state.config.printers.map((printer) =>
            printer.id === id ? { ...printer, ...patch } : printer,
          ),
        },
      }))
      get().persist()
    },

    archivePrinter: (id) => {
      set((state) => ({
        config: {
          ...state.config,
          printers: state.config.printers.map((printer) =>
            printer.id === id ? { ...printer, archived: !printer.archived } : printer,
          ),
        },
      }))
      get().persist()
    },

    addMaterial: (input) => {
      const material = { ...input, id: input.id ?? newId() }
      set((state) => ({
        config: { ...state.config, materials: [...state.config.materials, material] },
      }))
      get().persist()
    },

    updateMaterial: (id, patch) => {
      set((state) => ({
        config: {
          ...state.config,
          materials: state.config.materials.map((material) =>
            material.id === id ? { ...material, ...patch } : material,
          ),
        },
      }))
      get().persist()
    },

    archiveMaterial: (id) => {
      set((state) => ({
        config: {
          ...state.config,
          materials: state.config.materials.map((material) =>
            material.id === id ? { ...material, archived: !material.archived } : material,
          ),
        },
      }))
      get().persist()
    },

    addExtra: (input) => {
      const extra = { ...input, id: input.id ?? newId() }
      set((state) => ({
        config: { ...state.config, extras: [...state.config.extras, extra] },
      }))
      get().persist()
    },

    updateExtra: (id, patch) => {
      set((state) => ({
        config: {
          ...state.config,
          extras: state.config.extras.map((extra) =>
            extra.id === id ? { ...extra, ...patch } : extra,
          ),
        },
      }))
      get().persist()
    },

    archiveExtra: (id) => {
      set((state) => ({
        config: {
          ...state.config,
          extras: state.config.extras.map((extra) =>
            extra.id === id ? { ...extra, archived: !extra.archived } : extra,
          ),
        },
      }))
      get().persist()
    },

    updateDraftMeta: (patch) => {
      set((state) => ({
        draft: { ...state.draft, ...patch, updatedAt: nowIso() },
      }))
      get().persist()
    },

    updatePricing: (patch) => {
      set((state) => ({
        draft: {
          ...state.draft,
          pricing: { ...state.draft.pricing, ...patch },
          updatedAt: nowIso(),
        },
      }))
      get().persist()
    },

    updateJob: (patch) => {
      set((state) => ({
        draft: {
          ...state.draft,
          job: { ...state.draft.job, ...patch },
          updatedAt: nowIso(),
        },
      }))
      get().persist()
    },

    toggleJobExtra: (extraId) => {
      set((state) => {
        const ids = state.draft.job.extraIds
        return {
          draft: {
            ...state.draft,
            job: {
              ...state.draft.job,
              extraIds: ids.includes(extraId)
                ? ids.filter((id) => id !== extraId)
                : [...ids, extraId],
            },
            updatedAt: nowIso(),
          },
        }
      })
      get().persist()
    },

    updateLine: (lineId, patch) => {
      set((state) => ({
        draft: {
          ...state.draft,
          lines: state.draft.lines.map((line) =>
            line.id === lineId ? { ...line, ...patch } : line,
          ),
          updatedAt: nowIso(),
        },
      }))
      get().persist()
    },

    addLine: () => {
      set((state) => ({
        draft: {
          ...state.draft,
          lines: [
            ...state.draft.lines,
            createEmptyLine(state.draft.snapshot?.config ?? state.config, state.draft.locale),
          ],
          updatedAt: nowIso(),
        },
      }))
      get().persist()
    },

    importLines: (lines, mode) => {
      if (lines.length === 0) return
      const imported = structuredClone(lines)
      set((state) => ({
        draft: {
          ...state.draft,
          lines: mode === 'append' ? [...state.draft.lines, ...imported] : imported,
          updatedAt: nowIso(),
        },
      }))
      get().persist()
    },

    duplicateLine: (lineId) => {
      set((state) => {
        const index = state.draft.lines.findIndex((line) => line.id === lineId)
        const line = state.draft.lines[index]
        if (!line) return state
        const copy = cloneLineWithNewIds(line)
        copy.name = `${line.name}${QUOTE_COPY_SUFFIX[state.draft.locale]}`
        const lines = [...state.draft.lines]
        lines.splice(index + 1, 0, copy)
        return {
          draft: { ...state.draft, lines, updatedAt: nowIso() },
        }
      })
      get().persist()
    },

    removeLine: (lineId) => {
      set((state) => ({
        draft: {
          ...state.draft,
          lines: state.draft.lines.filter((line) => line.id !== lineId),
          updatedAt: nowIso(),
        },
      }))
      get().persist()
    },

    updateLineMaterial: (lineId, index, patch) => {
      set((state) => ({
        draft: {
          ...state.draft,
          lines: state.draft.lines.map((line) =>
            line.id === lineId
              ? {
                  ...line,
                  materials: line.materials.map((usage, usageIndex) =>
                    usageIndex === index ? { ...usage, ...patch } : usage,
                  ),
                }
              : line,
          ),
          updatedAt: nowIso(),
        },
      }))
      get().persist()
    },

    addLineMaterial: (lineId) => {
      set((state) => {
        const config = state.draft.snapshot?.config ?? state.config
        const material =
          config.materials.find((candidate) => !candidate.archived) ?? config.materials[0]
        if (!material) return state
        return {
          draft: {
            ...state.draft,
            lines: state.draft.lines.map((line) =>
              line.id === lineId
                ? {
                    ...line,
                    materials: [
                      ...line.materials,
                      {
                        materialId: material.id,
                        grams: 0 as PrintLine['materials'][number]['grams'],
                      },
                    ],
                  }
                : line,
            ),
            updatedAt: nowIso(),
          },
        }
      })
      get().persist()
    },

    removeLineMaterial: (lineId, index) => {
      set((state) => ({
        draft: {
          ...state.draft,
          lines: state.draft.lines.map((line) =>
            line.id === lineId
              ? {
                  ...line,
                  materials: line.materials.filter((_, usageIndex) => usageIndex !== index),
                }
              : line,
          ),
          updatedAt: nowIso(),
        },
      }))
      get().persist()
    },

    toggleLineExtra: (lineId, extraId) => {
      set((state) => ({
        draft: {
          ...state.draft,
          lines: state.draft.lines.map((line) =>
            line.id === lineId
              ? {
                  ...line,
                  extraIds: line.extraIds.includes(extraId)
                    ? line.extraIds.filter((id) => id !== extraId)
                    : [...line.extraIds, extraId],
                }
              : line,
          ),
          updatedAt: nowIso(),
        },
      }))
      get().persist()
    },

    saveDraft: () => {
      const state = get()
      if (!state.draft.name.trim()) {
        return {
          error: 'Il nome del preventivo è obbligatorio.',
          errorCode: 'missingName',
        }
      }
      const unnamedLine = state.draft.lines.find((line) => !line.name.trim())
      if (unnamedLine) {
        return {
          error: 'Ogni riga deve avere un nome.',
          errorCode: 'missingLineName',
        }
      }
      const existing = state.quotes.find((candidate) => candidate.id === state.draft.id)
      if (existing && !isQuoteEditable(existing.status, existing.archived)) {
        return {
          error: 'Questo preventivo non è più modificabile.',
          errorCode: 'locked',
        }
      }
      try {
        const calculationConfig = existing?.snapshot?.config ?? state.config
        const result = calculateQuote(state.draft, calculationConfig)
        const now = nowIso()
        const quote: Quote = {
          ...structuredClone(state.draft),
          status: 'saved',
          snapshot: existing?.snapshot
            ? { ...structuredClone(existing.snapshot), engineVersion: result.engineVersion }
            : {
                config: structuredClone(calculationConfig),
                capturedAt: now,
                engineVersion: result.engineVersion,
              },
          result,
          engineVersion: result.engineVersion,
          updatedAt: now,
          archived: false,
        }
        set((current) => ({
          quotes: [quote, ...current.quotes.filter((candidate) => candidate.id !== quote.id)],
          draft: createEmptyDraft(current.config, state.draft.locale),
        }))
        get().persist()
        return { quote }
      } catch (error) {
        return {
          error: error instanceof Error ? error.message : 'Impossibile salvare il preventivo.',
          errorCode: 'saveFailed',
        }
      }
    },

    editQuote: (quoteId) => {
      const quote = get().quotes.find((candidate) => candidate.id === quoteId)
      if (!quote || !isQuoteEditable(quote.status, quote.archived)) return false
      set({
        draft: {
          ...structuredClone(quote),
          status: 'draft',
          // The next save is by the current user; the server will confirm the audit.
          updatedBy: undefined,
        },
      })
      get().persist()
      return true
    },

    cancelEdit: () => {
      const state = get()
      set({ draft: createEmptyDraft(state.config, state.draft.locale) })
      get().persist()
    },

    setQuoteStatus: (quoteId, status) => {
      const quote = get().quotes.find((candidate) => candidate.id === quoteId)
      if (!quote || !canTransitionQuoteStatus(quote.status, status)) return false
      set((state) => ({
        quotes: state.quotes.map((candidate) =>
          candidate.id === quoteId ? { ...candidate, status, updatedAt: nowIso() } : candidate,
        ),
      }))
      get().persist()
      return true
    },

    duplicateQuote: (quoteId) => {
      const state = get()
      const quote = state.quotes.find((candidate) => candidate.id === quoteId)
      if (!quote) return
      set({ draft: cloneQuoteForDraft(quote, QUOTE_COPY_SUFFIX[quote.locale]) })
      get().persist()
    },

    refreshQuote: (quoteId) => {
      const state = get()
      const quote = state.quotes.find((candidate) => candidate.id === quoteId)
      if (!quote) return
      set({ draft: cloneQuoteForDraft(quote, QUOTE_REFRESH_SUFFIX[quote.locale]) })
      get().persist()
    },

    archiveQuote: (quoteId) => {
      set((state) => ({
        quotes: state.quotes.map((quote) =>
          quote.id === quoteId ? { ...quote, archived: !quote.archived } : quote,
        ),
      }))
      get().persist()
    },

    deleteQuote: (quoteId) => {
      set((state) => ({
        quotes: state.quotes.filter((quote) => quote.id !== quoteId),
      }))
      get().persist()
    },

    importSharedQuote: (quote) => {
      const now = nowIso()
      const imported: Quote = {
        ...structuredClone(quote),
        id: newId(),
        name: `${quote.name}${QUOTE_IMPORT_SUFFIX[quote.locale]}`,
        status: 'saved',
        archived: false,
        createdAt: now,
        updatedAt: now,
      }
      set((state) => ({ quotes: [imported, ...state.quotes] }))
      get().persist()
      return imported.id
    },

    importData: (data) => {
      const quotes = data.quotes.map((quote) => recomputeQuote(quote, data.config))
      set({
        config: data.config,
        quotes,
        draft: data.draft,
        warning: undefined,
      })
      get().persist()
    },

    exportData: async () => {
      try {
        await activeRepository.export(toAppData(get()))
        return true
      } catch {
        set({ warning: 'exportFailed' })
        return false
      }
    },

    reset: async () => {
      try {
        await persistQueue.flush()
        const data = await activeRepository.reset()
        const quotes = recomputeQuotes(data.quotes, data.config)
        set({
          config: data.config,
          quotes,
          draft: data.draft,
          warning: undefined,
        })
        if (get().mode === 'cloud') get().persist()
        return true
      } catch {
        set({ warning: 'resetFailed' })
        return false
      }
    },

    completeOnboarding: () => {
      get().updateSettings({ onboardingComplete: true })
    },

    newDraft: (locale) => {
      set((state) => ({
        draft: createEmptyDraft(state.config, locale ?? state.draft.locale ?? 'it'),
      }))
      get().persist()
    },

    adoptLocale: (locale) => {
      set((state) => {
        const previous = state.draft.locale
        if (previous === locale) return state
        if (draftHasContent(state.draft)) return state
        return {
          draft: {
            ...state.draft,
            locale,
            name:
              state.draft.name === EMPTY_DRAFT_NAMES[previous]
                ? EMPTY_DRAFT_NAMES[locale]
                : state.draft.name,
            lines: state.draft.lines.map((line) =>
              line.name === EMPTY_LINE_NAMES[previous]
                ? { ...line, name: EMPTY_LINE_NAMES[locale] }
                : line,
            ),
          },
        }
      })
      get().persist()
    },
  }
})
