# ADR-0014 — Snapshot completo e prezzi di riga al netto IVA

**Stato:** Accettato
**Data:** 23 ottobre 2026

## Contesto

L'ADR-0004 richiede preventivi immutabili. L'ADR-0007/0010 lasciava aperta la forma esatta dello snapshot e l'allocazione dei prezzi di riga.

## Decisione

1. Lo snapshot contiene una **copia completa di `CostConfig`** (impostazioni, stampanti, materiali, extra), oltre a `capturedAt` e `engineVersion`. È più semplice e più riproducibile di un elenco di tariffe per riga.
2. I prezzi di riga sono un'**allocazione del prezzo netto totale**, in centesimi, con il metodo dei resti più grandi. L'IVA è mostrata a parte sul totale.
3. Il risultato è memorizzato in `Quote.result`; il ricalcolo usa lo snapshot.

## Alternative considerate

- **Solo tariffe risolte per riga:** più compatto, ma più fragile se servono nuove grandezze.
- **Riferimenti live alla configurazione:** i vecchi preventivi cambierebbero.
- **Prezzi di riga con IVA:** confonde il margine e la somma delle righe.

## Conseguenze

- Storage leggermente più grande per preventivo.
- Riproducibilità completa.
- La UI deve spiegare che i prezzi di riga sono quote del totale.
- Un futuro cambio di schema richiede una migrazione.
