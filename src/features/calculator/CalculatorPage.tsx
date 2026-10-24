import { useId, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { calculateQuote } from '@/domain/cost/quote'
import { pricingFromSettings } from '@/domain/cost/quote'
import type { QuoteResult } from '@/domain/types'
import { useAppStore } from '@/state/app-store'
import { Button, Card, EmptyState, Field, Input, PageHeader, SectionHeader } from '@/components/ui'
import { TextField } from '@/components/number-fields'
import { OnboardingCard } from '@/features/onboarding/OnboardingCard'
import { QuotePrint } from '@/features/quotes/QuotePrint'
import { CostDetails } from './CostDetails'
import { JobCostsEditor } from './JobCostsEditor'
import { LineEditor } from './LineEditor'
import { NewDraftButton } from './NewDraftButton'
import { PricingEditor } from './PricingEditor'
import { SummaryPanel, type QuickComparison } from './SummaryPanel'
import { formatDateOnly, formatGrams } from '@/lib/format'

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
  const navigate = useNavigate()
  const dateFieldId = useId()

  const [saveError, setSaveError] = useState<string>()

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
    const active = config.printers.filter((printer) => !printer.archived)
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
        config,
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
  }, [calculation.result, config, draft])

  const handleSave = () => {
    setSaveError(undefined)
    const result = saveDraft()
    if (result.error) {
      setSaveError(result.error)
      return
    }
    if (result.quote) {
      navigate(`/quotes/${result.quote.id}`, { state: { saved: true } })
    }
  }

  const handlePrint = () => {
    if (!calculation.result) return
    window.print()
  }

  const handleResetPricing = () => {
    updatePricing(pricingFromSettings(config.settings))
  }

  const paragraphCount = draft.lines.length

  return (
    <>
      <div className="print:hidden">
        <PageHeader
          title={draft.name.trim() || 'Nuovo preventivo'}
          description={`Bozza · preventivo del ${formatDateOnly(draft.quoteDate)} · ${paragraphCount} ${
            paragraphCount === 1 ? 'riga' : 'righe'
          } · ${formatGrams(totalGrams)}`}
          meta={
            <span className="text-xs text-muted">
              La bozza si salva da sola in questo browser; “Salva preventivo” la aggiunge allo
              storico.
            </span>
          }
          actions={<NewDraftButton label="Nuovo" />}
        />

        <div className="mt-6">
          <OnboardingCard />
        </div>

        <div className="mt-6 grid items-start gap-6 lg:grid-cols-12">
          <div className="min-w-0 lg:col-span-7">
            <Card className="p-5 sm:p-6">
              <section aria-labelledby="section-intestazione">
                <SectionHeader
                  id="section-intestazione"
                  title="Preventivo"
                  description="Il nome identifica il lavoro; data e cliente compaiono in stampa e nei link condivisi."
                />
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
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
              </section>

              <section className="mt-8 border-t border-line pt-6" aria-labelledby="section-stampe">
                <SectionHeader
                  id="section-stampe"
                  title="Stampe"
                  description="Una riga per ogni stampa o pezzo diverso; la quantità gestisce le copie."
                  actions={
                    <Button variant="secondary" size="sm" onClick={addLine}>
                      Aggiungi riga
                    </Button>
                  }
                />

                {draft.lines.length === 0 ? (
                  <div className="mt-4">
                    <EmptyState
                      title="Nessuna stampa nel preventivo"
                      description="Aggiungi una riga con stampante, tempo e grammi per iniziare."
                      action={<Button onClick={addLine}>Aggiungi la prima riga</Button>}
                    />
                  </div>
                ) : (
                  <div className="mt-2">
                    {draft.lines.map((line, index) => (
                      <LineEditor
                        key={line.id}
                        index={index}
                        line={line}
                        config={config}
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
                )}
              </section>

              <section className="mt-8 border-t border-line pt-6" aria-labelledby="section-lavoro">
                <JobCostsEditor
                  job={draft.job}
                  config={config}
                  result={calculation.result}
                  onChange={updateJob}
                  onToggleExtra={toggleJobExtra}
                />
              </section>

              <section className="mt-8 border-t border-line pt-6" aria-labelledby="section-prezzo">
                <PricingEditor
                  pricing={draft.pricing}
                  settings={config.settings}
                  onChange={updatePricing}
                  onReset={handleResetPricing}
                />
              </section>
            </Card>
          </div>

          <aside
            className="min-w-0 lg:col-span-5 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto"
            aria-label="Risultato"
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
            />
          </aside>
        </div>

        {calculation.result ? (
          <div id="dettaglio" className="mt-6 scroll-mt-6">
            <CostDetails quote={draft} result={calculation.result} />
          </div>
        ) : null}
      </div>

      <QuotePrint quote={draft} result={calculation.result} />
    </>
  )
}
