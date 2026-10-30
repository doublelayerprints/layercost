# Inventario stringhe i18n

**Stato:** T5.6.1–T5.6.5 — interfaccia inglese completa; aree EVO-1, EVO-3a ed EVO-5 incluse
**Data:** 29 ottobre 2026
**Riferimenti:** ADR-0019, ADR-0025, ADR-0026, `docs/planning/phase-5.md` §3

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
| Export `.xlsx`       | `ExportXlsxButton`, `features/quotes/export-xlsx.ts`, `lib/xlsx.ts`                                                | pulsante, hint, nomi dei fogli, intestazioni di colonna, sì/no                                          | Area `xlsx`; intestazioni nella lingua dell’interfaccia (T5.12)                  |
| Stampanti            | `PrintersPage`, `PrinterForm`                                                                                      | titoli, campi, unità, note, archivio, anteprima costo orario                                            |                                                                                  |
| Materiali            | `MaterialsPage`, `MaterialForm`                                                                                    | campi, famiglie, prezzo/kg, peso bobina, colore, archivio                                               | `lib/labels.ts` per le famiglie                                                  |
| Tariffe              | `TariffsPage`, `TariffForm`                                                                                        | storico, decorrenza, ultima tariffa, nota non eliminabile                                               |                                                                                  |
| Extra                | `ExtrasPage`, `ExtraForm`                                                                                          | per pezzo/per lavoro, categorie, importi, archivio                                                      |                                                                                  |
| Impostazioni         | `SettingsPage`, `SyncSettings`                                                                                     | manodopera, rischio, prezzo, arrotondamento, IVA, backup, reset, tema, lingua, sync                     | Sezione Lingua in T5.6.4; sync in T5.4.3                                         |
| Auth e sync          | `LoginPage`, `auth-store`, `sync-store`, `SyncSettings`, `SyncIndicator`, dialoghi primo login/conflitto           | login, errori auth, sessione scaduta, stato sync, primo login, conflitti, logout                        | Area `auth` aggiunta in T5.4.3; dialoghi sync in T5.4.4                          |
| Richiesta accesso    | `RequestAccessPage`, `request-access.ts`, `LoginPage`, `SyncSettings`                                              | titolo, intro, campi, limiti, privacy, invio, stati, errori, conferma, link                             | Area `access` aggiunta in EVO-3a; 36 chiavi IT/EN                                |
| Landing pubblica     | `src/features/landing/`, `PublicLayout`, `PublicHeader`, `PublicFooter`, `LivePriceDemo`                            | meta, nav, hero, funzionalità, demo, privacy, cloud, FAQ, CTA, footer, preferenze                       | Area `landing` aggiunta in EVO-5; 113 chiavi IT/EN                               |
| Confronto            | `ComparePage`                                                                                                      | colonne, delta, vuoto, stampante più conveniente                                                        |                                                                                  |
| Guida iniziale       | `OnboardingCard`                                                                                                   | quattro passi, “Ho capito, inizia”, valori stimati, skip                                                |                                                                                  |
| Etichette di dominio | `src/lib/labels.ts`                                                                                                | famiglie materiale, fonte potenza, modalità prezzo, arrotondamento, IVA, allocazione, unità extra       | Diventano funzioni locale-aware o chiavi                                         |
| Formattazione        | `src/lib/format.ts`, `src/lib/date.ts`                                                                             | valuta, grammi, durata, date, numeri, “—”, suffissi                                                     | `INTL_LOCALES`; input numerici con virgola/punto                                 |
| Errori dati/dominio  | `data/storage.ts`, `data/schemas.ts`, `data/three-mf/*`, `domain/units.ts`, `domain/three-mf-mapping.ts`           | errori di storage, import, schema, parser, mapping, unità                                               | Preferire `error.code` + chiave UI; i messaggi italiani restano fallback         |
| Metadati pagina      | `index.html`                                                                                                       | `title`, `description`, `lang`                                                                          | T5.6.4 imposta `lang`; title/description per lingua                              |
| Stampa/PDF           | `QuotePrint`, `index.css` (@media print)                                                                           | intestazione, meta, tabelle, totali, note, footer                                                       | Usa la lingua del preventivo                                                     |

**Stato T5.6.2:** tutte le aree della tabella sono state estratte, inclusi componenti condivisi, etichette di dominio, cost stack, logo, 404, errori import/share/save e guida. I dizionari sono divisi in `calculator`, `quotes`, `catalogs`, `settings`, `misc` (743 chiavi al momento di T5.6.2; **812** dopo T5.13–T5.17; **865** dopo T5.12 con l’area `xlsx`). Restano come fallback tecnico raro i messaggi di storage/schema e alcuni errori di dominio.

