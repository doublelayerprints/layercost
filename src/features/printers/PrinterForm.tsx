import { useState, type FormEvent } from 'react'
import type { EnergyTariff, MaterialFamily, Printer, PowerProfile } from '@/domain/types'
import { asBasisPoints, asMicroEur, asWatts, euroToMicro } from '@/domain/units'
import { useI18n } from '@/app/i18n-context'
import { materialFamilyLabel } from '@/lib/labels'
import { Alert, Button, Toggle } from '@/components/ui'
import {
  MoneyField,
  NumberField,
  PercentField,
  SelectField,
  TextareaField,
  TextField,
} from '@/components/number-fields'

const PROFILE_FAMILIES: MaterialFamily[] = [
  'PLA',
  'PETG',
  'TPU',
  'ABS',
  'ASA',
  'PLA_CF',
  'PETG_CF',
  'PVA',
]

export function PrinterForm({
  printer,
  tariffs,
  onSave,
  onCancel,
}: {
  printer?: Printer
  tariffs: EnergyTariff[]
  onSave: (data: Omit<Printer, 'id'>) => void
  onCancel: () => void
}) {
  const { t } = useI18n()
  const [name, setName] = useState(printer?.name ?? '')
  const [model, setModel] = useState(printer?.model ?? '')
  const [purchasePrice, setPurchasePrice] = useState(printer?.purchasePrice ?? 0)
  const [residualBp, setResidualBp] = useState(printer?.residualValueBp ?? 0)
  const [expectedLifeHours, setExpectedLifeHours] = useState(printer?.expectedLifeHours ?? 3000)
  const [maintenancePerHour, setMaintenancePerHour] = useState(
    printer?.maintenancePerHour ?? euroToMicro(0.01),
  )
  const [startupMinutes, setStartupMinutes] = useState(printer?.startupMinutes ?? 5)
  const [defaultAvgWatts, setDefaultAvgWatts] = useState(printer?.defaultAvgWatts ?? 200)
  const [ratedPowerW, setRatedPowerW] = useState(printer?.ratedPowerW ?? 0)
  const [multicolor, setMulticolor] = useState(printer?.multicolor ?? false)
  const [energyTariffId, setEnergyTariffId] = useState(printer?.energyTariffId ?? '')
  const [buildVolume, setBuildVolume] = useState<[number, number, number]>(
    printer?.buildVolumeMm ?? [250, 250, 260],
  )
  const [profileWatts, setProfileWatts] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      PROFILE_FAMILIES.map((family) => [family, printer?.powerProfiles[family]?.avgWatts ?? 0]),
    ),
  )
  const [notes, setNotes] = useState(printer?.notes ?? '')
  const [error, setError] = useState<string>()

  const updateVolume = (index: number, value: number) => {
    setBuildVolume((current) => {
      const next = [...current] as [number, number, number]
      next[index] = Math.max(0, Math.round(value))
      return next
    })
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim()) {
      setError(t('printer.errorName'))
      return
    }
    if (expectedLifeHours <= 0) {
      setError(t('printer.errorLife'))
      return
    }
    if (defaultAvgWatts <= 0) {
      setError(t('printer.errorDefaultPower'))
      return
    }
    if (residualBp < 0 || residualBp > 10_000) {
      setError(t('printer.errorResidual'))
      return
    }

    const powerProfiles: Partial<Record<MaterialFamily, PowerProfile>> = {}
    for (const family of PROFILE_FAMILIES) {
      const watts = profileWatts[family] ?? 0
      if (watts > 0) {
        const existing = printer?.powerProfiles[family]
        powerProfiles[family] = {
          avgWatts: asWatts(Math.round(watts)),
          source: existing?.source ?? 'estimated',
          note: existing?.note,
        }
      }
    }

    onSave({
      name: name.trim(),
      model: model.trim() || name.trim(),
      purchasePrice: asMicroEur(purchasePrice),
      residualValueBp: asBasisPoints(residualBp),
      expectedLifeHours: Math.max(1, Math.round(expectedLifeHours)),
      maintenancePerHour: asMicroEur(maintenancePerHour),
      startupMinutes: Math.max(0, Math.round(startupMinutes)),
      multicolor,
      buildVolumeMm: buildVolume,
      ratedPowerW: Math.max(0, Math.round(ratedPowerW)),
      powerProfiles,
      defaultAvgWatts: asWatts(Math.round(defaultAvgWatts)),
      energyTariffId: energyTariffId || undefined,
      notes: notes.trim() || undefined,
      archived: printer?.archived ?? false,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error ? (
        <Alert tone="danger" title={t('printer.errorTitle')}>
          {error}
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label={t('printer.name')}
          value={name}
          onChange={setName}
          required
          placeholder={t('printer.namePlaceholder')}
        />
        <TextField
          label={t('printer.model')}
          value={model}
          onChange={setModel}
          placeholder={t('printer.modelPlaceholder')}
        />
      </div>

      <div>
        <h4 className="text-xs font-semibold text-muted">{t('printer.sectionPurchase')}</h4>
        <div className="mt-2 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MoneyField
            label={t('printer.purchasePrice')}
            valueMicro={purchasePrice}
            onChangeMicro={setPurchasePrice}
          />
          <PercentField
            label={t('printer.residualValue')}
            valueBp={residualBp}
            onChangeBp={setResidualBp}
            decimals={0}
          />
          <NumberField
            label={t('printer.lifeHours')}
            value={expectedLifeHours}
            onChange={setExpectedLifeHours}
            min={1}
            max={100_000}
            decimals={0}
            suffix="h"
          />
          <MoneyField
            label={t('printer.maintenance')}
            valueMicro={maintenancePerHour}
            onChangeMicro={setMaintenancePerHour}
            decimals={3}
            hint={t('printer.maintenanceHint')}
          />
        </div>
      </div>

      <div>
        <h4 className="text-xs font-semibold text-muted">{t('printer.sectionConsumption')}</h4>
        <div className="mt-2 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <NumberField
            label={t('printer.startupMinutes')}
            value={startupMinutes}
            onChange={setStartupMinutes}
            min={0}
            max={120}
            decimals={0}
            suffix="min"
          />
          <NumberField
            label={t('printer.defaultPower')}
            value={defaultAvgWatts}
            onChange={setDefaultAvgWatts}
            min={1}
            max={5000}
            decimals={0}
            suffix="W"
            hint={t('printer.defaultPowerHint')}
          />
          <NumberField
            label={t('printer.ratedPower')}
            value={ratedPowerW}
            onChange={setRatedPowerW}
            min={0}
            max={5000}
            decimals={0}
            suffix="W"
            hint={t('printer.ratedPowerHint')}
          />
          <SelectField
            label={t('printer.energyTariff')}
            value={energyTariffId}
            onChange={setEnergyTariffId}
            options={[
              { value: '', label: t('printer.energyTariffGlobal') },
              ...tariffs.map((tariff) => ({
                value: tariff.id,
                label: `${tariff.label} · ${new Intl.NumberFormat('it-IT', {
                  style: 'currency',
                  currency: 'EUR',
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 4,
                }).format(tariff.pricePerKWh / 1_000_000)}/kWh`,
              })),
            ]}
            hint={t('printer.energyTariffHint')}
          />
        </div>
        <div className="mt-3">
          <Toggle
            checked={multicolor}
            onChange={setMulticolor}
            label={t('printer.multicolor')}
            description={t('printer.multicolorDescription')}
          />
        </div>
      </div>

      <div>
        <h4 className="text-xs font-semibold text-muted">{t('printer.buildVolume')}</h4>
        <div className="mt-2 grid gap-4 sm:grid-cols-3">
          {(['X', 'Y', 'Z'] as const).map((axis, index) => (
            <NumberField
              key={axis}
              label={t('printer.axis', { axis })}
              value={buildVolume[index] ?? 0}
              onChange={(value) => updateVolume(index, value)}
              min={0}
              max={2000}
              decimals={0}
              suffix="mm"
            />
          ))}
        </div>
      </div>

      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-xs font-semibold text-muted">{t('printer.powerByMaterial')}</h4>
          <p className="text-xs text-muted">{t('printer.powerByMaterialHint')}</p>
        </div>
        <div className="mt-2 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PROFILE_FAMILIES.map((family) => (
            <NumberField
              key={family}
              label={materialFamilyLabel(family, t)}
              value={profileWatts[family] ?? 0}
              onChange={(value) => setProfileWatts((current) => ({ ...current, [family]: value }))}
              min={0}
              max={5000}
              decimals={0}
              suffix="W"
            />
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">{t('printer.powerProfilesHint')}</p>
      </div>

      <TextareaField
        label={t('printer.notes')}
        value={notes}
        onChange={setNotes}
        placeholder={t('printer.notesPlaceholder')}
      />

      <div className="flex items-center justify-end gap-2 border-t border-line pt-4">
        <Button variant="secondary" onClick={onCancel} type="button">
          {t('common.cancel')}
        </Button>
        <Button type="submit">{t('printer.save')}</Button>
      </div>
    </form>
  )
}
