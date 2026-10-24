import { useRef, useState } from 'react'
import type { AppData } from '@/data/storage'
import { SCHEMA_VERSION } from '@/data/storage'
import { localRepository } from '@/data/repository'
import { useAppStore } from '@/state/app-store'
import { ENGINE_VERSION } from '@/domain/version'
import { calculatePricing } from '@/domain/cost/pricing'
import { pricingFromSettings } from '@/domain/cost/quote'
import type { Settings } from '@/domain/types'
import { asMicroEur } from '@/domain/units'
import { Alert, Button, Card, Modal, PageHeader } from '@/components/ui'
import { MoneyField, PercentField, SelectField } from '@/components/number-fields'
import { useThemeStore } from '@/state/theme-store'
import type { ThemePreference } from '@/lib/theme'
import {
  allocationModeLabels,
  pricingModeLabels,
  roundingModeLabels,
  vatModeLabels,
} from '@/lib/labels'
import { formatCents, formatCurrency, formatPercent } from '@/lib/format'

const SAMPLE_COST = asMicroEur(5_000_000)

const themeOptions: Array<{ value: ThemePreference; label: string; description: string }> = [
  {
    value: 'system',
    label: 'Sistema',
    description: 'Segue l’impostazione di macOS, Windows o del telefono.',
  },
  { value: 'light', label: 'Chiaro', description: 'Fondo chiaro, sempre.' },
  { value: 'dark', label: 'Scuro', description: 'Fondo scuro con testo chiaro.' },
]

function samplePrice(settings: Settings) {
  const pricing = pricingFromSettings(settings)
  if (
    pricing.markupBp > 100_000 ||
    pricing.marginBp >= 10_000 ||
    pricing.vatRateBp > 3_000 ||
    pricing.roundingStep < 10_000 ||
    pricing.roundingStep > 10_000_000
  ) {
    return undefined
  }
  return calculatePricing(SAMPLE_COST, pricing)
}

