import { useState } from 'react'
import type { Printer } from '@/domain/types'
import { useAppStore } from '@/state/app-store'
import { useI18n } from '@/app/i18n-context'
import { useFormat } from '@/app/use-format'
import { Alert, Badge, Button, Card, EmptyState, Modal, PageHeader } from '@/components/ui'
import { materialFamilyLabel, materialFamilyLabels, powerSourceLabel } from '@/lib/labels'
import { PrinterForm } from './PrinterForm'

export function PrintersPage() {
  const { t } = useI18n()
  const format = useFormat()
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
        title={t('nav.printers')}
        description={t('printers.description')}
        actions={<Button onClick={() => setEditing('new')}>{t('printers.add')}</Button>}
      />

      <div className="mt-6">
        <Alert tone="info" title={t('printers.estimatesTitle')}>
          {t('printers.estimatesBody')}
        </Alert>
      </div>

      {printers.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title={t('printers.emptyTitle')}
            description={t('printers.emptyBody')}
            action={<Button onClick={() => setEditing('new')}>{t('printers.add')}</Button>}
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
              <section
                key={printer.id}
                className="p-5 sm:p-6"
                aria-labelledby={`printer-${printer.id}`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 id={`printer-${printer.id}`} className="text-base font-semibold text-ink">
                        {printer.name}
                      </h2>
                      {printer.multicolor ? (
                        <Badge tone="info">{t('printer.badgeMulticolor')}</Badge>
                      ) : null}
                      {printer.archived ? (
                        <Badge tone="warning">{t('printer.badgeArchived')}</Badge>
                      ) : null}
                      <Badge tone={hasEstimates ? 'warning' : 'success'}>
                        {hasEstimates ? t('printer.badgeEstimated') : t('printer.badgeMeasured')}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-sm text-muted">{printer.model}</p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button variant="secondary" size="sm" onClick={() => setEditing(printer)}>
                      {t('printers.edit')}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => archivePrinter(printer.id)}>
                      {printer.archived ? t('printers.restore') : t('printers.archive')}
                    </Button>
                  </div>
                </div>

                <div className="mt-4 grid gap-x-6 gap-y-4 border-t border-line pt-4 sm:grid-cols-2 lg:grid-cols-[1.2fr_repeat(3,1fr)]">
                  <div>
                    <p className="text-xs font-medium text-muted">{t('printer.wear')}</p>
                    <p className="mt-0.5 text-xl font-medium tabular-nums text-ink">
                      {format.currency(hourly)}
                      <span className="ml-0.5 text-sm font-normal text-muted">/h</span>
                    </p>
                    <p className="mt-0.5 text-xs text-muted">{t('printer.wearHint')}</p>
                  </div>
                  <Metric
                    label={t('printer.purchasePrice')}
                    value={format.currency(printer.purchasePrice)}
                  />
                  <Metric label={t('printer.lifeHours')} value={`${printer.expectedLifeHours} h`} />
                  <Metric
                    label={t('printer.maintenance')}
                    value={`${format.currency(printer.maintenancePerHour)}/h`}
                  />
                  <Metric
                    label={t('printer.residualValue')}
                    value={format.percent(printer.residualValueBp)}
                  />
                  <Metric label={t('printer.startup')} value={`${printer.startupMinutes} min`} />
                  <Metric
                    label={t('printer.volume')}
                    value={`${printer.buildVolumeMm[0]}×${printer.buildVolumeMm[1]}×${printer.buildVolumeMm[2]} mm`}
                  />
                  <Metric
                    label={t('printer.energyTariff')}
                    value={tariff?.label ?? t('printer.tariffGlobal')}
                  />
                </div>

                <div className="mt-4 border-t border-line pt-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="text-sm font-semibold text-ink">{t('printer.powerSection')}</h3>
                    <p className="text-xs text-muted">
                      {t('printer.powerSummary', {
                        default: printer.defaultAvgWatts,
                        rated: printer.ratedPowerW,
                      })}
                    </p>
                  </div>
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {profiles.length === 0 ? (
                      <li className="text-sm text-muted">{t('printer.noProfiles')}</li>
                    ) : (
                      profiles.map(([family, profile]) =>
                        profile ? (
                          <li
                            key={family}
                            className="rounded-full bg-raised px-2.5 py-1 text-xs text-ink"
                            title={profile.note ?? powerSourceLabel(profile.source, t)}
                          >
                            {materialFamilyLabel(family as keyof typeof materialFamilyLabels, t)}{' '}
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
        title={editing === 'new' ? t('printer.newTitle') : t('printer.editTitle')}
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
