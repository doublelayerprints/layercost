# Testing

**Stato:** v1.0.0 + T5.3.5 + T5.12 + T5.13–T5.21 + T5.4.1–T5.4.5 — 185 test unitari + 44 E2E (33 default + 6 visual + 2 auth + 3 sync) + 33 pgTAP RLS

---

## 1. Strategia

> Fase 5 (in corso): T5.4.1 ha aggiunto i test di contratto del repository e della coda di scrittura; T5.4.2 ha aggiunto 7 test sui mapper e i test pgTAP RLS; T5.4.4 ha aggiunto 13 test su diff/outbox/metadati/primo login, 9 sullo store sync, 8 sullo store app con cache cloud e 2 E2E a due contesti con offline e conflitto; T5.4.5 ha aggiunto 3 test unitari su audit, link condivisi e copie, 11 asserzioni pgTAP su quote condivise/isolamento e 1 E2E su utente senza membership e workspace separato. Dettagli in `docs/planning/t5.4-cloud-sync.md` §10.


| Livello  | Strumento             | Cosa copre                                                                        |
| -------- | --------------------- | --------------------------------------------------------------------------------- |
| Unit     | Vitest                | Unità, arrotondamenti, formule, prezzi                                            |
| Property | fast-check            | Invarianti di ripartizione e scala                                                |
| Dati     | Vitest                | Seed contro schema, versioni future, payload invalidi                             |
| E2E      | Playwright / Chromium | Calcola → salva → ricarica → condivide → importa; tema; stati; backup; stampa/PDF |
| E2E      | Playwright / WebKit   | Flusso critico e link condiviso sull'engine Safari                                |
| A11y     | axe-core              | WCAG 2.2 AA su tutte le route, chiaro/scuro, mobile, menu e modali                |
| Visual   | Playwright snapshots  | 36 schermate a 1440/768/390 px, baseline Linux                                    |
| Budget   | Node + zlib           | Peso gzip di JS, CSS, font e HTML; nessuna richiesta esterna                      |

## 2. Comandi

```bash
npm run test         # unit + data
npm run test:watch
npm run test:e2e     # build + Playwright (Chromium + WebKit; visual saltati su macOS)
npm run test:visual  # solo test visuali, richiede baseline Linux
npm run budget       # controllo del peso della build
npm run check        # typecheck + lint + test + build + budget
npm run db:start     # Supabase locale (Docker)
npm run db:reset     # migrazioni + seed locali
npm run db:test      # pgTAP/RLS
npm run test:e2e:auth # build con Supabase locale + E2E auth
npm run test:e2e:sync # build + due contesti, offline, conflitto e isolamento; azzera il DB locale
npm run smoke:production # manuale, richiede Supabase di produzione e PROD_URL
```

Playwright usa Chrome locale (`channel: 'chrome'`) per il progetto Chromium; in CI usa Chromium bundled. WebKit usa il browser Playwright installato con `npx playwright install webkit`.

## 3. File

