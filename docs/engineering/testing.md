# Testing

**Stato:** v1.0.0 — 42 test unitari + 18 E2E (3 visual su CI)

---

## 1. Strategia

| Livello  | Strumento             | Cosa copre                                                                        |
| -------- | --------------------- | --------------------------------------------------------------------------------- |
| Unit     | Vitest                | Unità, arrotondamenti, formule, prezzi                                            |
| Property | fast-check            | Invarianti di ripartizione e scala                                                |
| Dati     | Vitest                | Seed contro schema, versioni future, payload invalidi                             |
| E2E      | Playwright / Chromium | Calcola → salva → ricarica → condivide → importa; tema; stati; backup; stampa/PDF |
| E2E      | Playwright / WebKit   | Flusso critico e link condiviso sull'engine Safari                                |
| A11y     | axe-core              | WCAG 2.2 AA su tutte le route, chiaro/scuro, mobile, menu e modali                |
| Visual   | Playwright snapshots  | 15 schermate a 1440/768/390 px, baseline Linux                                    |
| Budget   | Node + zlib           | Peso gzip di JS, CSS, font e HTML; nessuna richiesta esterna                      |

## 2. Comandi

```bash
npm run test         # unit + data
npm run test:watch
npm run test:e2e     # build + Playwright (Chromium + WebKit; visual saltati su macOS)
npm run test:visual  # solo test visuali, richiede baseline Linux
npm run budget       # controllo del peso della build
npm run check        # typecheck + lint + test + build + budget
```

Playwright usa Chrome locale (`channel: 'chrome'`) per il progetto Chromium; in CI usa Chromium bundled. WebKit usa il browser Playwright installato con `npx playwright install webkit`.

## 3. File

- `src/domain/cost.test.ts` — 13 test: conversioni, arrotondamenti, allocazione, esempio 1, lotto, pricing, guasti, tariffe, multi-materiale, proprietà.
- `src/data/storage.test.ts` — 3 test: seed valido, schema futuro rifiutato, payload invalido rifiutato.
- `src/lib/cost-bands.test.ts` — 6 test: somma esatta delle bande, moltiplicazione per la quantità, ordine, lavoro, zero, accorpamento sotto il 3%.
- `src/lib/cost-details.test.ts` — 4 test: componenti, costo pieno, totali di colonna, prezzo allocato.
- `src/lib/format.test.ts` — 3 test: arrotondamento dei centesimi, roundtrip, formattazione it-IT.
- `src/lib/theme.test.ts` — 3 test: valori ammessi, risoluzione di sistema, scelta esplicita.
- `src/data/theme.test.ts` — 4 test: default, valore invalido, roundtrip, storage bloccato.
- `src/lib/draft.test.ts` — 6 test: bozza vuota, metadati, righe, costi di lavoro, prezzo, override.
- `tests/e2e/smoke.spec.ts` — 3 test: calcolo/salvataggio/reload, condivisione/import in contesto pulito, navigazione sezioni.
- `tests/e2e/design-system.spec.ts` — 2 test: token e font caricati; bordo campo, altezza touch, focus, primario, overflow a 375 e menu mobile.
- `tests/e2e/theme.spec.ts` — 1 test: tema scuro esplicito, persistenza, “Sistema” che segue il dispositivo.
- `tests/e2e/states.spec.ts` — 2 test: conferma prima di scartare la bozza, sostituzione della bozza dal dettaglio.
- `tests/e2e/a11y.spec.ts` — 2 test: 25 scansioni axe su tutte le route, tema chiaro desktop e tema scuro mobile, menu e modali inclusi; 0 violazioni.
- `tests/e2e/webkit.spec.ts` — 2 test su WebKit: flusso critico con stampa, link condiviso e import.
- `tests/e2e/release.spec.ts` — 3 test: backup esportato e reimportato; PDF A4 valido con token chiari partendo dal tema scuro; nessuna richiesta esterna.
- `tests/e2e/visual.spec.ts` — 3 test, 15 screenshot: calcolatore, dettaglio, preventivi, materiali e impostazioni a 1440/768/390 px. Saltati fuori dalla CI.
- `tests/fixtures/3mf/` — fixture ridotte per l'import `.3mf` (T5.3.1): Kobra 3, Kobra X, multi-piatto e progetto non slicato. Il README indica slicer, versione e valori attesi; i test del parser arrivano in T5.3.2.

## 4. Golden case

I numeri di riferimento sono in `docs/domain/golden-cases.md` e devono coincidere con `cost.test.ts` al µ€. Se cambia una formula:

1. aggiorna `cost-model.md`;
2. aggiorna `golden-cases.md`;
3. aggiorna i test;
4. aggiorna `ENGINE_VERSION`.

## 5. Cosa non è coperto

- Prova con screen reader reale (VoiceOver/NVDA) e su una stampante fisica.
- Regressione visiva su macOS: le baseline sono generate su Linux e i test visuali sono saltati localmente.
- Import via file chooser (E2E).
- Parser `.3mf`: fixture pronte in T5.3.1, test in T5.3.2.
- Deploy Vercel (verifica manuale).
- Carico con centinaia di preventivi.

## 6. CI

`.github/workflows/ci.yml` esegue:

- `npm ci`;
- `npm run check` (typecheck, lint, 42 test, build, budget);
- `npm run build` + Playwright con Chromium e WebKit.

Le baseline visive si generano con `.github/workflows/visual-baselines.yml` (workflow manuale) e si committano in `tests/e2e/visual.spec.ts-snapshots/`.

Stato al 24/10/2026: **verde su GitHub** per i job `check` ed `e2e` (42 unitari, 18 E2E).

## 7. Come aggiungere un test

- Per una formula: aggiungi un caso in `cost.test.ts` e il golden case nel doc.
- Per uno schema: aggiungi un fixture valido/invalido in `storage.test.ts`.
- Per un flusso UI: aggiungi un E2E in `tests/e2e`.
- Per un token o un componente: aggiungi un test in `tests/e2e/design-system.spec.ts` (font, token, focus, touch, overflow).
- Per una schermata: aggiungi la route in `tests/e2e/a11y.spec.ts` e, se è stabile, in `tests/e2e/visual.spec.ts`.
- Per una modifica intenzionale dell'interfaccia: rigenera le baseline con `gh workflow run visual-baselines.yml --ref main`, scarica l'artifact e committa gli screenshot.
- Non usare snapshot fragili per i numeri: asserisci i valori espliciti.
- Per le proprietà, limita i range per mantenere i test veloci.
