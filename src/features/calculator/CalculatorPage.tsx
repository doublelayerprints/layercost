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
  Card,
  EmptyState,
  Field,
  Input,
  PageHeader,
  SectionHeader,
} from '@/components/ui'
import { TextField } from '@/components/number-fields'
import { OnboardingCard } from '@/features/onboarding/OnboardingCard'
import { QuotePrint } from '@/features/quotes/QuotePrint'
import { cn } from '@/lib/cn'
import { domainErrorMessage } from '@/lib/domain-error-message'
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

  const [saveError, setSaveError] = useState<string>()
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

  const paragraphCount = draft.lines.length

  return (
    <>
      <div className="print:hidden">
        <PageHeader
          title={draft.name.trim() || t('calculator.newQuote')}
          description={t('calculator.meta', {
            date: format.dateOnly(draft.quoteDate),
            count: paragraphCount,
            lines: t(
              paragraphCount === 1 ? 'calculator.lineCount.one' : 'calculator.lineCount.other',
            ),
            grams: format.grams(totalGrams),
          })}
          meta={<span className="text-xs text-muted">{t('calculator.autosaveNote')}</span>}
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

            <Card className="p-5 sm:p-6">
              <section aria-labelledby="section-intestazione">
                <SectionHeader
                  id="section-intestazione"
                  title={t('calculator.quoteSection')}
                  description={t('calculator.quoteDescription')}
                />
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <TextField
                    label={t('calculator.nameLabel')}
                    value={draft.name}
                    onChange={(value) => updateDraftMeta({ name: value })}
                    placeholder={t('calculator.namePlaceholder')}
                    required
                    className="sm:col-span-2"
                  />
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
              </section>
            </Card>

            <Card
              {...dragHandlers}
              className={cn(
                'relative p-5 transition-feedback sm:p-6',
                isDragging && 'outline-2 outline-dashed outline-offset-4 outline-data',
              )}
              data-dropzone="3mf"
            >
              <section aria-labelledby="section-stampe">
                {isDragging ? (
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-control border-2 border-dashed border-data bg-surface/95"
                  >
                    <p className="text-sm font-medium text-ink">{t('import.dropHint')}</p>
                  </div>
                ) : null}
                <SectionHeader
                  id="section-stampe"
                  title={t('calculator.printsSection')}
                  description={t('calculator.printsDescription')}
                  actions={
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={openFilePicker}
                      disabled={isLoading}
                    >
                      {isLoading ? t('import.analyzing') : t('import.button')}
                    </Button>
                  }
                />

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
                          result={calculation.result?.lines.find(
                            (item) => item.lineId === line.id,
                          )}
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
              </section>
            </Card>

            <Card className="p-5 sm:p-6">
              <section aria-labelledby="section-lavoro">
                <JobCostsEditor
                  job={draft.job}
                  config={calculationConfig}
                  result={calculation.result}
                  onChange={updateJob}
                  onToggleExtra={toggleJobExtra}
                />
              </section>
            </Card>

            <Card className="p-5 sm:p-6">
              <section aria-labelledby="section-prezzo">
                <PricingEditor
                  pricing={draft.pricing}
                  settings={calculationConfig.settings}
                  result={calculation.result}
                  onChange={updatePricing}
                  onReset={handleResetPricing}
                />
              </section>
            </Card>
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