- `src/domain/cost.test.ts` — 18 test: conversioni, arrotondamenti, allocazione, esempio 1, lotto, pricing, guasti, tariffe, multi-materiale, sconti di riga/preventivo, limite a zero, somma esatta e proprietà.
- `src/data/storage.test.ts` — 9 test: seed valido, colore riga valido/rifiutato, schema futuro rifiutato, payload invalido rifiutato, migrazione v1 → v4, envelope v1, backup raw prima della migrazione, v2 → v4 e v3 → v4 con `discountBp`.
- `src/data/repository.test.ts` — 6 test: contratto asincrono locale e fake, roundtrip, import, reset ed export.
- `src/data/cloud/mappers.test.ts` — 8 test: settings/tariffe, stampanti/materiali/extra, archivio, preventivi, audit cloud, configurazione, unità intere e roundtrip.
- `src/data/cloud/sync.test.ts` — 13 test: diff per entità, delete, deduplica outbox, priorità, ack con payload cambiato, metadati e tombstone, snapshot → `AppData`, decisione del primo login e dati locali significativi.
- `src/state/persist-queue.test.ts` — 4 test: avvio immediato, serializzazione, errore e flush.
- `src/state/app-store.test.ts` — 9 test: hydration, doppia hydration, errore, scrittura immediata, export, reset, reset fallito, passaggio locale ↔ cache cloud e audit non trascinato nelle copie.
- `src/state/sync-store.test.ts` — 9 test: import automatico, primo login con backup, cloud che vince, modifica offline, conflitto, duplicazione, logout con/senza pending, workspace diverso e riconnessione dopo sessione scaduta.
- `supabase/tests/rls.test.sql` — 33 asserzioni pgTAP: isolamento workspace, accesso condiviso, quote condivise e audit `created_by`/`updated_by`, scritture, quote bloccate, settings, membership, ultimo owner (utente e admin), keep-alive.
- `src/state/auth-store.test.ts` — 11 test: unconfigured, sessione, inizializzazione idempotente, errori, login, logout, sessione scaduta ed eventi esterni.
- `tests/e2e/auth.spec.ts` — 2 test con Supabase locale: login, reload, impostazioni, logout, credenziali errate; axe a 375/1440.
- `tests/e2e/sync.spec.ts` — 3 test con Supabase locale: primo login con backup JSON e import dei dati locali; due contesti, modifica offline, conflitto e ricarica remota; utente senza membership e workspace separato con dati propri. Il file è seriale perché i workspace di test usano gli ID seed.
- `src/lib/cost-bands.test.ts` — 6 test: somma esatta delle bande, moltiplicazione per la quantità, ordine, lavoro, zero, accorpamento sotto il 3%.
- `src/lib/cost-details.test.ts` — 4 test: componenti, costo pieno, totali di colonna, prezzo allocato.
- `src/lib/format.test.ts` — 6 test: arrotondamento dei centesimi, roundtrip, formattazione it-IT, formattazione en-GB, parsing con virgola/punto, valori non numerici.
- `src/lib/theme.test.ts` — 3 test: valori ammessi, risoluzione di sistema, scelta esplicita.
- `src/data/theme.test.ts` — 4 test: default, valore invalido, roundtrip, storage bloccato.
- `src/data/locale.test.ts` — 4 test: default italiano, valore valido, valore non supportato/storage bloccato, salvataggio della preferenza.
- `src/lib/draft.test.ts` — 7 test: bozza vuota, nomi predefiniti inglesi, metadati, righe (incluso il colore), costi di lavoro, prezzo, override.
- `src/lib/color.test.ts` — 2 test: hex `#rrggbb` valido, nomi/forme brevi/non testuali rifiutati.
- `src/lib/quote-status.test.ts` — 3 test: modificabilità per stato/archivio, blocco inviato/completato, transizioni solo in avanti.
- `src/lib/quote-profit.test.ts` — 4 test: utile positivo, zero, negativo e coerenza con prezzo netto e costo pieno.
- `src/data/three-mf/parse.test.ts` — 18 test: fixture Kobra 3/Kobra X/multi-piatto, Bambu sintetico, progetto non slicato, XML/DOCTYPE, project_settings, pesi, materiali, fallback G-code, limiti ZIP, path traversal e cifratura.
- `src/domain/three-mf-mapping.test.ts` — 15 test: una riga per piatto, aggregazione per materiale, zero grammi, errori di mapping, proposte stampante/materiali e property test su somma esatta e nessun supplemento.
- `src/i18n/i18n.test.ts` — 8 test: parità chiavi it/en, valori non vuoti, aree senza duplicati, plurali e relative forme opposte, placeholder coerenti, locale supportata, interpolazione e plurali con `Intl.PluralRules`. Parità a 899 chiavi dopo T5.21.
- `src/lib/share.test.ts` — 6 test: roundtrip con lingua, migrazione dei vecchi link senza `locale` a italiano, migrazione di `discountBp` alla regola percentuale, conservazione degli sconti di riga/preventivo, rimozione dell’audit cloud, payload non valido rifiutato.
- `src/lib/xlsx.test.ts` — 5 test: pacchetto OPC, XML ben formato, formati numerici e date Excel, riferimenti oltre la Z, valori non finiti, nomi dei fogli sanificati e univoci.
- `src/features/quotes/export-xlsx.test.ts` — 3 test: tre fogli con preventivi/righe/materiali, intestazioni inglesi, preventivo senza risultato esportato con valori vuoti.
- `tests/e2e/import.spec.ts` — 8 test: file input, drag & drop, multi-piatto, mappatura ambigua, conferma append/replace, errore non slicato, salvataggio/reload e overflow a 375 px.
- `tests/e2e/smoke.spec.ts` — 3 test: calcolo/salvataggio/reload con utile e barra prezzo, stampa cliente senza costi e stampa interna con costi, riga preventivo cliccabile senza “Apri”, condivisione/import in contesto pulito, navigazione sezioni.
- `tests/e2e/design-system.spec.ts` — 2 test: token e font caricati; bordo campo, altezza touch, focus, primario, overflow a 375, menu mobile e preferenze rapide.
- `tests/e2e/theme.spec.ts` — 1 test: tema scuro dalla sidebar, sincronizzazione con Impostazioni, persistenza, “Sistema” che segue il dispositivo.
- `tests/e2e/locale.spec.ts` — 1 test: cambio lingua dalla sidebar, sincronizzazione con Impostazioni, `<html lang>`, titolo, persistenza al reload, salvataggio in inglese e stampa inglese anche con UI italiana.
- `tests/e2e/quote-lifecycle.spec.ts` — 1 test: azioni in alto prima del prezzo, modifica in place con lo stesso id e snapshot congelato, blocco dopo invio e completamento, duplicazione ancora disponibile.
- `tests/e2e/line-color.spec.ts` — 1 test: colore impostato, visibile nel dettaglio e in stampa, persistito nel preventivo, ricaricato in modifica e rimosso.
- `tests/e2e/states.spec.ts` — 2 test: conferma prima di scartare la bozza, sostituzione della bozza dal dettaglio.
- `tests/e2e/add-line.spec.ts` — 1 test: il pulsante largo sotto l’ultima card ha la stessa larghezza, aggiunge una riga e passa al colore accent su hover.
- `tests/e2e/collapsible-cards.spec.ts` — 1 test: comprimi/espandi Preventivo, Stampe, Costi di lavoro, Prezzo e una riga; verifica sintesi, `aria-expanded`, campi nascosti e “Ripristina default” cliccabile senza aprire la card.
- `tests/e2e/discounts.spec.ts` — 2 test: sconto di riga a importo fisso + sconto percentuale del preventivo, persistenza dopo il salvataggio; sconto fisso oltre il prezzo limitato a zero con avviso.
- `tests/e2e/xlsx.spec.ts` — 2 test: download reale del workbook con preventivo archiviato e verifica di fogli e contenuto; pulsante disabilitato senza preventivi.
- `tests/e2e/a11y.spec.ts` — 3 test: 40 scansioni axe (26 italiane, 14 inglesi) su tutte le route, tema chiaro desktop, tema scuro mobile e inglese desktop, menu, modali e import `.3mf` inclusi; 0 violazioni.
- `tests/e2e/webkit.spec.ts` — 2 test su WebKit: flusso critico con stampa, link condiviso e import.
- `tests/e2e/release.spec.ts` — 3 test: backup esportato e reimportato; PDF A4 valido con foglio chiaro e margini bianchi partendo dal tema scuro; nessuna richiesta esterna.
- `tests/e2e/visual.spec.ts` — 6 test, 36 screenshot: 18 italiani e 18 inglesi (calcolatore, modale import `.3mf`, dettaglio, preventivi, materiali e impostazioni) a 1440/768/390 px. Saltati fuori dalla CI; le baseline del calcolatore sono state rigenerate dopo T5.21.
- `tests/fixtures/3mf/` — fixture ridotte per l'import `.3mf` (T5.3.1): Kobra 3, Kobra X, multi-piatto e progetto non slicato. Il README indica slicer, versione e valori attesi; i test del parser sono in `parse.test.ts`.

