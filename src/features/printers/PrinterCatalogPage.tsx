import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { MessageKey } from '@/i18n'
import { plural } from '@/i18n'
import { useI18n } from '@/app/i18n-context'
import { useFormat } from '@/app/use-format'
import { useAppStore } from '@/state/app-store'
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  PageHeader,
  Select,
} from '@/components/ui'
import { buttonClassName } from '@/components/button-styles'
import {
  CATALOG_REVIEWED_AT,
  PRINTER_BRANDS,
  PRINTER_CATALOG,
  catalogEntryToPrinter,
  filterCatalogEntries,
  isCatalogEntryAdded,
  type BrandFilter,
  type CatalogConfidence,
  type CatalogSource,
  type PrinterCatalogEntry,
} from '@/data/printer-catalog'

const sourceKeys: Record<CatalogSource, MessageKey> = {
  official: 'printerCatalog.sourceOfficial',
  retailer: 'printerCatalog.sourceRetailer',
  aggregator: 'printerCatalog.sourceAggregator',
}

const confidenceKeys: Record<CatalogConfidence, MessageKey> = {
  high: 'printerCatalog.confidenceHigh',
  medium: 'printerCatalog.confidenceMedium',
  low: 'printerCatalog.confidenceLow',
}

/**
 * Lazy-loaded catalog of ready-made printer profiles. Entries are copies: the
 * added printer is a normal editable printer, and the catalog stays read-only.
 */
