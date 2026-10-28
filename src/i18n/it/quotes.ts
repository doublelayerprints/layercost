export const quotesIt = {
  'quote.status.saved': 'Salvato',
  'quote.status.sent': 'Inviato',
  'quote.status.completed': 'Completato',
  'quote.status.archived': 'Archiviato',
  'quote.status.draft': 'Bozza',
  'quote.status.notRecalculable': 'Non ricalcolabile',

  'quote.lineCount.one': '{count} riga',
  'quote.lineCount.other': '{count} righe',

  // Table headers shared by the list, the detail and the print layout.
  'quote.label.quote': 'Preventivo',
  'quote.label.status': 'Stato',
  'quote.label.lines': 'Righe',
  'quote.label.cost': 'Costo',
  'quote.label.price': 'Prezzo',
  'quote.label.print': 'Stampa',
  'quote.label.printer': 'Stampante',
  'quote.label.material': 'Materiale',
  'quote.label.time': 'Tempo',
  'quote.label.pieces': 'Pezzi',
  'quote.label.fullyLoadedCost': 'Costo pieno',
  'quote.label.linePrice': 'Prezzo di riga',

  // Quotes archive (QuotesPage).
  'quotes.title': 'Preventivi',
  'quotes.description': 'Ogni preventivo conserva i prezzi usati al momento del salvataggio.',
  'quotes.new': 'Nuovo preventivo',
  'quotes.search.label': 'Cerca preventivi',
  'quotes.search.placeholder': 'Cerca per nome o cliente…',
  'quotes.showArchived': 'Mostra archiviati',
  'quotes.goToCalculator': 'Vai al calcolatore',
  'quotes.resetSearch': 'Azzera la ricerca',
  'quotes.count.one': '{count} preventivo',
  'quotes.count.other': '{count} preventivi',
  'quotes.filteredOf': '{shown} di {total}',
  'quotes.empty.title': 'Nessun preventivo salvato',
  'quotes.empty.description': 'Calcola una stampa o un lotto e salvalo per ritrovarlo qui.',
  'quotes.noResults.title': 'Nessun risultato',
  'quotes.noResults.search': 'Nessun preventivo corrisponde alla ricerca.',
  'quotes.noResults.archived': 'Gli unici preventivi presenti sono archiviati.',
  'quotes.table.caption': 'Preventivi salvati',

  // Quote detail (QuoteDetailPage).
  'quote.notFound.title': 'Preventivo non trovato',
  'quote.notFound.heading': 'Questo preventivo non esiste più',
  'quote.notFound.description': 'Potrebbe essere stato eliminato o il link non è corretto.',
  'quote.backToArchive': 'Torna all’archivio',
  'quote.saved.title': 'Preventivo salvato',
  'quote.saved.body': 'È nello storico e conserva i prezzi usati adesso.',
  'quote.updated.title': 'Modifiche salvate',
  'quote.updated.body': 'Il preventivo è aggiornato e conserva i prezzi della prima stesura.',
  'quote.edit': 'Modifica preventivo',
  'quote.markSent': 'Segna come inviato',
  'quote.markCompleted': 'Segna come completato',
  'quote.locked.sent':
    'Inviato al cliente: non è più modificabile. Duplicalo per creare una copia.',
  'quote.locked.completed':
    'Completato e concluso: non è più modificabile. Duplicalo per creare una copia.',
  'quote.markSentConfirm.title': 'Segnare come inviato?',
  'quote.markSentConfirm.body':
    'Il preventivo verrà bloccato e non sarà più modificabile. Potrai duplicarlo per creare una copia.',
  'quote.markCompletedConfirm.title': 'Segnare come completato?',
  'quote.markCompletedConfirm.body':
    'Il preventivo verrà considerato concluso e non sarà più modificabile. Potrai duplicarlo per creare una copia.',
  'quote.engineMismatch.title': 'Versione del motore diversa',
  'quote.engineMismatch.body':
    'Questo preventivo è stato calcolato con il motore v{savedVersion}; quello attuale è v{currentVersion}. I numeri salvati restano validi come storico. Usa “Aggiorna ai prezzi correnti” per creare una copia ricalcolata.',
  'quote.refresh': 'Aggiorna ai prezzi correnti',
  'quote.manage.title': 'Gestione del preventivo',
  'quote.manage.description':
    'Modificabile finché è salvato: invio e completamento lo bloccano. Archiviare non cancella nulla.',
  'quote.duplicate': 'Duplica nel calcolatore',
  'quote.archive': 'Archivia',
  'quote.restore': 'Ripristina',
  'quote.delete': 'Elimina definitivamente',
  'quote.replaceDraft.title': 'Sostituire la bozza corrente?',
  'quote.replaceDraft.confirm': 'Sostituisci la bozza',
  'quote.replaceDraft.body': '“{name}” verrà aperto nel calcolatore come nuova bozza.',
  'quote.editDraft.body': '“{name}” verrà aperto in modifica. La bozza corrente sarà sostituita.',
  'quote.replaceDraft.hint':
    'La bozza corrente non è ancora nello storico e verrà sostituita. Se vuoi conservarla, annulla e salvala prima di continuare.',
  'quote.deleteConfirm.title': 'Eliminare il preventivo?',
  'quote.deleteConfirm.body':
    '“{name}” verrà rimosso dallo storico. L’operazione non è reversibile.',
  'quote.deleteConfirm.hint':
    'Se vuoi solo toglierlo dalla lista, usa “Archivia”: resta consultabile.',

  // Quote summary (QuoteOverview).
  'quote.notRecalculable.title': 'Preventivo non ricalcolabile',
  'quote.notRecalculable.body':
    'La configurazione usata da questo preventivo non è più disponibile o contiene dati non validi. I numeri salvati restano consultabili; usa “Duplica nel calcolatore” e correggi le righe per ricalcolarlo.',
  'quote.totalPrice': 'Prezzo totale',
  'quote.netPrice': 'Prezzo netto',
  'quote.price.netAndVat': '{net} netto + {vat} IVA',
  'quote.price.noVat': 'Nessuna IVA',
  'quote.directCost': 'Costo diretto',
  'quote.fixedCosts': 'Costi fissi',
  'quote.discountTotal': 'Sconti',
  'quote.lineDiscountAmount': 'Sconto −{amount}',
  'quote.discountBreakdown': 'di cui righe {lines} · preventivo {quote}',
  'quote.profit': 'Guadagno',
  'quote.effectiveMargin': 'Margine effettivo',
  'quote.costComposition': 'Composizione del costo',
  'quote.snapshot.frozen': 'Tariffe congelate al {date} · Motore v{version}',
  'quote.currentPrices': 'Prezzi dalla configurazione corrente',
  'quote.lines.title': 'Righe del preventivo',
  'quote.lines.description':
    'I prezzi di riga sono una quota del prezzo totale, non prezzi indipendenti.',
  'quote.noCustomer': 'Nessun cliente',
  'quote.noMaterial': 'Nessun materiale',
  'quote.perPiece': 'per pezzo',
  'quote.printerUnavailable': 'Stampante non disponibile',
  'quote.notes': 'Note',
  'quote.unit.pieces': 'pz',
  'quote.unit.pricePerPiece': '/pz',

  // Print layout (QuotePrint).
  'print.action': 'Stampa / PDF',
  'print.internalAction': 'Stampa interna',
  'quote.print.title': 'Preventivo',
  'quote.print.customer': 'Cliente: {name}',
  'quote.print.effectiveTime': 'Tempo effettivo',
  'quote.print.lineGrams': '{unit} per pezzo · {total} totali',
  'quote.print.lineGramsTotal': '{total} totali',
  'quote.print.linePriceNote':
    'Il prezzo di riga è una quota del prezzo totale, non un prezzo indipendente.',
  'quote.print.internalBadge': 'Uso interno · include i costi',
  'quote.print.footer':
    'Generato con LayerCost il {date}. I costi sono una stima basata sui parametri configurati.',
  'quote.print.footerCustomer': 'Generato con LayerCost il {date}.',

  // Shared quote link (SharePage).
  'share.error.noPayload': 'Il link non contiene un preventivo.',
  'share.error.invalid': 'Il link non è valido.',
  'share.error.empty': 'Il link condiviso è vuoto o danneggiato.',
  'share.error.invalidData': 'Il link condiviso non contiene dati validi.',
  'share.error.noQuote': 'Il link condiviso non contiene un preventivo.',
  'share.error.invalidQuote': 'Il preventivo condiviso non è valido o è incompleto.',
  'share.invalid.title': 'Link non valido',
  'share.invalid.heading': 'Impossibile aprire il preventivo',
  'share.invalid.description': 'Il link è incompleto o danneggiato.',
  'share.invalid.action': 'Vai a LayerCost',
  'share.description':
    'Preventivo condiviso in sola lettura. I numeri sono quelli salvati dal mittente.',
  'share.badge': 'Link condiviso',
  'share.import': 'Importa nel mio archivio',
  'share.info.title': 'Cosa stai vedendo',
  'share.info.body':
    'Questa pagina mostra solo il preventivo contenuto nel link. Non hai accesso alla configurazione o agli altri dati del mittente.',

  // Share dialog (ShareQuoteButton).
  'share.button': 'Condividi',
  'share.title': 'Condividi preventivo',
  'share.copied': 'Copiato',
  'share.copy': 'Copia link',
  'share.error.incomplete': 'Completa il calcolo prima di condividere il preventivo.',
  'share.error.create': 'Impossibile creare il link.',
  'share.error.copy': 'Copia non riuscita. Seleziona il link e copialo manualmente.',
  'share.link.description':
    'Il link contiene una copia del preventivo, non i tuoi dati di configurazione. Chi lo riceve può leggerlo e importarlo nel proprio archivio.',
  'share.link.label': 'Link',
  'share.privacy.title': 'Privacy',
  'share.privacy.body':
    'Chiunque abbia il link può leggere i dati del preventivo. Non inserire dati sensibili.',
} as const
