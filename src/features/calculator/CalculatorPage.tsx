import { useId, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { calculateQuote } from '@/domain/cost/quote'
import { pricingFromSettings } from '@/domain/cost/quote'
import type { QuoteResult } from '@/domain/types'
import { useAppStore } from '@/state/app-store'
import { Button, Card, EmptyState, Field, Input, PageHeader } from '@/components/ui'
import { TextField } from '@/components/number-fields'
import { OnboardingCard } from '@/features/onboarding/OnboardingCard'
import { QuotePrint } from '@/features/quotes/QuotePrint'
import { CostDetails } from './CostDetails'
import { JobCostsEditor } from './JobCostsEditor'
import { LineEditor } from './LineEditor'
import { PricingEditor } from './PricingEditor'
import { SummaryPanel } from './SummaryPanel'
import { formatDateOnly } from '@/lib/format'

interface CalculationState {
  result?: QuoteResult
  error?: string
}

export function CalculatorPage() {
  const config = useAppStore((state) => state.config)
  const draft = useAppStore((state) => state.draft)
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
  const newDraft = useAppStore((state) => state.newDraft)
  const navigate = useNavigate()
  const dateFieldId = useId()

  const [saveError, setSaveError] = useState<string>()
  const [savedMessage, setSavedMessage] = useState<string>()

  const calculation = useMemo<CalculationState>(() => {
    try {
      return { result: calculateQuote(draft, config) }
    } catch (error) {
      return {
        result: undefined,
        error: error instanceof Error ? error.message : 'Completa i dati del preventivo.',
      }
    }
  }, [draft, config])

  const totalGrams = draft.lines.reduce(
    (sum, line) => sum + line.materials.reduce((lineSum, usage) => lineSum + usage.grams, 0),
    0,
  )

  const handleSave = () => {
    setSaveError(undefined)
    setSavedMessage(undefined)
    const result = saveDraft()
    if (result.error) {
      setSaveError(result.error)
      return
    }
    if (result.quote) {
      setSavedMessage('Preventivo salvato. Lo trovi nello storico.')
      navigate(`/quotes/${result.quote.id}`)
    }
  }

  const handleNew = () => {
    const hasContent =
      draft.lines.length > 1 ||
      draft.lines.some(
        (line) =>
          line.timeSeconds > 0 ||
          line.materials.some((usage) => usage.grams > 0) ||
          line.name !== 'Stampa',
      )
    if (
      hasContent &&
      !window.confirm('Vuoi iniziare un nuovo preventivo? Le modifiche non salvate andranno perse.')
    ) {
      return
    }
    setSaveError(undefined)
    setSavedMessage(undefined)
    newDraft()
  }

  const handlePrint = () => {
    if (!calculation.result) return
    window.print()
  }

  const handleResetPricing = () => {
    updatePricing(pricingFromSettings(config.settings))
  }

  return (
    <>
      <div className="print:hidden space-y-6">
        <PageHeader
          title={draft.name.trim() || 'Nuovo preventivo'}
          description={`Preventivo del ${formatDateOnly(draft.quoteDate)} · ${draft.lines.length} ${
            draft.lines.length === 1 ? 'riga' : 'righe'
          }`}
          actions={
            <Button variant="secondary" onClick={handleNew}>
              Nuovo
            </Button>
          }
        />

        <OnboardingCard />

        <Card className="p-4 sm:p-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <TextField
              label="Nome preventivo"
              value={draft.name}
              onChange={(value) => updateDraftMeta({ name: value })}
              placeholder="Es. Set organizer scrivania"
              required
              className="sm:col-span-2"
            />
            <Field label="Data" htmlFor={dateFieldId}>
              <Input
                id={dateFieldId}
                type="date"
                value={draft.quoteDate}
                onChange={(event) => updateDraftMeta({ quoteDate: event.target.value })}
              />
            </Field>
            <TextField
              label="Cliente (opzionale)"
              value={draft.customer ?? ''}
              onChange={(value) => updateDraftMeta({ customer: value || undefined })}
              placeholder="Nome o riferimento"
            />
          </div>
        </Card>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0 space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-ink">Stampe</h2>
                <p className="mt-0.5 text-xs text-muted">
                  Una riga per ogni stampa o per ogni pezzo diverso. La quantità gestisce le copie.
                </p>
              </div>
              <Button variant="secondary" size="sm" onClick={addLine}>
                + Aggiungi riga
              </Button>
            </div>

            {draft.lines.length === 0 ? (
              <EmptyState
                title="Nessuna stampa nel preventivo"
                description="Aggiungi una riga con stampante, tempo e grammi per iniziare."
                action={<Button onClick={addLine}>Aggiungi la prima riga</Button>}
              />
            ) : (
              <div className="space-y-4">
                {draft.lines.map((line) => (
                  <LineEditor
                    key={line.id}
                    line={line}
                    config={config}
                    result={calculation.result?.lines.find((item) => item.lineId === line.id)}
                    canRemove={draft.lines.length > 1}
                    onUpdate={(patch) => updateLine(line.id, patch)}
                    onDuplicate={() => duplicateLine(line.id)}
                    onRemove={() => removeLine(line.id)}
                    onUpdateMaterial={(index, patch) => updateLineMaterial(line.id, index, patch)}
                    onAddMaterial={() => addLineMaterial(line.id)}
                    onRemoveMaterial={(index) => removeLineMaterial(line.id, index)}
                    onToggleExtra={(extraId) => toggleLineExtra(line.id, extraId)}
                  />
                ))}
              </div>
            )}

            <JobCostsEditor
              job={draft.job}
              config={config}
              result={calculation.result}
              onChange={updateJob}
              onToggleExtra={toggleJobExtra}
            />

            <PricingEditor
              pricing={draft.pricing}
              settings={config.settings}
              onChange={updatePricing}
              onReset={handleResetPricing}
            />
          </div>

          <div className="min-w-0">
            <SummaryPanel
              quote={draft}
              result={calculation.result}
              error={calculation.error}
              totalGrams={totalGrams}
              onSave={handleSave}
              onPrint={handlePrint}
              onNew={handleNew}
              saveError={saveError}
            />
            {savedMessage ? (
              <p className="mt-2 text-center text-xs text-positive">{savedMessage}</p>
            ) : null}
          </div>
        </div>

        {calculation.result ? <CostDetails quote={draft} result={calculation.result} /> : null}
      </div>

      <QuotePrint quote={draft} result={calculation.result} />
    </>
  )
}
