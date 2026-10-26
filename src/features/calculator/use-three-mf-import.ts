import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type RefObject,
} from 'react'
import { useI18n } from '@/app/i18n-context'
import { parseThreeMfInWorker } from '@/data/three-mf/worker-client'
import type { ThreeMfSummary } from '@/domain/three-mf'
import type { PrintLine } from '@/domain/types'
import { draftHasContent } from '@/lib/draft'
import { useAppStore } from '@/state/app-store'
import { threeMfErrorMessage } from './three-mf-messages'

export type ThreeMfImportStage = 'preview' | 'confirm'

export interface ThreeMfImportDragHandlers {
  onDragEnter: (event: DragEvent<HTMLElement>) => void
  onDragOver: (event: DragEvent<HTMLElement>) => void
  onDragLeave: (event: DragEvent<HTMLElement>) => void
  onDrop: (event: DragEvent<HTMLElement>) => void
}

export interface ThreeMfImportController {
  fileInputRef: RefObject<HTMLInputElement | null>
  openFilePicker: () => void
  handleFileInput: (event: ChangeEvent<HTMLInputElement>) => void
  dragHandlers: ThreeMfImportDragHandlers
  isDragging: boolean
  isLoading: boolean
  error?: string
  clearError: () => void
  success?: string
  clearSuccess: () => void
  summary?: ThreeMfSummary
  stage: ThreeMfImportStage
  pendingLines?: PrintLine[]
  dialogKey: number
  closeDialog: () => void
  backToPreview: () => void
  requestImport: (lines: PrintLine[]) => void
  confirmAppend: () => void
  confirmReplace: () => void
}

function isFileDrag(event: DragEvent<HTMLElement>): boolean {
  return Array.from(event.dataTransfer.types).includes('Files')
}

export function useThreeMfImport(onImported: (lineId: string) => void): ThreeMfImportController {
  const { t } = useI18n()
  const draft = useAppStore((state) => state.draft)
  const importLines = useAppStore((state) => state.importLines)

  const [summary, setSummary] = useState<ThreeMfSummary>()
  const [stage, setStage] = useState<ThreeMfImportStage>('preview')
  const [pendingLines, setPendingLines] = useState<PrintLine[]>()
  const [dialogKey, setDialogKey] = useState(0)
  const [error, setError] = useState<string>()
  const [success, setSuccess] = useState<string>()
  const [isLoading, setIsLoading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dragDepth = useRef(0)
  const loadingRef = useRef(false)
  const onImportedRef = useRef(onImported)

  useEffect(() => {
    onImportedRef.current = onImported
  }, [onImported])

  const startImport = async (file: File) => {
    if (loadingRef.current) return
    loadingRef.current = true
    setIsLoading(true)
    setError(undefined)
    setSuccess(undefined)
    try {
      const parsed = await parseThreeMfInWorker(file)
      setSummary(parsed)
      setDialogKey((key) => key + 1)
      setStage('preview')
      setPendingLines(undefined)
    } catch (caught) {
      setError(threeMfErrorMessage(caught, t))
    } finally {
      loadingRef.current = false
      setIsLoading(false)
    }
  }

  const openFilePicker = () => {
    fileInputRef.current?.click()
  }

  const handleFileInput = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    if (file) void startImport(file)
  }

  const onDragEnter = (event: DragEvent<HTMLElement>) => {
    if (!isFileDrag(event)) return
    event.preventDefault()
    dragDepth.current += 1
    setIsDragging(true)
  }

  const onDragOver = (event: DragEvent<HTMLElement>) => {
    if (!isFileDrag(event)) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
  }

  const onDragLeave = (event: DragEvent<HTMLElement>) => {
    event.preventDefault()
    if (dragDepth.current === 0) return
    dragDepth.current -= 1
    if (dragDepth.current === 0) setIsDragging(false)
  }

  const onDrop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault()
    dragDepth.current = 0
    setIsDragging(false)
    if (!isFileDrag(event)) return
    const file = event.dataTransfer.files?.[0]
    if (file) void startImport(file)
  }

  const closeDialog = () => {
    setSummary(undefined)
    setStage('preview')
    setPendingLines(undefined)
  }

  const backToPreview = () => {
    setStage('preview')
  }

  const applyImport = (mode: 'append' | 'replace', lines = pendingLines) => {
    if (!lines || lines.length === 0) return
    const fileName = summary?.fileName ?? t('import.defaultFile')
    importLines(lines, mode)
    setSuccess(
      t(lines.length === 1 ? 'import.success.one' : 'import.success.other', {
        count: lines.length,
        file: fileName,
      }),
    )
    const firstId = lines[0]?.id
    setSummary(undefined)
    setStage('preview')
    setPendingLines(undefined)
    if (firstId) onImportedRef.current(firstId)
  }

  const requestImport = (lines: PrintLine[]) => {
    if (lines.length === 0) return
    setPendingLines(lines)
    if (draftHasContent(draft)) {
      setStage('confirm')
      return
    }
    applyImport('replace', lines)
  }

  return {
    fileInputRef,
    openFilePicker,
    handleFileInput,
    dragHandlers: { onDragEnter, onDragOver, onDragLeave, onDrop },
    isDragging,
    isLoading,
    error,
    clearError: () => setError(undefined),
    success,
    clearSuccess: () => setSuccess(undefined),
    summary,
    stage,
    pendingLines,
    dialogKey,
    closeDialog,
    backToPreview,
    requestImport,
    confirmAppend: () => applyImport('append'),
    confirmReplace: () => applyImport('replace'),
  }
}
