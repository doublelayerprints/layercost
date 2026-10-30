import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useI18n } from '@/app/i18n-context'
import { useFormat } from '@/app/use-format'
import { calculateQuote } from '@/domain/cost/quote'
import { pricingFromSettings } from '@/domain/cost/quote'
import type { QuoteResult } from '@/domain/types'
import { useAppStore } from '@/state/app-store'
import {
  Alert,
  Button,
  CollapsibleCard,
  EmptyState,
  Field,
  Input,
  PageHeader,
} from '@/components/ui'
import { TextField } from '@/components/number-fields'
import { OnboardingCard } from '@/features/onboarding/OnboardingCard'
import { QuotePrint } from '@/features/quotes/QuotePrint'
import { cn } from '@/lib/cn'
import { domainErrorMessage } from '@/lib/domain-error-message'
import { pricingModeLabel, vatModeLabel } from '@/lib/labels'
import { CostDetails } from './CostDetails'
import { JobCostsEditor } from './JobCostsEditor'
import { LineEditor } from './LineEditor'
import { NewDraftButton } from './NewDraftButton'
import { PricingEditor } from './PricingEditor'
import { SummaryPanel, type QuickComparison } from './SummaryPanel'
import { ThreeMfImportDialog } from './ThreeMfImportDialog'
import { useThreeMfImport } from './use-three-mf-import'

interface CalculationState {
  result?: QuoteResult
  error?: string
}

