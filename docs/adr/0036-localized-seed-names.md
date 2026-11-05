# ADR-0036 — Seed localizzati: i nomi dei dati di partenza seguono la lingua della sessione

**Data:** 05/11/2026 · **Stato:** accettato · **Collegati:** ADR-0029 (landing), T5.6 (i18n), ADR-0028 (spazi personali)

---

## 1. Contesto

Il seed (`src/data/seed.ts`) crea i dati di partenza — tariffe, stampanti, materiali,
extra — con nomi e note in italiano («Sacchetto zip», «Tariffa attuale», fornitore
«Generico»). Con l'arrivo della pagina inglese `/en/` (ADR-0035) un visitatore inglese
si ritrova dati con etichette italiane. Il pattern per i nomi localizzati esiste già
per i documenti (`EMPTY_DRAFT_NAMES[locale]`, `EMPTY_LINE_NAMES[locale]`).

## 2. Decisione

1. **Il seed segue la lingua della sessione al primo avvio.** `createSeedConfig(locale)`
   produce gli stessi ID e gli stessi valori economici con nomi, note, categorie e
   fornitore nella lingua richiesta (`it` default per compatibilità, `en` per la
   sessione inglese). La lingua arriva da `initialLocale`/`loadLocalePreference()`
   (path `/en/` o preferenza salvata), coerente con il boot dell'app.
2. **Gli ID restano stabili in entrambe le lingue** (`extra-zip-bag`, `printer-kobra-3`,
   …): snapshot, link condivisi, XLSX e sync non cambiano; `seedIds` continua a valere.
3. **I nomi sono dati, non copia.** Il seed localizza solo la **prima creazione**: i
   dati esistenti non vengono mai rinominati al cambio lingua, né in locale né sul
   cloud (gli spazi personali nuovi nascono con la lingua della sessione che li crea;
   `ws-doublelayer` resta com'è). Chi vuole nomi diversi li rinomina nell'app.
4. **`Settings.locale` resta `'it-IT'`.** Il campo è record storico del valore
   predefinito, non ha consumatori di formattazione (la formattazione usa la lingua UI
   e `Quote.locale`): allargarlo al solo scopo del seed aggiungerebbe superficie di
   schema senza beneficio. Documentato qui.
5. **La demo della landing usa il default `it`.** `calculatePreview` mostra solo
   numeri (identici nelle due lingue), nessun nome: il golden statico resta
   deterministico.

## 3. Conseguenze

- **Positivi:** un visitatore inglese (root con preferenza `en` o pagina `/en/`) e
  ogni nuovo spazio personale creato da una sessione inglese nascono con dati in
  inglese; la guida inglese, che già parla di «Zip bag», coincide ora con i dati.
- **Attenzione:** la lingua del seed è fissata al primo avvio; cambiare lingua dopo
  non traduce i dati esistenti (scelta consapevole, coerenza con «i nomi sono dati»).
- **Costi:** ~20 stringhe duplicate IT/EN in `seed.ts` con test di allineamento
  (stessi ID, valori identici, nomi localizzati); nessun cambio di schema, di
  `engineVersion`, di snapshot o di migrazioni.

## 4. Riferimenti

- `docs/planning/evo-10-localized-seeds.md` — piano operativo.
- `src/lib/quote-defaults.ts` — pattern esistente dei nomi per lingua.