### 3.1 Fixture `.3mf`

- I fixture sono ridotti: niente G-code, geometrie o immagini, solo i metadati necessari al parser.
- `parse.test.ts` usa `@xmldom/xmldom` per il `DOMParser` in Node; nel browser il thread principale usa `DOMParser` nativo, mentre il Web Worker usa `@xmldom/xmldom` perché `DOMParser` non esiste nei worker.
- Il fixture Bambu reale non è committato per la licenza del modello; il percorso Bambu è coperto da un test sintetico con lo stesso schema (`X-BBL-Client-Version`, `printer_model_id = C12`).
- Il worker `.3mf` viene esercitato dall'E2E di import; non è testato in isolamento in Node.

### 3.2 Performance import `.3mf` (26/10/2026)

Misura locale con Chrome, build Vite e parser nel worker:

- **File reale esportato dallo slicer** (`1026-1206-prova volpe_plate(01)_PLA_0.12_6h32m3s.gcode.3mf`, 22 MB compressi, 75 MB di G-code decompresso): dialogo visibile in **915 ms** su produzione, con 70,05 g, 6h 32m, PLA e Kobra 3; import completato senza errori console e senza overflow a 1440 px.
- **Archivio sintetico da 50 MB** (fixture Kobra 3 + `Metadata/plate_1.gcode` da 50 MB non decompresso): dialogo di anteprima visibile in **95–107 ms** su 3 esecuzioni. Target < 3 s.
- **Progetto non slicato `rayquaza+230.3mf`** (15 MB, 14 piatti, nessun G-code): errore azionabile in **100–102 ms** su 3 esecuzioni, senza crash.
- Il file `rayquaza+230.3mf` e il file reale della volpe non sono committati: il primo è non slicato, il secondo è troppo grande. Il file sintetico da 50 MB è generato localmente dalla fixture Kobra 3 e non entra nel repository.
- Il parser non decomprime il G-code quando `slice_info.config` è presente; il limite di 100 MB compressi resta invalicabile.

