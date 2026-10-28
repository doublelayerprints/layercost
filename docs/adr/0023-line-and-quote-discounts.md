# ADR-0023 — Sconti di riga e di preventivo, percentuali o a importo fisso

**Stato:** Accettato
**Data:** 28 ottobre 2026

## Contesto

Fino alla v1.0.0 il preventivo aveva un solo sconto, percentuale e applicato al totale (`QuotePricing.discountBp`). Il committente ha chiesto di poter:

- applicare uno sconto alla singola stampa oltre che al totale del preventivo;
- scegliere tra sconto percentuale e sconto di importo fisso deciso dall'utente.

La richiesta cambia la semantica del prezzo e la struttura di `QuoteResult`, quindi richiede un nuovo ADR, un aggiornamento del modello dati, dei golden test e di `engineVersion`.

## Decisione

1. **Due livelli di sconto.** `PrintLine.discount?: DiscountRule` è lo sconto sulla singola riga; `QuotePricing.discount?: DiscountRule` è lo sconto sul preventivo.
2. **Due modalità.** `DiscountRule` è un'unione discriminata:
   - `{ mode: 'percent'; valueBp }`, con valore tra 0% e 90%;
   - `{ mode: 'amount'; amount }`, importo intero in µ€.
3. **Importo fisso di riga sul totale.** Con quantità maggiore di 1, l'importo fisso si sottrae dal totale della riga, non da ogni pezzo. Lo sconto percentuale è una percentuale del totale della riga.
4. **Cumulo.** Prima si applicano gli sconti di riga, poi quello del preventivo sul totale già scontato. Non ci sono esclusioni reciproche.
5. **Limite a zero.** Uno sconto di importo fisso viene limitato al prezzo disponibile: il prezzo non diventa negativo e la UI mostra un avviso quando il valore richiesto viene ridotto. Le percentuali restano limitate al 90%.
6. **Ordine di calcolo.** Costo pieno → ricarico o margine → sconto di riga → sconto del preventivo → arrotondamento → IVA → allocazione dei prezzi di riga. Senza sconti di riga il risultato resta identico a quello precedente.
7. **Risultati espliciti.** `QuoteResult` espone `lineDiscountTotal`, `quoteDiscount` e `discount` (somma dei due). `LineResult.discount` espone lo sconto applicato alla riga. `engineVersion` passa a **1.0.0** perché cambia la struttura e il significato di `discount`.
8. **Schema v4.** `QuotePricing.discount` sostituisce `discountBp`; `PrintLine.discount` è opzionale. La migrazione v3 → v4 converte i vecchi `discountBp` positivi in una regola percentuale, tratta `0` come nessuno sconto e salva un backup raw prima di applicarla. I link condivisi pre-v4 vengono normalizzati in lettura.
9. **Presentazione.** Sconti di riga, sconto preventivo e sconto totale compaiono in calcolatore, dettaglio, stampa/PDF, link condiviso ed export `.xlsx`. La vista cliente mostra gli sconti ma non i costi interni.
10. **Nessun costo scontato.** Gli sconti sono commerciali: riducono il prezzo, non il costo pieno, il margine effettivo o la riserva guasti.

## Alternative considerate

- **Solo sconto percentuale, con importo fisso simulato dall'utente.** Semplice, ma non soddisfa la richiesta e costringe a calcoli esterni.
- **Importo fisso per pezzo.** Con quantità 3 e 5 € di sconto, il prezzo scende di 15 €; è più simile a un ribasso unitario, ma può azzerare la riga e rende meno leggibile il totale. Il committente ha scelto il totale della riga.
- **Sconti non cumulabili.** Evita il doppio sconto, ma impedisce combinazioni normali (sconto sulla stampa più sconto commerciale sul preventivo).
- **Errore quando lo sconto supera il prezzo.** Più esplicito, ma può rendere non ricalcolabili preventivi salvati dopo una modifica dei dati. Si è scelto il limite a zero con avviso.
- **Mantenere `discountBp` e aggiungere campi opzionali.** Evita la migrazione, ma lascia due fonti di verità e stati incoerenti.

## Conseguenze

- Il preventivo ha due sconti indipendenti e cumulabili; i risultati e la stampa mostrano il dettaglio.
- La migrazione v3 → v4 è retrocompatibile: i vecchi sconti percentuali restano identici.
- I link condivisi creati prima della v4 continuano a funzionare.
- `engineVersion` 1.0.0 invalida i risultati calcolati con il motore precedente; i preventivi salvati vengono ricalcolati dallo snapshot al caricamento.
- I test coprono percentuale di riga, importo fisso, cumulo, limite a zero, somma esatta dei prezzi di riga, migrazione e link condivisi.
- Le baseline visive vanno rigenerate perché le card del calcolatore e le viste del preventivo cambiano.
- Nessun dato utente viene cancellato: la migrazione conserva il raw in `layercost:backup:schema-3`.
