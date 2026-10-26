# Inventario stringhe i18n

**Stato:** T5.6.1–T5.6.2 — infrastruttura ed estrazione completate; restano formattazione e selettore
**Data:** 26 ottobre 2026
**Riferimenti:** ADR-0019, `docs/planning/phase-5.md` §3

---

## 1. Regole

- Si traduce tutto ciò che l'utente vede: schermate, pulsanti, label, hint, placeholder, errori, stati vuoti, conferme, `aria-label`, `title`, guida, stampa/PDF e metadati della pagina.
- Non si traducono: codice, tipi, commenti tecnici, documentazione per sviluppatori, nomi di file, dati inseriti dall'utente e valori di dominio.
- I dati di seed (nomi e note di stampanti/materiali/tariffe) sono dati persistiti, non stringhe di interfaccia: restano nella lingua con cui sono stati creati. Le note informative vanno riviste separatamente se si vuole una configurazione iniziale inglese.
- Gli errori di `data/` e `domain/` devono esporre un codice o essere mappati nella UI. Le stringhe italiane restano come fallback, ma il testo visibile passa dai dizionari.
- Italiano predefinito; inglese `en-GB` (EUR, metrico, `gg/mm/aaaa`).
- Preferenza in `layercost:locale`, fuori da `AppData`; `Quote.locale` in schema v2 (T5.6.3).

## 2. Infrastruttura già pronta (T5.6.1)

- `src/i18n/it.ts`: dizionario sorgente tipizzato.
- `src/i18n/en.ts`: dizionario inglese con la stessa interfaccia `Messages`; una chiave mancante fallisce il typecheck.
- `src/i18n/index.ts`: `SUPPORTED_LOCALES`, `DEFAULT_LOCALE`, `INTL_LOCALES`, `translate`, `t`, `plural` con `Intl.PluralRules`, `isLocale`.
- `src/app/I18nProvider.tsx`: contesto, `useI18n`, aggiornamento di `<html lang>` e `dir`.
- Shell già collegata: navigazione, skip link, footer, titolo dell'alert globale e versione motore usano `useI18n`.
- Test: `src/i18n/i18n.test.ts` (parità chiavi, valori non vuoti, interpolazione, plurali, locale valido).

## 3. Inventario per area

