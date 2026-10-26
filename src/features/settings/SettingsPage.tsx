import { useRef, useState } from 'react'
import { useI18n } from '@/app/i18n-context'
import { useFormat } from '@/app/use-format'
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
import { useLocaleStore } from '@/state/locale-store'
import { ExportXlsxButton } from '@/features/quotes/ExportXlsxButton'
import type { ThemePreference } from '@/lib/theme'
import type { Locale } from '@/i18n'
import { storageErrorMessage } from '@/lib/storage-error-message'

const SAMPLE_COST = asMicroEur(5_000_000)

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
  const { t } = useI18n()
  const format = useFormat()
  const config = useAppStore((state) => state.config)
  const quoteCount = useAppStore((state) => state.quotes.length)
  const updateSettings = useAppStore((state) => state.updateSettings)
  const exportData = useAppStore((state) => state.exportData)
  const importData = useAppStore((state) => state.importData)
  const reset = useAppStore((state) => state.reset)
  const themePreference = useThemeStore((state) => state.preference)
  const setThemePreference = useThemeStore((state) => state.setPreference)
  const locale = useLocaleStore((state) => state.locale)
  const setLocale = useLocaleStore((state) => state.setLocale)
  const adoptLocale = useAppStore((state) => state.adoptLocale)

  const settings = config.settings
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pendingImport, setPendingImport] = useState<AppData>()
  const [importError, setImportError] = useState<string>()
  const [importOpen, setImportOpen] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const [message, setMessage] = useState<string>()

  const languageOptions: Array<{ value: Locale; label: string; description: string }> = [
    {
      value: 'it',
      label: t('settings.languageIt'),
      description: t('settings.languageItDescription'),
    },
    {
      value: 'en',
      label: t('settings.languageEn'),
      description: t('settings.languageEnDescription'),
    },
  ]

  const changeLocale = (next: Locale) => {
    setLocale(next)
    adoptLocale(next)
  }

  const themeOptions: Array<{ value: ThemePreference; label: string; description: string }> = [
    {
      value: 'system',
      label: t('settings.themeSystem'),
      description: t('settings.themeSystemDescription'),
    },
    {
      value: 'light',
      label: t('settings.themeLight'),
      description: t('settings.themeLightDescription'),
    },
    {
      value: 'dark',
      label: t('settings.themeDark'),
      description: t('settings.themeDarkDescription'),
    },
  ]

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    setImportError(undefined)
    setMessage(undefined)
    try {
      const data = await localRepository.import(file)
      setPendingImport(data)
      setImportOpen(true)
    } catch (error) {
      setImportError(storageErrorMessage(error, t) ?? t('settings.importFailed'))
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
    setMessage(t('settings.importSuccess'))
  }

  const confirmReset = () => {
    reset()
    setResetOpen(false)
    setMessage(t('settings.resetSuccess'))
  }

  const isMarkup = settings.pricingMode === 'markup'
  const preview = samplePrice(settings)

  return (
    <div>
      <PageHeader title={t('nav.settings')} description={t('settings.pageDescription')} />

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(event) => void handleFile(event.target.files?.[0])}
      />

      {message ? (
        <div className="mt-6">
          <Alert
            tone="success"
            title={t('settings.doneTitle')}
            onClose={() => setMessage(undefined)}
          >
            {message}
          </Alert>
        </div>
      ) : null}
      {importError ? (
        <div className="mt-6">
          <Alert
            tone="danger"
            title={t('settings.importFailedTitle')}
            onClose={() => setImportError(undefined)}
          >
            {importError}
          </Alert>
        </div>
      ) : null}

      <p className="mt-4 text-sm text-muted">{t('settings.autosaveHint')}</p>

      <Card className="mt-6 divide-y divide-line">
        <section
          className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)] lg:gap-10"
          aria-labelledby="settings-lavoro"
        >
          <div>
            <h2 id="settings-lavoro" className="text-base font-semibold text-ink">
              {t('settings.laborTitle')}
            </h2>
            <p className="mt-1 text-sm leading-snug text-muted">{t('settings.laborDescription')}</p>
            <p className="mt-3 text-xs leading-relaxed text-muted">
              {t('settings.currentSummary', {
                labor: format.currency(settings.laborRatePerHour),
                failure: format.percent(settings.failureRateBp),
                overhead: format.percent(settings.timeOverheadBp),
                allocation:
                  settings.allocationMode === 'proportional'
                    ? t('settings.allocationProportionalShort')
                    : t('settings.allocationEqualPerUnitShort'),
              })}
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <MoneyField
              label={t('settings.laborRate')}
              valueMicro={settings.laborRatePerHour}
              onChangeMicro={(value) => updateSettings({ laborRatePerHour: value })}
              decimals={2}
              hint="€/h"
            />
            <PercentField
              label={t('settings.failureRate')}
              valueBp={settings.failureRateBp}
              onChangeBp={(value) => updateSettings({ failureRateBp: value })}
              decimals={1}
              max={50}
              hint={t('settings.failureRateHint')}
            />
            <PercentField
              label={t('settings.timeOverhead')}
              valueBp={settings.timeOverheadBp}
              onChangeBp={(value) => updateSettings({ timeOverheadBp: value })}
              decimals={1}
              max={100}
              hint={t('settings.timeOverheadHint')}
            />
            <SelectField
              label={t('settings.allocationLabel')}
              value={settings.allocationMode}
              onChange={(value) =>
                updateSettings({ allocationMode: value as typeof settings.allocationMode })
              }
              options={[
                { value: 'proportional', label: t('settings.allocationProportional') },
                { value: 'equalPerUnit', label: t('settings.allocationEqualPerUnit') },
              ]}
              hint={t('settings.allocationHint')}
            />
          </div>
        </section>

        <section
          className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)] lg:gap-10"
          aria-labelledby="settings-prezzo"
        >
          <div>
            <h2 id="settings-prezzo" className="text-base font-semibold text-ink">
              {t('settings.pricingTitle')}
            </h2>
            <p className="mt-1 text-sm leading-snug text-muted">
              {t('settings.pricingDescription')}
            </p>
            {preview ? (
              <div className="mt-4 border-l-2 border-data pl-3">
                <p className="text-xs font-medium text-muted">
                  {t('settings.pricingExampleTitle')}
                </p>
                <p className="mt-1 text-sm leading-snug text-ink">
                  {t('settings.pricingExamplePrefix', { cost: format.currency(SAMPLE_COST) })}{' '}
                  <span className="font-medium tabular-nums">
                    {format.cents(preview.netPriceCents)}
                  </span>{' '}
                  {t('settings.pricingExampleNet')}
                  {preview.vatCents > 0
                    ? ` ${t('settings.pricingExampleWithVat', {
                        gross: format.cents(preview.grossPriceCents),
                        vat: format.percent(settings.vatRateBp),
                      })}`
                    : t('settings.pricingExampleWithoutVat')}
                </p>
              </div>
            ) : null}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              label={t('settings.pricingModeLabel')}
              value={settings.pricingMode}
              onChange={(value) =>
                updateSettings({ pricingMode: value as typeof settings.pricingMode })
              }
              options={[
                { value: 'markup', label: t('settings.pricingModeMarkup') },
                { value: 'margin', label: t('settings.pricingModeMargin') },
              ]}
            />
            <PercentField
              label={isMarkup ? t('settings.markup') : t('settings.margin')}
              valueBp={isMarkup ? settings.markupBp : settings.marginBp}
              onChangeBp={(value) =>
                updateSettings(isMarkup ? { markupBp: value } : { marginBp: value })
              }
              decimals={1}
              max={isMarkup ? 1000 : 99}
            />
            <SelectField
              label={t('settings.roundingMode')}
              value={settings.roundingMode}
              onChange={(value) =>
                updateSettings({ roundingMode: value as typeof settings.roundingMode })
              }
              options={[
                { value: 'up', label: t('settings.roundingUp') },
                { value: 'nearest', label: t('settings.roundingNearest') },
                { value: 'down', label: t('settings.roundingDown') },
              ]}
            />
            <MoneyField
              label={t('settings.roundingStep')}
              valueMicro={settings.roundingStep}
              onChangeMicro={(value) => updateSettings({ roundingStep: value })}
              decimals={2}
            />
            <SelectField
              label={t('settings.vatMode')}
              value={settings.vatMode}
              onChange={(value) => updateSettings({ vatMode: value as typeof settings.vatMode })}
              options={[
                { value: 'none', label: t('settings.vatNone') },
                { value: 'excluded', label: t('settings.vatExcluded') },
                { value: 'included', label: t('settings.vatIncluded') },
              ]}
            />
            {settings.vatMode !== 'none' ? (
              <PercentField
                label={t('settings.vatRate')}
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
          aria-labelledby="settings-lingua"
        >
          <div>
            <h2 id="settings-lingua" className="text-base font-semibold text-ink">
              {t('settings.languageTitle')}
            </h2>
            <p className="mt-1 text-sm leading-snug text-muted">
              {t('settings.languageDescription')}
            </p>
          </div>
          <fieldset>
            <legend className="sr-only">{t('settings.languageLegend')}</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {languageOptions.map((option) => (
                <label
                  key={option.value}
                  className="flex cursor-pointer items-start gap-2.5 rounded-control border border-line bg-surface p-3 transition-feedback has-[:checked]:border-data has-[:checked]:bg-raised"
                >
                  <input
                    type="radio"
                    name="locale-preference"
                    value={option.value}
                    checked={locale === option.value}
                    onChange={() => changeLocale(option.value)}
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
            <p className="mt-2 text-xs text-muted">{t('settings.languageHint')}</p>
          </fieldset>
        </section>

        <section
          className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)] lg:gap-10"
          aria-labelledby="settings-aspetto"
        >
          <div>
            <h2 id="settings-aspetto" className="text-base font-semibold text-ink">
              {t('settings.appearanceTitle')}
            </h2>
            <p className="mt-1 text-sm leading-snug text-muted">
              {t('settings.appearanceDescription')}
            </p>
          </div>
          <fieldset>
            <legend className="sr-only">{t('settings.themeLegend')}</legend>
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
            <p className="mt-2 text-xs text-muted">{t('settings.themeSystemHint')}</p>
          </fieldset>
        </section>

        <section
          className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)] lg:gap-10"
          aria-labelledby="settings-dati"
        >
          <div>
            <h2 id="settings-dati" className="text-base font-semibold text-ink">
              {t('settings.dataTitle')}
            </h2>
            <p className="mt-1 text-sm leading-snug text-muted">{t('settings.dataDescription')}</p>
            <p className="mt-2 text-xs text-muted">
              {t('settings.schemaEngineVersion', {
                schema: SCHEMA_VERSION,
                engine: ENGINE_VERSION,
              })}
            </p>
          </div>
          <div>
            <dl className="grid grid-cols-3 gap-4 border-b border-line pb-4">
              <div>
                <dt className="text-xs font-medium text-muted">{t('nav.printers')}</dt>
                <dd className="mt-0.5 text-xl font-medium tabular-nums text-ink">
                  {config.printers.length}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted">{t('nav.materials')}</dt>
                <dd className="mt-0.5 text-xl font-medium tabular-nums text-ink">
                  {config.materials.length}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted">{t('nav.quotes')}</dt>
                <dd className="mt-0.5 text-xl font-medium tabular-nums text-ink">{quoteCount}</dd>
              </div>
            </dl>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="secondary" onClick={exportData}>
                {t('settings.exportJson')}
              </Button>
              <ExportXlsxButton />
              <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
                {t('settings.importJson')}
              </Button>
              <Button variant="ghost" onClick={() => updateSettings({ onboardingComplete: false })}>
                {t('settings.reviewOnboarding')}
              </Button>
            </div>

            <div className="mt-6 border-t border-line pt-4">
              <h3 className="text-sm font-semibold text-ink">{t('settings.resetHeading')}</h3>
              <p className="mt-0.5 max-w-xl text-sm leading-snug text-muted">
                {t('settings.resetDescription')}
              </p>
              <Button
                variant="ghost"
                className="mt-2 text-negative hover:bg-raised"
                onClick={() => setResetOpen(true)}
              >
                {t('settings.resetAction')}
              </Button>
            </div>
          </div>
        </section>
      </Card>

      <Modal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title={t('settings.importModalTitle')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setImportOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={confirmImport}>{t('settings.importConfirm')}</Button>
          </>
        }
      >
        <div className="space-y-3 text-sm text-muted">
          <p>{t('settings.importModalDescription')}</p>
          {pendingImport ? (
            <dl className="grid grid-cols-3 gap-3 border-y border-line py-3">
              <div>
                <dt className="text-xs font-medium text-muted">{t('nav.printers')}</dt>
                <dd className="mt-0.5 text-base tabular-nums text-ink">
                  {pendingImport.config.printers.length}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted">{t('nav.materials')}</dt>
                <dd className="mt-0.5 text-base tabular-nums text-ink">
                  {pendingImport.config.materials.length}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted">{t('nav.quotes')}</dt>
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
        title={t('settings.resetModalTitle')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setResetOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button variant="danger" onClick={confirmReset}>
              {t('settings.resetConfirm')}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">{t('settings.resetModalDescription')}</p>
      </Modal>
    </div>
  )
}
