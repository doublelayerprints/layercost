# Stack tecnologico

**Stato:** v1.0.0 — versioni dal `package.json`

---

## 1. Runtime e build

| Area           | Scelta                      | Versione             |
| -------------- | --------------------------- | -------------------- |
| Runtime        | Node                        | 22+ (`.nvmrc`)       |
| Build          | Vite                        | 8.3                  |
| UI             | React + React DOM           | 19.3                 |
| Linguaggio     | TypeScript strict           | 6.0                  |
| Stile          | Tailwind CSS                | 4.3                  |
| Routing        | React Router (`HashRouter`) | 7.18                 |
| Stato          | Zustand                     | 5.0                  |
| Validazione    | Zod                         | 4.6                  |
| Link condivisi | lz-string                   | 1.5                  |
| Font           | Archivo + Source Serif 4    | self-hosted, OFL 1.1 |

## 2. Test e qualità

| Area          | Scelta                 | Versione |
| ------------- | ---------------------- | -------- |
| Unit test     | Vitest                 | 4.1      |
| Property test | fast-check             | 4.10     |
| E2E           | Playwright             | ultima   |
| Accessibilità | `@axe-core/playwright` | ultima   |
| Lint          | oxlint                 | 1.88     |
| Format        | Prettier               | 3.9      |
| CI            | GitHub Actions         | —        |

> Nota: il piano iniziale citava ESLint. In implementazione è stato scelto **oxlint** perché già integrato dallo scaffold Vite, più veloce e sufficiente per il progetto. La sostituzione è una deviazione consapevole, non un cambio di architettura.

## 3. Perché queste scelte

- **Vite** — build statica veloce, zero server.
- **React + TypeScript** — ecosistema, tipi, UI redesign futuro.
- **Tailwind** — UI funzionale rapida senza libreria di componenti.
- **Zustand** — stato semplice, poche cerimonie.
- **Zod** — un solo schema per form, storage e import.
- **HashRouter** — portabilità su hosting statico senza rewrite.
- **lz-string** — link condivisibili senza backend.
- **Font self-hosted** — Archivo e Source Serif 4 in WOFF2 (OFL 1.1), nessun CDN, cifre tabulari per denaro e tabelle.
- **Vitest + fast-check** — formule deterministiche e invarianti.
- **Playwright** — flusso reale calcola → salva → ricarica → condivide; progetti Chromium e WebKit.
- **axe-core** — audit WCAG 2.2 AA automatico su tutte le route, in chiaro e scuro.
- **Snapshot Playwright** — regressione visiva su 15 schermate, con baseline Linux in CI.

## 4. Dipendenze vietate in v1

- Backend, ORM, auth, database.
- Librerie di componenti (shadcn/Radix/MUI/Ant).
- Librerie di grafici.
- Librerie di money/decimal (le unità intere bastano).
- Analytics, cookie, tracciamento.
- `date-fns`: si usa `Intl` e utility interne.

## 5. Aggiungere una dipendenza

Prima di aggiungerla:

1. Verifica che non si possa fare con 20–30 righe interne.
2. Controlla peso, manutenzione e licenza.
3. Aggiungi un ADR se cambia l'architettura.
4. Aggiorna questo documento.

## 6. Browser supportati

- Chrome, Edge, Firefox, Safari: ultime 2 versioni.
- Safari iOS: ultima versione.
- Target mobile: 375 px di larghezza.

## 7. Bundle

Build v1.0.0: circa 509 KB JS (147 KB gzip Vite; 142 KB con lo script di budget), 34 KB CSS (7,6 KB gzip) e 58 KB di font WOFF2.

`scripts/check-budget.mjs` fallisce se supera:

- 225 KB gzip di JavaScript (era 200 KB prima di T5.6.2; i due dizionari i18n aggiungono circa 16 KB gzip e il writer XLSX di T5.12 circa 1 KB);
- 20 KB gzip di CSS;
- 120 KB gzip di font;
- 4 KB gzip di HTML;
- 350 KB gzip totali.

La build con i dizionari italiani e inglesi e l’export `.xlsx` è a circa 285 KB gzip totali (220 KB JS), quindi il vincolo reale resta il totale di 350 KB. Se cresce ancora, valutare code splitting per le pagine di configurazione o il caricamento differito del dizionario inglese.

## 8. Comandi

```bash
npm run dev
npm run build
npm run preview
npm run typecheck
npm run lint
npm run test
npm run test:e2e
npm run test:visual
npm run budget
npm run check
```
