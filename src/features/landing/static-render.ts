import { buttonClassName } from '../../components/button-styles'
import { ENGINE_VERSION } from '../../domain/version'
import { translate } from '../../i18n'
import type { MessageKey } from '../../i18n/it'
import { displayCents, formatCents, formatCurrency } from '../../lib/format'
import {
  LANDING_FAQS,
  LANDING_FEATURES,
  LANDING_PRIVACY_FACTS,
  LANDING_SYNC_STEPS,
} from './content'
import { PREVIEW_DEFAULTS, calculatePreview } from './preview'

const t = (key: MessageKey): string => translate('it', key)

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function attr(value: string): string {
  return escapeHtml(value)
}

function action(
  href: string,
  label: string,
  variant: 'primary' | 'secondary' = 'primary',
  size: 'sm' | 'md' | 'lg' = 'md',
  extraClass = '',
): string {
  const className = `${buttonClassName({ variant, size, className: extraClass })} landing-button`
  return `<a href="${attr(href)}" class="${attr(className)}">${escapeHtml(label)}</a>`
}

function caption(text: string): string {
  return `<figcaption class="mt-3 text-[13px] leading-relaxed text-muted">${escapeHtml(text)}</figcaption>`
}

function featureTable(): string {
  const rows = LANDING_FEATURES.map((feature, index) => {
    const rowClass = index % 2 === 0 ? 'bg-surface' : 'bg-raised'
    return `<tr class="${rowClass}">
      <th scope="row" class="px-5 py-5">
        <span class="block text-lg font-semibold tracking-title text-ink">${escapeHtml(t(feature.nameKey))}</span>
        <span class="mt-1 block text-base leading-relaxed text-muted">${escapeHtml(t(feature.bodyKey))}</span>
      </th>
      <td class="bg-ink px-5 py-5 text-base leading-relaxed text-surface">
        <span class="mb-1 block text-[13px] font-semibold text-surface/80 md:hidden">${escapeHtml(t('landing.features.column.layerCost'))}</span>
        ${escapeHtml(t(feature.layerCostKey))}
      </td>
      <td class="px-5 py-5 text-base leading-relaxed text-muted">
        <span class="mb-1 block text-[13px] font-semibold text-muted md:hidden">${escapeHtml(t('landing.features.column.spreadsheet'))}</span>
        ${escapeHtml(t(feature.spreadsheetKey))}
      </td>
    </tr>`
  }).join('')

  return `<div class="overflow-hidden rounded-card bg-surface">
    <table class="landing-feature-table w-full">
      <caption class="sr-only">${escapeHtml(t('landing.features.tableCaption'))}</caption>
      <thead class="hidden md:table-header-group">
        <tr>
          <th scope="col" class="w-[46%] px-5 py-5 text-base font-semibold text-ink">${escapeHtml(t('landing.features.column.feature'))}</th>
          <th scope="col" class="w-[27%] bg-ink px-5 py-5 text-base font-semibold text-surface">${escapeHtml(t('landing.features.column.layerCost'))}</th>
          <th scope="col" class="w-[27%] px-5 py-5 text-base font-semibold text-ink">${escapeHtml(t('landing.features.column.spreadsheet'))}</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`
}

