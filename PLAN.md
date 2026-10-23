# LayerCost — Piano di prodotto e tecnico

**Stato:** MVP funzionale implementato (fasi 0–3); CI verde su GitHub; deploy Vercel live; design da fare
**Data:** 23 ottobre 2026
**Lingua:** UI e documentazione in italiano; codice e identificatori in inglese
**Decisioni già prese:** nome **LayerCost**; local-first con sincronizzazione rimandata; preventivi snapshot con aggiornamento esplicito su copia; scope v1 completo; costo + prezzo; deploy su Vercel

## Stato implementazione

- **Fatto:** motore di calcolo, configurazione, persistenza locale, export/import, calcolatore singolo/lotto, confronto stampanti, storico con snapshot, link condivisibile, stampa/PDF, test unitari e E2E, CI verde su GitHub, repo `doublelayerprints/layercost`, deploy live su https://layercost.vercel.app, documentazione e ADR.
- **Da fare:** redesign UI con la skill di design, audit accessibilità automatico, eventuale sincronizzazione cloud.
- **Non fatto:** import diretto da slicer, magazzino bobine, PWA, inglese.

---

## 1. Sintesi

LayerCost è un'app web statica per stimare il costo reale di una stampa 3D o di un lotto di stampe. Parte con due profili: **Anycubic Kobra 3** (senza sistema multicolore) e **Anycubic Kobra X** (con ACE 2 Pro).

Tutti i parametri economici sono modificabili: tariffa elettrica, prezzo dei materiali, potenza media, vita utile della stampante, manutenzione, manodopera, tasso di guasti, ricarico, IVA e arrotondamento.

Il progetto deve essere:

- **corretto** — formule documentate, unità intere, test di riferimento;
- **trasparente** — ogni voce di costo è mostrata e giustificata;
- **configurabile** — nessun numero economico hardcoded;
- **locale e privato** — nessun backend, nessun account, nessun tracciamento;
- **portabile** — build statica deployabile su Vercel, GitHub Pages, Netlify o Cloudflare Pages;
- **manutenibile** — dominio puro separato dalla UI, documentazione e ADR aggiornati insieme al codice.

---

## 2. Problema e utenti

### 2.1 Persone

| Persona                       | Contesto                                                     | Bisogno                                                                     |
| ----------------------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------- |
| **Tancredi**                  | Kobra 3, stampa per hobby e piccoli lotti, senza multicolore | Sapere quanto costa davvero un pezzo e un lotto, includendo energia e usura |
| **La sua amorosa**            | Kobra X con ACE 2 Pro, stampe multicolore                    | Includere cambi colore, sprechi e usura senza contare due volte il purge    |
| **Futuro utente commerciale** | Vende stampe occasionalmente                                 | Ottenere un prezzo con margine, sconto e IVA opzionale                      |

### 2.2 Lavori da svolgere

- «Ho finito lo slicing: quanto mi è costato questo pezzo?»
- «Devo stampare 8 pezzi diversi: quanto costa il lotto e quanto devo far pagare?»
- «È cambiata la tariffa elettrica: i nuovi calcoli usano il nuovo prezzo, i vecchi preventivi restano invariati.»
- «La Kobra X consuma più della Kobra 3? Su questo lavoro quale conviene?»
- «Devo condividere un preventivo con la mia ragazza o con un cliente.»

### 2.3 User story

