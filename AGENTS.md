# AGENTS.md — LayerCost

**Versione:** draft pronto per il repository
**Data:** 23 ottobre 2026

---

## 1. Contesto

LayerCost è una SPA statica, local-first, per calcolare il costo e il prezzo di stampe 3D singole o di lotti. Due utenti iniziali: una Kobra 3 senza multicolore e una Kobra X con ACE 2 Pro. Tutti i parametri economici sono configurabili. Non c'è backend nella v1.

Stack: React 19 + TypeScript strict + Vite 8 + Tailwind 4 + Zustand + Zod. Test: Vitest + fast-check + Playwright. Lint: oxlint. Deploy: Vercel.

Lingua: UI e documentazione in italiano; codice, tipi, funzioni e commenti tecnici in inglese.

---

## 2. Ordine di lettura

Prima di toccare il codice:

1. `README.md`
2. `STATUS.md`
3. `AGENTS.md` (questo file)
4. `PLAN.md`
5. `TASKS.md`
6. `docs/domain/cost-model.md`
7. `docs/domain/data-model.md`
8. gli ADR rilevanti in `docs/adr/`
9. `docs/engineering/architecture.md`, `persistence.md`, `testing.md`, `deployment.md`
10. `docs/design/ui-brief.md`, `docs/design/directions.md`, `docs/design/design-system.md` solo per task UI

Se due documenti si contraddicono, fermati e segnala: non scegliere a caso.

---

## 3. Comandi

```bash
npm install          # dipendenze
npm run dev          # sviluppo
npm run typecheck    # TypeScript
npm run lint         # oxlint
npm run test         # Vitest
npm run test:watch   # Vitest in watch
npm run test:e2e     # Playwright
npm run build        # build di produzione
npm run preview      # anteprima build
npm run check        # typecheck + lint + test + build
```

`npm run check` è il gate prima di ogni commit. Non dichiarare un task chiuso se non è verde.

---

## 4. Architettura

```text
src/
  app/            routing, layout, provider
  domain/         tipi, motore di costo, prezzi — puro
  data/           repository, localStorage, migrazioni, seed
  state/          stato UI e casi d'uso (application layer attuale)
  features/       calculator, quotes, printers, materials, tariffs, extras, settings, compare, onboarding
  components/     primitivi minimi
  lib/            utility senza dominio
```

Regole di dipendenza:

- `domain` non importa nulla da `app`, `application`, `data`, `state`, `features`, `components`.
- `domain` non importa React, Zustand, Zod, `localStorage`, `window`, `Date.now()`, `crypto.randomUUID()`.
- `state` orchestra dominio e repository; se i casi d'uso crescono, si estrae `application/`.
- `data` implementa il repository; è l'unico posto che tocca `localStorage`.
- `features` usa dominio, store e componenti.
- Nessun accesso diretto allo storage fuori da `data/`.

---

## 5. Invarianti non negoziabili

1. **Unità intere.** Denaro in micro-euro (µ€), percentuali in basis point (bp), tempo in secondi, massa in centigrammi (cg), potenza in watt. Niente float per il denaro.
2. **Dominio puro.** Nessuna dipendenza da framework, browser o storage.
3. **Potenza nominale mai nel costo.** Si usano i profili di potenza media per famiglia.
4. **Grammi = totale slicer.** Nessun supplemento automatico per AMS/ACE: purge, flush e prime tower sono già inclusi.
5. **Preventivi immutabili.** Ogni preventivo salvato conserva input, tariffe risolte e versione motore. Aggiornare i prezzi crea una copia.
6. **Archiviare, non cancellare.** Un materiale o una stampante referenziata non si cancella mai.
7. **Una formula, un test.** Ogni formula ha un golden case in `cost-model.md` e un test.
8. **Cambio formula = docs + test + `engineVersion`.** Nello stesso commit.
9. **Nessun backend, account o sync in v1.** Solo architettura predisposta.
10. **Nessuna libreria di componenti prima della fase 4.** HTML semantico + Tailwind + primitivi interni.
11. **Nessun analytics, cookie o chiamata di rete** oltre agli asset statici.
12. **Nessun `eval`, `dangerouslySetInnerHTML`, `any`.**

---

## 6. Flusso di lavoro

1. Prendi il primo task non bloccato in `TASKS.md`.
2. Leggi i documenti collegati e i test esistenti.
3. Se il task cambia una formula o uno schema, scrivi prima il test o l'esempio.
4. Implementa nel layer corretto, non “tutto nel componente”.
5. Esegui `npm run check`.
6. Aggiorna la documentazione e lo stato del task.
7. Commit con Conventional Commits.
8. Apri una PR; per i task UI verifica la preview Vercel.
9. Se sei bloccato, scrivi il blocco in `TASKS.md` con una nota e fermati.

Non aggregare task diversi in un unico commit. Non fare refactor non richiesti insieme a una feature.

---

## 7. Definition of Done