export function SettingsPage() {
  const config = useAppStore((state) => state.config)
  const quoteCount = useAppStore((state) => state.quotes.length)
  const updateSettings = useAppStore((state) => state.updateSettings)
  const exportData = useAppStore((state) => state.exportData)
  const importData = useAppStore((state) => state.importData)
  const reset = useAppStore((state) => state.reset)
  const themePreference = useThemeStore((state) => state.preference)
  const setThemePreference = useThemeStore((state) => state.setPreference)

  const settings = config.settings
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pendingImport, setPendingImport] = useState<AppData>()
  const [importError, setImportError] = useState<string>()
  const [importOpen, setImportOpen] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const [message, setMessage] = useState<string>()

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    setImportError(undefined)
    setMessage(undefined)
    try {
      const data = await localRepository.import(file)
      setPendingImport(data)
      setImportOpen(true)
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Importazione non riuscita.')
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const confirmImport = () => {
    if (!pendingImport) return
    exportData()
    importData(pendingImport)
    setPendingImport(undefined)
    setImportOpen(false)
    setMessage('Backup importato. È stata scaricata anche una copia dei dati precedenti.')
  }

  const confirmReset = () => {
    reset()
    setResetOpen(false)
    setMessage('Dati ripristinati alla configurazione iniziale.')
  }

  const isMarkup = settings.pricingMode === 'markup'
  const preview = samplePrice(settings)

  return (
    <div>
      <PageHeader
        title="Impostazioni"
        description="Valori predefiniti per i nuovi preventivi e preferenze di questo browser. Ogni preventivo può poi sovrascrivere il prezzo."
      />

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(event) => void handleFile(event.target.files?.[0])}
      />

      {message ? (
        <div className="mt-6">
          <Alert tone="success" title="Fatto" onClose={() => setMessage(undefined)}>
            {message}
          </Alert>
        </div>
      ) : null}
      {importError ? (
        <div className="mt-6">
          <Alert
            tone="danger"
            title="Importazione non riuscita"
            onClose={() => setImportError(undefined)}
          >
            {importError}
          </Alert>
        </div>
      ) : null}

      <p className="mt-4 text-sm text-muted">
        Le modifiche si salvano subito in questo browser. Esporta un backup prima di cambiare
        dispositivo o svuotare i dati.
      </p>

      <Card className="mt-6 divide-y divide-line">
        <section
          className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)] lg:gap-10"
          aria-labelledby="settings-lavoro"
        >
          <div>
            <h2 id="settings-lavoro" className="text-base font-semibold text-ink">
              Manodopera e rischio
            </h2>
            <p className="mt-1 text-sm leading-snug text-muted">
              La manodopera è 0 per impostazione predefinita: attivala se vuoi conteggiare il tuo
              tempo. Il tasso guasti è una riserva, non un costo certo.
            </p>
            <p className="mt-3 text-xs leading-relaxed text-muted">
              Oggi: manodopera {formatCurrency(settings.laborRatePerHour)}/h · guasti{' '}
              {formatPercent(settings.failureRateBp)} · maggiorazione tempo{' '}
              {formatPercent(settings.timeOverheadBp)} ·{' '}
              {settings.allocationMode === 'proportional' ? 'proporzionale' : 'uguale per pezzo'}.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <MoneyField
              label="Manodopera"
              valueMicro={settings.laborRatePerHour}
              onChangeMicro={(value) => updateSettings({ laborRatePerHour: value })}
              decimals={2}
              hint="€/h"
            />
            <PercentField
              label="Tasso guasti"
              valueBp={settings.failureRateBp}
              onChangeBp={(value) => updateSettings({ failureRateBp: value })}
              decimals={1}
              max={50}
              hint="I materiali possono sovrascriverlo."
            />
            <PercentField
              label="Maggiorazione tempo"
              valueBp={settings.timeOverheadBp}
              onChangeBp={(value) => updateSettings({ timeOverheadBp: value })}
              decimals={1}
              max={100}
              hint="Aggiunta al tempo dello slicer, prima dell’avvio."
            />
            <SelectField
              label="Ripartizione costi fissi"
              value={settings.allocationMode}
              onChange={(value) =>
                updateSettings({ allocationMode: value as typeof settings.allocationMode })
              }
              options={[
                { value: 'proportional', label: allocationModeLabels.proportional },
                { value: 'equalPerUnit', label: allocationModeLabels.equalPerUnit },
              ]}
              hint="Come distribuire setup, design e spedizione sulle righe."
            />
          </div>
        </section>

        <section
          className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)] lg:gap-10"
          aria-labelledby="settings-prezzo"
        >
          <div>
            <h2 id="settings-prezzo" className="text-base font-semibold text-ink">
              Prezzo predefinito
            </h2>
            <p className="mt-1 text-sm leading-snug text-muted">
              Questi valori vengono copiati nel nuovo preventivo; puoi modificarli caso per caso.
            </p>
            {preview ? (
              <div className="mt-4 border-l-2 border-data pl-3">
                <p className="text-xs font-medium text-muted">Esempio con le regole attuali</p>
                <p className="mt-1 text-sm leading-snug text-ink">
                  Un lavoro da {formatCurrency(SAMPLE_COST)} di costo diventa{' '}
                  <span className="font-medium tabular-nums">
                    {formatCents(preview.netPriceCents)}
                  </span>{' '}
                  netti
                  {preview.vatCents > 0
                    ? ` e ${formatCents(preview.grossPriceCents)} con IVA ${formatPercent(settings.vatRateBp)}.`
                    : ', senza IVA.'}
                </p>
              </div>
            ) : null}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              label="Modalità"
              value={settings.pricingMode}
              onChange={(value) =>
                updateSettings({ pricingMode: value as typeof settings.pricingMode })
              }
              options={[
                { value: 'markup', label: pricingModeLabels.markup },
                { value: 'margin', label: pricingModeLabels.margin },
              ]}
            />
            <PercentField
              label={isMarkup ? 'Ricarico' : 'Margine'}
              valueBp={isMarkup ? settings.markupBp : settings.marginBp}
              onChangeBp={(value) =>
                updateSettings(isMarkup ? { markupBp: value } : { marginBp: value })
              }
              decimals={1}
              max={isMarkup ? 1000 : 99}
            />
            <SelectField
              label="Arrotondamento"
              value={settings.roundingMode}
              onChange={(value) =>
                updateSettings({ roundingMode: value as typeof settings.roundingMode })
              }
              options={[
                { value: 'up', label: roundingModeLabels.up },
                { value: 'nearest', label: roundingModeLabels.nearest },
                { value: 'down', label: roundingModeLabels.down },
              ]}
            />
            <MoneyField
              label="Passo"
              valueMicro={settings.roundingStep}
              onChangeMicro={(value) => updateSettings({ roundingStep: value })}
              decimals={2}
            />
            <SelectField
              label="IVA"
              value={settings.vatMode}
              onChange={(value) => updateSettings({ vatMode: value as typeof settings.vatMode })}
              options={[
                { value: 'none', label: vatModeLabels.none },
                { value: 'excluded', label: vatModeLabels.excluded },
                { value: 'included', label: vatModeLabels.included },
              ]}
            />
            {settings.vatMode !== 'none' ? (
              <PercentField
                label="Aliquota IVA"
                valueBp={settings.vatRateBp}
                onChangeBp={(value) => updateSettings({ vatRateBp: value })}
                decimals={0}
                max={30}
              />
            ) : null}
          </div>
        </section>

        <section
          className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)] lg:gap-10"
          aria-labelledby="settings-aspetto"
        >
          <div>
            <h2 id="settings-aspetto" className="text-base font-semibold text-ink">
              Aspetto
            </h2>
            <p className="mt-1 text-sm leading-snug text-muted">
              Il tema si applica subito e resta su questo browser. La stampa usa sempre fondo bianco
              e testo nero.
            </p>
          </div>
          <fieldset>
            <legend className="sr-only">Tema dell’interfaccia</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {themeOptions.map((option) => (
                <label
                  key={option.value}
                  className="flex cursor-pointer items-start gap-2.5 rounded-control border border-line bg-surface p-3 transition-feedback has-[:checked]:border-data has-[:checked]:bg-raised"
                >
                  <input
                    type="radio"
                    name="theme-preference"
                    value={option.value}
                    checked={themePreference === option.value}
                    onChange={() => setThemePreference(option.value)}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-data"
                  />
                  <span>
                    <span className="block text-sm font-medium text-ink">{option.label}</span>
                    <span className="block text-xs leading-snug text-muted">
                      {option.description}
                    </span>
                  </span>
                </label>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted">
              “Sistema” segue l’impostazione del dispositivo e si aggiorna quando cambia.
            </p>
          </fieldset>
        </section>

        <section
          className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)] lg:gap-10"
          aria-labelledby="settings-dati"
        >
          <div>
            <h2 id="settings-dati" className="text-base font-semibold text-ink">
              Dati e backup
            </h2>
            <p className="mt-1 text-sm leading-snug text-muted">
              I dati vivono solo in questo browser. Un backup JSON è l’unica copia esterna:
              importarlo sostituisce configurazione, preventivi e bozza.
            </p>
            <p className="mt-2 text-xs text-muted">
              Schema v{SCHEMA_VERSION} · Motore v{ENGINE_VERSION}
            </p>
          </div>
          <div>
            <dl className="grid grid-cols-3 gap-4 border-b border-line pb-4">
              <div>
                <dt className="text-xs font-medium text-muted">Stampanti</dt>
                <dd className="mt-0.5 text-xl font-medium tabular-nums text-ink">
                  {config.printers.length}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted">Materiali</dt>
                <dd className="mt-0.5 text-xl font-medium tabular-nums text-ink">
                  {config.materials.length}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted">Preventivi</dt>
                <dd className="mt-0.5 text-xl font-medium tabular-nums text-ink">{quoteCount}</dd>
              </div>
            </dl>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="secondary" onClick={exportData}>
                Esporta JSON
              </Button>
              <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
                Importa JSON
              </Button>
              <Button variant="ghost" onClick={() => updateSettings({ onboardingComplete: false })}>
                Rivedi la guida iniziale
              </Button>
            </div>

            <div className="mt-6 border-t border-line pt-4">
              <h3 className="text-sm font-semibold text-ink">Ripristina i dati iniziali</h3>
              <p className="mt-0.5 max-w-xl text-sm leading-snug text-muted">
                Elimina tutti i preventivi e le personalizzazioni e ricarica il seed. L’operazione
                chiede conferma e non è reversibile.
              </p>
              <Button
                variant="ghost"
                className="mt-2 text-negative hover:bg-raised"
                onClick={() => setResetOpen(true)}
              >
                Ripristina dati iniziali
              </Button>
            </div>
          </div>
        </section>
      </Card>

      <Modal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Importare il backup?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setImportOpen(false)}>
              Annulla
            </Button>
            <Button onClick={confirmImport}>Importa e sostituisci</Button>
          </>
        }
      >
        <div className="space-y-3 text-sm text-muted">
          <p>
            L’importazione sostituisce la configurazione, i preventivi e la bozza corrente. Prima di
            procedere verrà scaricato un backup dei dati attuali.
          </p>
          {pendingImport ? (
            <dl className="grid grid-cols-3 gap-3 border-y border-line py-3">
              <div>
                <dt className="text-xs font-medium text-muted">Stampanti</dt>
                <dd className="mt-0.5 text-base tabular-nums text-ink">
                  {pendingImport.config.printers.length}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted">Materiali</dt>
                <dd className="mt-0.5 text-base tabular-nums text-ink">
                  {pendingImport.config.materials.length}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted">Preventivi</dt>
                <dd className="mt-0.5 text-base tabular-nums text-ink">
                  {pendingImport.quotes.length}
                </dd>
              </div>
            </dl>
          ) : null}
        </div>
      </Modal>

      <Modal
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title="Ripristinare i dati iniziali?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setResetOpen(false)}>
              Annulla
            </Button>
            <Button variant="danger" onClick={confirmReset}>
              Ripristina
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">
          Verranno eliminati tutti i preventivi e le personalizzazioni. Esporta un backup prima di
          continuare.
        </p>
      </Modal>
    </div>
  )
}