| ID    | Storia                                                                   | Criterio di accettazione                                          |
| ----- | ------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| US-01 | Configurare una stampante con prezzo, vita utile, potenza e manutenzione | Vedo il costo orario di usura e posso modificarlo in ogni momento |
| US-02 | Configurare un materiale con prezzo al kg e peso netto                   | Vedo il prezzo al grammo e il costo del materiale in tempo reale  |
| US-03 | Aggiornare la tariffa elettrica                                          | I nuovi calcoli usano la nuova tariffa; i preventivi salvati no   |
| US-04 | Calcolare una stampa con due materiali                                   | Vedo il costo per materiale, il tempo e il totale                 |
| US-05 | Calcolare un lotto di 5 stampe                                           | Vedo costo per riga, costo unitario, costo pieno e totale         |
| US-06 | Salvare un preventivo e ricaricarlo                                      | I numeri e i prezzi usati sono identici dopo il reload            |
| US-07 | Esportare e reimportare tutti i dati                                     | Il roundtrip non perde né modifica nulla                          |
| US-08 | Condividere un preventivo con un link                                    | Il destinatario vede un riepilogo in sola lettura                 |
| US-09 | Confrontare Kobra 3 e Kobra X sullo stesso lavoro                        | Vedo la differenza di costo e di prezzo                           |
| US-10 | Ottenere un prezzo con margine e IVA                                     | Vedo costo, prezzo netto, IVA e prezzo lordo                      |
| US-11 | Stampare o salvare in PDF un preventivo                                  | Il documento è leggibile e non contiene elementi dell'app         |
| US-12 | Archiviare un materiale                                                  | I preventivi storici continuano a funzionare                      |

---

## 3. Principi di prodotto

1. **Ogni numero è configurabile.** Se un valore entra in un calcolo, deve essere modificabile e persistito.
2. **Nessun numero magico.** Le formule sono in `docs/domain/cost-model.md`; il codice le implementa, non le inventa.
3. **La trasparenza vince sulla semplificazione.** Meglio mostrare sei righe di costo che un prezzo unico inspiegabile.
4. **Il costo non è il prezzo.** Il motore calcola il costo; il livello prezzi applica margine, sconto e IVA.
5. **Il passato non cambia.** Un preventivo salvato conserva le tariffe usate.
6. **Locale prima, cloud dopo.** Nessun backend in v1, ma interfaccia dati pronta per un adapter futuro.
7. **La UI può cambiare, il dominio no.** La fase di design non deve toccare le formule.
8. **Gratis e senza lock-in.** Hosting statico, dati esportabili, nessuna dipendenza da un servizio proprietario.

---

## 4. Scope

### 4.1 Dentro la v1

- Anagrafiche: stampanti, materiali, tariffe energia con storico, costi extra, impostazioni.
- Calcolatore singola stampa e lotto.
- Più materiali per riga (AMS/ACE o cambio manuale).
- Quantità per riga.
- Override per riga: kWh misurati, potenza media, tasso guasti.
- Risultato con breakdown completo, costo diretto, costo pieno, prezzo, margine effettivo.
- Confronto tra due stampanti sullo stesso lavoro.
- Preventivi salvati con snapshot, storico, duplicazione, archiviazione, ricerca.
- Export/import JSON, link condivisibile, PDF tramite stampa del browser.
- Persistenza locale con schema versionato e migrazioni.
- Wizard iniziale per confermare i dati stimati.
- UI funzionale, accessibile e responsive; **non** design definitivo.
- Test del dominio, test end-to-end del flusso critico, CI e deploy.

### 4.2 Fuori dalla v1

- Backend, account, login, sincronizzazione cloud (solo architettura predisposta).
- Magazzino bobine e scarico automatico.
- Parsing di G-code o import diretto dallo slicer.
- Import CSV da presa intelligente.
- Multi-valuta e conversione cambi.
- Fasce orarie F1/F2/F3.
- Fatturazione elettronica o adempimenti fiscali.
- Design visivo definitivo, dark mode, animazioni.
- PWA/offline.
- Interfaccia in inglese.
- Grafici e dashboard.
- Gestione clienti e listini.
- Confronto actual vs estimated.

---

## 5. Requisiti funzionali

