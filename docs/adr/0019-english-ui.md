# ADR-0019 — Interfaccia inglese con italiano predefinito

**Stato:** Accettato (T5.6.1–T5.6.3: infrastruttura, estrazione, formattazione e `Quote.locale`)
**Data:** 26 ottobre 2026

## Contesto

LayerCost è nato in italiano per due utenti italiani. Il committente vuole una versione inglese. La UI contiene stringhe in componenti, messaggi di errore, `aria-label`, testi di stampa e formattazione di date, numeri e valuta; il dominio e i tipi sono già in inglese.

Serve una soluzione che non duplichi l'app, non introduca un runtime di traduzione pesante e non rompa i preventivi già salvati.

## Decisione

1. **Italiano predefinito, inglese selezionabile.** La lingua iniziale resta `it`; l'utente può passare a `en` da Impostazioni → Lingua. La preferenza vive in `layercost:locale`, separata da `AppData`.
2. **Dizionari tipizzati, nessuna libreria runtime.** Le stringhe stanno in `src/i18n/it.ts` e `src/i18n/en.ts`, con la stessa interfaccia TypeScript. Un hook `useI18n()` espone `t(key, params)`; una chiave mancante è un errore di compilazione o di test.
3. **Formattazione locale.** Prezzi, date, numeri e plurali passano da `Intl`. L'inglese usa **`en-GB`** (EUR, metrico, `gg/mm/aaaa`) per restare coerente con il contesto europeo; `en-US` resta un'alternativa da valutare solo se il committente lo chiede.
4. **Lingua del preventivo salvata.** Ogni preventivo conserva la lingua con cui è stato creato (`Quote.locale`), così stampa e link condivisi restano coerenti anche se l'interfaccia cambia. È un cambio di schema retrocompatibile: migrazione a `schemaVersion` 2 con default `it` per i preventivi esistenti.
5. **Tutto ciò che l'utente vede è tradotto.** UI, errori, stati vuoti, conferme, `aria-label`, testi di stampa, PDF, guida iniziale e metadati della pagina. La documentazione per sviluppatori resta in italiano.
6. **Nessuna traduzione a runtime.** Nessuna chiamata di rete, nessun servizio di traduzione, nessun testo generato al volo.
7. **Nessun cambio alle formule.** La lingua non tocca unità, arrotondamenti, `engineVersion` o snapshot economici.

## Alternative considerate

- **Solo inglese.** Esclude l'utente principale e rompe l'italiano già curato.
- **Libreria i18n (i18next, react-intl).** Utile per app grandi, ma qui aggiunge peso e concetti per poche centinaia di stringhe.
- **Due build separate.** Duplica il codice e rende difficile mantenere la parità.
- **URL con prefisso `/en/`.** Con hash routing e sito statico è possibile, ma non serve: la preferenza basta e i link condivisi possono portare la lingua del preventivo.
- **Non salvare la lingua nel preventivo.** Semplice, ma un preventivo italiano stampato da un utente inglese cambierebbe lingua in modo inatteso.

## Conseguenze

- Estrazione completa delle stringhe, inclusi `aria-label` e messaggi meno visibili.
- Nuovo `src/i18n/`, `I18nProvider`, `useI18n`, test di parità delle chiavi.
- `src/lib/format.ts` e `src/lib/labels.ts` diventano locale-aware.
- Migrazione schema v1 → v2 per `Quote.locale`; test sui preventivi esistenti.
- Nuovi screenshot di regressione in inglese e axe anche in inglese.
- Il piano operativo e le domande aperte sono in `docs/planning/phase-5.md` §3.
