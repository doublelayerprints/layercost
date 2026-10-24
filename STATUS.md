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

La fase 4 è in corso: T4.1 (brief), T4.2 (direzione **A — Strato**, ADR-0015), T4.3 (design system), T4.4 (redesign delle schermate) e T4.7 (dark mode, ADR-0016) sono chiusi, mergiati in `main` e distribuiti in produzione. Restano T4.5 (stati e rifiniture) e T4.6 (review e release v1.0).

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
- Redesign delle schermate: shell open plane, calcolatore 7/12 + 5/12 con risultato sticky, confronto rapido tra le due stampanti, preventivi e dettaglio con prezzo + stack, anagrafiche a righe o tabelle, impostazioni con anteprima del prezzo, condivisione read-only, stampa A4.
- Tema chiaro, scuro o di sistema (ADR-0016), con preferenza salvata sul dispositivo e stampa sempre chiara.
- Stampa: intestazione, meta, righe, composizione in grigi, totali e note; PDF A4 verificato su Chrome.

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
| Test unitari/dati | 36 superati                                   |
| Test E2E          | 6 superati                                    |
| Build produzione  | verde (~505 KB JS, ~146 KB gzip; ~58 KB font) |
| CI GitHub `check` | verde su `main` (`a0960d3`)                   |
| CI GitHub `e2e`   | verde su `main` (`a0960d3`)                   |
| Vercel produzione | deployment completato, gate 0 FAIL / 1 WARN   |

Comandi:

```bash
npm run check
npm run test:e2e
```

---

## 4. Dati e privacy

- Dati in `localStorage`, chiave `layercost:data`.
- Preferenza del tema in `layercost:theme`, separata dai dati e non inclusa nei backup.
- Nessun backend, account o analytics.
- Export/import JSON; backup automatico prima dell'import.
- Link condivisi = copia compressa del preventivo nell'URL.
- Svuotare il browser cancella i dati: il backup è l'unica copia esterna.

---

## 5. Deploy

- **Live:** https://layercost.vercel.app
- Progetto Vercel collegato alla repo GitHub.
- Ultimo deploy verificato: commit `a0960d3` (T4.7, PR #2) del 24/10/2026. `inspect.mjs --app` su https://layercost.vercel.app a 1440/768/390: **0 FAIL, 1 WARN** (`ragged-row`, rail sticky). La produzione serve il tema scuro (token `#141413`, preferenza persistita, `<meta name="theme-color">` aggiornato) e la sezione Aspetto ha le tre radio. I commit successivi di sola documentazione ridistribuiscono lo stesso build.
- Le preview Vercel sono protette da SSO; la produzione è pubblica. Per verificare una preview serve un browser autenticato su Vercel.
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

- Stampa verificata su Chrome (PDF A4); Safari e stampa reale su più browser restano da verificare (T3.8).
- Nessun audit automatico axe; verifica manuale di tastiera, focus e overflow a 390 px (T3.11).
- Nessun test visuale di regressione (T3.12).
- Nessuna sincronizzazione cloud.
- Nessun import diretto da slicer o presa intelligente.
- Nessun magazzino bobine.
- Migrazioni schema minime (v1; rifiuto versioni future).
- Guida iniziale come checklist, non wizard multi-step.

---

## 7. Prossimi passi

1. Fase 4: stati e rifiniture (T4.5), review e release v1.0 (T4.6).
2. Audit accessibilità automatico (axe) e test visuali.
3. Catena di migrazioni versionata con fixture.
4. Backlog: sync, magazzino bobine, import slicer, PWA, inglese.

---

## 8. Ripresa rapida

- **Stato:** `main` pulito e allineato a `origin/main` su `a0960d3`; T4.7 è in produzione. Prossimo task: **T4.5 — Stati e rifiniture**.
- **Da leggere prima di riprendere:** `AGENTS.md`, `TASKS.md` (T4.5 e T4.7), `docs/design/design-system.md` §8.3–8.4, `docs/design/ui-brief.md` §5.
- **Comandi:** `npm run dev`, `npm run check`, `npm run test:e2e`.
- **Punti aperti:** Safari e stampa reale (T3.8), audit `axe` (T3.11), test visuali di regressione (T3.12). La preview Vercel richiede login SSO; la produzione è pubblica.
- **Branch remoto:** `feat/t4.4-screens` è ancora su `origin` dopo il merge e può essere eliminato con `git push origin --delete feat/t4.4-screens`.
- **Vincolo:** non toccare dominio, formule, `engineVersion`, snapshot o persistenza senza un nuovo ADR e i test collegati. La preferenza del tema resta fuori da `AppData`.

---

## 9. Riferimenti

- `README.md` — onboarding e comandi.
- `PLAN.md` — visione e roadmap.
- `TASKS.md` — task e stato.
- `docs/domain/cost-model.md` — formule normative.
- `docs/engineering/deployment.md` — deploy.
- `docs/design/ui-brief.md` — requisiti per la fase design.
- `docs/design/directions.md` — direzioni e scelta visiva.
- `docs/design/design-system.md` — token, componenti, accessibilità e stampa.
- `docs/adr/0015-direzione-visiva.md` — decisione sulla direzione.