| ID    | Requisito                                                                                                                                                   |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-01 | CRUD stampanti con prezzo di acquisto, valore residuo, vita utile, manutenzione €/h, potenza media per famiglia, minuti di avvio, multicolore, volume, note |
| FR-02 | CRUD materiali con famiglia, prezzo al kg, peso netto informativo, fornitore, colore, note                                                                  |
| FR-03 | Tariffe energia con etichetta, prezzo €/kWh, data di decorrenza; selezione della tariffa corrente per data                                                  |
| FR-04 | Tariffa globale con override opzionale per stampante                                                                                                        |
| FR-05 | CRUD costi extra con importo e unità (`perUnit`, `perJob`)                                                                                                  |
| FR-06 | Impostazioni: manodopera €/h, tasso guasti, maggiorazione tempo, ricarico/margine, arrotondamento, IVA, ripartizione costi fissi                            |
| FR-07 | Calcolo di una riga con stampante, uno o più materiali, grammi, tempo, quantità                                                                             |
| FR-08 | Override per riga: kWh misurati, potenza media, tasso guasti                                                                                                |
| FR-09 | Breakdown: materiale, energia, ammortamento, manutenzione, manodopera, extra, riserva guasti                                                                |
| FR-10 | Costo diretto unitario, costo diretto riga, costo pieno unitario, costo totale                                                                              |
| FR-11 | Prezzo con ricarico o margine, sconto, arrotondamento, IVA inclusa/esclusa                                                                                  |
| FR-12 | Lotto: più righe, quantità, costi fissi di lavoro, ripartizione                                                                                             |
| FR-13 | Confronto tra stampanti: duplica una riga su un'altra stampante e mostra il delta                                                                           |
| FR-14 | Salvataggio preventivo con snapshot delle tariffe e versione del motore                                                                                     |
| FR-15 | Storico, ricerca, duplicazione, archiviazione, cancellazione solo se non referenziato                                                                       |
| FR-16 | Export/import JSON con validazione, migrazione e conferma                                                                                                   |
| FR-17 | Link condivisibile in sola lettura, con possibilità di importare il preventivo                                                                              |
| FR-18 | Stampa/PDF del preventivo con breakdown e totali                                                                                                            |
| FR-19 | Wizard iniziale per confermare prezzi stampanti, vita utile, tariffa e prezzi bobine                                                                        |
| FR-20 | Validazione con errori bloccanti e avvisi non bloccanti per valori anomali                                                                                  |
| FR-21 | Formattazione italiana: valuta EUR, decimali con virgola, date `gg/mm/aaaa`, tempo `h:mm`                                                                   |
| FR-22 | Accessibilità: label, focus, contrasto, navigazione da tastiera, messaggi di errore associati                                                               |
| FR-23 | Responsive: utilizzabile da telefono, tablet e desktop                                                                                                      |
| FR-24 | Persistenza locale con versione schema, migrazioni e backup prima di una migrazione                                                                         |
| FR-25 | Repository astratto: nessun accesso diretto a `localStorage` fuori dall'infrastruttura                                                                      |

---

## 6. Requisiti non funzionali

- **Prestazioni:** calcolo di 50 righe in meno di 100 ms; caricamento iniziale inferiore a 2 s su rete 3G ragionevole.
- **Affidabilità:** nessuna perdita di dati al reload; export/import con roundtrip esatto; migrazioni testate.
- **Privacy:** nessuna chiamata di rete oltre agli asset statici; nessun analytics; nessun cookie.
- **Accessibilità:** obiettivo WCAG 2.1 AA.
- **Browser:** ultime versioni di Chrome, Safari, Firefox ed Edge; Safari iOS.
- **Manutenibilità:** dominio senza dipendenze da React, browser o storage; ogni formula documentata e testata.
- **Portabilità:** build statica senza server; hash routing; base path configurabile.
- **Sicurezza:** import validato con Zod; niente `eval`, niente `dangerouslySetInnerHTML`; header di sicurezza su Vercel; CSP da valutare.
- **Bundle:** obiettivo < 500 KB gzip per il caricamento iniziale.
- **Semplicità:** nessuna dipendenza pesante se una funzione da 20 righe basta.

---

## 7. Architettura

### 7.1 Livelli