function staticDemo(): string {
  const result = calculatePreview(PREVIEW_DEFAULTS.grams, PREVIEW_DEFAULTS.hours)
  const priceCents = result?.netPriceCents ?? 0
  const costCents = result ? displayCents(result.totalCost) : 0
  const total = Math.max(priceCents, 1)
  const costPercent = Math.min(100, Math.max(0, (costCents / total) * 100))
  const gainPercent = Math.max(0, 100 - costPercent)
  const price = result ? formatCents(result.netPriceCents) : '—'
  const cost = result ? formatCurrency(result.totalCost) : '—'
  const gain = result ? formatCurrency(result.gainMicro) : '—'

  return `<div data-ui class="rounded-card border border-line bg-surface p-5 sm:p-6">
    <h3 class="landing-h3 text-ink">${escapeHtml(t('landing.demo.title'))}</h3>
    <p class="mt-2 text-base leading-relaxed text-muted">${escapeHtml(t('landing.demo.body'))}</p>
    <div class="mt-5 grid gap-4 sm:grid-cols-2">
      <div class="rounded-card bg-ground px-4 py-3">
        <span class="block text-[13px] font-medium text-muted">${escapeHtml(t('landing.demo.grams'))}</span>
        <span class="mt-1 block text-lg font-semibold tabular-nums text-ink">${PREVIEW_DEFAULTS.grams} g</span>
      </div>
      <div class="rounded-card bg-ground px-4 py-3">
        <span class="block text-[13px] font-medium text-muted">${escapeHtml(t('landing.demo.hours'))}</span>
        <span class="mt-1 block text-lg font-semibold tabular-nums text-ink">${PREVIEW_DEFAULTS.hours} h</span>
      </div>
    </div>
    <div class="mt-5 rounded-card bg-ground p-4">
      <div class="flex items-baseline justify-between gap-4">
        <span class="text-base text-muted">${escapeHtml(t('landing.demo.price'))}</span>
        <span class="font-serif text-price-sm tabular-nums text-ink">${escapeHtml(price)}</span>
      </div>
      <div class="mt-1 flex items-baseline justify-between gap-4">
        <span class="text-base text-muted">${escapeHtml(t('landing.demo.cost'))}</span>
        <span class="font-serif text-2xl tabular-nums text-ink">${escapeHtml(cost)}</span>
      </div>
      <div role="img" aria-label="${attr(t('landing.demo.compositionAria'))}" class="mt-4 flex h-2 overflow-hidden rounded-full bg-raised">
        <span class="h-full bg-control" style="width:${costPercent.toFixed(1)}%"></span>
        <span class="h-full bg-data" style="width:${gainPercent.toFixed(1)}%"></span>
      </div>
      <dl class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted">
        <div class="flex items-center gap-1.5"><span class="h-2 w-2 rounded-full bg-control" aria-hidden="true"></span><dt class="text-ink">${escapeHtml(t('landing.demo.cost'))}</dt><dd class="tabular-nums text-ink">${escapeHtml(cost)}</dd></div>
        <div class="flex items-center gap-1.5"><span class="h-2 w-2 rounded-full bg-data" aria-hidden="true"></span><dt class="text-ink">${escapeHtml(t('landing.demo.gain'))}</dt><dd class="tabular-nums text-ink">${escapeHtml(gain)}</dd></div>
      </dl>
    </div>
    <p class="mt-3 text-[13px] leading-relaxed text-muted">${escapeHtml(t('landing.demo.note'))}</p>
    ${action('#/calculator', t('landing.demo.open'), 'secondary', 'sm', 'mt-4')}
  </div>`
}

function faqList(): string {
  return LANDING_FAQS.map(
    (faq) => `<details name="landing-faq" class="group rounded-card bg-surface transition-feedback open:bg-pill-info-bg">
      <summary class="flex min-h-[72px] items-center justify-between gap-4 px-5 py-4 text-lg font-medium text-ink transition-feedback hover:bg-raised group-open:bg-transparent group-open:text-pill-info-ink">
        <span>${escapeHtml(t(faq.questionKey))}</span>
        <span class="faq-icon" aria-hidden="true"></span>
      </summary>
      <p class="max-w-[60ch] px-5 pb-5 text-base leading-relaxed text-ink">${escapeHtml(t(faq.answerKey))}</p>
    </details>`,
  ).join('')
}

/**
 * The Italian landing rendered into `#root` at build time. Crawlers and a
 * visitor without JavaScript get the complete public page; React replaces it
 * on the first client render. This function is pure and never touches storage.
 */
