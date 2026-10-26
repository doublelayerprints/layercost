import type { AppData, LoadWarning } from './storage'
import {
  downloadAppData,
  loadAppData,
  parseImportFile,
  resetStoredData,
  saveAppData,
} from './storage'

export interface DataRepository {
  load: () => { data: AppData; warning?: LoadWarning }
  save: (data: AppData) => void
  export: (data: AppData) => void
  import: (file: File) => Promise<AppData>
  reset: () => AppData
}

/**
 * Adapter locale. In futuro si potrà aggiungere un adapter Supabase
 * senza cambiare dominio, store o UI.
 */
export const localRepository: DataRepository = {
  load: loadAppData,
  save: saveAppData,
  export: downloadAppData,
  import: parseImportFile,
  reset: resetStoredData,
}