```text
┌──────────────────────────────────────────────┐
│ UI (React, form, route, componenti)          │
└──────────────────────┬───────────────────────┘
                       │
┌──────────────────────▼───────────────────────┐
│ Stato applicativo (store: calcola, salva,     │
│ esporta, importa, condivide)                  │
└──────────────────────┬───────────────────────┘
                       │
┌──────────────────────▼───────────────────────┐
│ Domain (tipi, motore di costo, prezzi)       │
│ puro, deterministico, senza I/O              │
└──────────────────────▲───────────────────────┘
                       │
┌──────────────────────┴───────────────────────┐
│ Infrastructure (repository, localStorage,    │
│ migrazioni, compressione, clock, UUID)       │
└──────────────────────────────────────────────┘
```

Regola: le dipendenze puntano verso l'interno. Il dominio non importa React, Zustand, Zod, `localStorage` o `window`.

### 7.2 Struttura del repository

```text
src/
  app/            # routing, layout
  domain/
    units.ts
    money.ts
    types.ts
    version.ts
    cost/
      material.ts
      energy.ts
      wear.ts
      labor.ts
      failure.ts
      line.ts
      pricing.ts
      quote.ts
      index.ts
    cost.test.ts
  data/
    repository.ts
    storage.ts
    schemas.ts
    seed.ts
    storage.test.ts
  state/
    app-store.ts
  features/
    calculator/
    quotes/
    printers/
    materials/
    tariffs/
    extras/
    settings/
    compare/
    onboarding/
    NotFoundPage.tsx
  components/
    ui.tsx
    number-fields.tsx
  lib/
    format.ts
    date.ts
    id.ts
    share.ts
    labels.ts
    cn.ts
  main.tsx
tests/
  e2e/
docs/
```

### 7.3 Flusso di calcolo

1. La UI costruisce un `QuoteDraft` validato.
2. L'application service risolve le tariffe correnti (stampante, materiale, energia, manodopera, guasti).
3. Il dominio calcola le righe, ripartisce i costi fissi, applica il prezzo.
4. Il risultato viene mostrato e, se l'utente salva, memorizzato con lo snapshot.
5. Al reload, il preventivo salvato usa lo snapshot, non la configurazione corrente.

### 7.4 Sync-ready

- Interfaccia `DataRepository` astratta: `load`, `save`, `export`, `import`, `reset`. In v1 è sincrona (localStorage); un adapter cloud potrà richiedere un refactor async dello store.
- Adapter locale in v1; adapter Supabase in una fase futura.
- Nessuna chiamata a `localStorage` fuori da `data/`.
- ID stabili; timestamp ISO su preventivi e snapshot, per facilitare un merge futuro.
- I preventivi sono snapshot immutabili: il merge per ID è semplice.
- La sincronizzazione delle impostazioni richiederà un ADR dedicato (conflitti, last-write-wins o merge per entità).

---

## 8. Stack tecnologico

| Area              | Scelta                          | Motivo                                                            |
| ----------------- | ------------------------------- | ----------------------------------------------------------------- |
| Build             | Vite 8                          | Build statica veloce, configurazione minima                       |
| UI                | React 19 + TypeScript strict    | Ecosistema, familiarità, UI redesign futuro                       |
| Stile             | Tailwind CSS 4                  | Velocità nella UI funzionale, nessun lock-in di componenti        |
| Stato             | Zustand 5                       | Semplice, testabile, nessun boilerplate                           |
| Form              | Form controllati + Zod          | Validazione senza una dipendenza aggiuntiva                       |
| Routing           | React Router 7 con `HashRouter` | Portabilità su hosting statico senza rewrite                      |
| Validazione       | Zod 4                           | Schema unico per storage e import                                 |
| Compressione link | `lz-string`                     | Link condivisibili senza backend                                  |
| Test unitari      | Vitest                          | Veloce, integrazione Vite                                         |
| Property test     | `fast-check`                    | Invarianti del motore                                             |
| Test E2E          | Playwright                      | Flusso critico reale                                              |
| Lint/format       | oxlint + Prettier               | Veloce, già integrato nello scaffold; a11y verificata manualmente |
| CI                | GitHub Actions                  | Typecheck, lint, test, build                                      |
| Deploy            | Vercel                          | Preview automatiche, piano gratuito per uso personale             |

