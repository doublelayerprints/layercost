import { useState } from 'react'
import type { Printer } from '@/domain/types'
import { useAppStore } from '@/state/app-store'
import { Alert, Badge, Button, Card, EmptyState, Modal, PageHeader } from '@/components/ui'
import { materialFamilyLabels, powerSourceLabels } from '@/lib/labels'
import { formatCurrency, formatPercent } from '@/lib/format'
import { PrinterForm } from './PrinterForm'

export function PrintersPage() {
  const config = useAppStore((state) => state.config)
  const addPrinter = useAppStore((state) => state.addPrinter)
  const updatePrinter = useAppStore((state) => state.updatePrinter)
  const archivePrinter = useAppStore((state) => state.archivePrinter)
  const [editing, setEditing] = useState<Printer | 'new' | null>(null)

  const printers = config.printers
  const tariffs = config.settings.tariffs

  const handleSave = (data: Omit<Printer, 'id'>) => {
    if (editing === 'new') {
      addPrinter(data)
    } else if (editing) {
      updatePrinter(editing.id, data)
    }
    setEditing(null)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Configurazione"
        title="Stampanti"
        description="Prezzo, vita utile, manutenzione e consumi medi. Ogni stampante può avere la sua tariffa energia."
        actions={<Button onClick={() => setEditing('new')}>Aggiungi stampante</Button>}
      />

      <Alert tone="info" title="I valori di partenza sono stime">
        Prezzi di acquisto, potenze medie e ore di vita sono modificabili. Se misuri i consumi con
        una presa intelligente, puoi inserire i Wh direttamente nella riga del calcolatore.
      </Alert>

      {printers.length === 0 ? (
        <EmptyState
          title="Nessuna stampante configurata"
          description="Aggiungi la tua prima stampante per iniziare a calcolare."
          action={<Button onClick={() => setEditing('new')}>Aggiungi stampante</Button>}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {printers.map((printer) => {
            const residual = Math.round((printer.purchasePrice * printer.residualValueBp) / 10_000)
            const hourly =
              (printer.purchasePrice - residual) / printer.expectedLifeHours +
              printer.maintenancePerHour
            const profiles = Object.entries(printer.powerProfiles)
            const hasEstimates =
              profiles.length === 0 ||
              profiles.some(([, profile]) => profile?.source === 'estimated')
            const tariff = printer.energyTariffId
              ? tariffs.find((candidate) => candidate.id === printer.energyTariffId)
              : undefined

            return (
              <Card key={printer.id} className={printer.archived ? 'opacity-70' : undefined}>
                <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-semibold text-slate-900">{printer.name}</h2>
                      {printer.multicolor ? <Badge tone="info">Multicolore</Badge> : null}
                      {printer.archived ? <Badge tone="warning">Archiviata</Badge> : null}
                      <Badge tone={hasEstimates ? 'warning' : 'success'}>
                        {hasEstimates ? 'Stime' : 'Misurata'}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{printer.model}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => setEditing(printer)}>
                      Modifica
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => archivePrinter(printer.id)}>
                      {printer.archived ? 'Ripristina' : 'Archivia'}
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3">
                  <Info label="Prezzo" value={formatCurrency(printer.purchasePrice)} />
                  <Info
                    label="Manutenzione €/h"
                    value={formatCurrency(printer.maintenancePerHour)}
                    hint={`Usura totale ${formatCurrency(hourly)}/h`}
                  />
                  <Info label="Vita utile" value={`${printer.expectedLifeHours} h`} />
                  <Info label="Residuo" value={formatPercent(printer.residualValueBp)} />
                  <Info label="Avvio" value={`${printer.startupMinutes} min`} />
                  <Info
                    label="Volume"
                    value={`${printer.buildVolumeMm[0]}×${printer.buildVolumeMm[1]}×${printer.buildVolumeMm[2]} mm`}
                  />
                </div>

                <div className="border-t border-slate-100 p-4">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                    Potenza media
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {profiles.length === 0 ? (
                      <span className="text-xs text-slate-500">
                        Default {printer.defaultAvgWatts} W
                      </span>
                    ) : (
                      profiles
                        .sort(
                          ([a], [b]) =>
                            Object.keys(materialFamilyLabels).indexOf(a) -
                            Object.keys(materialFamilyLabels).indexOf(b),
                        )
                        .map(([family, profile]) =>
                          profile ? (
                            <span
                              key={family}
                              className="rounded-full bg-slate-100 px-2 py-1 text-[11px] text-slate-600"
                              title={profile.note ?? powerSourceLabels[profile.source]}
                            >
                              {materialFamilyLabels[family as keyof typeof materialFamilyLabels]}{' '}
                              {profile.avgWatts} W
                            </span>
                          ) : null,
                        )
                    )}
                  </div>
                  <p className="mt-2 text-[11px] text-slate-500">
                    Default: {printer.defaultAvgWatts} W · Nominale {printer.ratedPowerW} W (non
                    usata nel costo) · Tariffa {tariff?.label ?? 'globale'}
                  </p>
                  {printer.notes ? (
                    <p className="mt-2 text-xs text-slate-500">{printer.notes}</p>
                  ) : null}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'Nuova stampante' : 'Modifica stampante'}
        size="lg"
      >
        <PrinterForm
          printer={editing && editing !== 'new' ? editing : undefined}
          tariffs={tariffs}
          onSave={handleSave}
          onCancel={() => setEditing(null)}
        />
      </Modal>
    </div>
  )
}

function Info({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-slate-800">{value}</p>
      {hint ? <p className="text-[11px] text-slate-500">{hint}</p> : null}
    </div>
  )
}
