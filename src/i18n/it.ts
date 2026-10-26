import { calculatorIt } from './it/calculator'
import { catalogsIt } from './it/catalogs'
import { miscIt } from './it/misc'
import { quotesIt } from './it/quotes'
import { settingsIt } from './it/settings'
import { xlsxIt } from './it/xlsx'

/**
 * Dizionario sorgente italiano.
 * Le chiavi sono piatte e namespaced: una chiave mancante in `en.ts` è un errore di tipo.
 */
export const baseIt = {
  'app.name': 'LayerCost',
  'app.tagline': 'Costo e prezzo delle stampe 3D',
  'app.dataLocal': 'Dati salvati solo su questo browser.',
  'app.exportBackup': 'Esporta un backup',
  'app.engineVersion': 'Motore v{version}',
  'meta.title': 'LayerCost — Costo e prezzo delle stampe 3D',
  'meta.description':
    'LayerCost — calcola costo e prezzo delle stampe 3D con materiali, energia, usura e manodopera.',

  'nav.work': 'Lavoro',
  'nav.configuration': 'Configurazione',
  'nav.calculator': 'Calcolatore',
  'nav.quotes': 'Preventivi',
  'nav.compare': 'Confronto',
  'nav.printers': 'Stampanti',
  'nav.materials': 'Materiali',
  'nav.tariffs': 'Tariffe energia',
  'nav.extras': 'Extra',
  'nav.settings': 'Impostazioni',
  'nav.menu': 'Menu',
  'nav.close': 'Chiudi',
  'nav.skipToContent': 'Vai al contenuto',
  'nav.main': 'Navigazione principale',

  'common.cancel': 'Annulla',
  'common.close': 'Chiudi',
  'common.back': 'Indietro',
  'common.next': 'Avanti',
  'common.optional': 'opzionale',
  'common.loading': 'Caricamento…',
  'common.error': 'Errore',
  'common.warning': 'Attenzione',

  'language.title': 'Lingua',
  'language.description':
    'La lingua dell’interfaccia. I preventivi salvati mantengono la lingua con cui sono stati creati.',
  'language.it': 'Italiano',
  'language.en': 'English',

  'import.title': 'Importa .3mf',
  'import.button': 'Importa .3mf',
  'import.analyzing': 'Analisi…',
  'import.loadingTitle': 'Analisi del file in corso',
  'import.loadingDetail': 'Il file viene letto in locale e non lascia il browser.',
  'import.successTitle': 'Import completato',
  'import.errorTitle': 'Importazione non riuscita',
  'import.printer': 'Stampante',
  'import.plates': 'Piatti',
  'import.choosePrinter': 'Scegli una stampante',
  'import.chooseMaterial': 'Scegli materiale',
  'import.cancel': 'Annulla',
  'import.confirmTitle': 'Aggiungere o sostituire?',
  'import.append': 'Aggiungi alla bozza',
  'import.replace': 'Sostituisci le righe',
  'import.back': 'Indietro',
  'import.noPrintersTitle': 'Nessuna stampante attiva',
  'import.noPrintersBody': 'Aggiungi o riattiva una stampante prima di importare un file.',
  'import.openPrinters': 'Apri Stampanti',
  'import.noMaterialsTitle': 'Nessun materiale attivo',
  'import.noMaterialsBody': 'Aggiungi o riattiva un materiale prima di importare un file.',
  'import.openMaterials': 'Apri Materiali',
  'import.warnings': 'Avvisi sul file',
  'import.selectPlates':
    'Seleziona i piatti da importare. Ogni piatto diventa una riga con quantità 1.',
  'import.selectedCount': '{selected} di {total} selezionati',
  'import.importRows.one': 'Importa {count} riga',
  'import.importRows.other': 'Importa {count} righe',
  'import.ready.one': '{count} riga pronta da importare.',
  'import.ready.other': '{count} righe pronte da importare.',
  'import.selectAtLeastOne': 'Seleziona almeno un piatto.',
  'import.choosePrinterHint': 'Scegli la stampante.',
  'import.completeMapping': 'Completa la mappatura dei materiali.',
  'import.addPrinterHint': 'Aggiungi una stampante attiva per importare.',
  'import.addMaterialHint': 'Aggiungi un materiale attivo per importare.',
  'import.draftNotSaved': 'La bozza corrente non è ancora nello storico.',
  'import.importingCount.one': 'Stai importando {count} riga da {file}.',
  'import.importingCount.other': 'Stai importando {count} righe da {file}.',
  'import.appendHint':
    '“Aggiungi alla bozza” mantiene le righe esistenti. “Sostituisci le righe” le scarta, ma conserva nome, cliente, costi di lavoro e prezzo.',
  'import.plate': 'Piatto {index}',
  'import.timeMissing': 'Tempo mancante',
  'import.materialCount.one': '{count} materiale',
  'import.materialCount.other': '{count} materiali',
  'import.toComplete': 'Da completare',
  'import.completePlate': 'Completa tempo e grammi nello slicer per importare questo piatto.',
  'import.zeroGrams': 'I filamenti a 0 g non vengono importati.',
  'import.unknownType': 'Tipo sconosciuto',
  'import.mappingIncomplete': 'Mappatura incompleta',
  'import.mappingError': 'Impossibile importare i piatti selezionati. Controlla la mappatura.',
  'import.fileTooLarge': 'Il file supera {size} MB. Esporta un solo piatto o riduci il progetto.',
} as const

export const it = {
  ...baseIt,
  ...calculatorIt,
  ...quotesIt,
  ...catalogsIt,
  ...settingsIt,
  ...miscIt,
  ...xlsxIt,
} as const

export type BaseMessageKey = keyof typeof baseIt
export type MessageKey = keyof typeof it
export type Messages = Record<MessageKey, string>