**Non usare in v1:** librerie di componenti (shadcn/Radix/MUI), librerie di grafici, date-fns, library di money, backend, ORM, analytics.

---

## 9. Hosting e deploy

### 9.1 Vercel

- Repository GitHub collegato a Vercel.
- Build: `npm run build`; output: `dist`.
- Nessuna funzione server, nessuna variabile d'ambiente obbligatoria.
- Hash routing: nessun rewrite necessario.
- Preview deployment su ogni pull request.
- Header consigliati: CSP, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` minimale.
- `noindex` per un'app privata.

### 9.2 Portabilità

- `base` di Vite configurabile con `VITE_BASE` (default `/`).
- Hash routing: funziona su Vercel, GitHub Pages con sottocartella, Netlify, Cloudflare Pages.
- Nessun asset con path assoluto hardcoded.
- Workflow GitHub Pages documentato come alternativa, non mantenuto in parallelo.

### 9.3 Nota sui piani gratuiti

Vercel Hobby è pensato per uso personale. Se il sito diventa parte di un'attività commerciale, valutare Cloudflare Pages o Netlify, che hanno piani gratuiti più permissivi. Il build statico resta lo stesso.

---

## 10. Modello dati (sintesi)

La specifica completa è in `docs/domain/data-model.md`.

| Entità         | Campi principali                                                                                                                                                                 |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Settings`     | tariffe energia, manodopera €/h, tasso guasti, maggiorazione tempo, modalità prezzo, ricarico/margine, arrotondamento, IVA, ripartizione, preferenze backup                      |
| `EnergyTariff` | id, etichetta, prezzo µ€/kWh, `effectiveFrom`, note                                                                                                                              |
| `Printer`      | id, nome, modello, prezzo, valore residuo, vita utile ore, manutenzione €/h, profili potenza per famiglia, minuti avvio, multicolore, volume, tariffa override, note, archiviata |
| `Material`     | id, nome, famiglia, prezzo al kg, peso netto, fornitore, colore, tasso guasti override, note, archiviato                                                                         |
| `Extra`        | id, nome, importo, unità (`perUnit`/`perJob`), categoria, archiviato                                                                                                             |
| `PrintLine`    | id, nome, stampante, tempo slicer, materiali (materiale + grammi), quantità, finitura secondi/unità, extra, override, note                                                       |
| `Quote`        | id, nome, data, cliente opzionale, stato, righe, costi di lavoro, impostazioni prezzo, snapshot, risultato, versione motore, timestamp                                           |
| `AppData`      | `schemaVersion`, settings, printers, materials, extras, quotes                                                                                                                   |

### 10.1 Unità

- Soldi: micro-euro interi (µ€). €1 = 1.000.000 µ€.
- Percentuali: basis point interi (bp). 30% = 3.000 bp.
- Tempo: secondi interi.
- Massa: centigrammi interi (cg). 1 g = 100 cg.
- Potenza: watt interi.
- Prezzo energia: µ€/kWh interi.
- Prezzo materiale: µ€/kg interi.
- Override energia: wattora interi (Wh).

### 10.2 Snapshot del preventivo

Ogni preventivo salvato contiene:

- `engineVersion`;
- data del preventivo;
- per ogni riga: nomi e ID, grammi, tempo, quantità, minuti di finitura, extra, tariffe risolte (prezzo materiale, potenza media, avvio, ammortamento €/h, manutenzione €/h, prezzo energia, tasso guasti, manodopera);
- impostazioni di prezzo (modalità, ricarico/margine, arrotondamento, sconto, IVA);
- costi di lavoro;
- risultato calcolato.

L'utente può "aggiornare ai prezzi correnti" solo creando una copia. L'originale non cambia.

### 10.3 Privacy e backup

