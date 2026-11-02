# ADR-0033 — Catalogo statico di profili stampante

**Stato:** Accettato; implementato, verificato e distribuito in produzione il 2 novembre 2026 (build `index-qC6ZIM_A.js` / `index-BJQMHja1.css`)
**Data:** 2 novembre 2026
**Relazione:** aggiunge preset non persistiti; non cambia formule, `engineVersion`, schema dati, backup o sync

## Contesto

Le due stampanti di partenza sono una Anycubic Kobra 3 e una Kobra X. Gli utenti hanno chiesto di poter aggiungere rapidamente altre macchine diffuse — Ender 3, FLSUN Super Racer, le Bambu Lab, altri modelli Anycubic e un elenco più ampio — senza compilare a mano prezzo, volume, potenza e manutenzione.

Espandere il seed avrebbe tre effetti indesiderati: ogni workspace e ogni installazione esistente riceverebbe decine di stampanti non richieste; i test e le fixture che assumono due stampanti cambierebbero; gli utenti dovrebbero archiviare ciò che non usano. Un catalogo remoto avrebbe richiesto rete, backend e una fonte da mantenere, in contrasto con l'app statica e local-first.

## Decisione

1. **Catalogo statico e separato dal seed.** `src/data/printer-catalog.ts` contiene **29 preset** di 8 marche (Bambu Lab, Creality, Anycubic, Prusa, Elegoo, FLSUN, Sovol, QIDI). Le due Kobra del seed restano fuori dal catalogo perché già presenti in ogni configurazione iniziale.

2. **Pagina lazy `/#/printers/catalog`.** La pagina è raggiungibile dalla testata di **Stampanti** e dal suo stato vuoto. Il catalogo non entra nel bundle iniziale: il chunk `PrinterCatalogPage` misura **4,5 KB gzip**. Il budget lazy resta **80 KB**, con **77,7 KB** misurati dopo l'aggiunta.

3. **Preset copiati, non referenziati.** `catalogEntryToPrinter` restituisce `Omit<Printer, 'id'>`; l'aggiunta passa dal normale `addPrinter`, che genera un ID e salva una stampante modificabile. Il catalogo non è una nuova entità di `AppData`, non ha `schemaVersion`, non entra in backup, snapshot o sync e non viene mai letto dal motore di costo. Lo stesso modello può essere aggiunto più volte per rappresentare più unità.

4. **Prezzi indicativi, IVA inclusa, SKU base.** I prezzi sono rilevati a novembre 2026 e rappresentano la macchina base, senza AMS/ACE opzionali. `multicolor` è `true` solo quando il sistema multicolore è incluso nella versione considerata (H2C AMS Combo); gli altri modelli con sistema opzionale hanno `multicolor: false` e una nota esplicita. I modelli fuori listino (P1P, X1 Carbon, Ender-3, Ender-3 V2, Super Racer) usano un prezzo indicativo dell'usato e confidenza bassa.

5. **Potenza nominale informativa, consumi stimati.** Ogni preset espone `ratedPowerW` come dato di scheda e quattro profili medi stimati per PLA, PETG, ABS e ASA, più `defaultAvgWatts` per le altre famiglie. I profili hanno `source: 'estimated'` e una nota che invita a misurare con una presa intelligente. La potenza nominale non entra mai nel costo; non si aggiunge alcun supplemento AMS/ACE perché i grammi dello slicer sono già il totale.

6. **Manutenzione coerente con il seed.** La riserva è **€0,01–0,03/h**, nello stesso ordine di grandezza delle due Kobra, invece del valore indicativo €0,08–0,20/h circolato nella prima stesura. Resta modificabile dopo l'aggiunta.

7. **Metadati di fiducia.** Ogni voce dichiara `source` (`official`, `retailer`, `aggregator`) e `confidence` (`high`, `medium`, `low`). La UI mostra fonte, data di rilevazione e confidenza; i link esterni non sono cliccabili, per non introdurre navigazione o richieste di rete.

8. **Ricerca e filtri lato client.** Ricerca senza distinzione di maiuscole o accenti su marca, nome e modello, filtro per marca, conteggio risultati con plurale `Intl`, stato vuoto con azzeramento filtri. “Già presente” è un avviso, non un blocco: l'utente può aggiungere una seconda unità.

9. **Compatibilità con l'import `.3mf`.** Il campo `model` usa il nome che lo slicer espone in `printer_model` (per esempio `Bambu Lab A1 mini` o `Creality Ender-3 V3 KE`), così il mapping dell'import propone la stampante aggiunta con un match esatto. Il test unitario verifica tutti i 29 preset.

10. **Nessuna dipendenza o chiamata di rete.** Catalogo, ricerca, filtri e pagina usano solo React, i componenti interni e i dizionari IT/EN. Nessun analytics, cookie, endpoint o servizio esterno.

11. **Nessun impatto sul dominio.** Non cambiano formule, `engineVersion`, schema locale v4, snapshot, RLS, auth o sync.

## Alternative considerate

- **Aggiungere tutte le stampanti al seed.** Sarebbe la via più semplice, ma imporrebbe decine di voci a ogni utente e workspace, cambierebbe i test che assumono due stampanti e renderebbe più difficile distinguere i dati iniziali. Scartata.
- **Catalogo remoto o API.** Permetterebbe aggiornamenti centralizzati, ma introduce rete, backend, cache e una fonte da mantenere; l'app è statica e funziona offline. Scartata.
- **Entità `PrinterPreset` persistita e referenziata.** Avrebbe richiesto schema, migrazione, sync e una relazione con `Printer`, senza vantaggi per l'utente. Scartata.
- **Solo profili di potenza senza prezzo o volume.** È il dato più difficile da stimare, ma l'utente ha chiesto esplicitamente i costi di acquisto e i preset servono a partire da valori completi. I metadati di confidenza rendono esplicito il limite. Scartata.
- **Profili per tutte le 12 famiglie di materiale.** Aggiungerebbe rumore e valori inventati per TPU, PA, PC e composite. Si usano quattro famiglie rappresentative più il default. Rimandata.
- **Link cliccabili alle fonti nella UI.** Sarebbero utili per la verifica, ma aggiungono navigazione esterna e possibili richieste; le fonti restano nella documentazione. Scartata.

## Conseguenze

- Nuovi `src/data/printer-catalog.ts`, `src/data/printer-catalog.test.ts` (11 test), `src/features/printers/PrinterCatalogPage.tsx` e `tests/e2e/printer-catalog.spec.ts` (3 test).
- `src/App.tsx` registra la route lazy; `PrintersPage` aggiunge il link al catalogo nella testata e nello stato vuoto.
- Nuove chiavi IT/EN per la pagina; la parità globale passa a **1352** chiavi.
- Aggiunta la route alle scansioni axe (48 totali) e al controllo delle richieste esterne.
- La verifica manuale di prezzi e specifiche è periodica: ogni revisione aggiorna `CATALOG_REVIEWED_AT`, le note e la confidenza. Un prezzo sbagliato non corrompe dati salvati, perché la stampante aggiunta è una copia modificabile.
- Rollback: rimuovere route, pagina, catalogo e chiavi i18n. Nessun dato utente o schema è coinvolto.

## Riferimenti

- `src/data/printer-catalog.ts`
- `src/features/printers/PrinterCatalogPage.tsx`
- `src/App.tsx`
- `docs/domain/sources.md` §7
- `docs/domain/data-model.md` §2.3.1
- `tests/e2e/printer-catalog.spec.ts`
- `scripts/check-budget.mjs`
