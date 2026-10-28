# ADR-0022 — Vista interna e vista cliente del preventivo

**Stato:** Accettato
**Data:** 28 ottobre 2026

## Contesto

Il preventivo contiene sia i prezzi sia i dati economici interni: costo pieno, costo diretto, costi fissi, utile, margine effettivo e composizione del costo. Fino alla v1.0.0 la stessa vista (`QuoteOverview`) e lo stesso layout di stampa (`QuotePrint`) erano usati nel calcolatore, nel dettaglio, nel link condiviso e nel PDF. Di conseguenza il cliente che apriva il link o riceveva la stampa vedeva anche il margine.

Il committente vuole vedere chiaramente quanto guadagna, ma solo nella vista del configuratore/creatore. Il documento consegnato al cliente deve mostrare solo prezzi, IVA e note.

## Decisione

1. **Due audience di presentazione.** `QuoteOverview` e `QuotePrint` accettano `audience: 'internal' | 'customer'`. La vista interna mostra tutti i dati economici; la vista cliente mostra solo prezzi, IVA, righe e note.
2. **Cliente di default nella stampa.** `QuotePrint` usa `customer` come default: una stampa è un documento che può uscire dall'app. La stampa interna va scelta esplicitamente.
3. **Utile derivato.** L'utile in euro è `netPrice − totalCost`, calcolato per la UI da `src/lib/quote-profit.ts`. Non entra in `QuoteResult`, non viene persistito e non cambia `engineVersion`.
4. **Due azioni nel dettaglio.** “Stampa / PDF” produce la versione cliente; “Stampa interna” produce la versione con costi e composizione, marcata “Uso interno” nell'intestazione. Il calcolatore stampa la versione cliente.
5. **Link condiviso invariato nei dati.** Il payload del link continua a contenere il preventivo completo, per compatibilità con i link esistenti e con l'import nell'archivio. La separazione è di visualizzazione, non di cifratura o autorizzazione: chi decodifica il link può ancora leggere i dati interni. Una futura rimozione o cifratura dei dati condivisi richiede un ADR separato e una migrazione dei link.

## Alternative considerate

- **Un oggetto “preventivo cliente” separato.** Pulito, ma cambia schema, import, snapshot e link: troppo costoso per una correzione di visualizzazione.
- **Rimuovere i costi dal payload condiviso.** Protegge anche chi decodifica il link, ma rompe l'import completo nel proprio archivio e richiede una migrazione dei link esistenti.
- **Nascondere solo il margine.** Il costo pieno resterebbe visibile e permetterebbe di ricavare il margine: non soddisfa la richiesta.
- **Nessuna stampa interna.** Semplice, ma toglie al creatore il documento di lavoro con i costi.

## Conseguenze

- La vista cliente e il PDF standard non contengono costo, utile, margine, composizione del costo, dettaglio costi o versione motore.
- La vista interna resta su calcolatore e dettaglio; l'utile è mostrato in euro con il margine effettivo come nota.
- I test E2E verificano che il link condiviso e la sua stampa non contengano le etichette economiche interne.
- Nessun cambio a formule, schema, snapshot, persistenza o `engineVersion`.
- I dati economici restano nel link compresso: la protezione è solo visuale. Per una protezione reale servirà un ADR successivo.
