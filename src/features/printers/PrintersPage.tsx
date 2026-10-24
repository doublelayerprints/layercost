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
    <div>
      <PageHeader
        title="Stampanti"
        description="Prezzo, vita utile, manutenzione e consumi medi. Ogni stampante può avere la sua tariffa energia."
        actions={<Button onClick={() => setEditing('new')}>Aggiungi stampante</Button>}
      />

      <div className="mt-6">
        <Alert tone="info" title="I valori di partenza sono stime">
          Prezzi di acquisto, potenze medie e ore di vita sono modificabili. Se misuri i consumi con
          una presa intelligente, puoi inserire i Wh direttamente nella riga del calcolatore.
        </Alert>
      </div>

      {printers.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="Nessuna stampante configurata"
            description="Aggiungi la tua prima stampante per iniziare a calcolare."
            action={<Button onClick={() => setEditing('new')}>Aggiungi stampante</Button>}
          />
        </div>
      ) : (
        <Card className="mt-6 divide-y divide-line">
          {printers.map((printer) => {
            const residual = Math.round((printer.purchasePrice * printer.residualValueBp) / 10_000)
            const hourly =
              (printer.purchasePrice - residual) / printer.expectedLifeHours +
              printer.maintenancePerHour
            const profiles = Object.entries(printer.powerProfiles).sort(
              ([a], [b]) =>
                Object.keys(materialFamilyLabels).indexOf(a) -
                Object.keys(materialFamilyLabels).indexOf(b),
            )
            const hasEstimates =
              profiles.length === 0 ||
              profiles.some(([, profile]) => profile?.source === 'estimated')
            const tariff = printer.energyTariffId
              ? tariffs.find((candidate) => candidate.id === printer.energyTariffId)
              : undefined

            return (
              <section key={printer.id} className="p-5 sm:p-6" aria-labelledby={`printer-${printer.id}`}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2
                        id={`printer-${printer.id}`}
                        className="text-base font-semibold text-ink"
                      >
                        {printer.name}
                      </h2>
                      {printer.multicolor ? <Badge tone="info">Multicolore</Badge> : null}
                      {printer.archived ? <Badge tone="warning">Archiviata</Badge> : null}
                      <Badge tone={hasEstimates ? 'warning' : 'success'}>
                        {hasEstimates ? 'Stime' : 'Misurata'}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-sm text-muted">{printer.model}</p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button variant="secondary" size="sm" onClick={() => setEditing(printer)}>
                      Modifica
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => archivePrinter(printer.id)}>
                      {printer.archived ? 'Ripristina' : 'Archivia'}
                    </Button>
                  </div>
                </div>

                <div className="mt-4 grid gap-x-6 gap-y-4 border-t border-line pt-4 sm:grid-cols-2 lg:grid-cols-[1.2fr_repeat(3,1fr)]">
                  <div>
                    <p className="text-xs font-medium text-muted">Usura e manutenzione</p>
                    <p className="mt-0.5 text-xl font-medium tabular-nums text-ink">
                      {formatCurrency(hourly)}
                      <span className="ml-0.5 text-sm font-normal text-muted">/h</span>
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      Ammortamento + manutenzione
                    </p>
                  </div>
                  <Metric label="Prezzo di acquisto" value={formatCurrency(printer.purchasePrice)} />
                  <Metric label="Vita utile" value={`${printer.expectedLifeHours} h`} />
                  <Metric
                    label="Manutenzione"
                    value={`${formatCurrency(printer.maintenancePerHour)}/h`}
                  />
                  <Metric label="Valore residuo" value={formatPercent(printer.residualValueBp)} />
                  <Metric label="Avvio" value={`${printer.startupMinutes} min`} />
                  <Metric
                    label="Volume"
                    value={`${printer.buildVolumeMm[0]}×${printer.buildVolumeMm[1]}×${printer.buildVolumeMm[2]} mm`}
                  />
                  <Metric label="Tariffa energia" value={tariff?.label ?? 'Globale'} />
                </div>

                <div className="mt-4 border-t border-line pt-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="text-sm font-semibold text-ink">Potenza media</h3>
                    <p className="text-xs text-muted">
                      Default {printer.defaultAvgWatts} W · Nominale {printer.ratedPowerW} W, non
                      usata nel costo
                    </p>
                  </div>
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {profiles.length === 0 ? (
                      <li className="text-sm text-muted">Nessun profilo per famiglia.</li>
                    ) : (
                      profiles.map(([family, profile]) =>
                        profile ? (
                          <li
                            key={family}
                            className="rounded-full bg-raised px-2.5 py-1 text-xs text-ink"
                            title={profile.note ?? powerSourceLabels[profile.source]}
                          >
                            {materialFamilyLabels[family as keyof typeof materialFamilyLabels]}{' '}
                            <span className="tabular-nums">{profile.avgWatts} W</span>
                          </li>
                        ) : null,
                      )
                    )}
                  </ul>
                  {printer.notes ? (
                    <p className="mt-3 text-sm text-muted">{printer.notes}</p>
                  ) : null}
                </div>
              </section>
            )
          })}
        </Card>
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

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="mt-0.5 text-sm font-medium tabular-nums text-ink">{value}</p>
    </div>
  )
}
