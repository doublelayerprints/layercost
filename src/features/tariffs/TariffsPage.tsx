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
  const [pendingDelete, setPendingDelete] = useState<EnergyTariff>()

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
    setPendingDelete(tariff)
  }

  const confirmRemove = () => {
    if (!pendingDelete) return
    removeTariff(pendingDelete.id)
    setPendingDelete(undefined)
  }

  return (
    <div>
      <PageHeader
        title="Tariffe energia"
        description="Una tariffa per ogni contratto o periodo. I preventivi salvati conservano il prezzo usato."
        actions={<Button onClick={() => setEditing('new')}>Aggiungi tariffa</Button>}
      />

      <Card className="mt-6 border-l-4 border-l-data p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-muted">Tariffa corrente</p>
            {current ? (
              <>
                <p className="mt-1 text-base font-semibold text-ink">{current.label}</p>
                <p className="mt-1 text-2xl font-medium tabular-nums text-ink">
                  {formatCurrency(current.pricePerKWh, 4)}
                  <span className="text-sm font-normal text-muted">/kWh</span>
                </p>
                <p className="mt-0.5 text-sm text-muted">
                  In vigore dal {formatDateOnly(current.effectiveFrom)}
                </p>
              </>
            ) : (
              <p className="mt-1 text-sm font-medium text-negative">
                Nessuna tariffa valida oggi: i calcoli non possono essere eseguiti.
              </p>
            )}
          </div>
          {current ? <Badge tone="success">In uso</Badge> : null}
        </div>
      </Card>

      {tariffs.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="Nessuna tariffa"
            description="Aggiungi il costo marginale al kWh per poter calcolare l’energia."
            action={<Button onClick={() => setEditing('new')}>Aggiungi tariffa</Button>}
          />
        </div>
      ) : (
        <Card className="mt-6 p-5 sm:p-6">
          <p className="text-sm text-muted">
            {tariffs.length} {tariffs.length === 1 ? 'tariffa' : 'tariffe'} in archivio
          </p>
          {tariffs.length === 1 ? (
            <p className="mt-1 text-xs text-muted">
              Serve almeno una tariffa: l’ultima non può essere eliminata.
            </p>
          ) : null}
          <div className="relative mt-3 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <caption className="sr-only">Tariffe energia in ordine di decorrenza</caption>
              <thead>
                <tr className="text-xs text-muted">
                  <th scope="col" className="py-2 pr-4 text-left font-medium">
                    Etichetta
                  </th>
                  <th scope="col" className="py-2 pr-4 text-right font-medium">
                    Prezzo
                  </th>
                  <th scope="col" className="py-2 pr-4 text-right font-medium">
                    Decorrenza
                  </th>
                  <th scope="col" className="py-2 pr-4 text-left font-medium">
                    Stato
                  </th>
                  <th scope="col" className="py-2 text-right font-medium">
                    <span className="sr-only">Azioni</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {tariffs.map((tariff) => (
                  <tr key={tariff.id} className="border-t border-rule align-top">
                    <th scope="row" className="py-3 pr-4 text-left font-normal">
                      <p className="font-medium text-ink">{tariff.label}</p>
                      {tariff.notes ? (
                        <p className="mt-0.5 text-xs text-muted">{tariff.notes}</p>
                      ) : null}
                    </th>
                    <td className="py-3 pr-4 text-right font-medium tabular-nums text-ink">
                      {formatCurrency(tariff.pricePerKWh, 4)}/kWh
                    </td>
                    <td className="py-3 pr-4 text-right tabular-nums text-muted">
                      {formatDateOnly(tariff.effectiveFrom)}
                    </td>
                    <td className="py-3 pr-4">
                      {current?.id === tariff.id ? (
                        <Badge tone="success">Corrente</Badge>
                      ) : tariff.effectiveFrom > today ? (
                        <Badge tone="info">Futura</Badge>
                      ) : (
                        <Badge tone="neutral">Storica</Badge>
                      )}
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="secondary" size="sm" onClick={() => setEditing(tariff)}>
                          Modifica
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemove(tariff)}
                          disabled={config.settings.tariffs.length <= 1}
                          className="text-negative hover:bg-raised"
                        >
                          Elimina
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <p className="mt-4 max-w-2xl text-sm leading-snug text-muted">
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

      <Modal
        open={pendingDelete !== undefined}
        onClose={() => setPendingDelete(undefined)}
        title="Eliminare la tariffa?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setPendingDelete(undefined)}>
              Annulla
            </Button>
            <Button variant="danger" onClick={confirmRemove}>
              Elimina tariffa
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-sm text-muted">
          <p>
            “{pendingDelete?.label}” verrà rimossa. Le stampanti che la usano torneranno alla
            tariffa globale.
          </p>
          <p>I preventivi già salvati conservano il prezzo dell’energia nel loro snapshot.</p>
        </div>
      </Modal>
    </div>
  )
}
