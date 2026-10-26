import type { settingsIt } from '../it/settings'

export const settingsEn: Record<keyof typeof settingsIt, string> = {
  'settings.pageDescription':
    'Default values for new quotes and preferences for this browser. Each quote can still override the price.',
  'settings.doneTitle': 'Done',
  'settings.importFailedTitle': 'Import failed',
  'settings.importFailed': 'Import failed.',
  'settings.importSuccess': 'Backup imported. A copy of the previous data was also downloaded.',
  'settings.resetSuccess': 'Data restored to the initial configuration.',
  'settings.autosaveHint':
    'Changes are saved immediately in this browser. Export a backup before switching device or clearing data.',

  'settings.laborTitle': 'Labour and risk',
  'settings.laborDescription':
    'Labour is 0 by default: turn it on if you want to account for your time. The failure rate is an allowance, not a certain cost.',
  'settings.currentSummary':
    'Today: labour {labor}/h · failures {failure} · time overhead {overhead} · {allocation}.',
  'settings.allocationProportionalShort': 'proportional',
  'settings.allocationEqualPerUnitShort': 'equal per piece',
  'settings.laborRate': 'Labour',
  'settings.failureRate': 'Failure rate',
  'settings.failureRateHint': 'Materials can override it.',
  'settings.timeOverhead': 'Time overhead',
  'settings.timeOverheadHint': 'Added to slicer time, before setup.',
  'settings.allocationLabel': 'Fixed cost allocation',
  'settings.allocationProportional': 'Proportional to cost',
  'settings.allocationEqualPerUnit': 'Equal per piece',
  'settings.allocationHint': 'How to spread setup, design and shipping across lines.',

  'settings.pricingTitle': 'Default price',
  'settings.pricingDescription':
    'These values are copied into new quotes; you can change them case by case.',
  'settings.pricingExampleTitle': 'Example with the current rules',
  'settings.pricingExamplePrefix': 'A job costing {cost} becomes',
  'settings.pricingExampleNet': 'net',
  'settings.pricingExampleWithVat': 'and {gross} with {vat} VAT.',
  'settings.pricingExampleWithoutVat': ', without VAT.',
  'settings.pricingModeLabel': 'Mode',
  'settings.pricingModeMarkup': 'Markup on cost',
  'settings.pricingModeMargin': 'Margin on price',
  'settings.markup': 'Markup',
  'settings.margin': 'Margin',
  'settings.roundingMode': 'Rounding',
  'settings.roundingUp': 'Up',
  'settings.roundingNearest': 'Nearest',
  'settings.roundingDown': 'Down',
  'settings.roundingStep': 'Step',
  'settings.vatMode': 'VAT',
  'settings.vatNone': 'No VAT',
  'settings.vatExcluded': 'VAT excluded',
  'settings.vatIncluded': 'VAT included',
  'settings.vatRate': 'VAT rate',

  'settings.languageTitle': 'Language',
  'settings.languageDescription':
    'Interface language. Saved quotes keep the language they were created in.',
  'settings.languageLegend': 'Interface language',
  'settings.languageIt': 'Italiano',
  'settings.languageItDescription': 'Italian interface, errors and formatting.',
  'settings.languageEn': 'English',
  'settings.languageEnDescription': 'English interface, errors and formatting (en-GB).',
  'settings.languageHint': 'The preference stays in this browser and is not included in backups.',

  'settings.appearanceTitle': 'Appearance',
  'settings.appearanceDescription':
    'The theme applies immediately and stays in this browser. Printing always uses a white background and black text.',
  'settings.themeLegend': 'Interface theme',
  'settings.themeSystem': 'System',
  'settings.themeSystemDescription': 'Follows the setting on macOS, Windows or your phone.',
  'settings.themeLight': 'Light',
  'settings.themeLightDescription': 'Light background, always.',
  'settings.themeDark': 'Dark',
  'settings.themeDarkDescription': 'Dark background with light text.',
  'settings.themeSystemHint': '“System” follows the device setting and updates when it changes.',

  'settings.dataTitle': 'Data and backups',
  'settings.dataDescription':
    'Data lives only in this browser. A JSON backup is the only external copy: importing it replaces the configuration, quotes and draft.',
  'settings.schemaEngineVersion': 'Schema v{schema} · Engine v{engine}',
  'settings.exportJson': 'Export JSON',
  'settings.importJson': 'Import JSON',
  'settings.reviewOnboarding': 'Review the onboarding guide',
  'settings.resetHeading': 'Restore initial data',
  'settings.resetDescription':
    'Deletes all quotes and customisations and reloads the seed. The operation asks for confirmation and cannot be undone.',
  'settings.resetAction': 'Restore initial data',

  'settings.importModalTitle': 'Import the backup?',
  'settings.importConfirm': 'Import and replace',
  'settings.importModalDescription':
    'The import replaces the current configuration, quotes and draft. A backup of the current data will be downloaded before proceeding.',
  'settings.resetModalTitle': 'Restore initial data?',
  'settings.resetConfirm': 'Restore',
  'settings.resetModalDescription':
    'All quotes and customisations will be deleted. Export a backup before continuing.',
}
