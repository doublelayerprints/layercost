import { Fragment, useState } from 'react'
import type { EnergyTariff, MaterialFamily, PowerProfile, Printer } from '@/domain/types'
import { useI18n } from '@/app/i18n-context'
import { useFormat } from '@/app/use-format'
import { Badge, Button, ChevronDown, Table } from '@/components/ui'
import { cn } from '@/lib/cn'
import { materialFamilyLabel, materialFamilyLabels, powerSourceLabel } from '@/lib/labels'

interface PrinterRow {
  printer: Printer
  hourly: number
  profiles: Array<readonly [MaterialFamily, PowerProfile]>
  hasEstimates: boolean
  tariff?: EnergyTariff
}

interface PrinterListProps {
  printers: Printer[]
  tariffs: EnergyTariff[]
  onEdit: (printer: Printer) => void
  onArchive: (printer: Printer) => void
}

interface RowProps {
  rows: PrinterRow[]
  expanded: Set<string>
  onToggle: (id: string) => void
  onEdit: (printer: Printer) => void
  onArchive: (printer: Printer) => void
}

const familyOrder = Object.keys(materialFamilyLabels) as MaterialFamily[]

/**
 * Compact printer list: a real table on wide screens and separate cards below
 * 1280 px. Both views share the same expandable detail content and state.
 */
export function PrinterList({ printers, tariffs, onEdit, onArchive }: PrinterListProps) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set())

  const rows = printers.map((printer) => {
    const residual = Math.round((printer.purchasePrice * printer.residualValueBp) / 10_000)
    const hourly =
      (printer.purchasePrice - residual) / printer.expectedLifeHours + printer.maintenancePerHour
    const profiles = familyOrder
      .map((family) => [family, printer.powerProfiles[family]] as const)
      .filter((entry): entry is readonly [MaterialFamily, PowerProfile] => entry[1] !== undefined)
    const hasEstimates =
      profiles.length === 0 || profiles.some(([, profile]) => profile.source === 'estimated')
    const tariff = printer.energyTariffId
      ? tariffs.find((candidate) => candidate.id === printer.energyTariffId)
      : undefined

    return { printer, hourly, profiles, hasEstimates, tariff }
  })

  const toggle = (id: string) => {
    setExpanded((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const shared = { rows, expanded, onToggle: toggle, onEdit, onArchive }

  return (
    <>
      <PrinterTable {...shared} />
      <PrinterCards {...shared} />
    </>
  )
}

function PrinterTable({ rows, expanded, onToggle, onEdit, onArchive }: RowProps) {
  const { t } = useI18n()
  const format = useFormat()

  return (
    <Table
      label={t('printers.tableLabel')}
      containerClassName="hidden border-y border-line xl:block"
    >
      <caption className="sr-only">{t('printers.tableLabel')}</caption>
      <thead>
        <tr className="text-xs text-muted">
          <th scope="col" className="py-2 pl-4 pr-4 text-left font-medium">
            {t('printers.colPrinter')}
          </th>
          <th scope="col" className="py-2 pr-4 text-right font-medium">
            {t('printers.colPrice')}
          </th>
          <th scope="col" className="py-2 pr-4 text-right font-medium">
            {t('printers.colWear')}
          </th>
          <th scope="col" className="py-2 pr-4 text-right font-medium">
            {t('printers.colVolume')}
          </th>
          <th scope="col" className="py-2 pr-4 text-right font-medium">
            {t('printers.colActions')}
          </th>
          <th scope="col" className="py-2 pr-4 text-right font-medium">
            {t('printers.details')}
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const open = expanded.has(row.printer.id)
          const panelId = `printer-table-details-${row.printer.id}`

          return (
            <Fragment key={row.printer.id}>
              <tr
                className={cn(
                  'border-t border-rule align-middle transition-feedback hover:bg-raised',
                  open && 'bg-raised',
                )}
              >
                <th scope="row" className="py-3 pl-4 pr-4 text-left font-normal">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-ink">{row.printer.name}</span>
                    <PrinterBadges printer={row.printer} hasEstimates={row.hasEstimates} />
                  </div>
                  <p className="mt-0.5 text-xs text-muted">{row.printer.model}</p>
                </th>
                <td className="py-3 pr-4 text-right font-medium tabular-nums text-ink">
                  {format.currency(row.printer.purchasePrice)}
                </td>
                <td
                  className="py-3 pr-4 text-right tabular-nums text-ink"
                  title={t('printer.wearHint')}
                >
                  {format.currency(row.hourly)}
                  <span className="text-xs font-normal text-muted">/h</span>
                </td>
                <td className="py-3 pr-4 text-right tabular-nums text-muted">
                  {row.printer.buildVolumeMm.join('×')} mm
                </td>
                <td className="py-3 pr-4 text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="secondary" size="sm" onClick={() => onEdit(row.printer)}>
                      {t('printers.edit')}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => onArchive(row.printer)}>
                      {row.printer.archived ? t('printers.restore') : t('printers.archive')}
                    </Button>
                  </div>
                </td>
                <td className="py-3 pr-4 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-expanded={open}
                    aria-controls={panelId}
                    onClick={() => onToggle(row.printer.id)}
                  >
                    {t('printers.details')}
                    <span className="sr-only"> {row.printer.name}</span>
                    <ChevronDown open={open} />
                  </Button>
                </td>
              </tr>
              <tr id={panelId} hidden={!open} className="border-t border-rule bg-raised">
                <td colSpan={6} className="px-4 pb-4">
                  <PrinterDetails row={row} />
                </td>
              </tr>
            </Fragment>
          )
        })}
      </tbody>
    </Table>
  )
}

