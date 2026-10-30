import type { MessageKey } from '../../i18n/it'

export interface LandingFeature {
  id: string
  nameKey: MessageKey
  bodyKey: MessageKey
  layerCostKey: MessageKey
  spreadsheetKey: MessageKey
}

export const LANDING_FEATURES: readonly LandingFeature[] = [
  {
    id: 'engine',
    nameKey: 'landing.features.engine.name',
    bodyKey: 'landing.features.engine.body',
    layerCostKey: 'landing.features.engine.layerCost',
    spreadsheetKey: 'landing.features.engine.spreadsheet',
  },
  {
    id: 'multi',
    nameKey: 'landing.features.multi.name',
    bodyKey: 'landing.features.multi.body',
    layerCostKey: 'landing.features.multi.layerCost',
    spreadsheetKey: 'landing.features.multi.spreadsheet',
  },
  {
    id: 'quotes',
    nameKey: 'landing.features.quotes.name',
    bodyKey: 'landing.features.quotes.body',
    layerCostKey: 'landing.features.quotes.layerCost',
    spreadsheetKey: 'landing.features.quotes.spreadsheet',
  },
  {
    id: 'import',
    nameKey: 'landing.features.import.name',
    bodyKey: 'landing.features.import.body',
    layerCostKey: 'landing.features.import.layerCost',
    spreadsheetKey: 'landing.features.import.spreadsheet',
  },
  {
    id: 'export',
    nameKey: 'landing.features.export.name',
    bodyKey: 'landing.features.export.body',
    layerCostKey: 'landing.features.export.layerCost',
    spreadsheetKey: 'landing.features.export.spreadsheet',
  },
  {
    id: 'compare',
    nameKey: 'landing.features.compare.name',
    bodyKey: 'landing.features.compare.body',
    layerCostKey: 'landing.features.compare.layerCost',
    spreadsheetKey: 'landing.features.compare.spreadsheet',
  },
]

export interface LandingFaq {
  id: string
  questionKey: MessageKey
  answerKey: MessageKey
}

export const LANDING_FAQS: readonly LandingFaq[] = [
  {
    id: 'account',
    questionKey: 'landing.faq.account.question',
    answerKey: 'landing.faq.account.answer',
  },
  {
    id: 'cost',
    questionKey: 'landing.faq.cost.question',
    answerKey: 'landing.faq.cost.answer',
  },
  {
    id: 'data',
    questionKey: 'landing.faq.data.question',
    answerKey: 'landing.faq.data.answer',
  },
  {
    id: 'devices',
    questionKey: 'landing.faq.devices.question',
    answerKey: 'landing.faq.devices.answer',
  },
  {
    id: 'access',
    questionKey: 'landing.faq.access.question',
    answerKey: 'landing.faq.access.answer',
  },
]

export interface LandingFact {
  id: string
  titleKey: MessageKey
  bodyKey: MessageKey
}

export const LANDING_PRIVACY_FACTS: readonly LandingFact[] = [
  {
    id: 'account',
    titleKey: 'landing.privacy.account.title',
    bodyKey: 'landing.privacy.account.body',
  },
  {
    id: 'data',
    titleKey: 'landing.privacy.data.title',
    bodyKey: 'landing.privacy.data.body',
  },
  {
    id: 'backup',
    titleKey: 'landing.privacy.backup.title',
    bodyKey: 'landing.privacy.backup.body',
  },
  {
    id: 'tracking',
    titleKey: 'landing.privacy.tracking.title',
    bodyKey: 'landing.privacy.tracking.body',
  },
]

export interface LandingSyncStep {
  id: string
  titleKey: MessageKey
  bodyKey: MessageKey
}

export const LANDING_SYNC_STEPS: readonly LandingSyncStep[] = [
  {
    id: 'request',
    titleKey: 'landing.sync.request.title',
    bodyKey: 'landing.sync.request.body',
  },
  {
    id: 'approve',
    titleKey: 'landing.sync.approve.title',
    bodyKey: 'landing.sync.approve.body',
  },
  {
    id: 'signin',
    titleKey: 'landing.sync.signin.title',
    bodyKey: 'landing.sync.signin.body',
  },
  {
    id: 'find',
    titleKey: 'landing.sync.find.title',
    bodyKey: 'landing.sync.find.body',
  },
]

export const LANDING_SECTIONS = [
  { id: 'features', labelKey: 'landing.nav.features' },
  { id: 'how-it-works', labelKey: 'landing.nav.how' },
  { id: 'privacy', labelKey: 'landing.nav.privacy' },
  { id: 'faq', labelKey: 'landing.nav.faq' },
] as const satisfies ReadonlyArray<{ id: string; labelKey: MessageKey }>
