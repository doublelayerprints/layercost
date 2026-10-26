export const settingsIt = {
  'settings.pageDescription':
    'Valori predefiniti per i nuovi preventivi e preferenze di questo browser. Ogni preventivo può poi sovrascrivere il prezzo.',
  'settings.doneTitle': 'Fatto',
  'settings.importFailedTitle': 'Importazione non riuscita',
  'settings.importFailed': 'Importazione non riuscita.',
  'settings.importSuccess':
    'Backup importato. È stata scaricata anche una copia dei dati precedenti.',
  'settings.resetSuccess': 'Dati ripristinati alla configurazione iniziale.',
  'settings.autosaveHint':
    'Le modifiche si salvano subito in questo browser. Esporta un backup prima di cambiare dispositivo o svuotare i dati.',

  'settings.laborTitle': 'Manodopera e rischio',
  'settings.laborDescription':
    'La manodopera è 0 per impostazione predefinita: attivala se vuoi conteggiare il tuo tempo. Il tasso guasti è una riserva, non un costo certo.',
  'settings.currentSummary':
    'Oggi: manodopera {labor}/h · guasti {failure} · maggiorazione tempo {overhead} · {allocation}.',
  'settings.allocationProportionalShort': 'proporzionale',
  'settings.allocationEqualPerUnitShort': 'uguale per pezzo',
  'settings.laborRate': 'Manodopera',
  'settings.failureRate': 'Tasso guasti',
  'settings.failureRateHint': 'I materiali possono sovrascriverlo.',
  'settings.timeOverhead': 'Maggiorazione tempo',
  'settings.timeOverheadHint': 'Aggiunta al tempo dello slicer, prima dell’avvio.',
  'settings.allocationLabel': 'Ripartizione costi fissi',
  'settings.allocationProportional': 'Proporzionale al costo',
  'settings.allocationEqualPerUnit': 'Uguale per pezzo',
  'settings.allocationHint': 'Come distribuire setup, design e spedizione sulle righe.',

  'settings.pricingTitle': 'Prezzo predefinito',
  'settings.pricingDescription':
    'Questi valori vengono copiati nel nuovo preventivo; puoi modificarli caso per caso.',
  'settings.pricingExampleTitle': 'Esempio con le regole attuali',
  'settings.pricingExamplePrefix': 'Un lavoro da {cost} di costo diventa',
  'settings.pricingExampleNet': 'netti',
  'settings.pricingExampleWithVat': 'e {gross} con IVA {vat}.',
  'settings.pricingExampleWithoutVat': ', senza IVA.',
  'settings.pricingModeLabel': 'Modalità',
  'settings.pricingModeMarkup': 'Ricarico sul costo',
  'settings.pricingModeMargin': 'Margine sul prezzo',
  'settings.markup': 'Ricarico',
  'settings.margin': 'Margine',
  'settings.roundingMode': 'Arrotondamento',
  'settings.roundingUp': 'Per eccesso',
  'settings.roundingNearest': 'Al più vicino',
  'settings.roundingDown': 'Per difetto',
  'settings.roundingStep': 'Passo',
  'settings.vatMode': 'IVA',
  'settings.vatNone': 'Nessuna IVA',
  'settings.vatExcluded': 'IVA esclusa',
  'settings.vatIncluded': 'IVA inclusa',
  'settings.vatRate': 'Aliquota IVA',

  'settings.languageTitle': 'Lingua',
  'settings.languageDescription':
    'Lingua dell’interfaccia. I preventivi salvati mantengono la lingua con cui sono stati creati.',
  'settings.languageLegend': 'Lingua dell’interfaccia',
  'settings.languageIt': 'Italiano',
  'settings.languageItDescription': 'Interfaccia, errori e formattazione in italiano.',
  'settings.languageEn': 'English',
  'settings.languageEnDescription': 'Interfaccia, errori e formattazione in inglese (en-GB).',
  'settings.languageHint': 'La preferenza resta in questo browser e non entra nei backup.',

  'settings.appearanceTitle': 'Aspetto',
  'settings.appearanceDescription':
    'Il tema si applica subito e resta su questo browser. La stampa usa sempre fondo bianco e testo nero.',
  'settings.themeLegend': 'Tema dell’interfaccia',
  'settings.themeSystem': 'Sistema',
  'settings.themeSystemDescription': 'Segue l’impostazione di macOS, Windows o del telefono.',
  'settings.themeLight': 'Chiaro',
  'settings.themeLightDescription': 'Fondo chiaro, sempre.',
  'settings.themeDark': 'Scuro',
  'settings.themeDarkDescription': 'Fondo scuro con testo chiaro.',
  'settings.themeSystemHint':
    '“Sistema” segue l’impostazione del dispositivo e si aggiorna quando cambia.',

  'settings.dataTitle': 'Dati e backup',
  'settings.dataDescription':
    'I dati vivono solo in questo browser. Un backup JSON è l’unica copia esterna; il file Excel serve per analisi e non sostituisce il backup. Importare un JSON sostituisce configurazione, preventivi e bozza.',
  'settings.schemaEngineVersion': 'Schema v{schema} · Motore v{engine}',
  'settings.exportJson': 'Esporta JSON',
  'settings.importJson': 'Importa JSON',
  'settings.reviewOnboarding': 'Rivedi la guida iniziale',
  'settings.resetHeading': 'Ripristina i dati iniziali',
  'settings.resetDescription':
    'Elimina tutti i preventivi e le personalizzazioni e ricarica il seed. L’operazione chiede conferma e non è reversibile.',
  'settings.resetAction': 'Ripristina dati iniziali',

  'settings.importModalTitle': 'Importare il backup?',
  'settings.importConfirm': 'Importa e sostituisci',
  'settings.importModalDescription':
    'L’importazione sostituisce la configurazione, i preventivi e la bozza corrente. Prima di procedere verrà scaricato un backup dei dati attuali.',
  'settings.resetModalTitle': 'Ripristinare i dati iniziali?',
  'settings.resetConfirm': 'Ripristina',
  'settings.resetModalDescription':
    'Verranno eliminati tutti i preventivi e le personalizzazioni. Esporta un backup prima di continuare.',
} as const
