import { Link } from 'react-router-dom'
import { useI18n } from '@/app/i18n-context'
import { ENGINE_VERSION } from '@/domain/version'
import { LANDING_SECTIONS } from './content'
import { scrollToSection } from './scroll'

const linkClass =
  'inline-flex min-h-11 items-center rounded-control text-base text-muted transition-feedback hover:text-ink sm:min-h-8'

export function PublicFooter() {
  const { t } = useI18n()

  return (
    <footer className="bg-ground">
      <div className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-12 lg:gap-8">
          <div className="sm:col-span-2 lg:col-span-5">
            <h2 className="landing-wordmark text-ink">
              <Link
                to="/welcome"
                aria-label={t('app.name')}
                className="rounded-control transition-feedback hover:text-data"
              >
                LayerCost
              </Link>
            </h2>
            <p className="mt-4 max-w-[34ch] text-base leading-relaxed text-muted">
              {t('landing.footer.description')}
            </p>
          </div>

          <nav aria-label={t('landing.footer.product')} className="lg:col-span-2">
            <h3 className="text-[13px] font-semibold text-ink">{t('landing.footer.product')}</h3>
            <ul className="mt-3 space-y-1">
              {LANDING_SECTIONS.map((section) => (
                <li key={section.id}>
                  <button
                    type="button"
                    onClick={() => scrollToSection(section.id)}
                    className={linkClass}
                  >
                    {t(section.labelKey)}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label={t('landing.footer.app')} className="lg:col-span-2">
            <h3 className="text-[13px] font-semibold text-ink">{t('landing.footer.app')}</h3>
            <ul className="mt-3 space-y-1">
              <li>
                <Link to="/calculator" className={linkClass}>
                  {t('landing.nav.open')}
                </Link>
              </li>
              <li>
                <Link to="/login" className={linkClass}>
                  {t('auth.loginAction')}
                </Link>
              </li>
              <li>
                <Link to="/request-access" className={linkClass}>
                  {t('access.requestAccess')}
                </Link>
              </li>
            </ul>
          </nav>

          <div className="lg:col-span-3">
            <h3 className="text-[13px] font-semibold text-ink">
              {t('landing.footer.dataTitle')}
            </h3>
            <p className="mt-3 text-[13px] leading-relaxed text-muted">
              {t('landing.footer.dataNote')}
            </p>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-3 bg-ground text-[13px] leading-relaxed text-ink sm:flex-row sm:items-end sm:justify-between">
          <p className="max-w-[58ch]">{t('landing.footer.privacyNote')}</p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 sm:justify-end">
            <span className="text-ink">{t('app.engineVersion', { version: ENGINE_VERSION })}</span>
            <span className="text-ink">© LayerCost</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
