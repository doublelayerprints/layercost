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
| Cloud (fase 5) | `@supabase/supabase-js`     | 2.118, lazy          |

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
| Database (fase 5) | Supabase Free      | Postgres 17 |
| Database CLI  | `supabase` (dev)       | 2.122    |

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

- Backend, ORM, auth, database (eccezione pianificata: Supabase in fase 5, ADR-0024).

> Fase 5 (in corso): Supabase Free per auth, Postgres e RLS; `@supabase/supabase-js` sarà caricato lazy solo per login/sync (ADR-0024). T5.4.2 ha aggiunto schema, RLS, trigger, tipi e mapper; il client arriva in T5.4.3. In modalità ospite l'app resta statica e non chiama la rete.
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

Build attuale (T5.4.3): circa 700 KB JS raw (197,5 KB gzip iniziale), 39 KB CSS (8,3 KB gzip) e 58 KB di font WOFF2. Con il cloud configurato si aggiunge un chunk lazy di circa 55 KB gzip. La v1.0.0 era circa 509 KB JS raw.

`scripts/check-budget.mjs` separa il caricamento iniziale dai chunk opzionali:

- 205 KB gzip di **JavaScript iniziale** (quello referenziato da `dist/index.html`);
- 80 KB gzip di **chunk lazy** (il client Supabase, circa 53,5 KB con env);
- 40 KB gzip di **worker `.3mf`** (circa 37,6 KB);
- 20 KB gzip di CSS;
- 120 KB gzip di font;
- 4 KB gzip di HTML;
- 350 KB gzip per **JS iniziale + CSS + font**.

La build senza env è a **191,4 KB JS iniziale** e **256,2 KB iniziali** totali; con env il chunk cloud è **53,5 KB** e non entra nel caricamento iniziale. Se il chunk lazy cresce oltre 80 KB, valutare un import più selettivo o un budget dedicato più alto con motivazione.

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
npm run db:start
npm run db:reset
npm run db:test
npm run db:types
npm run test:e2e:auth
```

`supabase` è una devDependency: serve solo per migrazioni, test pgTAP e generazione tipi, non entra nel bundle.
