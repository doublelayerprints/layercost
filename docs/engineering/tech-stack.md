# Stack tecnologico

**Stato:** v0.1 — versioni dal `package.json`

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

| Area          | Scelta         | Versione |
| ------------- | -------------- | -------- |
| Unit test     | Vitest         | 4.1      |
| Property test | fast-check     | 4.10     |
| E2E           | Playwright     | ultima   |
| Lint          | oxlint         | 1.88     |
| Format        | Prettier       | 3.9      |
| CI            | GitHub Actions | —        |

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
- **Playwright** — flusso reale calcola → salva → ricarica → condivide.

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

Build v0.1 dopo T4.5: circa 509 KB JS (147 KB gzip), 34 KB CSS (7,5 KB gzip) e 58 KB di font WOFF2. È accettabile per una SPA di calcolo; il budget del piano è sotto i 500 KB gzip, quindi c'è margine. Se cresce, valutare code splitting per le pagine di configurazione.

## 8. Comandi

```bash
npm run dev
npm run build
npm run preview
npm run typecheck
npm run lint
npm run test
npm run test:e2e
npm run check
```