- I dati vivono nel browser: nessun server li riceve.
- I link condivisibili contengono il preventivo compresso nell'URL. Chiunque abbia il link può leggerlo: non inserire dati sensibili.
- Svuotare i dati del browser cancella anche i preventivi. L'export JSON è un pulsante visibile, con un promemoria periodico.
- Prima di una migrazione dello schema, l'app conserva un backup raw dei dati.
- Nessun analytics, nessun cookie, nessun tracciamento.

---

## 11. Documentazione

Il progetto adotta una documentazione "docs-as-code": ogni decisione, formula e task ha un posto preciso.

| File                               | Ruolo                                                 |
| ---------------------------------- | ----------------------------------------------------- |
| `README.md`                        | Cos'è, come si avvia, come si deploya                 |
| `STATUS.md`                        | Stato attuale, verifiche, deploy, limiti              |
| `AGENTS.md`                        | Regole operative per il coding agent                  |
| `docs/README.md`                   | Struttura e regole della documentazione               |
| `PLAN.md`                          | Visione, scope, architettura, roadmap, rischi         |
| `TASKS.md`                         | Task con ID, dipendenze, criteri di accettazione      |
| `docs/domain/cost-model.md`        | **Normativo**: formule, unità, arrotondamenti, esempi |
| `docs/domain/data-model.md`        | Entità, invarianti, snapshot, migrazioni              |
| `docs/domain/glossary.md`          | Glossario italiano/inglese                            |
| `docs/domain/sources.md`           | Fonti su stampanti e potenze, con confidenza          |
| `docs/domain/golden-cases.md`      | Esempi numerici condivisi con i test                  |
| `docs/engineering/architecture.md` | Livelli, dipendenze, flussi                           |
| `docs/engineering/tech-stack.md`   | Stack, versioni, dipendenze                           |
| `docs/engineering/persistence.md`  | Storage, schema, migrazioni, backup                   |
| `docs/engineering/testing.md`      | Strategia e casi di test                              |
| `docs/engineering/deployment.md`   | Vercel e alternative                                  |
| `docs/engineering/conventions.md`  | Stile, naming, commit, PR                             |
| `docs/design/ui-brief.md`          | Requisiti UI per la fase design                       |
| `docs/adr/0001…`                   | Decisioni architetturali                              |
| `CHANGELOG.md`                     | Versioni                                              |

**Regola:** se codice e `cost-model.md` non concordano, è un bug. Se una formula cambia, cambiano nello stesso commit documentazione, test e versione del motore.

La specifica operativa è in `docs/README.md`; le regole per il coding agent sono in `AGENTS.md`.

---

## 12. Roadmap

| Fase                  | Contenuto                                                           | Gate                                               | Stima indicativa |
| --------------------- | ------------------------------------------------------------------- | -------------------------------------------------- | ---------------- |
| **0 — Fondamenta**    | Repo, tooling, CI, docs, unità e tipi                               | Build e test verdi; docs approvati                 | 0,5–1 giorno     |
| **1 — Motore**        | Materiale, energia, usura, manodopera, extra, guasti, prezzi, lotti | Esempi documentati = test al µ€                    | 1,5–3 giorni     |
| **2 — Config e dati** | Seed, CRUD, tariffe, storage, migrazioni, export/import             | Reload e roundtrip ok; vecchi preventivi invariati | 1,5–3 giorni     |
| **3 — UI funzionale** | Calcolatore, risultati, storico, PDF, link, confronto               | Scenario end-to-end completo su Vercel             | 2–4 giorni       |
| **4 — UI design**     | Skill design, design system, responsive, accessibilità              | Review UX + nessuna regressione                    | 2–5 giorni       |
| **5 — Extra**         | Inventory, actuals, sync, PWA, inglese                              | Backlog prioritizzato                              | —                |

**MVP:** fasi 0–3 implementate. Deploy Vercel live su https://layercost.vercel.app.
**v1.0:** fase 4 completata.
Le stime sono indicative e si riferiscono a lavoro assistito da agente, non a giornate umane.

---

## 13. Dati di partenza

Tutti i valori sono modificabili. Quelli marcati **stimato** devono essere confermati nel wizard iniziale.