| Area                 | File principali                                                                                                    | Stringhe da estrarre                                                                                    | Note                                                                             |
| -------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Shell                | `src/app/Layout.tsx`, `src/components/logo.tsx`, `src/features/NotFoundPage.tsx`                                   | navigazione (già), footer (già), tagline logo, 404, skip link                                           | Tagline e 404 restano                                                            |
| Componenti comuni    | `src/components/ui.tsx`, `number-fields.tsx`, `cost-stack.tsx`                                                     | “Chiudi”, “Chiudi avviso”, label passate dai chiamanti, legenda stack                                   | I componenti non devono avere dizionari propri: ricevono `t` o stringhe tradotte |
| Calcolatore          | `CalculatorPage`, `LineEditor`, `JobCostsEditor`, `PricingEditor`, `SummaryPanel`, `CostDetails`, `NewDraftButton` | intestazioni, label, hint, unità, stati, conferme, microcopy, “Salva preventivo”, “Stampa”, “Condividi” | Unità e valuta passano da `lib/format.ts`                                        |
| Import `.3mf`        | `use-three-mf-import.ts`, `ThreeMfImportDialog.tsx`, `data/three-mf/parse.ts`                                      | pulsanti, stati, titolo modale, piatti, mappatura, conferma, errori/warning                             | Le chiavi `import.*` sono già nel dizionario; T5.6.2 collega la UI               |
| Preventivi           | `QuotesPage`, `QuoteDetailPage`, `QuoteOverview`, `QuotePrint`, `SharePage`, `ShareQuoteButton`                    | lista, ricerca, vuoti, dettaglio, azioni, stampa, link, import nel proprio archivio                     | Stampare nella lingua del preventivo (T5.6.4)                                    |
| Stampanti            | `PrintersPage`, `PrinterForm`                                                                                      | titoli, campi, unità, note, archivio, anteprima costo orario                                            |                                                                                  |
| Materiali            | `MaterialsPage`, `MaterialForm`                                                                                    | campi, famiglie, prezzo/kg, peso bobina, colore, archivio                                               | `lib/labels.ts` per le famiglie                                                  |
| Tariffe              | `TariffsPage`, `TariffForm`                                                                                        | storico, decorrenza, ultima tariffa, nota non eliminabile                                               |                                                                                  |
| Extra                | `ExtrasPage`, `ExtraForm`                                                                                          | per pezzo/per lavoro, categorie, importi, archivio                                                      |                                                                                  |
| Impostazioni         | `SettingsPage`                                                                                                     | manodopera, rischio, prezzo, arrotondamento, IVA, backup, reset, tema, lingua                           | Sezione Lingua in T5.6.4                                                         |
| Confronto            | `ComparePage`                                                                                                      | colonne, delta, vuoto, stampante più conveniente                                                        |                                                                                  |
| Guida iniziale       | `OnboardingCard`                                                                                                   | quattro passi, “Ho capito, inizia”, valori stimati, skip                                                |                                                                                  |
| Etichette di dominio | `src/lib/labels.ts`                                                                                                | famiglie materiale, fonte potenza, modalità prezzo, arrotondamento, IVA, allocazione, unità extra       | Diventano funzioni locale-aware o chiavi                                         |
| Formattazione        | `src/lib/format.ts`, `src/lib/date.ts`                                                                             | valuta, grammi, durata, date, numeri, “—”, suffissi                                                     | `INTL_LOCALES`; input numerici con virgola/punto                                 |
| Errori dati/dominio  | `data/storage.ts`, `data/schemas.ts`, `data/three-mf/*`, `domain/units.ts`, `domain/three-mf-mapping.ts`           | errori di storage, import, schema, parser, mapping, unità                                               | Preferire `error.code` + chiave UI; i messaggi italiani restano fallback         |
| Metadati pagina      | `index.html`                                                                                                       | `title`, `description`, `lang`                                                                          | T5.6.4 imposta `lang`; title/description per lingua                              |
| Stampa/PDF           | `QuotePrint`, `index.css` (@media print)                                                                           | intestazione, meta, tabelle, totali, note, footer                                                       | Usa la lingua del preventivo                                                     |

**Stato T5.6.2:** tutte le aree della tabella sono state estratte, inclusi componenti condivisi, etichette di dominio, cost stack, logo, 404, errori import/share/save e guida. I dizionari sono divisi in `calculator`, `quotes`, `catalogs`, `settings`, `misc` (743 chiavi). Restano come fallback tecnico raro i messaggi di storage/schema e alcuni errori di dominio; la formattazione `Intl`, `Quote.locale`, il selettore e i metadati pagina sono in T5.6.3–T5.6.4.

## 4. Ordine di estrazione consigliato (T5.6.2)

1. Shell e componenti comuni (chiude subito le stringhe condivise).
2. Etichette di dominio e formattazione (`lib/labels.ts`, `lib/format.ts`).
3. Calcolatore e import `.3mf`.
4. Preventivi, stampa e condivisione.
5. Anagrafiche (stampanti, materiali, tariffe, extra) e impostazioni.
6. Confronto e guida iniziale.
7. Errori di dati/dominio: mappatura per codice e fallback.
8. Test di scansione: nessuna stringa italiana residua nelle schermate in inglese.

## 5. Test e verifiche

- Parità chiavi e valori non vuoti: `src/i18n/i18n.test.ts`.
- Typecheck: una chiave mancante in `en.ts` è un errore.
- Dopo l'estrazione: E2E in inglese, persistenza, `<html lang>`, stampa/link nella lingua del preventivo, axe e visual.
- La migrazione `Quote.locale` e la formattazione locale arrivano in T5.6.3; il selettore e la persistenza in T5.6.4; la verifica completa in T5.6.5.