**Stato T5.6.3:** formattazione `Intl` legata alla locale (`useFormat`), parsing con virgola o punto, `Quote.locale` e schema v2 con migrazione e backup raw. Nomi predefiniti di bozza/riga e suffissi di copia/import localizzati.

**Stato T5.6.4:** preferenza `layercost:locale` e selettore Italiano/English in Impostazioni; `I18nProvider` aggiorna `<html lang>`, titolo e meta description. La bozza vuota adotta la lingua, i preventivi salvati restano nella loro. Restano axe, screenshot e scansione finale delle stringhe in T5.6.5.

**Stato T5.15–T5.17:** i selettori rapidi usano le stesse chiavi di Impostazioni (`settings.theme*`, `settings.language*`) e il colore filamento ha tre chiavi dedicate (`line.colorLabel`, `line.colorAria`, `line.colorClear`). Nessuna stringa hardcoded nelle nuove schermate; parità it/en portata a 812 chiavi.

**Stato T5.12:** l’area `xlsx` aggiunge 53 chiavi per azione, hint, nomi dei fogli, valori sì/no e intestazioni di colonna in italiano e inglese. Parità it/en a **865** chiavi.

**Stato T5.18:** aggiunte 5 chiavi per “Guadagno” (`summary.profit`, `quote.profit`), “Stampa interna” (`print.internalAction`), la marcatura “Uso interno” e il footer della stampa cliente (`quote.print.internalBadge`, `quote.print.footerCustomer`). Parità it/en a **870** chiavi.

**Stato T5.19:** aggiunte 4 chiavi `priceComposition.*` per titolo, costo, utile e aria-label; rimosse `quotes.open` e `quote.label.actions`, non più usate dopo la riga cliccabile. Parità it/en a **872** chiavi.

**Stato T5.20:** aggiunte 23 chiavi per gli sconti: `discount.*` (4), `line.discount*` (4), `pricing.discount*` (3), `summary.discount*` (4), `details.*Discount*` (2), `quote.discount*` (3) e `xlsx.column.*Discount*` (3). Parità it/en a **895** chiavi.

**Stato T5.4.3:** aggiunte 43 chiavi nell'area `auth` per login, errori, sessione scaduta, stato sync, logout e conferma. Parità it/en a **946** chiavi; il test delle aree include `authIt`.

**Stato T5.4.4:** aggiunte 56 chiavi per stati sync, primo login con backup, conflitti (motivo, entità, azioni, eliminazione), indicatore, errori, logout con modifiche in sospeso e avviso import cloud. Parità it/en a **1002** chiavi; il test di parità e aree resta verde.

**Stato T5.21:** aggiunte 4 chiavi per le card comprimibili: `common.expand`, `common.collapse`, `line.expand`, `line.collapse`. Parità it/en a **1002** chiavi.

**Stato T5.4.5:** aggiunte 5 chiavi `quote.audit.*` per la sezione “Workspace condiviso” e l’audit del preventivo (creatore, ultima modifica, “te”/“un altro membro”). Parità it/en a **1007** chiavi.

**Stato EVO-1:** aggiunte 16 chiavi OAuth nell’area `auth` (pulsante, reindirizzamento, collegamento, errori, account Google). Parità it/en a **1023** chiavi; l’inventario non era stato aggiornato nel commit EVO-1.

**Stato EVO-3a:** aggiunte 36 chiavi nell’area `access` per titolo/descrizione, campi e limiti, privacy, invio, stati success/error/endpoint mancante, validazione, link da login e sync. Parità it/en a **1059** chiavi; il test delle aree include `accessIt` e l’E2E copre IT/EN e axe.

**Stato EVO-5:** aggiunte **113 chiavi** nell’area `landing` per meta, navigazione, hero, tabella delle funzionalità, passi e demo, privacy, cloud, FAQ, CTA, footer e preferenze pubbliche, più `nav.overview` per la voce **Panoramica** della sidebar. Parità it/en a **1173** chiavi; il test delle aree include `landingIt`. La landing usa gli stessi dizionari tipizzati e cambia lingua senza ricaricare la pagina.

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
- La migrazione `Quote.locale`, la formattazione locale, il selettore, la persistenza e le verifiche in inglese sono implementati in T5.6.3–T5.6.5.
- EVO-3a: `access.spec.ts` verifica IT/EN a 375/1440, inclusi errori e conferma; `access-missing.spec.ts` verifica lo stato senza endpoint in entrambe le lingue. La parità è a 1173 chiavi dopo EVO-5.
