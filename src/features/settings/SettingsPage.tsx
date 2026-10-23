import { useRef, useState } from 'react'
import type { AppData } from '@/data/storage'
import { SCHEMA_VERSION } from '@/data/storage'
import { localRepository } from '@/data/repository'
import { useAppStore } from '@/state/app-store'
import { ENGINE_VERSION } from '@/domain/version'
import { Alert, Button, Card, Modal, PageHeader } from '@/components/ui'
import { MoneyField, PercentField, SelectField } from '@/components/number-fields'
import {
  allocationModeLabels,
  pricingModeLabels,
  roundingModeLabels,
  vatModeLabels,
} from '@/lib/labels'

export function SettingsPage() {
  const config = useAppStore((state) => state.config)
  const quoteCount = useAppStore((state) => state.quotes.length)
  const updateSettings = useAppStore((state) => state.updateSettings)
  const exportData = useAppStore((state) => state.exportData)
  const importData = useAppStore((state) => state.importData)
  const reset = useAppStore((state) => state.reset)

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

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Configurazione"
        title="Impostazioni"
        description="Valori predefiniti per i nuovi preventivi. Ogni preventivo può poi sovrascrivere il prezzo."
        actions={
          <>
            <Button variant="secondary" onClick={exportData}>
              Esporta backup
            </Button>
            <Button onClick={() => fileInputRef.current?.click()}>Importa backup</Button>
          </>
        }
      />

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(event) => void handleFile(event.target.files?.[0])}
      />

      {message ? (
        <Alert tone="success" title="Fatto" onClose={() => setMessage(undefined)}>
          {message}
        </Alert>
      ) : null}
      {importError ? (
        <Alert
          tone="danger"
          title="Importazione non riuscita"
          onClose={() => setImportError(undefined)}
        >
          {importError}
        </Alert>
      ) : null}

      <Alert tone="info" title="Salvataggio automatico">
        Le impostazioni si salvano nel browser a ogni modifica. Esporta un backup JSON prima di
        cambiare dispositivo o svuotare i dati del browser.
      </Alert>

      <Card className="p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-slate-800">Manodopera e rischio</h2>
        <p className="mt-0.5 text-xs text-slate-500">
          La manodopera è 0 per impostazione predefinita: attivala se vuoi conteggiare il tuo tempo.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
            hint="Valore predefinito; i materiali possono sovrascriverlo."
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
      </Card>

      <Card className="p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-slate-800">Prezzo predefinito</h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Questi valori vengono copiati nel nuovo preventivo; puoi modificarli caso per caso.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
      </Card>

      <Card className="p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-slate-800">Dati e backup</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <DataStat label="Stampanti" value={config.printers.length} />
          <DataStat label="Materiali" value={config.materials.length} />
          <DataStat label="Preventivi" value={quoteCount} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="secondary" onClick={exportData}>
            Esporta JSON
          </Button>
          <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
            Importa JSON
          </Button>
          <Button variant="secondary" onClick={() => updateSettings({ onboardingComplete: false })}>
            Rivedi la guida iniziale
          </Button>
          <Button
            variant="ghost"
            className="text-rose-600 hover:bg-rose-50"
            onClick={() => setResetOpen(true)}
          >
            Ripristina dati iniziali
          </Button>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Dati locali: schema v{SCHEMA_VERSION}, motore v{ENGINE_VERSION}. Svuotare i dati del
          browser cancella anche i preventivi.
        </p>
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
        <div className="space-y-3 text-sm text-slate-600">
          <p>
            L’importazione sostituisce la configurazione, i preventivi e la bozza corrente. Prima di
            procedere verrà scaricato un backup dei dati attuali.
          </p>
          {pendingImport ? (
            <div className="rounded-lg bg-slate-50 p-3 text-xs">
              <p>Stampanti: {pendingImport.config.printers.length}</p>
              <p>Materiali: {pendingImport.config.materials.length}</p>
              <p>Preventivi: {pendingImport.quotes.length}</p>
            </div>
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
        <p className="text-sm text-slate-600">
          Verranno eliminati tutti i preventivi e le personalizzazioni. Esporta un backup prima di
          continuare.
        </p>
      </Modal>
    </div>
  )
}

function DataStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2">
      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums text-slate-800">{value}</p>
    </div>
  )
}
