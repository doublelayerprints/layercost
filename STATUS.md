# LayerCost — Stato del progetto

**Data:** 23 ottobre 2026
**Versione:** 0.1.0 — MVP funzionale
**Repo:** https://github.com/doublelayerprints/layercost (privata)
**Locale:** `/Users/tancredi/Desktop/DoubleLayeRPrints/layercost`
**Branch:** `main`

---

## 1. Sintesi

LayerCost è una SPA statica, local-first, per calcolare costo e prezzo di stampe 3D singole o di lotti. La v0.1 implementa le fasi 0–3 del piano:

- fondamenta, tooling, CI e documentazione;
- motore di costo e prezzo;
- configurazione, persistenza locale, export/import;
- UI funzionale, storico, condivisione, stampa/PDF e confronto.

La fase 4 (redesign UI con la skill di design) non è iniziata.

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

### Seed

- Anycubic Kobra 3 (250 × 250 × 260 mm, senza multicolore).
- Anycubic Kobra X (260 × 260 × 260 mm, ACE 2 Pro).
- Materiali PLA, PETG, TPU, ABS, ASA, PLA-CF, PETG-CF, PVA.
- Tariffa energia €0,25/kWh, guasti 5%, ricarico 30%, arrotondamento €0,10, IVA disattivata.
- Valori marcati come stime dove non verificati.

---

## 3. Verifiche

| Verifica          | Stato                            |
| ----------------- | -------------------------------- |
| TypeScript strict | verde                            |
| oxlint            | verde                            |
| Test unitari/dati | 16 superati                      |
| Test E2E          | 3 superati                       |
| Build produzione  | verde (~480 KB JS, ~140 KB gzip) |
| CI GitHub `check` | verde                            |
| CI GitHub `e2e`   | verde                            |

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

- `vercel.json` pronto (framework Vite, output `dist`, header di sicurezza).
- Pulsante “Deploy with Vercel” nel README.
- Repo GitHub collegabile a Vercel.
- Vercel CLI non è autenticato in questo ambiente.
- Un deploy temporaneo anonimo è stato creato, ma Vercel lo ha bloccato con 403; non è usabile come deploy definitivo.

Per completare il deploy:

1. Importare `doublelayerprints/layercost` da https://vercel.com/new.
2. Framework: Vite; build `npm run build`; output `dist`.
3. Deploy.

Oppure:

```bash
npx vercel login
npx vercel link
npx vercel --prod
```

---

## 6. Limiti noti

- Design definitivo non ancora realizzato.
- Nessuna sincronizzazione cloud.
- Nessun import diretto da slicer o presa intelligente.
- Nessun magazzino bobine.
- Nessun audit automatico axe.
- Migrazioni schema minime (v1; rifiuto versioni future).
- Guida iniziale come checklist, non wizard multi-step.
- Deploy Vercel permanente in attesa di autenticazione.

---

## 7. Prossimi passi

1. Completare il deploy Vercel (login/import).
2. Fase 4: direzione di design, design system, redesign schermate.
3. Audit accessibilità e test visuali.
4. Catena di migrazioni versionata con fixture.
5. Backlog: sync, magazzino bobine, import slicer, PWA, inglese.

---

## 8. Riferimenti

- `README.md` — onboarding e comandi.
- `PLAN.md` — visione e roadmap.
- `TASKS.md` — task e stato.
- `docs/domain/cost-model.md` — formule normative.
- `docs/engineering/deployment.md` — deploy.
- `docs/design/ui-brief.md` — requisiti per la fase design.