export function renderStaticLanding(): string {
  return `<div class="bg-ground text-ink">
    <a href="#main" class="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-control focus:bg-surface focus:px-3 focus:py-2 focus:text-base focus:text-ink">${escapeHtml(t('nav.skipToContent'))}</a>
    <header class="sticky top-0 z-40 bg-ground">
      <div class="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <a href="#/welcome" class="flex items-center gap-2.5 rounded-control" aria-label="LayerCost">
          <svg width="24" height="24" viewBox="0 0 32 32" aria-hidden="true" class="shrink-0 text-ink" fill="currentColor"><rect x="2" y="5" width="20" height="6" rx="2"></rect><rect x="6" y="13" width="20" height="6" rx="2"></rect><rect x="10" y="21" width="20" height="6" rx="2"></rect></svg>
          <span class="text-base font-semibold tracking-title text-ink">LayerCost</span>
        </a>
        <nav class="hidden items-center gap-7 lg:flex" aria-label="${attr(t('nav.main'))}">
          <a href="#features" class="rounded-control text-base text-muted transition-feedback hover:text-ink">${escapeHtml(t('landing.nav.features'))}</a>
          <a href="#how-it-works" class="rounded-control text-base text-muted transition-feedback hover:text-ink">${escapeHtml(t('landing.nav.how'))}</a>
          <a href="#privacy" class="rounded-control text-base text-muted transition-feedback hover:text-ink">${escapeHtml(t('landing.nav.privacy'))}</a>
          <a href="#faq" class="rounded-control text-base text-muted transition-feedback hover:text-ink">${escapeHtml(t('landing.nav.faq'))}</a>
        </nav>
        ${action('#/calculator', t('landing.nav.open'), 'primary', 'md', 'max-sm:hidden')}
      </div>
    </header>

    <main id="main">
      <section class="bg-ground">
        <div class="mx-auto grid max-w-[1200px] grid-cols-1 gap-10 px-4 pb-16 pt-10 sm:px-6 lg:grid-cols-12 lg:gap-8 lg:px-8 lg:pb-24 lg:pt-16">
          <div class="lg:col-span-5 lg:pt-8">
            <h1 class="landing-display max-w-[17ch] text-ink">${escapeHtml(t('landing.hero.title'))}</h1>
            <p class="landing-lead mt-6 max-w-[46ch] text-muted">${escapeHtml(t('landing.hero.body'))}</p>
            <div class="mt-8 flex flex-wrap items-center gap-3">
              ${action('#/calculator', t('landing.nav.open'), 'primary', 'lg', '',)}
              ${action('#/request-access', t('access.requestAccess'), 'secondary', 'lg')}
            </div>
            <p class="landing-small mt-4 text-muted">${escapeHtml(t('landing.hero.note'))}</p>
          </div>
          <div class="lg:col-span-7">
            <figure>
              <div class="overflow-hidden rounded-card bg-ground">
                <img src="landing/calculator.jpg" width="1440" height="1000" alt="${attr(t('landing.hero.imageAlt'))}" fetchpriority="high" decoding="async" class="aspect-[4/3] w-full bg-ground object-contain">
              </div>
              ${caption(t('landing.hero.imageCaption'))}
            </figure>
          </div>
        </div>
      </section>

      <section id="features" class="landing-section bg-ground">
        <div class="mx-auto max-w-[1200px] px-4 pb-20 pt-4 sm:px-6 lg:px-8 lg:pb-28 lg:pt-8">
          <div class="grid gap-10 lg:grid-cols-12 lg:gap-8">
            <div class="lg:col-span-4">
              <h2 class="landing-h2 text-ink">${escapeHtml(t('landing.features.title'))}</h2>
              <p class="landing-body mt-5 max-w-[38ch] text-muted">${escapeHtml(t('landing.features.body'))}</p>
            </div>
            <div class="lg:col-span-8">${featureTable()}</div>
          </div>
        </div>
      </section>

      <section class="bg-surface">
        <div class="mx-auto max-w-[1200px] px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div class="grid gap-6 lg:grid-cols-12 lg:gap-8">
            <h2 class="landing-h2 text-ink lg:col-span-6">${escapeHtml(t('landing.showcase.title'))}</h2>
            <p class="landing-body max-w-[50ch] text-muted lg:col-span-5 lg:col-start-8">${escapeHtml(t('landing.showcase.body'))}</p>
          </div>
          <figure class="mt-10 lg:mt-14">
            <div class="overflow-hidden rounded-card bg-ground">
              <img src="landing/quote-detail.jpg" width="1440" height="1000" alt="${attr(t('landing.showcase.imageAlt'))}" loading="lazy" decoding="async" class="aspect-[16/9] w-full bg-ground object-cover object-top">
            </div>
            ${caption(t('landing.showcase.caption'))}
          </figure>
        </div>
      </section>

      <section id="how-it-works" class="landing-section bg-ground">
        <div class="mx-auto max-w-[1200px] px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div class="max-w-[46ch]">
            <h2 class="landing-h2 text-ink">${escapeHtml(t('landing.steps.title'))}</h2>
            <p class="landing-body mt-5 text-muted">${escapeHtml(t('landing.steps.body'))}</p>
          </div>
          <div class="mt-12 grid gap-12 lg:grid-cols-12 lg:gap-8">
            <div class="lg:col-span-5"><div class="lg:sticky lg:top-24">${staticDemo()}</div></div>
            <ol class="list-none space-y-14 lg:col-span-7">
              <li>
                <p class="landing-body max-w-[60ch] text-muted"><strong class="font-semibold text-ink">${escapeHtml(t('landing.steps.one.lead'))}</strong> ${escapeHtml(t('landing.steps.one.body'))}</p>
                <figure class="mt-5">
                  <div class="overflow-hidden rounded-card bg-ground"><img src="landing/import.jpg" width="1440" height="1000" alt="${attr(t('landing.steps.one.imageAlt'))}" loading="lazy" decoding="async" class="aspect-[4/3] w-full bg-ground object-contain"></div>
                  ${caption(t('landing.steps.one.caption'))}
                </figure>
              </li>
              <li>
                <p class="landing-body max-w-[60ch] text-muted"><strong class="font-semibold text-ink">${escapeHtml(t('landing.steps.two.lead'))}</strong> ${escapeHtml(t('landing.steps.two.body'))}</p>
              </li>
              <li>
                <p class="landing-body max-w-[60ch] text-muted"><strong class="font-semibold text-ink">${escapeHtml(t('landing.steps.three.lead'))}</strong> ${escapeHtml(t('landing.steps.three.body'))}</p>
                <figure class="mt-5">
                  <div class="overflow-hidden rounded-card bg-ground"><img src="landing/share.jpg" width="1440" height="1000" alt="${attr(t('landing.steps.three.imageAlt'))}" loading="lazy" decoding="async" class="aspect-[4/3] w-full bg-ground object-contain"></div>
                  ${caption(t('landing.steps.three.caption'))}
                </figure>
              </li>
            </ol>
          </div>
        </div>
      </section>

      <section id="privacy" class="landing-section bg-ink text-ground">
        <div class="mx-auto max-w-[1200px] px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div class="grid gap-12 lg:grid-cols-12 lg:gap-8">
            <div class="lg:col-span-5">
              <h2 class="landing-h2 max-w-[16ch] text-ground">${escapeHtml(t('landing.privacy.title'))}</h2>
              <p class="landing-lead mt-5 max-w-[42ch] text-ground/80">${escapeHtml(t('landing.privacy.body'))}</p>
            </div>
            <div class="lg:col-span-7">
              <ul class="grid gap-x-10 gap-y-8 sm:grid-cols-2">
                ${LANDING_PRIVACY_FACTS.map(
                  (fact) => `<li><p class="text-base font-semibold text-ground">${escapeHtml(t(fact.titleKey))}</p><p class="mt-2 text-base leading-relaxed text-ground/80">${escapeHtml(t(fact.bodyKey))}</p></li>`,
                ).join('')}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section class="bg-surface">
        <div class="mx-auto max-w-[1200px] px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div class="grid gap-6 lg:grid-cols-12 lg:gap-8">
            <h2 class="landing-h2 text-ink lg:col-span-5">${escapeHtml(t('landing.sync.title'))}</h2>
            <p class="landing-lead text-muted lg:col-span-6 lg:col-start-7">${escapeHtml(t('landing.sync.body'))}</p>
          </div>
          <ol class="mt-12 grid list-decimal gap-8 pl-5 marker:font-semibold marker:text-muted sm:grid-cols-2 lg:grid-cols-4">
            ${LANDING_SYNC_STEPS.map(
              (step) => `<li class="pl-1"><h3 class="landing-h3 text-ink">${escapeHtml(t(step.titleKey))}</h3><p class="mt-2 text-base leading-relaxed text-muted">${escapeHtml(t(step.bodyKey))}</p></li>`,
            ).join('')}
          </ol>
          <div class="mt-10 flex flex-wrap items-center gap-3">
            ${action('#/request-access', t('access.requestAccess'))}
            ${action('#/login', t('auth.loginAction'), 'secondary')}
            <p class="text-[13px] text-muted">${escapeHtml(t('landing.sync.note'))}</p>
          </div>
        </div>
      </section>

      <section id="faq" class="landing-section bg-ground">
        <div class="mx-auto max-w-[1200px] px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div class="grid gap-10 lg:grid-cols-12 lg:gap-8">
            <div class="lg:col-span-4"><div class="lg:sticky lg:top-24"><h2 class="landing-h2 text-ink">${escapeHtml(t('landing.faq.title'))}</h2></div></div>
            <div class="lg:col-span-8"><div class="landing-faq space-y-2">${faqList()}</div></div>
          </div>
        </div>
      </section>

      <section class="bg-raised">
        <div class="mx-auto max-w-[1200px] px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
          <div class="grid gap-8 md:grid-cols-12 md:items-end">
            <div class="md:col-span-7">
              <h2 class="landing-h2 text-ink">${escapeHtml(t('landing.cta.title'))}</h2>
              <p class="landing-lead mt-5 max-w-[46ch] text-muted">${escapeHtml(t('landing.cta.body'))}</p>
            </div>
            <div class="md:col-span-5">
              <div class="flex flex-wrap gap-3 md:justify-end">
                ${action('#/calculator', t('landing.nav.open'), 'primary', 'lg')}
                ${action('#/request-access', t('access.requestAccess'), 'secondary', 'lg')}
              </div>
              <p class="mt-4 text-[13px] text-muted md:text-right">${escapeHtml(t('landing.cta.note'))}</p>
            </div>
          </div>
        </div>
      </section>
    </main>

    <footer class="bg-ground">
      <div class="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div class="grid gap-10 sm:grid-cols-2 lg:grid-cols-12 lg:gap-8">
          <div class="sm:col-span-2 lg:col-span-5">
            <h2 class="landing-wordmark text-ink"><a href="#/welcome" aria-label="LayerCost" class="rounded-control transition-feedback hover:text-data">LayerCost</a></h2>
            <p class="mt-4 max-w-[34ch] text-base leading-relaxed text-muted">${escapeHtml(t('landing.footer.description'))}</p>
          </div>
          <nav class="lg:col-span-2" aria-label="${attr(t('landing.footer.product'))}">
            <h3 class="text-[13px] font-semibold text-ink">${escapeHtml(t('landing.footer.product'))}</h3>
            <ul class="mt-3 space-y-1">
              <li><a href="#features" class="inline-flex min-h-11 items-center rounded-control text-base text-muted transition-feedback hover:text-ink sm:min-h-8">${escapeHtml(t('landing.nav.features'))}</a></li>
              <li><a href="#how-it-works" class="inline-flex min-h-11 items-center rounded-control text-base text-muted transition-feedback hover:text-ink sm:min-h-8">${escapeHtml(t('landing.nav.how'))}</a></li>
              <li><a href="#privacy" class="inline-flex min-h-11 items-center rounded-control text-base text-muted transition-feedback hover:text-ink sm:min-h-8">${escapeHtml(t('landing.nav.privacy'))}</a></li>
              <li><a href="#faq" class="inline-flex min-h-11 items-center rounded-control text-base text-muted transition-feedback hover:text-ink sm:min-h-8">${escapeHtml(t('landing.nav.faq'))}</a></li>
            </ul>
          </nav>
          <nav class="lg:col-span-2" aria-label="${attr(t('landing.footer.app'))}">
            <h3 class="text-[13px] font-semibold text-ink">${escapeHtml(t('landing.footer.app'))}</h3>
            <ul class="mt-3 space-y-1">
              <li><a href="#/calculator" class="inline-flex min-h-11 items-center rounded-control text-base text-muted transition-feedback hover:text-ink sm:min-h-8">${escapeHtml(t('landing.nav.open'))}</a></li>
              <li><a href="#/login" class="inline-flex min-h-11 items-center rounded-control text-base text-muted transition-feedback hover:text-ink sm:min-h-8">${escapeHtml(t('auth.loginAction'))}</a></li>
              <li><a href="#/request-access" class="inline-flex min-h-11 items-center rounded-control text-base text-muted transition-feedback hover:text-ink sm:min-h-8">${escapeHtml(t('access.requestAccess'))}</a></li>
            </ul>
          </nav>
          <div class="lg:col-span-3">
            <h3 class="text-[13px] font-semibold text-ink">${escapeHtml(t('landing.footer.dataTitle'))}</h3>
            <p class="mt-3 text-[13px] leading-relaxed text-muted">${escapeHtml(t('landing.footer.dataNote'))}</p>
          </div>
        </div>
        <div class="mt-14 flex flex-col gap-3 bg-ground text-[13px] leading-relaxed text-ink sm:flex-row sm:items-end sm:justify-between">
          <p class="max-w-[58ch]">${escapeHtml(t('landing.footer.privacyNote'))}</p>
          <div class="flex flex-wrap items-center gap-x-5 gap-y-1 sm:justify-end">
            <span class="text-ink">${escapeHtml(translate('it', 'app.engineVersion', { version: ENGINE_VERSION }))}</span>
            <span class="text-ink">© LayerCost</span>
          </div>
        </div>
      </div>
    </footer>
  </div>`
}
