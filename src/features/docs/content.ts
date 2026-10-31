import type { DocsKey } from './i18n'

export type DocsBlock =
  | { kind: 'paragraph'; textKey: DocsKey }
  | { kind: 'steps'; titleKey: DocsKey; items: readonly DocsKey[] }
  | { kind: 'bullets'; titleKey?: DocsKey; items: readonly DocsKey[] }
  | { kind: 'note'; tone: 'info' | 'warning'; titleKey: DocsKey; textKey: DocsKey }
  | { kind: 'figure'; src: string; altKey: DocsKey; captionKey: DocsKey }

export interface DocsLink {
  to: string
  labelKey: DocsKey
}

export interface DocsSection {
  id: string
  labelKey: DocsKey
  titleKey: DocsKey
  introKey: DocsKey
  blocks: readonly DocsBlock[]
  links: readonly DocsLink[]
}

/**
 * Long-form documentation lives in typed data, not in the page component.
 * Every string is a message key, so Italian and English stay in sync and the
 * same section can be deep-linked at `/#/docs/<id>`.
 */
export const DOCS_SECTIONS = [
  {
    id: 'primi-passi',
    labelKey: 'docs.primiPassi.label',
    titleKey: 'docs.primiPassi.title',
    introKey: 'docs.primiPassi.intro',
    blocks: [
      { kind: 'paragraph', textKey: 'docs.primiPassi.p1' },
      { kind: 'paragraph', textKey: 'docs.primiPassi.p2' },
      {
        kind: 'steps',
        titleKey: 'docs.primiPassi.stepsTitle',
        items: [
          'docs.primiPassi.step1',
          'docs.primiPassi.step2',
          'docs.primiPassi.step3',
          'docs.primiPassi.step4',
          'docs.primiPassi.step5',
          'docs.primiPassi.step6',
        ],
      },
      {
        kind: 'note',
        tone: 'warning',
        titleKey: 'docs.primiPassi.noteTitle',
        textKey: 'docs.primiPassi.note',
      },
      {
        kind: 'figure',
        src: 'landing/calculator.jpg',
        altKey: 'docs.primiPassi.imageAlt',
        captionKey: 'docs.primiPassi.imageCaption',
      },
    ],
    links: [
      { to: '/calculator', labelKey: 'docs.primiPassi.linkCalculator' },
      { to: '/docs/stampanti', labelKey: 'docs.primiPassi.linkPrinters' },
    ],
  },
  {
    id: 'stampanti',
    labelKey: 'docs.stampanti.label',
    titleKey: 'docs.stampanti.title',
    introKey: 'docs.stampanti.intro',
    blocks: [
      { kind: 'paragraph', textKey: 'docs.stampanti.p1' },
      { kind: 'paragraph', textKey: 'docs.stampanti.p2' },
      {
        kind: 'steps',
        titleKey: 'docs.stampanti.stepsTitle',
        items: [
          'docs.stampanti.step1',
          'docs.stampanti.step2',
          'docs.stampanti.step3',
          'docs.stampanti.step4',
          'docs.stampanti.step5',
        ],
      },
      {
        kind: 'note',
        tone: 'info',
        titleKey: 'docs.stampanti.noteTitle',
        textKey: 'docs.stampanti.note',
      },
      {
        kind: 'figure',
        src: 'docs/printers.jpg',
        altKey: 'docs.stampanti.imageAlt',
        captionKey: 'docs.stampanti.imageCaption',
      },
    ],
    links: [{ to: '/printers', labelKey: 'docs.stampanti.linkPrinters' }],
  },
  {
    id: 'materiali',
    labelKey: 'docs.materiali.label',
    titleKey: 'docs.materiali.title',
    introKey: 'docs.materiali.intro',
    blocks: [
      { kind: 'paragraph', textKey: 'docs.materiali.p1' },
      { kind: 'paragraph', textKey: 'docs.materiali.p2' },
      {
        kind: 'steps',
        titleKey: 'docs.materiali.stepsTitle',
        items: [
          'docs.materiali.step1',
          'docs.materiali.step2',
          'docs.materiali.step3',
          'docs.materiali.step4',
          'docs.materiali.step5',
        ],
      },
      {
        kind: 'note',
        tone: 'info',
        titleKey: 'docs.materiali.noteTitle',
        textKey: 'docs.materiali.note',
      },
      {
        kind: 'figure',
        src: 'docs/materials.jpg',
        altKey: 'docs.materiali.imageAlt',
        captionKey: 'docs.materiali.imageCaption',
      },
    ],
    links: [{ to: '/materials', labelKey: 'docs.materiali.linkMaterials' }],
  },
  {
    id: 'tariffe-extra',
    labelKey: 'docs.tariffeExtra.label',
    titleKey: 'docs.tariffeExtra.title',
    introKey: 'docs.tariffeExtra.intro',
    blocks: [
      { kind: 'paragraph', textKey: 'docs.tariffeExtra.p1' },
      { kind: 'paragraph', textKey: 'docs.tariffeExtra.p2' },
      {
        kind: 'steps',
        titleKey: 'docs.tariffeExtra.stepsTitle',
        items: [
          'docs.tariffeExtra.step1',
          'docs.tariffeExtra.step2',
          'docs.tariffeExtra.step3',
          'docs.tariffeExtra.step4',
        ],
      },
      {
        kind: 'note',
        tone: 'info',
        titleKey: 'docs.tariffeExtra.noteTitle',
        textKey: 'docs.tariffeExtra.note',
      },
      {
        kind: 'figure',
        src: 'docs/tariffs.jpg',
        altKey: 'docs.tariffeExtra.imageAlt',
        captionKey: 'docs.tariffeExtra.imageCaption',
      },
    ],
    links: [
      { to: '/tariffs', labelKey: 'docs.tariffeExtra.linkTariffs' },
      { to: '/extras', labelKey: 'docs.tariffeExtra.linkExtras' },
    ],
  },
  {
    id: 'calcolare',
    labelKey: 'docs.calcolare.label',
    titleKey: 'docs.calcolare.title',
    introKey: 'docs.calcolare.intro',
    blocks: [
      { kind: 'paragraph', textKey: 'docs.calcolare.p1' },
      { kind: 'paragraph', textKey: 'docs.calcolare.p2' },
      {
        kind: 'steps',
        titleKey: 'docs.calcolare.stepsTitle',
        items: [
          'docs.calcolare.step1',
          'docs.calcolare.step2',
          'docs.calcolare.step3',
          'docs.calcolare.step4',
          'docs.calcolare.step5',
          'docs.calcolare.step6',
          'docs.calcolare.step7',
        ],
      },
      {
        kind: 'note',
        tone: 'info',
        titleKey: 'docs.calcolare.noteTitle',
        textKey: 'docs.calcolare.note',
      },
      {
        kind: 'figure',
        src: 'landing/calculator.jpg',
        altKey: 'docs.calcolare.imageAlt',
        captionKey: 'docs.calcolare.imageCaption',
      },
    ],
    links: [
      { to: '/calculator', labelKey: 'docs.calcolare.linkCalculator' },
      { to: '/docs/import-3mf', labelKey: 'docs.calcolare.linkImport' },
    ],
  },
  {
    id: 'import-3mf',
    labelKey: 'docs.import3mf.label',
    titleKey: 'docs.import3mf.title',
    introKey: 'docs.import3mf.intro',
    blocks: [
      { kind: 'paragraph', textKey: 'docs.import3mf.p1' },
      { kind: 'paragraph', textKey: 'docs.import3mf.p2' },
      {
        kind: 'steps',
        titleKey: 'docs.import3mf.stepsTitle',
        items: [
          'docs.import3mf.step1',
          'docs.import3mf.step2',
          'docs.import3mf.step3',
          'docs.import3mf.step4',
          'docs.import3mf.step5',
        ],
      },
      {
        kind: 'note',
        tone: 'warning',
        titleKey: 'docs.import3mf.noteTitle',
        textKey: 'docs.import3mf.note',
      },
      {
        kind: 'figure',
        src: 'landing/import.jpg',
        altKey: 'docs.import3mf.imageAlt',
        captionKey: 'docs.import3mf.imageCaption',
      },
    ],
    links: [{ to: '/calculator', labelKey: 'docs.import3mf.linkCalculator' }],
  },
  {
    id: 'prezzo-sconti-iva',
    labelKey: 'docs.prezzo.label',
    titleKey: 'docs.prezzo.title',
    introKey: 'docs.prezzo.intro',
    blocks: [
      { kind: 'paragraph', textKey: 'docs.prezzo.p1' },
      { kind: 'paragraph', textKey: 'docs.prezzo.p2' },
      {
        kind: 'steps',
        titleKey: 'docs.prezzo.stepsTitle',
        items: [
          'docs.prezzo.step1',
          'docs.prezzo.step2',
          'docs.prezzo.step3',
          'docs.prezzo.step4',
          'docs.prezzo.step5',
        ],
      },
      {
        kind: 'note',
        tone: 'warning',
        titleKey: 'docs.prezzo.noteTitle',
        textKey: 'docs.prezzo.note',
      },
      {
        kind: 'figure',
        src: 'landing/quote-detail.jpg',
        altKey: 'docs.prezzo.imageAlt',
        captionKey: 'docs.prezzo.imageCaption',
      },
    ],
    links: [
      { to: '/calculator', labelKey: 'docs.prezzo.linkCalculator' },
      { to: '/settings', labelKey: 'docs.prezzo.linkSettings' },
    ],
  },
  {
    id: 'preventivi',
    labelKey: 'docs.preventivi.label',
    titleKey: 'docs.preventivi.title',
    introKey: 'docs.preventivi.intro',
    blocks: [
      { kind: 'paragraph', textKey: 'docs.preventivi.p1' },
      { kind: 'paragraph', textKey: 'docs.preventivi.p2' },
      { kind: 'paragraph', textKey: 'docs.preventivi.p3' },
      {
        kind: 'bullets',
        titleKey: 'docs.preventivi.bulletsTitle',
        items: [
          'docs.preventivi.item1',
          'docs.preventivi.item2',
          'docs.preventivi.item3',
          'docs.preventivi.item4',
          'docs.preventivi.item5',
        ],
      },
      {
        kind: 'note',
        tone: 'info',
        titleKey: 'docs.preventivi.noteTitle',
        textKey: 'docs.preventivi.note',
      },
      {
        kind: 'figure',
        src: 'landing/quote-detail.jpg',
        altKey: 'docs.preventivi.imageAlt',
        captionKey: 'docs.preventivi.imageCaption',
      },
      {
        kind: 'figure',
        src: 'landing/share.jpg',
        altKey: 'docs.preventivi.image2Alt',
        captionKey: 'docs.preventivi.image2Caption',
      },
    ],
    links: [
      { to: '/quotes', labelKey: 'docs.preventivi.linkQuotes' },
      { to: '/settings', labelKey: 'docs.preventivi.linkSettings' },
    ],
  },
  {
    id: 'cloud-backup',
    labelKey: 'docs.cloud.label',
    titleKey: 'docs.cloud.title',
    introKey: 'docs.cloud.intro',
    blocks: [
      { kind: 'paragraph', textKey: 'docs.cloud.p1' },
      { kind: 'paragraph', textKey: 'docs.cloud.p2' },
      { kind: 'paragraph', textKey: 'docs.cloud.p3' },
      { kind: 'paragraph', textKey: 'docs.cloud.p4' },
      {
        kind: 'steps',
        titleKey: 'docs.cloud.stepsTitle',
        items: [
          'docs.cloud.step1',
          'docs.cloud.step2',
          'docs.cloud.step3',
          'docs.cloud.step4',
          'docs.cloud.step5',
        ],
      },
      {
        kind: 'note',
        tone: 'warning',
        titleKey: 'docs.cloud.noteTitle',
        textKey: 'docs.cloud.note',
      },
      {
        kind: 'figure',
        src: 'docs/settings.jpg',
        altKey: 'docs.cloud.imageAlt',
        captionKey: 'docs.cloud.imageCaption',
      },
    ],
    links: [
      { to: '/request-access', labelKey: 'docs.cloud.linkRequest' },
      { to: '/settings', labelKey: 'docs.cloud.linkSettings' },
    ],
  },
  {
    id: 'suggerimenti',
    labelKey: 'docs.suggerimenti.label',
    titleKey: 'docs.suggerimenti.title',
    introKey: 'docs.suggerimenti.intro',
    blocks: [
      { kind: 'paragraph', textKey: 'docs.suggerimenti.p1' },
      { kind: 'paragraph', textKey: 'docs.suggerimenti.p2' },
      {
        kind: 'steps',
        titleKey: 'docs.suggerimenti.stepsTitle',
        items: [
          'docs.suggerimenti.step1',
          'docs.suggerimenti.step2',
          'docs.suggerimenti.step3',
          'docs.suggerimenti.step4',
        ],
      },
      {
        kind: 'note',
        tone: 'warning',
        titleKey: 'docs.suggerimenti.noteTitle',
        textKey: 'docs.suggerimenti.note',
      },
    ],
    links: [{ to: '/feedback', labelKey: 'docs.suggerimenti.linkFeedback' }],
  },
] as const satisfies readonly DocsSection[]

export const DEFAULT_DOCS_SECTION = 'primi-passi'

export function findDocsSection(id: string | undefined): DocsSection | undefined {
  if (!id) return undefined
  return DOCS_SECTIONS.find((section) => section.id === id)
}

export function docsSectionNeighbours(id: string): {
  previous?: DocsSection
  next?: DocsSection
} {
  const index = DOCS_SECTIONS.findIndex((section) => section.id === id)
  if (index === -1) return {}
  return {
    previous: index > 0 ? DOCS_SECTIONS[index - 1] : undefined,
    next: index < DOCS_SECTIONS.length - 1 ? DOCS_SECTIONS[index + 1] : undefined,
  }
}