export function CalculatorPage() {
  const { t } = useI18n()
  const format = useFormat()
  const config = useAppStore((state) => state.config)
  const draft = useAppStore((state) => state.draft)
  const quotes = useAppStore((state) => state.quotes)
  const cancelEdit = useAppStore((state) => state.cancelEdit)
  const updateDraftMeta = useAppStore((state) => state.updateDraftMeta)
  const updatePricing = useAppStore((state) => state.updatePricing)
  const updateJob = useAppStore((state) => state.updateJob)
  const toggleJobExtra = useAppStore((state) => state.toggleJobExtra)
  const updateLine = useAppStore((state) => state.updateLine)
  const addLine = useAppStore((state) => state.addLine)
  const duplicateLine = useAppStore((state) => state.duplicateLine)
  const removeLine = useAppStore((state) => state.removeLine)
  const updateLineMaterial = useAppStore((state) => state.updateLineMaterial)
  const addLineMaterial = useAppStore((state) => state.addLineMaterial)
  const removeLineMaterial = useAppStore((state) => state.removeLineMaterial)
  const toggleLineExtra = useAppStore((state) => state.toggleLineExtra)
  const saveDraft = useAppStore((state) => state.saveDraft)
  const navigate = useNavigate()
  const dateFieldId = useId()
  const renameHintId = useId()

  const [saveError, setSaveError] = useState<string>()
  const [isRenaming, setIsRenaming] = useState(false)
  const nameBeforeRenameRef = useRef('')
  const restoreTitleFocusRef = useRef(false)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const renameButtonRef = useRef<HTMLButtonElement>(null)
  const pendingFocusRef = useRef<string | undefined>(undefined)
  const {
    fileInputRef,
    openFilePicker,
    handleFileInput,
    dragHandlers,
    isDragging,
    isLoading,
    error: importError,
    clearError,
    success: importSuccess,
    clearSuccess,
    summary: importSummary,
    stage: importStage,
    pendingLines,
    dialogKey,
    closeDialog,
    backToPreview,
    requestImport,
    confirmAppend,
    confirmReplace,
  } = useThreeMfImport((lineId) => {
    pendingFocusRef.current = lineId
  })

  useEffect(() => {
    const lineId = pendingFocusRef.current
    if (!lineId) return
    pendingFocusRef.current = undefined
    const line = document.getElementById(`line-${lineId}`)
    const nameInput = line?.querySelector<HTMLInputElement>(
      `input[aria-label="${t('line.nameLabel')}"]`,
    )
    nameInput?.focus()
    line?.scrollIntoView({ block: 'center' })
  }, [draft.lines, t])

  useEffect(() => {
    if (!isRenaming) return
    const input = nameInputRef.current
    input?.focus()
    input?.setSelectionRange(input.value.length, input.value.length)
  }, [isRenaming])

  useEffect(() => {
    if (isRenaming || !restoreTitleFocusRef.current) return
    restoreTitleFocusRef.current = false
    renameButtonRef.current?.focus()
  }, [isRenaming])

  const editingQuote = quotes.find(
    (quote) => quote.id === draft.id && quote.status === 'saved' && !quote.archived,
  )
  // Editing keeps the prices frozen in the saved snapshot. New drafts use the current config.
  const calculationConfig = draft.snapshot?.config ?? config

  const calculation = useMemo<CalculationState>(() => {
    try {
      return { result: calculateQuote(draft, calculationConfig) }
    } catch (error) {
      return {
        result: undefined,
        error: domainErrorMessage(error, t) ?? t('calculator.calculationError'),
      }
    }
  }, [draft, calculationConfig, t])

  const totalGrams = draft.lines.reduce(
    (sum, line) =>
      sum + line.materials.reduce((lineSum, usage) => lineSum + usage.grams, 0) * line.quantity,
    0,
  )

  /**
   * Same job on the other active printer. Display-only: the draft is never mutated.
   * Only offered when the whole draft uses one of the two configured printers.
   */
  const quickComparison = useMemo<QuickComparison | undefined>(() => {
    if (!calculation.result) return undefined
    const active = calculationConfig.printers.filter((printer) => !printer.archived)
    if (active.length !== 2 || draft.lines.length === 0) return undefined
    const printerIds = new Set(draft.lines.map((line) => line.printerId))
    if (printerIds.size !== 1) return undefined
    const current = active.find((printer) => printer.id === draft.lines[0]?.printerId)
    if (!current) return undefined
    const other = active.find((printer) => printer.id !== current.id)
    if (!other) return undefined

    try {
      const alternative = calculateQuote(
        {
          ...draft,
          lines: draft.lines.map((line) => ({ ...line, printerId: other.id })),
        },
        calculationConfig,
      )
      return {
        currentId: current.id,
        options: [
          {
            id: current.id,
            name: current.name,
            totalCost: calculation.result.totalCost,
            grossPriceCents: calculation.result.grossPriceCents,
          },
          {
            id: other.id,
            name: other.name,
            totalCost: alternative.totalCost,
            grossPriceCents: alternative.grossPriceCents,
          },
        ],
      }
    } catch {
      return undefined
    }
  }, [calculation.result, calculationConfig, draft])

  const handleSave = () => {
    setSaveError(undefined)
    const result = saveDraft()
    if (result.error) {
      setSaveError(result.errorCode ? t(`calculator.saveError.${result.errorCode}`) : result.error)
      return
    }
    if (result.quote) {
      navigate(`/quotes/${result.quote.id}`, {
        state: { saved: true, edited: Boolean(editingQuote) },
      })
    }
  }

  const handlePrint = () => {
    if (!calculation.result) return
    window.print()
  }

  const handleResetPricing = () => {
    updatePricing(pricingFromSettings(calculationConfig.settings))
  }

  const handleCancelEdit = () => {
    if (!editingQuote) return
    const id = editingQuote.id
    cancelEdit()
    navigate(`/quotes/${id}`)
  }

  const startRenaming = () => {
    nameBeforeRenameRef.current = draft.name
    setIsRenaming(true)
  }

  const finishRenaming = () => {
    if (!draft.name.trim() && nameBeforeRenameRef.current.trim()) {
      updateDraftMeta({ name: nameBeforeRenameRef.current })
    }
    setIsRenaming(false)
  }

  const cancelRenaming = () => {
    updateDraftMeta({ name: nameBeforeRenameRef.current })
    restoreTitleFocusRef.current = true
    setIsRenaming(false)
  }

  const quoteTitle = draft.name.trim() || t('calculator.newQuote')

  const paragraphCount = draft.lines.length
  const lineCountLabel = t(
    paragraphCount === 1 ? 'calculator.lineCount.one' : 'calculator.lineCount.other',
  )
  const quoteSummary = (
    <>
      <span>{format.dateOnly(draft.quoteDate)}</span>
      {draft.customer ? (
        <>
          <span aria-hidden="true">·</span>
          <span>{draft.customer}</span>
        </>
      ) : null}
    </>
  )
  const printsSummary = (
    <>
      <span>
        {paragraphCount} {lineCountLabel}
      </span>
      <span aria-hidden="true">·</span>
      <span>{format.grams(totalGrams)}</span>
      {calculation.result ? (
        <>
          <span aria-hidden="true">·</span>
          <span>
            {t('line.directCost')}{' '}
            <span className="tabular-nums text-ink">
              {format.currency(calculation.result.directTotal)}
            </span>
          </span>
        </>
      ) : null}
    </>
  )
  const pricingValueBp =
    draft.pricing.mode === 'markup' ? draft.pricing.markupBp : draft.pricing.marginBp
  const pricingSummary = (
    <>
      <span>
        {pricingModeLabel(draft.pricing.mode, t)}{' '}
        <span className="tabular-nums text-ink">{format.percent(pricingValueBp)}</span>
      </span>
      <span aria-hidden="true">·</span>
      <span>
        {vatModeLabel(draft.pricing.vatMode, t)}
        {draft.pricing.vatMode !== 'none' ? ` ${format.percent(draft.pricing.vatRateBp)}` : null}
      </span>
    </>
  )
  const jobSummary = calculation.result ? (
    <>
      <span>
        {t('job.labor')}{' '}
        <span className="tabular-nums text-ink">
          {format.currency(calculation.result.jobLabor)}
        </span>
      </span>
      <span aria-hidden="true">·</span>
      <span>
        {t('job.extras')}{' '}
        <span className="tabular-nums text-ink">
          {format.currency(calculation.result.jobExtras)}
        </span>
      </span>
    </>
  ) : (
    <>
      <span>
        {t('job.setup')} {format.duration(draft.job.setupSeconds)}
      </span>
      <span aria-hidden="true">·</span>
      <span>
        {t('job.design')} {format.duration(draft.job.designSeconds)}
      </span>
    </>
  )

  return (
    <>
      <div className="print:hidden">
        <PageHeader
          title={
            isRenaming ? (
              <input
                ref={nameInputRef}
                value={draft.name}
                aria-label={t('calculator.nameLabel')}
                aria-describedby={renameHintId}
                placeholder={t('calculator.namePlaceholder')}
                onChange={(event) => updateDraftMeta({ name: event.target.value })}
                onBlur={finishRenaming}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    restoreTitleFocusRef.current = true
                    finishRenaming()
                  } else if (event.key === 'Escape') {
                    event.preventDefault()
                    cancelRenaming()
                  }
                }}
                className="w-full min-w-0 border-b-2 border-data bg-transparent px-0 pb-0.5 pt-0 text-2xl font-semibold tracking-title text-ink caret-data transition-feedback placeholder:font-normal placeholder:text-muted focus:outline-none focus-visible:outline-none"
              />
            ) : (
              quoteTitle
            )
          }
          titleClassName={isRenaming ? 'w-full' : undefined}
          titleEdit={
            isRenaming
              ? undefined
              : {
                  label: t('calculator.renameQuote'),
                  onClick: startRenaming,
                  buttonRef: renameButtonRef,
                }
          }
          description={t('calculator.meta', {
            date: format.dateOnly(draft.quoteDate),
            count: paragraphCount,
            lines: lineCountLabel,
            grams: format.grams(totalGrams),
          })}
          meta={
            <>
              <span className="text-xs text-muted">{t('calculator.autosaveNote')}</span>
              {isRenaming ? (
                <span id={renameHintId} className="sr-only">
                  {t('calculator.renameHint')}
                </span>
              ) : null}
            </>
          }
          actions={
            <>
              <Button variant="secondary" onClick={openFilePicker} disabled={isLoading}>
                {isLoading ? t('import.analyzing') : t('import.button')}
              </Button>
              <NewDraftButton label={t('calculator.newDraft')} />
            </>
          }
        />

        <div className="mt-6">
          <OnboardingCard />
        </div>

        {importError || isLoading || importSuccess ? (
          <div className="mt-6 space-y-3">
            {importError ? (
              <div role="alert">
                <Alert tone="danger" title={t('import.errorTitle')} onClose={clearError}>
                  {importError}
                </Alert>
              </div>
            ) : null}
            {isLoading ? (
              <div role="status">
                <Alert tone="info" title={t('import.loadingTitle')}>
                  {t('import.loadingDetail')}
                </Alert>
              </div>
            ) : null}
            {importSuccess ? (
              <div role="status">
                <Alert tone="success" title={t('import.successTitle')} onClose={clearSuccess}>
                  {importSuccess}
                </Alert>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="mt-6 grid items-start gap-6 lg:grid-cols-12">
          <div className="min-w-0 space-y-6 lg:col-span-7">
            {editingQuote ? (
              <Alert tone="info" title={t('calculator.editing.title', { name: editingQuote.name })}>
                <p>{t('calculator.editing.description')}</p>
                <Button variant="secondary" size="sm" className="mt-3" onClick={handleCancelEdit}>
                  {t('calculator.editing.cancel')}
                </Button>
              </Alert>
            ) : null}

            <CollapsibleCard
              title={t('calculator.quoteSection')}
              description={t('calculator.quoteDescription')}
              summary={quoteSummary}
              headingId="section-intestazione"
            >
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label={t('calculator.date')} htmlFor={dateFieldId}>
                  <Input
                    id={dateFieldId}
                    type="date"
                    value={draft.quoteDate}
                    onChange={(event) => updateDraftMeta({ quoteDate: event.target.value })}
                  />
                </Field>
                <TextField
                  label={`${t('calculator.customer')} (${t('common.optional')})`}
                  value={draft.customer ?? ''}
                  onChange={(value) => updateDraftMeta({ customer: value || undefined })}
                  placeholder={t('calculator.customerPlaceholder')}
                />
              </div>
            </CollapsibleCard>

            <CollapsibleCard
              {...dragHandlers}
              title={t('calculator.printsSection')}
              description={t('calculator.printsDescription')}
              summary={printsSummary}
              headingId="section-stampe"
              actions={
                <Button variant="secondary" size="sm" onClick={openFilePicker} disabled={isLoading}>
                  {isLoading ? t('import.analyzing') : t('import.button')}
                </Button>
              }
              className={cn(
                'relative transition-feedback',
                isDragging && 'outline-2 outline-dashed outline-offset-4 outline-data',
              )}
              data-dropzone="3mf"
            >
              {isDragging ? (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-control border-2 border-dashed border-data bg-surface/95"
                >
                  <p className="text-sm font-medium text-ink">{t('import.dropHint')}</p>
                </div>
              ) : null}

              {draft.lines.length === 0 ? (
                <div className="mt-4">
                  <EmptyState
                    title={t('line.emptyTitle')}
                    description={t('line.emptyDescription')}
                    action={<Button onClick={addLine}>{t('line.addFirst')}</Button>}
                  />
                </div>
              ) : (
                <>
                  <div className="mt-4 space-y-4">
                    {draft.lines.map((line, index) => (
                      <LineEditor
                        key={line.id}
                        index={index}
                        line={line}
                        config={calculationConfig}
                        result={calculation.result?.lines.find((item) => item.lineId === line.id)}
                        canRemove={draft.lines.length > 1}
                        onUpdate={(patch) => updateLine(line.id, patch)}
                        onDuplicate={() => duplicateLine(line.id)}
                        onRemove={() => removeLine(line.id)}
                        onUpdateMaterial={(index, patch) =>
                          updateLineMaterial(line.id, index, patch)
                        }
                        onAddMaterial={() => addLineMaterial(line.id)}
                        onRemoveMaterial={(index) => removeLineMaterial(line.id, index)}
                        onToggleExtra={(extraId) => toggleLineExtra(line.id, extraId)}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={addLine}
                    aria-label={t('line.add')}
                    title={t('line.add')}
                    className="mt-4 flex h-12 w-full items-center justify-center rounded-card border border-line bg-raised/40 text-muted transition-feedback hover:border-data hover:bg-data/10 hover:text-data focus-visible:border-data focus-visible:text-data active:border-data active:bg-data/20 active:text-data"
                  >
                    <span aria-hidden="true" className="text-2xl leading-none">
                      +
                    </span>
                  </button>
                </>
              )}
            </CollapsibleCard>

            <CollapsibleCard
              title={t('job.title')}
              description={t('job.description')}
              meta={jobSummary}
              headingId="section-lavoro"
            >
              <JobCostsEditor
                job={draft.job}
                config={calculationConfig}
                onChange={updateJob}
                onToggleExtra={toggleJobExtra}
              />
            </CollapsibleCard>

            <CollapsibleCard
              title={t('pricing.title')}
              description={t('pricing.description')}
              summary={pricingSummary}
              headingId="section-prezzo"
              actions={
                <Button variant="ghost" size="sm" onClick={handleResetPricing}>
                  {t('pricing.reset')}
                </Button>
              }
            >
              <PricingEditor
                pricing={draft.pricing}
                settings={calculationConfig.settings}
                result={calculation.result}
                onChange={updatePricing}
              />
            </CollapsibleCard>
          </div>

          <aside
            className="min-w-0 lg:col-span-5 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto"
            aria-label={t('summary.region')}
          >
            <SummaryPanel
              quote={draft}
              result={calculation.result}
              error={calculation.error}
              totalGrams={totalGrams}
              comparison={quickComparison}
              detailHref="#dettaglio"
              onSave={handleSave}
              onPrint={handlePrint}
              saveError={saveError}
              saveLabel={editingQuote ? t('summary.saveChanges') : undefined}
            />
          </aside>
        </div>

        {calculation.result ? (
          <div id="dettaglio" className="mt-6 scroll-mt-6">
            <CostDetails quote={draft} result={calculation.result} />
          </div>
        ) : null}

        <input
          ref={fileInputRef}
          type="file"
          accept=".3mf,application/zip"
          className="hidden"
          tabIndex={-1}
          onChange={handleFileInput}
        />

        {importSummary ? (
          <ThreeMfImportDialog
            key={dialogKey}
            summary={importSummary}
            config={calculationConfig}
            stage={importStage}
            pendingCount={pendingLines?.length ?? 0}
            onClose={closeDialog}
            onBack={backToPreview}
            onRequestImport={requestImport}
            onAppend={confirmAppend}
            onReplace={confirmReplace}
          />
        ) : null}
      </div>

      <QuotePrint quote={draft} result={calculation.result} audience="customer" />
    </>
  )
}
