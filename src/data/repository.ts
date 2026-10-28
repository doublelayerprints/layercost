import type { AppData, LoadWarning } from './storage'
import {
  downloadAppData,
  loadAppData,
  parseImportFile,
  resetStoredData,
  saveAppData,
} from './storage'

export interface LoadResult {
  data: AppData
  warning?: LoadWarning
}

/**
 * Contratto del repository dati.
 *
 * L'adapter locale mantiene le operazioni sincrone internamente, ma espone
 * sempre una Promise: il cloud adapter potrà implementare lo stesso contratto
 * senza cambiare store o UI.
 */
export interface DataRepository {
  load: () => Promise<LoadResult>
  save: (data: AppData) => Promise<void>
  export: (data: AppData) => Promise<void>
  import: (file: File) => Promise<AppData>
  reset: () => Promise<AppData>
}

export const localRepository: DataRepository = {
  load: async () => loadAppData(),
  save: async (data) => saveAppData(data),
  export: async (data) => downloadAppData(data),
  import: parseImportFile,
  reset: async () => resetStoredData(),
}
