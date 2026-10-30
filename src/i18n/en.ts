import { authEn } from './en/auth'
import { accessEn } from './en/access'
import { calculatorEn } from './en/calculator'
import { feedbackEn } from './en/feedback'
import { landingEn } from './en/landing'
import { catalogsEn } from './en/catalogs'
import { miscEn } from './en/misc'
import { quotesEn } from './en/quotes'
import { settingsEn } from './en/settings'
import { workspaceEn } from './en/workspace'
import { xlsxEn } from './en/xlsx'
import type { BaseMessageKey, Messages } from './it'

/** English dictionary. The `Messages` type keeps every key in sync with Italian. */
const baseEn: Record<BaseMessageKey, string> = {
  'app.name': 'LayerCost',
  'app.tagline': 'Cost and price for 3D prints',
  'app.dataLocal': 'Data is saved only in this browser.',
  'app.exportBackup': 'Export a backup',
  'app.engineVersion': 'Engine v{version}',
  'meta.title': 'LayerCost — Cost and price for 3D prints',
  'meta.description':
    'LayerCost — calculate the cost and price of 3D prints including materials, energy, wear and labor.',

  'nav.work': 'Work',
  'nav.configuration': 'Configuration',
  'nav.help': 'Help',
  'nav.docs': 'Documentation',
  'nav.feedback': 'Suggestions',
  'nav.overview': 'Overview',
  'nav.calculator': 'Calculator',
  'nav.quotes': 'Quotes',
  'nav.compare': 'Compare',
  'nav.printers': 'Printers',
  'nav.materials': 'Materials',
  'nav.tariffs': 'Energy tariffs',
  'nav.extras': 'Extras',
  'nav.settings': 'Settings',
  'nav.menu': 'Menu',
  'nav.close': 'Close',
  'nav.skipToContent': 'Skip to content',
  'nav.main': 'Main navigation',

  'common.cancel': 'Cancel',
  'common.close': 'Close',
  'common.back': 'Back',
  'common.next': 'Next',
  'common.optional': 'optional',
  'common.loading': 'Loading…',
  'common.retry': 'Try again',
  'common.error': 'Error',
  'common.warning': 'Warning',
  'common.expand': 'Expand {name}',
  'common.collapse': 'Collapse {name}',

  'discount.none': 'None',
  'discount.percent': 'Percentage',
  'discount.amount': 'Fixed amount',
  'discount.value': 'Discount value',

  'language.title': 'Language',
  'language.description':
    'Interface language. Saved quotes keep the language they were created in.',
  'language.it': 'Italiano',
  'language.en': 'English',

  'import.title': 'Import .3mf',
  'import.button': 'Import .3mf',
  'import.analyzing': 'Analyzing…',
  'import.loadingTitle': 'Analyzing file',
  'import.loadingDetail': 'The file is read locally and never leaves the browser.',
  'import.successTitle': 'Import complete',
  'import.errorTitle': 'Import failed',
  'import.printer': 'Printer',
  'import.plates': 'Plates',
  'import.choosePrinter': 'Choose a printer',
  'import.chooseMaterial': 'Choose a material',
  'import.cancel': 'Cancel',
  'import.confirmTitle': 'Add or replace?',
  'import.append': 'Add to draft',
  'import.replace': 'Replace lines',
  'import.back': 'Back',
  'import.noPrintersTitle': 'No active printers',
  'import.noPrintersBody': 'Add or reactivate a printer before importing a file.',
  'import.openPrinters': 'Open Printers',
  'import.noMaterialsTitle': 'No active materials',
  'import.noMaterialsBody': 'Add or reactivate a material before importing a file.',
  'import.openMaterials': 'Open Materials',
  'import.warnings': 'File warnings',
  'import.selectPlates': 'Select the plates to import. Each plate becomes a line with quantity 1.',
  'import.selectedCount': '{selected} of {total} selected',
  'import.importRows.one': 'Import {count} line',
  'import.importRows.other': 'Import {count} lines',
  'import.ready.one': '{count} line ready to import.',
  'import.ready.other': '{count} lines ready to import.',
  'import.selectAtLeastOne': 'Select at least one plate.',
  'import.choosePrinterHint': 'Choose the printer.',
  'import.completeMapping': 'Complete the material mapping.',
  'import.addPrinterHint': 'Add an active printer to import.',
  'import.addMaterialHint': 'Add an active material to import.',
  'import.draftNotSaved': 'The current draft is not in the archive yet.',
  'import.importingCount.one': 'You are importing {count} line from {file}.',
  'import.importingCount.other': 'You are importing {count} lines from {file}.',
  'import.appendHint':
    '“Add to draft” keeps the existing lines. “Replace lines” discards them but keeps the name, customer, labor costs and price.',
  'import.plate': 'Plate {index}',
  'import.timeMissing': 'Time missing',
  'import.materialCount.one': '{count} material',
  'import.materialCount.other': '{count} materials',
  'import.toComplete': 'Needs completion',
  'import.completePlate': 'Complete time and grams in the slicer to import this plate.',
  'import.zeroGrams': 'Filaments at 0 g are not imported.',
  'import.unknownType': 'Unknown type',
  'import.mappingIncomplete': 'Incomplete mapping',
  'import.mappingError': 'Could not import the selected plates. Check the mapping.',
  'import.fileTooLarge': 'The file exceeds {size} MB. Export a single plate or reduce the project.',
}

export const en: Messages = {
  ...baseEn,
  ...calculatorEn,
  ...quotesEn,
  ...catalogsEn,
  ...settingsEn,
  ...miscEn,
  ...xlsxEn,
  ...authEn,
  ...accessEn,
  ...landingEn,
  ...feedbackEn,
  ...workspaceEn,
}