function PrinterCards({ rows, expanded, onToggle, onEdit, onArchive }: RowProps) {
  const { t } = useI18n()
  const format = useFormat()

  return (
    <ul className="grid list-none gap-3 p-0 xl:hidden">
      {rows.map((row) => {
        const open = expanded.has(row.printer.id)
        const panelId = `printer-card-details-${row.printer.id}`

        return (
          <li key={row.printer.id} className="rounded-card border border-line bg-surface">
            <div className="flex items-start gap-3 p-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-semibold text-ink">{row.printer.name}</h2>
                  <PrinterBadges printer={row.printer} hasEstimates={row.hasEstimates} />
                </div>
                <p className="mt-0.5 text-xs text-muted">
                  {row.printer.model} · {row.printer.buildVolumeMm.join('×')} mm
                </p>
                <dl className="mt-2 grid max-w-md grid-cols-2 gap-x-4 gap-y-3">
                  <div>
                    <dt className="text-xs font-medium text-muted">{t('printers.colWear')}</dt>
                    <dd
                      className="mt-0.5 whitespace-nowrap text-sm font-medium tabular-nums text-ink"
                      title={t('printer.wearHint')}
                    >
                      {format.currency(row.hourly)}
                      <span className="text-xs font-normal text-muted">/h</span>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-muted">{t('printers.colPrice')}</dt>
                    <dd className="mt-0.5 whitespace-nowrap text-sm font-medium tabular-nums text-ink">
                      {format.currency(row.printer.purchasePrice)}
                    </dd>
                  </div>
                </dl>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="shrink-0"
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => onToggle(row.printer.id)}
              >
                {t('printers.details')}
                <span className="sr-only"> {row.printer.name}</span>
                <ChevronDown open={open} />
              </Button>
            </div>
            <div id={panelId} hidden={!open} className="border-t border-line bg-raised px-4 pb-4">
              <PrinterDetails row={row} />
              <div className="mt-4 flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => onEdit(row.printer)}>
                  {t('printers.edit')}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => onArchive(row.printer)}>
                  {row.printer.archived ? t('printers.restore') : t('printers.archive')}
                </Button>
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

function PrinterBadges({ printer, hasEstimates }: { printer: Printer; hasEstimates: boolean }) {
  const { t } = useI18n()

  return (
    <>
      {printer.multicolor ? <Badge tone="info">{t('printer.badgeMulticolor')}</Badge> : null}
      {printer.archived ? <Badge tone="warning">{t('printer.badgeArchived')}</Badge> : null}
      <Badge tone={hasEstimates ? 'warning' : 'success'}>
        {hasEstimates ? t('printer.badgeEstimated') : t('printer.badgeMeasured')}
      </Badge>
    </>
  )
}

function PrinterDetails({ row }: { row: PrinterRow }) {
  const { t } = useI18n()
  const format = useFormat()
  const { printer, profiles, tariff } = row

  return (
    <div className="space-y-4 pt-4">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 xl:grid-cols-5">
        <Metric
          label={t('printer.residualValue')}
          value={format.percent(printer.residualValueBp)}
        />
        <Metric label={t('printer.lifeHours')} value={`${printer.expectedLifeHours} h`} />
        <Metric
          label={t('printer.maintenance')}
          value={`${format.currency(printer.maintenancePerHour)}/h`}
        />
        <Metric label={t('printer.startup')} value={`${printer.startupMinutes} min`} />
        <Metric
          label={t('printer.energyTariff')}
          value={tariff?.label ?? t('printer.tariffGlobal')}
        />
      </dl>

      <div className="border-t border-line pt-3">
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
            profiles.map(([family, profile]) => (
              <li
                key={family}
                className="rounded-full bg-surface px-2.5 py-1 text-xs text-ink"
                title={profile.note ?? powerSourceLabel(profile.source, t)}
              >
                {materialFamilyLabel(family, t)}{' '}
                <span className="tabular-nums">{profile.avgWatts} W</span>
              </li>
            ))
          )}
        </ul>
        {printer.notes ? <p className="mt-3 text-sm text-muted">{printer.notes}</p> : null}
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium tabular-nums text-ink">{value}</dd>
    </div>
  )
}
