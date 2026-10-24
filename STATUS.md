# LayerCost — Stato del progetto

**Data:** 24 ottobre 2026
**Versione:** 0.1.0 — MVP funzionale
**Repo:** https://github.com/doublelayerprints/layercost (privata)
**Live:** https://layercost.vercel.app
**Locale:** `/Users/tancredi/Desktop/DoubleLayeRPrints/layercost`
**Branch:** `main`

---

## 1. Sintesi

LayerCost è una SPA statica, local-first, per calcolare costo e prezzo di stampe 3D singole o di lotti. La v0.1 implementa le fasi 0–3 del piano:

- fondamenta, tooling, CI e documentazione;
- motore di costo e prezzo;
- configurazione, persistenza locale, export/import;
- UI funzionale, storico, condivisione, stampa/PDF e confronto.

La fase 4 è in corso: T4.1 (brief), T4.2 (direzione **A — Strato**, ADR-0015) e T4.3 (design system) sono chiusi. Il redesign delle schermate (T4.4) è ancora da fare.

---

## 2. Cosa è implementato

### Motore

- Materiale con più materiali per riga.
- Energia da W medi per famiglia, non da potenza nominale.
- Ammortamento + manutenzione.
- Manodopera, extra e riserva guasti `p/(1−p)`.
- Ricarico o margine, sconto, arrotondamento, IVA opzionale.
- Ripartizione costi fissi e prezzi di riga con resti più grandi.
- Unità intere: µ€, bp, secondi, cg, W, Wh.
- Snapshot completo della configurazione per ogni preventivo.

### Applicazione

- Calcolatore singola stampa/lotto.
- Confronto Kobra 3 / Kobra X.
- Storico preventivi con ricerca, duplicazione, aggiornamento prezzi, archiviazione.
- Configurazione di stampanti, materiali, tariffe energia con storico, extra, impostazioni.
- Export/import JSON con backup automatico prima dell'import.
- Link condivisibile compresso, import nel proprio archivio.
- Stampa/PDF tramite stylesheet dedicato.
- Guida iniziale per confermare i dati stimati.
- Layout responsive, label, focus e unità.
- Design system **Strato**: token, font Archivo + Source Serif 4 self-hosted, componenti, stack dei costi, focus e stampa.

### Seed

- Anycubic Kobra 3 (250 × 250 × 260 mm, senza multicolore).
- Anycubic Kobra X (260 × 260 × 260 mm, ACE 2 Pro).
- Materiali PLA, PETG, TPU, ABS, ASA, PLA-CF, PETG-CF, PVA.
- Tariffa energia €0,20/kWh, manutenzione €0,01/h, guasti 5%, ricarico 30%, arrotondamento €0,10, IVA disattivata.
- Valori marcati come stime dove non verificati.

---

## 3. Verifiche

| Verifica          | Stato                                         |
| ----------------- | --------------------------------------------- |
| TypeScript strict | verde                                         |
| oxlint            | verde                                         |
| Test unitari/dati | 21 superati                                   |
| Test E2E          | 5 superati                                    |
| Build produzione  | verde (~480 KB JS, ~141 KB gzip; ~58 KB font) |
| CI GitHub `check` | verde                                         |
| CI GitHub `e2e`   | verde                                         |

Comandi:

```bash
npm run check
npm run test:e2e
```

---

## 4. Dati e privacy

- Dati in `localStorage`, chiave `layercost:data`.
- Nessun backend, account o analytics.
- Export/import JSON; backup automatico prima dell'import.
- Link condivisi = copia compressa del preventivo nell'URL.
- Svuotare il browser cancella i dati: il backup è l'unica copia esterna.

---

## 5. Deploy

- **Live:** https://layercost.vercel.app
- Progetto Vercel collegato alla repo GitHub; l'ultimo deploy verificato è il commit `ba8ec15` (T4.3), con status Vercel “Deployment has completed”.
- `vercel.json` configurato (framework Vite, output `dist`, header di sicurezza).
- Deploy automatico su push su `main` (verificato dallo status check Vercel).
- Header verificati: `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Robots-Tag: noindex`.
- `robots.txt` presente.

Il deploy manuale resta possibile da dashboard o con:

```bash
npx vercel login
npx vercel link
npx vercel --prod
```

---

## 6. Limiti noti

- Direzione e design system scelti (A — Strato, ADR-0015); il redesign delle schermate e la stampa finale non sono ancora realizzati.
- Nessuna sincronizzazione cloud.
- Nessun import diretto da slicer o presa intelligente.
- Nessun magazzino bobine.
- Nessun audit automatico axe.
- Migrazioni schema minime (v1; rifiuto versioni future).
- Guida iniziale come checklist, non wizard multi-step.

---

## 7. Prossimi passi

1. Fase 4: redesign schermate (T4.4), stati e rifiniture (T4.5), review e release v1.0 (T4.6).
2. Audit accessibilità e test visuali.
3. Catena di migrazioni versionata con fixture.
4. Backlog: sync, magazzino bobine, import slicer, PWA, inglese.

---

## 8. Riferimenti

- `README.md` — onboarding e comandi.
- `PLAN.md` — visione e roadmap.
- `TASKS.md` — task e stato.
- `docs/domain/cost-model.md` — formule normative.
- `docs/engineering/deployment.md` — deploy.
- `docs/design/ui-brief.md` — requisiti per la fase design.
- `docs/design/directions.md` — direzioni e scelta visiva.
- `docs/design/design-system.md` — token, componenti, accessibilità e stampa.
- `docs/adr/0015-direzione-visiva.md` — decisione sulla direzione.
