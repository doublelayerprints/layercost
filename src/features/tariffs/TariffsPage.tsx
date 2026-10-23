import { useState } from 'react'
import type { EnergyTariff } from '@/domain/types'
import { useAppStore } from '@/state/app-store'
import { Badge, Button, Card, EmptyState, Modal, PageHeader } from '@/components/ui'
import { formatCurrency, formatDateOnly } from '@/lib/format'
import { todayIsoDate } from '@/lib/date'
import { TariffForm } from './TariffForm'

export function TariffsPage() {
  const config = useAppStore((state) => state.config)
  const addTariff = useAppStore((state) => state.addTariff)
  const updateTariff = useAppStore((state) => state.updateTariff)
  const removeTariff = useAppStore((state) => state.removeTariff)
  const [editing, setEditing] = useState<EnergyTariff | 'new' | null>(null)

  const tariffs = [...config.settings.tariffs].sort((a, b) =>
    b.effectiveFrom.localeCompare(a.effectiveFrom),
  )
  const today = todayIsoDate()
  const current = [...config.settings.tariffs]
    .filter((tariff) => tariff.effectiveFrom <= today)
    .sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom))
    .at(-1)

  const handleSave = (data: Omit<EnergyTariff, 'id'>) => {
    if (editing === 'new') {
      addTariff(data)
    } else if (editing) {
      updateTariff(editing.id, data)
    }
    setEditing(null)
  }

  const handleRemove = (tariff: EnergyTariff) => {
    if (config.settings.tariffs.length <= 1) return
    if (
      !window.confirm(
        `Eliminare la tariffa “${tariff.label}”? Le stampanti che la usano torneranno alla tariffa globale.`,
      )
    ) {
      return
    }
    removeTariff(tariff.id)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Configurazione"
        title="Tariffe energia"
        description="Una tariffa per ogni contratto o periodo. I preventivi salvati conservano il prezzo usato."
        actions={<Button onClick={() => setEditing('new')}>Aggiungi tariffa</Button>}
      />

      <Card className="border-emerald-200 bg-emerald-50/50 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
          Tariffa corrente
        </p>
        {current ? (
          <div className="mt-1 flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-lg font-semibold text-slate-900">{current.label}</p>
              <p className="text-sm text-slate-600">
                {formatCurrency(current.pricePerKWh, 4)}/kWh · dal{' '}
                {formatDateOnly(current.effectiveFrom)}
              </p>
            </div>
            <Badge tone="success">In uso</Badge>
          </div>
        ) : (
          <p className="mt-1 text-sm text-rose-700">
            Nessuna tariffa valida oggi: i calcoli non possono essere eseguiti.
          </p>
        )}
      </Card>

      {tariffs.length === 0 ? (
        <EmptyState
          title="Nessuna tariffa"
          description="Aggiungi il costo marginale al kWh per poter calcolare l’energia."
          action={<Button onClick={() => setEditing('new')}>Aggiungi tariffa</Button>}
        />
      ) : (
        <div className="space-y-3">
          {tariffs.map((tariff) => (
            <Card key={tariff.id} className="p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm font-semibold text-slate-900">{tariff.label}</h2>
                    {current?.id === tariff.id ? <Badge tone="success">Corrente</Badge> : null}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatCurrency(tariff.pricePerKWh, 4)}/kWh · decorrenza{' '}
                    {formatDateOnly(tariff.effectiveFrom)}
                  </p>
                  {tariff.notes ? (
                    <p className="mt-1 text-xs text-slate-500">{tariff.notes}</p>
                  ) : null}
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => setEditing(tariff)}>
                    Modifica
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemove(tariff)}
                    disabled={config.settings.tariffs.length <= 1}
                    className="text-rose-600 hover:bg-rose-50"
                  >
                    Elimina
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <p className="text-xs text-slate-500">
        Se una stampante è in una casa con un contratto diverso, assegnale una tariffa specifica
        dalla scheda della stampante. Altrimenti usa la tariffa globale.
      </p>

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'Nuova tariffa' : 'Modifica tariffa'}
      >
        <TariffForm
          tariff={editing && editing !== 'new' ? editing : undefined}
          onSave={handleSave}
          onCancel={() => setEditing(null)}
        />
      </Modal>
    </div>
  )
}
