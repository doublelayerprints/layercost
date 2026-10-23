# Testing

**Stato:** v0.1 — 16 test unitari + 3 E2E

---

## 1. Strategia

| Livello  | Strumento           | Cosa copre                                            |
| -------- | ------------------- | ----------------------------------------------------- |
| Unit     | Vitest              | Unità, arrotondamenti, formule, prezzi                |
| Property | fast-check          | Invarianti di ripartizione e scala                    |
| Dati     | Vitest              | Seed contro schema, versioni future, payload invalidi |
| E2E      | Playwright          | Calcola → salva → ricarica → condivide → importa      |
| A11y     | manuale + checklist | Label, focus, tastiera, contrasto                     |

## 2. Comandi

```bash
npm run test         # unit + data
npm run test:watch
npm run test:e2e     # build + Playwright
npm run check        # typecheck + lint + test + build
```

Playwright usa Chrome locale (`channel: 'chrome'`); in CI usa Chromium.

## 3. File

- `src/domain/cost.test.ts` — 13 test: conversioni, arrotondamenti, allocazione, esempio 1, lotto, pricing, guasti, tariffe, multi-materiale, proprietà.
- `src/data/storage.test.ts` — 3 test: seed valido, schema futuro rifiutato, payload invalido rifiutato.
- `tests/e2e/smoke.spec.ts` — 3 test: calcolo/salvataggio/reload, condivisione/import in contesto pulito, navigazione sezioni.

## 4. Golden case

I numeri di riferimento sono in `docs/domain/golden-cases.md` e devono coincidere con `cost.test.ts` al µ€. Se cambia una formula:

1. aggiorna `cost-model.md`;
2. aggiorna `golden-cases.md`;
3. aggiorna i test;
4. aggiorna `ENGINE_VERSION`.

## 5. Cosa non è coperto

- Test visuali/regressione screenshot.
- Audit `axe` automatico.
- Stampa/PDF reale su più browser.
- Import via file chooser (E2E).
- Deploy Vercel (verifica manuale).
- Carico con centinaia di preventivi.

Sono candidati per la fase 4 o per il backlog.

## 6. CI

`.github/workflows/ci.yml` esegue:

- `npm ci`;
- `npm run check`;
- `npm run build` + Playwright con Chromium.

## 7. Come aggiungere un test

- Per una formula: aggiungi un caso in `cost.test.ts` e il golden case nel doc.
- Per uno schema: aggiungi un fixture valido/invalido in `storage.test.ts`.
- Per un flusso UI: aggiungi un E2E in `tests/e2e`.
- Non usare snapshot fragili per i numeri: asserisci i valori espliciti.
- Per le proprietà, limita i range per mantenere i test veloci.
