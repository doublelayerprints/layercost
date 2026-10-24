# Testing

**Stato:** v0.1 — 21 test unitari + 5 E2E

---

## 1. Strategia

| Livello  | Strumento           | Cosa copre                                                      |
| -------- | ------------------- | --------------------------------------------------------------- |
| Unit     | Vitest              | Unità, arrotondamenti, formule, prezzi                          |
| Property | fast-check          | Invarianti di ripartizione e scala                              |
| Dati     | Vitest              | Seed contro schema, versioni future, payload invalidi           |
| E2E      | Playwright          | Calcola → salva → ricarica → condivide → importa; design system |
| A11y     | manuale + checklist | Label, focus, tastiera, contrasto; test token/focus             |

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
- `src/lib/cost-bands.test.ts` — 5 test: somma esatta delle bande, ordine, lavoro, zero, accorpamento sotto il 3%.
- `tests/e2e/smoke.spec.ts` — 3 test: calcolo/salvataggio/reload, condivisione/import in contesto pulito, navigazione sezioni.
- `tests/e2e/design-system.spec.ts` — 2 test: token e font caricati; bordo campo, altezza touch, focus, primario, overflow a 375 e menu mobile.

## 4. Golden case

I numeri di riferimento sono in `docs/domain/golden-cases.md` e devono coincidere con `cost.test.ts` al µ€. Se cambia una formula:

1. aggiorna `cost-model.md`;
2. aggiorna `golden-cases.md`;
3. aggiorna i test;
4. aggiorna `ENGINE_VERSION`.

## 5. Cosa non è coperto

- Regressione screenshot pixel-perfect: i test design verificano token, font, focus e overflow, non fanno snapshot visivi.
- Audit `axe` automatico.
- Stampa/PDF reale su più browser.
- Import via file chooser (E2E).
- Deploy Vercel (verifica manuale).
- Carico con centinaia di preventivi.

Sono candidati per T4.4/T4.5 o per il backlog.

## 6. CI

`.github/workflows/ci.yml` esegue:

- `npm ci`;
- `npm run check`;
- `npm run build` + Playwright con Chromium.

Stato al 24/10/2026: **verde su GitHub** per i job `check` ed `e2e` (29 unitari, 5 E2E).

## 7. Come aggiungere un test

- Per una formula: aggiungi un caso in `cost.test.ts` e il golden case nel doc.
- Per uno schema: aggiungi un fixture valido/invalido in `storage.test.ts`.
- Per un flusso UI: aggiungi un E2E in `tests/e2e`.
- Per un token o un componente: aggiungi un test in `tests/e2e/design-system.spec.ts` (font, token, focus, touch, overflow).
- Non usare snapshot fragili per i numeri: asserisci i valori espliciti.
- Per le proprietà, limita i range per mantenere i test veloci.