## 4. Golden case

I numeri di riferimento sono in `docs/domain/golden-cases.md` e devono coincidere con `cost.test.ts` al µ€. Se cambia una formula:

1. aggiorna `cost-model.md`;
2. aggiorna `golden-cases.md`;
3. aggiorna i test;
4. aggiorna `ENGINE_VERSION`.

## 5. Cosa non è coperto

- Prova con screen reader reale (VoiceOver/NVDA) e su una stampante fisica.
- Regressione visiva su macOS: le baseline sono generate su Linux e i test visuali sono saltati localmente.
- Performance dell'import su un file reale da 50–100 MB: misurata con un archivio sintetico; resta una prova con file reale.
- Interfaccia inglese: copertura E2E/axe/visual in T5.6.5.
- Sync cloud: E2E solo in locale con Supabase e reset del DB; la CI dedicata e il deploy sono in T5.4.6. L’E2E copre un workspace separato con dati e ID propri; due workspace con gli stessi ID seed restano non supportati.
- Deploy Vercel (verifica manuale).
- Carico con centinaia di preventivi.

## 6. CI

`.github/workflows/ci.yml` esegue tre job:

- **check** — `npm ci`, `npm run check` (typecheck, lint, 185 test, build, budget).
- **e2e** — build, Playwright Chromium e WebKit; auth e sync test sono saltati senza `E2E_AUTH`/`E2E_SYNC`.
- **database** — Supabase locale, `npm run db:test` (33 pgTAP), `npm run test:e2e:auth` (2 test), `npm run test:e2e:sync` (3 test), stop del database. Non usa segreti di produzione.

`npm run test:e2e:auth` legge le env da Supabase locale, builda con le credenziali pubbliche e crea l'utente via Admin API. `npm run test:e2e:sync` azzera il database locale, builda con le env pubbliche, crea utenti/workspace via Admin API e pulisce con `psql`.

Le baseline visive si generano con `.github/workflows/visual-baselines.yml` (workflow manuale) e si committano in `tests/e2e/visual.spec.ts-snapshots/`.

Stato al 28/10/2026: **verde in locale** per `npm run check` (185 unitari), `db:test` (33 asserzioni pgTAP), `test:e2e` (33 default + 11 saltati), `test:e2e:auth` (2) e `test:e2e:sync` (3). La PR #20 e `main` `1bf641e` hanno superato `check`, `e2e` e `database` su GitHub; il job `database` esegue Supabase locale, 33 pgTAP, 2 auth E2E e 3 sync E2E senza segreti di produzione. `npm run smoke:production` è verde su https://layercost.vercel.app.

## 7. Come aggiungere un test

- Per una formula: aggiungi un caso in `cost.test.ts` e il golden case nel doc.
- Per uno schema: aggiungi un fixture valido/invalido in `storage.test.ts`.
- Per il parser `.3mf`: aggiungi un caso in `src/data/three-mf/parse.test.ts`; se serve un nuovo file reale, aggiungi una fixture ridotta in `tests/fixtures/3mf/` e aggiorna il README.
- Per il mapping `.3mf`: aggiungi un caso in `src/domain/three-mf-mapping.test.ts`; per le invarianti usa `fast-check`.
- Per l'import `.3mf` lato UI: aggiungi un caso in `tests/e2e/import.spec.ts`, usando una fixture di `tests/fixtures/3mf/`.
- Per un flusso UI: aggiungi un E2E in `tests/e2e`.
- Per un token o un componente: aggiungi un test in `tests/e2e/design-system.spec.ts` (font, token, focus, touch, overflow).
- Per una schermata: aggiungi la route in `tests/e2e/a11y.spec.ts` e, se è stabile, in `tests/e2e/visual.spec.ts`.
- Per una modifica intenzionale dell'interfaccia: rigenera le baseline con `gh workflow run visual-baselines.yml --ref main`, scarica l'artifact e committa gli screenshot.
- Non usare snapshot fragili per i numeri: asserisci i valori espliciti.
- Per le proprietà, limita i range per mantenere i test veloci.