export function PrinterCatalogPage() {
  const { t, locale } = useI18n()
  const printers = useAppStore((state) => state.config.printers)
  const addPrinter = useAppStore((state) => state.addPrinter)
  const [query, setQuery] = useState('')
  const [brand, setBrand] = useState<BrandFilter>('all')
  const [addedName, setAddedName] = useState<string | null>(null)

  const visibleEntries = useMemo(
    () => filterCatalogEntries(PRINTER_CATALOG, query, brand),
    [query, brand],
  )
  const filtersActive = query.trim() !== '' || brand !== 'all'

  const handleAdd = (entry: PrinterCatalogEntry) => {
    addPrinter(catalogEntryToPrinter(entry, locale))
    setAddedName(entry.name)
  }

  const resetFilters = () => {
    setQuery('')
    setBrand('all')
  }

  return (
    <div>
      <PageHeader
        title={t('printerCatalog.title')}
        description={t('printerCatalog.description')}
        actions={
          <Link to="/printers" className={buttonClassName({ variant: 'secondary' })}>
            {t('printerCatalog.back')}
          </Link>
        }
      />

      {addedName ? (
        <div role="status" className="mt-6">
          <Alert
            tone="success"
            title={t('printerCatalog.addedTitle', { name: addedName })}
            onClose={() => setAddedName(null)}
          >
            <p>{t('printerCatalog.addedBody')}</p>
            <Link
              to="/printers"
              className="mt-2 inline-block font-medium text-data underline underline-offset-2"
            >
              {t('printerCatalog.goToPrinters')}
            </Link>
          </Alert>
        </div>
      ) : null}

      <div className="mt-6">
        <Alert tone="info" title={t('printerCatalog.estimatesTitle')}>
          <p>{t('printerCatalog.estimatesBody')}</p>
          <p className="mt-1">{t('printerCatalog.seedNote')}</p>
        </Alert>
      </div>

      <Card className="mt-6 p-4">
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_14rem]">
          <Field label={t('printerCatalog.search')} htmlFor="catalog-search">
            <Input
              id="catalog-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('printerCatalog.searchPlaceholder')}
              autoComplete="off"
            />
          </Field>
          <Field label={t('printerCatalog.brand')} htmlFor="catalog-brand">
            <Select
              id="catalog-brand"
              value={brand}
              onValueChange={(value) => setBrand(value as BrandFilter)}
            >
              <option value="all">{t('printerCatalog.allBrands')}</option>
              {PRINTER_BRANDS.map((brandName) => (
                <option key={brandName} value={brandName}>
                  {brandName}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p aria-live="polite" className="text-sm text-muted">
            {plural(locale, visibleEntries.length, {
              one: 'printerCatalog.results.one',
              other: 'printerCatalog.results.other',
            })}
          </p>
          {filtersActive ? (
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              {t('printerCatalog.reset')}
            </Button>
          ) : null}
        </div>
      </Card>

      {visibleEntries.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title={t('printerCatalog.emptyTitle')}
            description={t('printerCatalog.emptyBody')}
            action={
              <Button variant="secondary" onClick={resetFilters}>
                {t('printerCatalog.reset')}
              </Button>
            }
          />
        </div>
      ) : (
        <ul className="mt-6 grid list-none gap-4 p-0 lg:grid-cols-2">
          {visibleEntries.map((entry) => (
            <CatalogCard
              key={entry.id}
              entry={entry}
              present={isCatalogEntryAdded(printers, entry)}
              onAdd={() => handleAdd(entry)}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

function CatalogCard({
  entry,
  present,
  onAdd,
}: {
  entry: PrinterCatalogEntry
  present: boolean
  onAdd: () => void
}) {
  const { t, locale } = useI18n()
  const format = useFormat()
  const headingId = `catalog-${entry.id}`
  const [width, depth, height] = entry.buildVolumeMm

  return (
    <li className="flex">
      <Card className="flex w-full flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">{entry.brand}</p>
            <h2 id={headingId} className="mt-0.5 text-base font-semibold text-ink">
              {entry.name}
            </h2>
            <p className="mt-0.5 text-xs text-muted">{entry.model}</p>
          </div>
          {present ? <Badge tone="success">{t('printerCatalog.present')}</Badge> : null}
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {entry.multicolor ? (
            <Badge tone="info">{t('printerCatalog.multicolorIncluded')}</Badge>
          ) : entry.multicolorReady ? (
            <Badge tone="neutral">{t('printerCatalog.multicolorOptional')}</Badge>
          ) : null}
          {entry.enclosed ? <Badge tone="neutral">{t('printerCatalog.enclosed')}</Badge> : null}
          {entry.confidence === 'low' ? (
            <Badge tone="warning">{t('printerCatalog.confidenceLow')}</Badge>
          ) : null}
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-3">
          <div>
            <dt className="text-xs font-medium text-muted">{t('printerCatalog.price')}</dt>
            <dd className="mt-0.5 text-sm font-medium tabular-nums text-ink">
              {format.currency(entry.purchasePrice)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted">{t('printerCatalog.volume')}</dt>
            <dd className="mt-0.5 text-sm font-medium tabular-nums text-ink">
              {width}×{depth}×{height} mm
            </dd>
          </div>
        </dl>

        <details className="mt-3 border-t border-line pt-3">
          <summary className="cursor-pointer text-sm font-medium text-data">
            {t('printerCatalog.details')}
          </summary>
          <div className="mt-3 space-y-2 text-sm text-muted">
            <ul className="grid list-none grid-cols-2 gap-1.5 p-0">
              <PowerItem label={t('printerCatalog.powerPla')} watts={entry.avgWatts.PLA} />
              <PowerItem label={t('printerCatalog.powerPetg')} watts={entry.avgWatts.PETG} />
              <PowerItem label={t('printerCatalog.powerAbs')} watts={entry.avgWatts.ABS} />
              <PowerItem label={t('printerCatalog.powerAsa')} watts={entry.avgWatts.ASA} />
              <PowerItem label={t('printerCatalog.powerDefault')} watts={entry.avgWatts.default} />
            </ul>
            <p>
              {t('printerCatalog.ratedPower')}:{' '}
              <span className="tabular-nums">{entry.ratedPowerW} W</span>
            </p>
            <p>{entry.notes[locale]}</p>
            <p className="text-xs">
              {t('printerCatalog.meta', {
                source: t(sourceKeys[entry.source]),
                date: format.dateOnly(CATALOG_REVIEWED_AT),
                confidence: t(confidenceKeys[entry.confidence]),
              })}
            </p>
          </div>
        </details>

        <div className="mt-auto pt-4">
          <Button onClick={onAdd} aria-describedby={headingId}>
            {present
              ? t('printerCatalog.addAnotherNamed', { name: entry.name })
              : t('printerCatalog.addNamed', { name: entry.name })}
          </Button>
        </div>
      </Card>
    </li>
  )
}

function PowerItem({ label, watts }: { label: string; watts: number }) {
  return (
    <li className="flex items-baseline justify-between gap-2 rounded-control bg-raised px-2 py-1">
      <span className="text-xs text-muted">{label}</span>
      <span className="text-xs font-medium tabular-nums text-ink">{watts} W</span>
    </li>
  )
}