- [ ] TypeScript strict, nessun `any`.
- [ ] Test nuovi/aggiornati; formule coperte.
- [ ] `npm run check` verde.
- [ ] Documentazione aggiornata.
- [ ] `TASKS.md` aggiornato.
- [ ] Nessuna regressione.
- [ ] UI: tastiera, focus, label, contrasto, 375 px e 1440 px.
- [ ] UI: preview Vercel verificata.
- [ ] Nessun dato utente cancellato senza conferma.
- [ ] Commit Conventional Commits.

---

## 8. Cosa decidi da solo

- Nomi di file e funzioni interne.
- Struttura dei test.
- Piccoli refactor senza cambio di comportamento.
- Dettagli UI della fase funzionale, se rispettano il brief.
- Scelta di una utility interna al posto di una dipendenza.
- Messaggi di errore e microcopy, in italiano.

## 8.1 Cosa chiedere prima

- Cambio di scope o di una fase.
- Nuovo backend, auth, sync o servizio esterno.
- Cambio di semantica di una formula o di un'unità.
- Nuova dipendenza esterna.
- Modifica dello schema che rompe i preventivi salvati.
- Cancellazione di dati utente.
- Cambio di hosting o di piano.
- Direzione di design prima della fase 4.

---

## 9. Regole per area

### Dominio

- Funzioni pure, input espliciti, output espliciti.
- Ricevi `now` e `id` dall'esterno.
- Nessun `try/catch` per controllare il flusso: valida ai confini.
- Arrotonda nell'ordine documentato.
- Non usare `Math.random()` nei risultati.

### Dati

- Le entità persistite hanno un `id` stabile; i preventivi hanno `createdAt`/`updatedAt` ISO.
- Ogni schema ha `schemaVersion`.
- Prima di una migrazione, salva un backup raw.
- Import: valida, migra, poi sostituisci; mai scrittura parziale.
- Dati corrotti: non bloccare l'app; offri export e reset.
- Archivia invece di cancellare se referenziato.

### UI

- HTML semantico prima dei div.
- Ogni input ha label e unità visibile.
- Errori associati al campo con `aria-describedby`.
- Focus visibile.
- Nessun colore come unica informazione.
- Tabelle responsive: scroll controllato o card.
- Formattazione it-IT con `Intl`.
- Niente animazioni non richieste; rispetta `prefers-reduced-motion`.
- Non introdurre shadcn/Radix/MUI o simili prima della fase 4.

### Documentazione

- `cost-model.md` è normativo.
- Ogni nuovo termine va nel glossario.
- Ogni nuova fonte va in `sources.md`.
- Ogni decisione importante va in un ADR.
- Non duplicare sezioni: linka.
- Se cambi una formula, aggiorna esempio, golden case e test.

### Test

- Unit test per ogni componente di costo.
- Property test per monotonia, scala e somme esatte.
- Integration test per repository, import, migrazioni.
- E2E per il flusso critico.
- Fixture riutilizzabili; niente dati casuali non seedati.
- Test di accessibilità sulle schermate principali.

### Git

- Conventional Commits: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`.
- Un task = un commit o una PR piccola.
- Non committare `.env`, segreti, `node_modules`, `dist`.
- Non fare force push su `main`.
- Aggiorna `CHANGELOG.md` per le release.

---

## 10. Divieti

- Non usare float per denaro, percentuali, grammi o tempo nel dominio.
- Non usare la potenza nominale della stampante nel costo.
- Non aggiungere una percentuale di purge AMS/ACE ai grammi dello slicer.
- Non cancellare entità referenziate.
- Non modificare un preventivo salvato: crea una copia.
- Non cambiare una formula senza documentazione, golden test e `engineVersion`.
- Non introdurre un backend o un account in v1.
- Non introdurre una libreria di componenti prima della fase 4.
- Non introdurre analytics, cookie o tracciamento.
- Non usare `any`, `eval`, `dangerouslySetInnerHTML`.
- Non accedere a `localStorage` fuori da `data/`.
- Non fare migrazioni silenziose senza backup.
- Non committare segreti.
- Non dichiarare “fatto” senza `npm run check` verde.

---

## 11. Quando fermarsi

Fermati e chiedi se:

- una formula è ambigua o due documenti si contraddicono;
- il task richiede una decisione di design prima della fase 4;
- una modifica può cancellare dati;
- una dipendenza esterna è necessaria;
- il piano gratuito dell'hosting non copre l'uso previsto;
- i test falliscono per motivi non collegati al task;
- il task richiede un cambio di schema non retrocompatibile.

Scrivi il blocco in `TASKS.md` e spiega cosa serve per sbloccarlo.

---

## 12. Riferimenti

- `PLAN.md` — visione, scope, architettura, roadmap.
- `TASKS.md` — backlog e criteri.
- `docs/domain/cost-model.md` — formule normative.
- `docs/domain/data-model.md` — schema e invarianti.
- `docs/domain/sources.md` — fonti e confidenza.
- `docs/adr/` — decisioni.
- `docs/engineering/deployment.md` — Vercel e alternative.
- `docs/design/ui-brief.md` — requisiti per la fase design.
- `docs/design/directions.md` — direzioni e scelta visiva.
- `docs/design/design-system.md` — token, componenti, accessibilità e stampa.