### 13.1 Stampanti

| Campo                 | Kobra 3            | Kobra X                         |
| --------------------- | ------------------ | ------------------------------- |
| Volume                | 250 × 250 × 260 mm | 260 × 260 × 260 mm              |
| Potenza nominale      | 400 W              | 1450 W (220 V, stampante + ACE) |
| Letto max             | 110 °C             | 100 °C                          |
| Ugello max            | 300 °C             | 300 °C                          |
| Multicolore           | No                 | ACE 2 Pro, 4 colori (fino a 19) |
| Potenza media PLA     | 190 W (stimato)    | 220 W (stimato)                 |
| Potenza media PETG    | 200 W (stimato)    | 230 W (stimato)                 |
| Potenza media TPU     | 180 W (stimato)    | 200 W (stimato)                 |
| Potenza media ABS/ASA | 380 W (stimato)    | 420 W (stimato)                 |
| Default               | 200 W              | 230 W                           |
| Minuti avvio          | 5                  | 5                               |
| Prezzo acquisto       | €299 (indicativo)  | €449 (indicativo)               |
| Valore residuo        | 0%                 | 0%                              |
| Vita utile            | 3.000 h            | 3.000 h                         |
| Manutenzione          | €0,03/h            | €0,03/h                         |

**Perché la potenza nominale non si usa:** la Kobra 3 è dichiarata 400 W, ma in PLA misura ~180–205 W; in ASA a letto 100 °C sale verso ~400 W. La Kobra X è dichiarata 1450 W a 220 V, ma non ci sono misure medie affidabili: il seed è una stima da verificare. Usare la nominale gonfia il costo di 2–8 volte.

**Manutenzione:** €0,03/h è una riserva indicativa per ugello, piatto, cinghie e lubrificante, non un dato ufficiale. Va adattata all'uso reale.

### 13.2 Materiali

| Materiale | Prezzo indicativo | Peso bobina |
| --------- | ----------------- | ----------- |
| PLA       | €20/kg            | 1.000 g     |
| PETG      | €24/kg            | 1.000 g     |
| TPU       | €30/kg            | 1.000 g     |
| ABS       | €25/kg            | 1.000 g     |
| ASA       | €30/kg            | 1.000 g     |
| PLA-CF    | €35/kg            | 1.000 g     |
| PETG-CF   | €35/kg            | 1.000 g     |
| PVA       | €60/kg            | 1.000 g     |

### 13.3 Impostazioni iniziali

| Impostazione             | Default                        |
| ------------------------ | ------------------------------ |
| Tariffa energia          | €0,25/kWh, decorrenza oggi     |
| Manodopera               | €0/h                           |
| Tasso guasti             | 5%                             |
| Maggiorazione tempo      | 0%                             |
| Modalità prezzo          | Ricarico                       |
| Ricarico                 | 30%                            |
| Arrotondamento           | Per eccesso a €0,10            |
| IVA                      | Disattivata (22% pronta)       |
| Ripartizione costi fissi | Proporzionale al costo diretto |

### 13.4 Extra

| Extra         | Importo | Unità      |
| ------------- | ------- | ---------- |
| Sacchetto zip | €0,08   | per pezzo  |
| Scatola       | €0,40   | per pezzo  |
| Etichetta     | €0,03   | per pezzo  |
| Imbottitura   | €0,10   | per pezzo  |
| Spedizione    | €6,00   | per lavoro |

---

## 14. Rischi e mitigazioni

