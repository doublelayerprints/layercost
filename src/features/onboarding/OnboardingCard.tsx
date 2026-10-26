import { Link } from 'react-router-dom'
import { useI18n } from '@/app/i18n-context'
import { useAppStore } from '@/state/app-store'
import { Button, Card } from '@/components/ui'

export function OnboardingCard() {
  const { t } = useI18n()
  const completeOnboarding = useAppStore((state) => state.completeOnboarding)
  const settings = useAppStore((state) => state.config.settings)
  if (settings.onboardingComplete) return null

  const steps = [
    { to: '/printers', title: t('nav.printers') },
    { to: '/tariffs', title: t('onboarding.tariffStep') },
    { to: '/materials', title: t('nav.materials') },
    { to: '/settings', title: t('onboarding.priceStep') },
  ]

  return (
    <Card className="border-l-4 border-l-data p-5 sm:p-6">
      <div className="grid gap-5 lg:grid-cols-2 lg:items-start lg:gap-10">
        <div>
          <h2 className="text-base font-semibold text-ink">
            {t('onboarding.title', { app: t('app.name') })}
          </h2>
          <p className="mt-1 text-sm leading-snug text-muted">{t('onboarding.description')}</p>
          <Button variant="secondary" onClick={completeOnboarding} className="mt-3">
            {t('onboarding.start')}
          </Button>
        </div>
        <ul className="grid grid-cols-2 gap-2">
          {steps.map((step) => (
            <li key={step.to}>
              <Link
                to={step.to}
                className="flex min-h-11 items-center justify-between gap-2 rounded-control border border-line bg-surface px-3 text-sm font-medium text-ink transition-feedback hover:border-control"
              >
                {step.title}
                <span aria-hidden="true" className="text-muted">
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  )
}
