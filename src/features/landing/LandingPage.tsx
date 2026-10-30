import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '@/app/i18n-context'
import { landingButtonClassName } from './button'
import {
  LANDING_FAQS,
  LANDING_FEATURES,
  LANDING_PRIVACY_FACTS,
  LANDING_SYNC_STEPS,
} from './content'
import { LivePriceDemo } from './LivePriceDemo'
import { Reveal } from './Reveal'
import { applyLandingMeta } from './meta'
import { useEntranceMotion } from './use-entrance-motion'
import { useParallax } from './use-parallax'
import './landing.css'

const captionClass = 'mt-3 text-[13px] leading-relaxed text-muted'

function ArrowIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      focusable="false"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 8h10M9 4l4 4-4 4" />
    </svg>
  )
}

export function LandingPage() {
  const { t, locale } = useI18n()
  const heroImageRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    applyLandingMeta(locale)
  }, [locale])

  useEntranceMotion()
  useParallax(heroImageRef)

  return (
    <>
      <section className="bg-ground">
        <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-10 px-4 pb-16 pt-10 sm:px-6 lg:grid-cols-12 lg:gap-8 lg:px-8 lg:pb-24 lg:pt-16">
          <div className="lg:col-span-5 lg:pt-8">
            <Reveal>
              <h1 className="landing-display max-w-[17ch] text-ink">{t('landing.hero.title')}</h1>
              <p className="landing-lead mt-6 max-w-[46ch] text-muted">{t('landing.hero.body')}</p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link to="/calculator" className={landingButtonClassName({ size: 'lg' })}>
                  {t('landing.nav.open')}
                  <ArrowIcon />
                </Link>
                <Link
                  to="/request-access"
                  className={landingButtonClassName({ variant: 'secondary', size: 'lg' })}
                >
                  {t('access.requestAccess')}
                </Link>
              </div>
              <p className="landing-small mt-4 text-muted">{t('landing.hero.note')}</p>
            </Reveal>
          </div>

          <Reveal className="lg:col-span-7" delay={120}>
            <figure>
              <div className="overflow-hidden rounded-card bg-ground">
                <img
                  ref={heroImageRef}
                  src="landing/calculator.jpg"
                  width={1440}
                  height={1000}
                  alt={t('landing.hero.imageAlt')}
                  fetchPriority="high"
                  decoding="async"
                  className="aspect-[4/3] w-full bg-ground object-contain will-change-transform"
                  style={{ transform: 'translate3d(0, var(--hero-shift, 0px), 0) scale(1.015)' }}
                />
              </div>
              <figcaption className={captionClass}>{t('landing.hero.imageCaption')}</figcaption>
            </figure>
          </Reveal>
        </div>
      </section>

      <section id="features" className="landing-section bg-ground">
        <div className="mx-auto max-w-[1200px] px-4 pb-20 pt-4 sm:px-6 lg:px-8 lg:pb-28 lg:pt-8">
          <div className="grid gap-10 lg:grid-cols-12 lg:gap-8">
            <Reveal className="lg:col-span-4">
              <h2 className="landing-h2 text-ink">{t('landing.features.title')}</h2>
              <p className="landing-body mt-5 max-w-[38ch] text-muted">
                {t('landing.features.body')}
              </p>
            </Reveal>

            <Reveal className="lg:col-span-8" delay={80}>
              <div className="overflow-hidden rounded-card bg-surface">
                <table className="landing-feature-table w-full">
                  <caption className="sr-only">{t('landing.features.tableCaption')}</caption>
                  <thead className="hidden md:table-header-group">
                    <tr>
                      <th scope="col" className="w-[46%] px-5 py-5 text-base font-semibold text-ink">
                        {t('landing.features.column.feature')}
                      </th>
                      <th
                        scope="col"
                        className="w-[27%] bg-ink px-5 py-5 text-base font-semibold text-surface"
                      >
                        {t('landing.features.column.layerCost')}
                      </th>
                      <th scope="col" className="w-[27%] px-5 py-5 text-base font-semibold text-ink">
                        {t('landing.features.column.spreadsheet')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {LANDING_FEATURES.map((feature, index) => (
                      <tr
                        key={feature.id}
                        className={index % 2 === 0 ? 'bg-surface' : 'bg-raised'}
                      >
                        <th scope="row" className="px-5 py-5">
                          <span className="block text-lg font-semibold tracking-title text-ink">
                            {t(feature.nameKey)}
                          </span>
                          <span className="mt-1 block text-base leading-relaxed text-muted">
                            {t(feature.bodyKey)}
                          </span>
                        </th>
                        <td className="bg-ink px-5 py-5 text-base leading-relaxed text-surface">
                          <span className="mb-1 block text-[13px] font-semibold text-surface/80 md:hidden">
                            {t('landing.features.column.layerCost')}
                          </span>
                          {t(feature.layerCostKey)}
                        </td>
                        <td className="px-5 py-5 text-base leading-relaxed text-muted">
                          <span className="mb-1 block text-[13px] font-semibold text-muted md:hidden">
                            {t('landing.features.column.spreadsheet')}
                          </span>
                          {t(feature.spreadsheetKey)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="bg-surface">
        <div className="mx-auto max-w-[1200px] px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <Reveal className="grid gap-6 lg:grid-cols-12 lg:gap-8">
            <h2 className="landing-h2 text-ink lg:col-span-6">{t('landing.showcase.title')}</h2>
            <p className="landing-body max-w-[50ch] text-muted lg:col-span-5 lg:col-start-8">
              {t('landing.showcase.body')}
            </p>
          </Reveal>

          <Reveal className="mt-10 lg:mt-14" delay={80}>
            <figure>
              <div className="overflow-hidden rounded-card bg-ground">
                <img
                  src="landing/quote-detail.jpg"
                  width={1440}
                  height={1000}
                  alt={t('landing.showcase.imageAlt')}
                  loading="lazy"
                  decoding="async"
                  className="aspect-[16/9] w-full bg-ground object-cover object-top"
                />
              </div>
              <figcaption className={captionClass}>{t('landing.showcase.caption')}</figcaption>
            </figure>
          </Reveal>
        </div>
      </section>

      <section id="how-it-works" className="landing-section bg-ground">
        <div className="mx-auto max-w-[1200px] px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <Reveal className="max-w-[46ch]">
            <h2 className="landing-h2 text-ink">{t('landing.steps.title')}</h2>
            <p className="landing-body mt-5 text-muted">{t('landing.steps.body')}</p>
          </Reveal>

          <div className="mt-12 grid gap-12 lg:grid-cols-12 lg:gap-8">
            <Reveal className="lg:col-span-5" delay={60}>
              <div className="lg:sticky lg:top-24">
                <LivePriceDemo />
              </div>
            </Reveal>

            <ol className="list-none space-y-14 lg:col-span-7">
              <li>
                <Reveal>
                  <p className="landing-body max-w-[60ch] text-muted">
                    <strong className="font-semibold text-ink">
                      {t('landing.steps.one.lead')}
                    </strong>{' '}
                    {t('landing.steps.one.body')}
                  </p>
                  <figure className="mt-5">
                    <div className="overflow-hidden rounded-card bg-surface">
                      <img
                        src="landing/import.jpg"
                        width={1440}
                        height={1000}
                        alt={t('landing.steps.one.imageAlt')}
                        loading="lazy"
                        decoding="async"
                        className="aspect-[4/3] w-full bg-ground object-contain"
                      />
                    </div>
                    <figcaption className={captionClass}>
                      {t('landing.steps.one.caption')}
                    </figcaption>
                  </figure>
                </Reveal>
              </li>

              <li>
                <Reveal delay={40}>
                  <p className="landing-body max-w-[60ch] text-muted">
                    <strong className="font-semibold text-ink">
                      {t('landing.steps.two.lead')}
                    </strong>{' '}
                    {t('landing.steps.two.body')}
                  </p>
                </Reveal>
              </li>

              <li>
                <Reveal delay={40}>
                  <p className="landing-body max-w-[60ch] text-muted">
                    <strong className="font-semibold text-ink">
                      {t('landing.steps.three.lead')}
                    </strong>{' '}
                    {t('landing.steps.three.body')}
                  </p>
                  <figure className="mt-5">
                    <div className="overflow-hidden rounded-card bg-surface">
                      <img
                        src="landing/share.jpg"
                        width={1440}
                        height={1000}
                        alt={t('landing.steps.three.imageAlt')}
                        loading="lazy"
                        decoding="async"
                        className="aspect-[4/3] w-full bg-ground object-contain"
                      />
                    </div>
                    <figcaption className={captionClass}>
                      {t('landing.steps.three.caption')}
                    </figcaption>
                  </figure>
                </Reveal>
              </li>
            </ol>
          </div>
        </div>
      </section>

      <section id="privacy" className="landing-section bg-ink text-ground">
        <div className="mx-auto max-w-[1200px] px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-8">
            <Reveal className="lg:col-span-5">
              <h2 className="landing-h2 max-w-[16ch] text-ground">
                {t('landing.privacy.title')}
              </h2>
              <p className="landing-lead mt-5 max-w-[42ch] text-ground/80">
                {t('landing.privacy.body')}
              </p>
            </Reveal>

            <Reveal className="lg:col-span-7" delay={80}>
              <ul className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
                {LANDING_PRIVACY_FACTS.map((fact) => (
                  <li key={fact.id}>
                    <p className="text-base font-semibold text-ground">{t(fact.titleKey)}</p>
                    <p className="mt-2 text-base leading-relaxed text-ground/80">
                      {t(fact.bodyKey)}
                    </p>
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="bg-surface">
        <div className="mx-auto max-w-[1200px] px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="grid gap-6 lg:grid-cols-12 lg:gap-8">
            <Reveal className="lg:col-span-5">
              <h2 className="landing-h2 text-ink">{t('landing.sync.title')}</h2>
            </Reveal>
            <Reveal className="lg:col-span-6 lg:col-start-7" delay={60}>
              <p className="landing-lead text-muted">{t('landing.sync.body')}</p>
            </Reveal>
          </div>

          <Reveal className="mt-12" delay={80}>
            <ol className="grid list-decimal gap-8 pl-5 marker:font-semibold marker:text-muted sm:grid-cols-2 lg:grid-cols-4">
              {LANDING_SYNC_STEPS.map((step) => (
                <li key={step.id} className="pl-1">
                  <h3 className="landing-h3 text-ink">{t(step.titleKey)}</h3>
                  <p className="mt-2 text-base leading-relaxed text-muted">{t(step.bodyKey)}</p>
                </li>
              ))}
            </ol>
          </Reveal>

          <Reveal className="mt-10 flex flex-wrap items-center gap-3" delay={120}>
            <Link to="/request-access" className={landingButtonClassName({ size: 'md' })}>
              {t('access.requestAccess')}
            </Link>
            <Link
              to="/login"
              className={landingButtonClassName({ variant: 'secondary', size: 'md' })}
            >
              {t('auth.loginAction')}
            </Link>
            <p className="text-[13px] text-muted">{t('landing.sync.note')}</p>
          </Reveal>
        </div>
      </section>

      <section id="faq" className="landing-section bg-ground">
        <div className="mx-auto max-w-[1200px] px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="grid gap-10 lg:grid-cols-12 lg:gap-8">
            <Reveal className="lg:col-span-4">
              <div className="lg:sticky lg:top-24">
                <h2 className="landing-h2 text-ink">{t('landing.faq.title')}</h2>
              </div>
            </Reveal>

            <Reveal className="lg:col-span-8" delay={80}>
              <div className="landing-faq space-y-2">
                {LANDING_FAQS.map((faq) => (
                  <details
                    key={faq.id}
                    name="landing-faq"
                    className="group rounded-card bg-surface transition-feedback open:bg-pill-info-bg"
                  >
                    <summary className="flex min-h-[72px] items-center justify-between gap-4 px-5 py-4 text-lg font-medium text-ink transition-feedback hover:bg-raised group-open:bg-transparent group-open:text-pill-info-ink">
                      <span>{t(faq.questionKey)}</span>
                      <span className="faq-icon" aria-hidden="true" />
                    </summary>
                    <p className="max-w-[60ch] px-5 pb-5 text-base leading-relaxed text-ink">
                      {t(faq.answerKey)}
                    </p>
                  </details>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="bg-raised">
        <div className="mx-auto max-w-[1200px] px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
          <div className="grid gap-8 md:grid-cols-12 md:items-end">
            <Reveal className="md:col-span-7">
              <h2 className="landing-h2 text-ink">{t('landing.cta.title')}</h2>
              <p className="landing-lead mt-5 max-w-[46ch] text-muted">{t('landing.cta.body')}</p>
            </Reveal>
            <Reveal className="md:col-span-5" delay={80}>
              <div className="flex flex-wrap gap-3 md:justify-end">
                <Link to="/calculator" className={landingButtonClassName({ size: 'lg' })}>
                  {t('landing.nav.open')}
                  <ArrowIcon />
                </Link>
                <Link
                  to="/request-access"
                  className={landingButtonClassName({ variant: 'secondary', size: 'lg' })}
                >
                  {t('access.requestAccess')}
                </Link>
              </div>
              <p className="mt-4 text-[13px] text-muted md:text-right">{t('landing.cta.note')}</p>
            </Reveal>
          </div>
        </div>
      </section>
    </>
  )
}