| Rischio                              | Impatto                         | Mitigazione                                                               |
| ------------------------------------ | ------------------------------- | ------------------------------------------------------------------------- |
| Potenze e vite utili sono stime      | Costi lontani dalla realtà      | Valori marcati "stimato", override kWh, guida alla misura, wizard         |
| Doppio conteggio del purge AMS       | Materiale gonfiato              | Regola esplicita "grammi = totale slicer", nessuna percentuale automatica |
| Perdita dati locali                  | Preventivi persi                | Export/import visibile, promemoria backup, link condivisibili             |
| Scope creep                          | Progetto che non finisce        | Fasi, non-obiettivi, backlog separato, ADR                                |
| Formule ambigue                      | Risultati diversi tra UI e test | `cost-model.md` normativo, unità intere, golden test                      |
| UI rifatta tardi                     | Rework                          | Dominio puro, componenti minimi, ui-brief prima del design                |
| Hosting gratuito che cambia          | Deploy bloccato                 | Build statica portabile, hash routing, nessun lock-in                     |
| Dati tra due dispositivi divergono   | Configurazioni diverse          | Export/import, link; sync in fase successiva                              |
| Input slicer sbagliato               | Costo errato                    | Helper text, validazione, avvisi, esempi                                  |
| Free tier Vercel per uso commerciale | Problema ToS                    | Nota in deploy; alternativa Cloudflare/Netlify                            |

---

## 15. Criteri di successo

- Un utente nuovo configura le due stampanti e calcola un lotto di 3 pezzi in meno di 10 minuti.
- Il breakdown coincide con i calcoli manuali dei golden case, al µ€.
- Cambiare la tariffa energetica non altera i preventivi già salvati.
- Export e import JSON sono un roundtrip esatto.
- Un link condiviso apre un preventivo in sola lettura.
- L'app è utilizzabile da telefono senza scroll orizzontale nei form.
- CI verde su typecheck, lint, test e build.
- Deploy pubblico su Vercel.
- Un coding agent riesce a implementare un task leggendo `AGENTS.md`, `TASKS.md` e i doc di dominio senza domande.

---

## 16. Backlog futuro

- Magazzino bobine con grammi residui e avvisi.
- Actual vs estimated: tempo e filamento reali, scostamenti.
- Import da slicer (CSV o paste) e da presa intelligente.
- Sincronizzazione cloud tra due utenti (Supabase + auth).
- PWA/offline.
- Interfaccia inglese.
- Grafici di breakdown e trend.
- Listini, clienti, preventivi con scadenza.
- Registro manutenzioni e guasti.
- Calibrazione automatica del tasso guasti sui dati storici.
- Ottimizzazione del lotto: quale stampante per quale pezzo.
- Multi-valuta e fasce orarie.
- Extra pass-through (es. spedizione senza ricarico).
- Export CSV di righe e preventivi.
- Fatturazione elettronica (solo se necessario, con consulenza).

---

## 17. Domande aperte

Non bloccano l'implementazione:

- Prezzi di acquisto reali delle due stampanti e ore di vita stimate.
- Se e quando inizierete a vendere, e con quale regime IVA.
- Provider di sincronizzazione futuro (Supabase o altro).
- Se il repository sarà pubblico o privato.
- Nome definitivo e branding dell'app.
- Lista materiali iniziale completa (oltre ai default).

---

## 18. Fonti

Le fonti complete, con data di accesso e livello di confidenza, sono in `docs/domain/sources.md`. Sintesi:

- Anycubic Kobra X — FAQ e pagina prodotto: volume 260 × 260 × 260 mm; ACE 2 Pro 4 colori (fino a 19); letto 100 °C; ugello 300 °C; potenza nominale 1450 W a 220 V.
- Anycubic Kobra 3 — manuale: volume 250 × 250 × 260 mm; letto 110 °C; ugello 300 °C; potenza nominale 400 W.
- 3D Print Pricing e 3D Calculators — misura Kobra 3 ~180–205 W in PLA.
- Test YouTube Kobra 3 Combo — ~400 W medi in ASA con letto a 100 °C.
- Kobra X — nessuna misura media affidabile trovata: il seed è una stima.

---

## 19. Riferimenti interni

- `docs/domain/cost-model.md` — specifica normativa del calcolo.
- `TASKS.md` — task e criteri di accettazione.
- `docs/adr/` — decisioni architetturali.
- `docs/README.md` — struttura e regole della documentazione.
- `AGENTS.md` — istruzioni per il coding agent.
