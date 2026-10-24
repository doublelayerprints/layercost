import { Link } from 'react-router-dom'
import { useAppStore } from '@/state/app-store'
import { Button, Card } from '@/components/ui'

const steps = [
  {
    to: '/printers',
    title: 'Stampanti',
    description: 'Conferma prezzo di acquisto, vita utile, manutenzione e potenza media.',
  },
  {
    to: '/tariffs',
    title: 'Tariffa energia',
    description: 'Inserisci il costo marginale al kWh della tua bolletta.',
  },
  {
    to: '/materials',
    title: 'Materiali',
    description: 'Aggiorna prezzo e peso netto delle bobine che usi davvero.',
  },
  {
    to: '/settings',
    title: 'Prezzo',
    description: 'Imposta ricarico, IVA, arrotondamento e ripartizione dei costi fissi.',
  },
]

export function OnboardingCard() {
  const completeOnboarding = useAppStore((state) => state.completeOnboarding)
  const settings = useAppStore((state) => state.config.settings)
  if (settings.onboardingComplete) return null

  return (
    <Card className="border-data/30 bg-data/5 p-4 sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-ink">Configura LayerCost</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            I dati di partenza sono stime modificabili. Prima di fidarti dei numeri, conferma i
            quattro punti che contano davvero.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {steps.map((step) => (
              <Link
                key={step.to}
                to={step.to}
                className="rounded-control border border-line bg-surface/70 px-3 py-2 transition-feedback hover:bg-surface"
              >
                <p className="text-sm font-medium text-ink">{step.title}</p>
                <p className="mt-0.5 text-xs text-muted">{step.description}</p>
              </Link>
            ))}
          </div>
        </div>
        <Button variant="secondary" onClick={completeOnboarding} className="shrink-0">
          Ho capito, inizia
        </Button>
      </div>
    </Card>
  )
}
