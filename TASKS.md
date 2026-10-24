# LayerCost — Task

**Stato:** MVP implementato (fasi 0–3); CI verde; deploy Vercel live; fase 4: T4.1–T4.4 chiusi e in produzione
**Repo:** https://github.com/doublelayerprints/layercost (privata)
**Data:** 24 ottobre 2026
**Uso:** il coding agent prende il primo task non bloccato, rispetta le dipendenze, aggiorna lo stato e chiude solo quando i criteri di accettazione sono soddisfatti.

Legenda: `[ ]` da fare · `[~]` parziale/da verificare · `[x]` fatto · `[!]` bloccato

**Stato al 24/10/2026:** Fase 0–3 implementata, CI verde su GitHub. Fase 4: T4.1, T4.2, T4.3 e T4.4 chiusi (direzione **A — Strato**, ADR-0015, design system, redesign delle schermate), mergiati in `main` con la PR #1 e distribuiti in produzione. Restano T4.5 e T4.6. I task `[~]` sono implementati in forma ridotta o richiedono una verifica esterna (axe, stampa su più browser).

---

## Definition of Done (globale)

Un task è chiuso solo se:

- [ ] Il codice compila con TypeScript strict e non introduce `any`.
- [ ] I test nuovi/aggiornati passano; le formule nuove hanno casi di riferimento.
- [ ] `npm run check` è verde (typecheck + lint + test + build).
- [ ] La documentazione è aggiornata (`cost-model.md`, `data-model.md`, ADR, README) se il task cambia formule, schema o decisioni.
- [ ] `TASKS.md` è aggiornato con lo stato.
- [ ] Non ci sono regressioni nei test esistenti.
- [ ] Per task UI: verifica da tastiera, focus visibile, label, contrasto, layout a 375 px e 1440 px.
- [ ] Per task UI: preview Vercel verificata.
- [ ] Commit con messaggio Conventional Commits.
- [ ] Nessun dato utente viene cancellato o sovrascritto senza conferma.

**Regola speciale:** se cambia una formula, nello stesso commit cambiano `docs/domain/cost-model.md`, i golden test e `engineVersion`.

---

## Milestone

| Milestone           | Dopo   | Significato                                   |
| ------------------- | ------ | --------------------------------------------- |
| **M0 — Fondamenta** | Fase 0 | Repo, CI, docs, unità e arrotondamenti pronti |
| **M1 — Motore**     | Fase 1 | Costo e prezzo calcolabili e verificati       |
| **M2 — Dati**       | Fase 2 | Configurazione, persistenza, export/import    |
| **M3 — MVP**        | Fase 3 | App usabile e deployata                       |
| **M4 — v1.0**       | Fase 4 | UI rifinita con la skill di design            |

---

# Fase 0 — Fondamenta

## T0.1 — Scaffold del repository

**Dipende da:** —
**Stato:** `[x]`

- Inizializzare git, `.gitignore`, `.editorconfig`, `.nvmrc` (Node 22 LTS).
- Creare app Vite + React + TypeScript con nome pacchetto `layercost`.
- Configurare alias `@/` per `src/`.
- README stub con comandi base e nome LayerCost.

**Accettazione:** `npm run dev` e `npm run build` funzionano; nessun errore in console; struttura cartelle coerente con `PLAN.md`; il package si chiama `layercost`.

---

## T0.2 — Tooling qualità

**Dipende da:** T0.1
**Stato:** `[x]`

- oxlint + Prettier. Deviazione consapevole da ESLint, vedi ADR-0013.
- Vitest + `fast-check`.
- Playwright configurato e usato per 3 test E2E.
- Script: `dev`, `build`, `preview`, `typecheck`, `lint`, `format`, `test`, `test:e2e`, `check`.
- TypeScript strict + `noUncheckedIndexedAccess`.

**Accettazione:** `npm run check` esegue typecheck, lint, test e build; i test E2E passano su Chrome locale.

---

## T0.3 — CI GitHub Actions

**Dipende da:** T0.2
**Stato:** `[x]`

- Workflow su push e pull request.
- Node 22, cache npm, `npm ci`, `npm run check`.
- Job E2E con Playwright/Chromium.
- Upload degli artifact in caso di fallimento.

**Accettazione:** workflow verde su `doublelayerprints/layercost`; job `check` e `e2e` completati.

---

## T0.4 — Scheletro documentazione

**Dipende da:** T0.1
**Stato:** `[x]`

- Creare `README.md`, `AGENTS.md`, `PLAN.md`, `TASKS.md`, `CHANGELOG.md`.
- Creare l'albero `docs/` con i file elencati in `docs/README.md`.
- Ogni file ha titolo, scopo e sezioni minime; i contenuti normativi possono essere copiati dai file di piano.

**Accettazione:** tutti i link relativi funzionano; `AGENTS.md` è operativo; `cost-model.md` e `data-model.md` esistono.

---

## T0.5 — ADR iniziali

**Dipende da:** T0.4
**Stato:** `[x]`

- Trascrivere e accettare gli ADR 0001–0014 (12 dal piano + 2 deviazioni v0.1) in `docs/adr/`.
- Ogni ADR: contesto, decisione, alternative, conseguenze.

**Accettazione:** gli ADR sono in `docs/adr/`, numerati, linkati dall'indice; nessuna decisione importante resta solo nella chat.

---

## T0.6 — Unità e tipi di dominio

**Dipende da:** T0.2
**Stato:** `[x]`

- Branded types: `MicroEur`, `BasisPoints`, `Seconds`, `Centigrams`, `Watts`, `Wh`.
- Conversioni: euro ↔ µ€, percentuale ↔ bp, grammi ↔ cg, ore/minuti ↔ s, kWh ↔ Wh.
- Limiti di validazione da `docs/domain/cost-model.md`.

**Accettazione:** test di conversione, roundtrip e valori limite; nessun `any`; le conversioni non perdono precisione oltre l'unità dichiarata.

---

## T0.7 — Arrotondamenti e allocazione

**Dipende da:** T0.6
**Stato:** `[x]`

- `roundHalfUp`.
- `roundToStep` con modalità `up`, `nearest`, `down`.
- `allocateLargestRemainder(total, weights)` in µ€ e in centesimi.
- Helper per percentuali e basis point.

**Accettazione:** test per `.5`, passi, tie-break, somma esatta dell'allocazione, valori grandi senza overflow, guard esplicito che rifiuta i valori non sicuri.

---

# Fase 1 — Motore di calcolo

## T1.1 — Tipi del dominio

**Dipende da:** T0.6
**Stato:** `[x]`

- `Printer`, `Material`, `EnergyTariff`, `Extra`, `Settings`, `PrintLine`, `Quote`, `RateSnapshot`, `CostBreakdown`, `QuoteResult`.
- Nessun import da React, Zustand, Zod o browser.
- `now` e `id` iniettati.

**Accettazione:** i tipi compilano; `docs/domain/data-model.md` descrive ogni campo; un test importa il dominio in ambiente Node senza polyfill.

---

## T1.2 — Costo materiale

**Dipende da:** T1.1
**Stato:** `[x]`

- Multi-materiale per riga.
- Prezzo €/kg, grammi in cg.
- Materiale a 0 g ignorato.
- Somma grammi per validazione.

**Accettazione:** test con 1 e 2 materiali, 0 g, arrotondamento; G-06.

---

## T1.3 — Costo energia

**Dipende da:** T1.1
**Stato:** `[x]`

- Profilo potenza per famiglia con fallback al default.
- Regola multi-materiale: potenza massima, non somma.
- Tempo effettivo: maggiorazione + avvio.
- Override `energyOverrideWh` e `powerOverrideW`.
- Tariffa globale o override stampante, selezione per data.
- Nessun uso della potenza nominale.

**Accettazione:** test PLA/PETG/ABS, due materiali, entrambi gli override, tariffa storica, avvio; G-07, G-15; test esplicito che la nominale non è usata.

---

## T1.4 — Costo usura

**Dipende da:** T1.1
**Stato:** `[x]`

- Ammortamento con valore residuo e vita utile.
- Manutenzione €/h.
- Costo orario visualizzabile.
- Prezzo 0 → ammortamento 0 + warning.

**Accettazione:** test con residuo 0/20%, vita 1/3000 h, prezzo 0; nessun overflow ai limiti.

---

## T1.5 — Manodopera ed extra

**Dipende da:** T1.1
**Stato:** `[x]`

- Finitura per unità.
- Setup e design per lavoro.
- Extra per unità e per lavoro.
- Validazione: extra `perJob` non attaccabile a una riga.

**Accettazione:** test con tariffa 0 e >0; quantità >1; extra misti; G-08.

---

## T1.6 — Riserva guasti

**Dipende da:** T1.2–T1.5
**Stato:** `[x]`

- Formula `base × p / (1 − p)`.
- Gerarchia: override riga > massimo override materiale > globale.
- Base: materiale + energia + usura + manodopera di riga.
- p = 0 e p = 50%.

**Accettazione:** test G-04, G-05; la riserva non include extra e costi di lavoro; monotonia.

---

## T1.7 — Costo di riga

**Dipende da:** T1.2–T1.6
**Stato:** `[x]`

- Assemblaggio componenti.
- `directUnitCost`, `lineDirectCost`, breakdown con percentuali.
- Quantità.

**Accettazione:** G-01, G-08; la somma dei componenti coincide col totale al µ€; nessun `NaN`.

---

## T1.8 — Costo del preventivo e ripartizione

**Dipende da:** T1.7
**Stato:** `[x]`

- Totali diretti, costi fissi, costo totale.
- Ripartizione `proportional` e `equalPerUnit`.
- Resti più grandi, somma esatta.
- Costo pieno per riga e unitario.
- Fallback peso zero.

**Accettazione:** G-02, G-09, G-17; la somma delle quote è esattamente il totale; nessuna riga con costo negativo.

---

## T1.9 — Prezzo, sconto, IVA

**Dipende da:** T1.8
**Stato:** `[x]`

- Ricarico e margine.
- Sconto prima dell'arrotondamento.
- Arrotondamento al passo.
- IVA nessuna/esclusa/inclusa.
- Margine effettivo.
- Allocazione del prezzo alle righe in centesimi.

**Accettazione:** G-03, G-10–G-14; la somma dei prezzi di riga è esattamente il prezzo totale; margine 100% rifiutato.

---

## T1.10 — Golden case e property test

**Dipende da:** T1.9
**Stato:** `[x]`

- Fixture condivisi con `docs/domain/cost-model.md`.
- Tutti i casi G-01–G-18.
- Proprietà: monotonia, scala, prezzo ≥ costo, somme esatte, nessun valore non finito.

**Accettazione:** tutti i test verdi; i numeri negli esempi del doc coincidono al µ€; test massimi senza overflow; combinazioni estreme rifiutate con errore, non con numeri imprecisi.

---

## T1.11 — Snapshot e versione motore

**Dipende da:** T1.10
**Stato:** `[x]`

- `RateSnapshot` completo.
- `engineVersion` nel risultato.
- Funzione di ricalcolo: snapshot vs configurazione corrente.
- Policy: ricalcolo corrente solo su copia.

**Accettazione:** test che modifica tariffe e verifica l'invarianza del preventivo salvato; G-15, G-16.

---

# Fase 2 — Configurazione, persistenza, seed

## T2.1 — Seed iniziale

**Dipende da:** T1.1
**Stato:** `[x]`

- Kobra 3 e Kobra X con i dati di `PLAN.md`.
- Materiali, extra, impostazioni.
- Metadati `source`/`confidence` per le stime.
- Nessun valore economico hardcoded nel motore.

**Accettazione:** il seed carica; i valori sono modificabili; le stime sono marcate; `docs/domain/sources.md` cita le fonti.

---

## T2.2 — Schemi Zod

**Dipende da:** T1.1
**Stato:** `[x]`

- Schemi per ogni entità persistita e per l'export.
- Messaggi di errore chiari.
- Validazione ai confini: form, import, storage.

**Accettazione:** fixture validi/invalidi; un import con campo mancante è rifiutato con messaggio utile; il dominio non importa Zod.

---

## T2.3 — Repository locale

**Dipende da:** T2.2
**Stato:** `[x]`

- Interfaccia `DataRepository` astratta; in v1 è sincrona su localStorage, pronta per un adapter cloud.
- Adapter `localStorage`.
- Load/save/reset, gestione dati corrotti.
- Nessun accesso diretto a `localStorage` fuori da `data/`.

**Accettazione:** test di roundtrip; dati corrotti non bloccano l'app; reset richiede conferma.

---

## T2.4 — Migrazioni

**Dipende da:** T2.3
**Stato:** `[~]`

**Nota:** Framework di migrazione minimo (v1, rifiuto versioni future); manca una catena versionata con fixture.

- `schemaVersion` e catena di migrazioni.
- Backup raw prima della migrazione.
- Migrazione fallita: dati originali intatti.
- Import di schema più nuovo: rifiutato.

**Accettazione:** fixture v1 migra; fixture rotta produce errore e backup; test di idempotenza.

---

## T2.5 — Storico tariffe

**Dipende da:** T2.3
**Stato:** `[x]`

- `effectiveFrom`, selezione per data del preventivo.
- Override per stampante.
- Nuova tariffa non modifica i preventivi salvati.
- UI/state per aggiungere, modificare, archiviare una tariffa.

**Accettazione:** G-15; data backdated; tariffa mancante → errore chiaro.

---

## T2.6 — Impostazioni

**Dipende da:** T2.3
**Stato:** `[x]`

- Form per manodopera, guasti, maggiorazione tempo, prezzo, arrotondamento, IVA, ripartizione.
- Anteprima dell'effetto sui numeri.
- Persistenza e validazione.

**Accettazione:** ogni modifica persiste al reload; i valori invalidi sono bloccati; nessun campo economico hardcoded.

---

## T2.7 — CRUD stampanti

**Dipende da:** T2.3
**Stato:** `[x]`

- Creazione, modifica, archiviazione.
- Profili potenza per famiglia, default, avvio.
- Prezzo, residuo, vita, manutenzione, tariffa override.
- Anteprima costo orario.

**Accettazione:** non si cancella una stampante referenziata; le archiviate non compaiono nelle nuove righe; i preventivi storici funzionano.

---

## T2.8 — CRUD materiali

**Dipende da:** T2.3
**Stato:** `[x]`

- Creazione, modifica, archiviazione.
- Prezzo al kg + peso netto informativo; la UI mostra la formula per ricavare il prezzo dalla bobina.
- Famiglia, fornitore, colore, override guasti.
- Prezzo al grammo visualizzato.

**Accettazione:** conversione corretta; materiale archiviato non selezionabile; snapshot storici ok.

---

## T2.9 — CRUD extra

**Dipende da:** T2.3
**Stato:** `[x]`

- Creazione, modifica, archiviazione.
- Unità `perUnit`/`perJob`, categoria.
- Importo in €.

**Accettazione:** un extra per lavoro non è attaccabile a una riga; archiviazione sicura.

---

## T2.10 — Export/import JSON

**Dipende da:** T2.3, T2.4
**Stato:** `[x]`

- Download con nome `layercost-backup-YYYY-MM-DD.json`.
- Upload, validazione, migrazione, conferma.
- Backup automatico dei dati correnti prima della sostituzione.
- Nessuna scrittura parziale.

**Accettazione:** roundtrip esatto; file invalido rifiutato; dati correnti intatti in caso di errore.

---

## T2.11 — Reset e dati demo

**Dipende da:** T2.10
**Stato:** `[x]`

- Reset ai seed con doppia conferma.
- Eventuale preventivo demo per il primo avvio.
- Export obbligatorio consigliato prima del reset.

**Accettazione:** reset funziona; nessun dato residuo; test.

---

## T2.12 — Wizard iniziale

**Dipende da:** T2.1, T2.6, T2.7, T2.8
**Stato:** `[~]`

**Nota:** Implementata come checklist di primo avvio nella dashboard, non come wizard multi-step.

- Passi: tariffa, stampanti (prezzo/vita), materiali (prezzo), preferenze prezzo.
- Valori stimati evidenziati.
- Può essere saltato; banner persistente finché i dati critici non sono confermati.

**Accettazione:** i valori salvati sono quelli del wizard; skip non corrompe nulla; il banner scompare dopo la conferma.

---

# Fase 3 — UI funzionale

## T3.1 — Shell e routing

**Dipende da:** T2.3
**Stato:** `[x]`

- `HashRouter`, layout, navigazione.
- Route: calcolatore, preventivi, stampanti, materiali, tariffe, extra, impostazioni, confronto, share.
- Pagina 404.

**Accettazione:** i link funzionano su hosting statico; refresh e link diretto ok; nessun rewrite server.

---

## T3.2 — Calcolatore singola riga

**Dipende da:** T1.11, T2.7, T2.8
**Stato:** `[x]`

- Selezione stampante.
- Materiali multipli con grammi.
- Tempo, quantità, finitura.
- Override kWh, potenza, guasti.
- Validazione e messaggi.

**Accettazione:** risultato live; errori associati ai campi; inserimento da tastiera; nessun valore non finito.

---

## T3.3 — Lotto

**Dipende da:** T3.2
**Stato:** `[x]`

- Aggiungi, duplica, rimuovi, riordina righe.
- Totali per riga e complessivi.
- Nessuna perdita di stato al riordino.

**Accettazione:** 10 righe gestibili; totali coerenti; duplicazione non condivide mutazioni.

---

## T3.4 — Pannello risultati

**Dipende da:** T3.2, T3.3
**Stato:** `[x]`

- Breakdown per componente.
- Percentuali, costo diretto, costo pieno, prezzo, margine effettivo.
- Formattazione it-IT.
- Evidenza delle voci stimate.

**Accettazione:** coincide col motore; nessun `NaN`; leggibile a 375 px.

---

## T3.5 — Preventivi

**Dipende da:** T3.4
**Stato:** `[x]`

- Salva, apri, duplica, archivia.
- Banner snapshot.
- "Aggiorna ai prezzi correnti" crea una copia.
- Modifica di un preventivo salvato: solo su copia.

**Accettazione:** G-15/G-16 in UI; reload identico; nessun preventivo storico alterato.

---

## T3.6 — Storico e ricerca

**Dipende da:** T3.5
**Stato:** `[x]`

- Lista con data, nome, totale, stato.
- Ricerca per nome.
- Dettaglio, duplicazione, archiviazione.
- Empty state.

**Accettazione:** funziona con 100 preventivi; nessun link rotto; cancellazione solo se non referenziato.

---

## T3.7 — Link condivisibile

**Dipende da:** T3.5
**Stato:** `[x]`

- Compressione con `lz-string`.
- Route read-only.
- Import nel proprio archivio.
- Gestione link invalido/troncato.

**Accettazione:** roundtrip; il link contiene solo il preventivo, non tutta la configurazione; messaggio chiaro se invalido.

---

## T3.8 — Stampa/PDF

**Dipende da:** T3.4
**Stato:** `[~]`

**Nota:** Stylesheet di stampa rifatto in T4.4; PDF A4 verificato su Chrome (`@page` 14 mm, stack in grigi, totali, note). Safari e stampa reale su più browser ancora da verificare.

- Stylesheet di stampa A4.
- Intestazione, data, righe, breakdown, totali, note.
- Nessun elemento di navigazione.

**Accettazione:** stampa leggibile; i totali coincidono; funziona da Chrome e Safari.

---

## T3.9 — Confronto stampanti

**Dipende da:** T3.2
**Stato:** `[x]`

- Duplica una riga su un'altra stampante.
- Delta costo e prezzo.
- Evidenza della stampante più conveniente.
- Nessuna mutazione dell'originale.

**Accettazione:** numeri corretti; il delta usa lo stesso tempo e gli stessi grammi; UI chiara.

---

## T3.10 — E2E del flusso critico

**Dipende da:** T2.12, T3.5–T3.9
**Stato:** `[x]`

- Configura stampante e materiale.
- Crea 3 righe.
- Salva, ricarica, esporta, reimporta.
- Apri link condiviso.
- Genera PDF (smoke test).

**Accettazione:** Playwright verde in CI; test stabile; nessun dato di test residuo.

---

## T3.11 — Accessibilità baseline

**Dipende da:** T3.2–T3.9
**Stato:** `[~]`

**Nota:** Label, focus, contrasto e struttura presenti; T4.4 ha verificato skip link, Esc sul dialogo, focus restituito e nessun overflow a 390 px. Audit automatico axe e percorso completo da tastiera su tutte le schermate ancora da fare.

- Label, `aria-describedby` per errori, focus visibile.
- Navigazione da tastiera.
- Contrasto.
- `axe` sulle schermate principali.

**Accettazione:** nessun errore critico axe; percorso completo da tastiera; ordine di focus sensato.

---

## T3.12 — Responsive baseline

**Dipende da:** T3.2–T3.9
**Stato:** `[~]`

**Nota:** Layout verificato a 375, 768 e 1440 px con screenshot e nessuno scroll orizzontale a 390 px su tutte le route; aggiungere test visuali di regressione.

- Layout a 375, 768, 1440 px.
- Tabelle con scroll orizzontale controllato o card.
- Input numerici comodi su mobile.

**Accettazione:** nessuno scroll orizzontale indesiderato; azioni principali raggiungibili con il pollice; screenshot in PR.

---

# Fase 4 — UI design

## T4.1 — UI brief per la skill di design

**Dipende da:** M3
**Stato:** `[x]`

- Schermate, flussi, stati, dati, vincoli.
- Accessibility e responsive.
- Cosa non cambiare (dominio, formule, snapshot).
- Nessuna scelta di stile visivo.

**Accettazione:** brief approvato; la skill di design ha tutto il contesto senza leggere il codice.

---

## T4.2 — Direzioni di design

**Dipende da:** T4.1
**Stato:** `[x]`

- Due direzioni con la skill: **A — Strato** (`achromatic-ledger`) e **B — Commessa** (`framed-sheet`).
- Specifiche complete, palette, tipografia e wireframe in `docs/design/directions.md`.
- Scelta motivata: **A — Strato**; ADR-0015.
- Font self-hosted, base chiara, nessuna modifica a dominio, formule, snapshot o persistenza.

**Accettazione:** direzione scelta e registrata; niente redesign del dominio. Direzione A, ADR-0015, `docs/design/directions.md`.

---

## T4.3 — Design system

**Dipende da:** T4.2
**Stato:** `[x]`

- Token in `src/index.css`: colore, tipografia, raggi, ombre, focus, movimento e stampa.
- Font self-hosted **Archivo + Source Serif 4** (OFL 1.1, WOFF2, preload, `font-display: swap`).
- Componenti: Button, Card, Badge, Field, Input, Select, Textarea, Toggle, Alert, Modal, EmptyState, Stat, Price, PageHeader, InfoDot, Table, Tabs.
- Firma di prodotto: **CostStack** a quattro bande, con legenda accessibile e raggruppamento sotto il 3%.
- Shell e schermate migrate ai token senza cambiare la composizione; contrasto AA verificato; bordo campi a 3,45:1.
- Test: 21 unitari (5 sul raggruppamento delle bande) + 5 E2E (2 sul design system); `inspect.mjs --app` 0 FAIL, 1 WARN motivato (`tiny-text`). T4.4 porta i test a 29 e il gate a 0 FAIL, 1 WARN (`ragged-row`, rail sticky).

**Accettazione:** componenti documentati in `docs/design/design-system.md`; nessuna eccezione hardcoded nei componenti (restano solo le dimensioni `pt` della stampa e gli asset statici); test visuali di base verdi.

---

## T4.4 — Redesign schermate

**Dipende da:** T4.3
**Stato:** `[x]`

- Calcolatore, risultati, preventivi, anagrafiche, impostazioni, confronto, share.
- Dettagli in `docs/design/design-system.md` §8; wireframe in `docs/design/directions.md` §3.4 e §4.4.
- Calcolatore 7/12 + 5/12 con risultato sticky a ≥ 1024 px; stack e `Price` nel dettaglio e in stampa; tabelle mobile; una sola azione primaria per schermata.
- Responsive; dark mode fuori scope v1 (ADR-0015).
- Eseguire il gate visivo `inspect.mjs --app` a 1440/768/390 e la critique.

**Nota:** applicata la direzione A a tutte le schermate; confronto rapido nel pannello risultato; stampa A4 rifinita. Corretto un difetto di visualizzazione dello stack con quantità > 1 (bande × quantità, importi in centesimi allocati) e l’arrotondamento dei centesimi in `formatCurrency`: nessun cambio a formule, `engineVersion`, snapshot o persistenza. Gate: `inspect.mjs --app` 0 FAIL, 1 WARN motivato (`ragged-row` sulla rail sticky); nessun overflow a 390 px; dialogo con Esc e focus restituito; PDF A4 verificato su Chrome. Critique in `docs/design/design-system.md` §8.2 (round 1 → 2, 8,2). Safari e axe restano in T3.8/T3.11. **Merge:** PR #1, squash `42e60b7`; deploy di produzione verificato il 24/10/2026 con lo stesso gate (0 FAIL, 1 WARN).

**Accettazione:** tutti i flussi funzionano; test E2E verdi; nessuna regressione nei calcoli. → 29 test unitari, 5 E2E, `npm run check` verde.

---

## T4.5 — Stati e rifiniture

**Dipende da:** T4.4
**Stato:** `[ ]`

**Nota di partenza (dopo T4.4):**
- Vuoti: presenti su preventivi, materiali, stampanti, extra, tariffe, calcolatore e pagine di errore; verificare che ogni vuoto abbia la prossima azione.
- Errori: calcolo, salvataggio, import, link non valido e reset sono coperti da `Alert`; manca una revisione dei messaggi meno frequenti.
- Successo: import e reset hanno un messaggio; il salvataggio naviga al dettaglio. Valutare un riscontro più esplicito.
- Disabilitati e archiviati: pulsanti disabilitati con opacità e motivo nel contesto; archiviati con badge testuale. Nessuna cancellazione di entità referenziate.
- Unsaved changes: da decidere e implementare; la bozza è persistita, quindi il banner “Modifiche non salvate” non va aggiunto per finta. Se serve, confrontare la bozza con l’ultimo preventivo salvato.
- Loading: non ci sono operazioni asincrone oltre a import/export locali; non introdurre spinner decorativi.
- Movimento: solo feedback, `prefers-reduced-motion` già rispettato; nessuna animazione d’ingresso.
- Microcopy: italiano, diretto; rivedere unità, “quota del totale” e i messaggi di rischio.

- Empty, loading, error, success, disabled, archived, unsaved changes.
- Movimento ridotto.
- Microcopy italiano.

**Accettazione:** nessun vicolo cieco; messaggi chiari; accessibilità mantenuta.

---

## T4.6 — Review e release v1.0

**Dipende da:** T4.5
**Stato:** `[ ]`

- Review UX, accessibilità, performance, cross-browser.
- Checklist di release.
- Tag `v1.0.0` e deploy.

**Accettazione:** checklist completa; deploy Vercel; CHANGELOG aggiornato.

---

# Fase 5 — Backlog

Nessun impegno in v1. Ogni voce richiede un ADR prima dell'implementazione.

## T5.1 — Magazzino bobine

Tracciare bobine acquistate, grammi residui, costo effettivo, avvisi di esaurimento.

## T5.2 — Actual vs estimated

Registrare tempo e filamento reali per stampa, confrontarli con le stime, suggerire calibrazioni.

## T5.3 — Import da slicer

Incollare o importare CSV/JSON con tempo e grammi per materiale; parsing robusto e validazione.

## T5.4 — Sincronizzazione cloud

Supabase + auth, RLS, merge per ID, gestione conflitti; ADR dedicato.

## T5.5 — PWA/offline

Service worker, cache degli asset, promemoria backup.

## T5.6 — Inglese

Estrarre le stringhe, aggiungere locale `en`, mantenere it-IT come default.

## T5.7 — Registro manutenzioni e guasti

Log di interventi, guasti, sostituzioni; calibrazione del tasso guasti.

## T5.8 — Import da presa intelligente

CSV di consumo per stampa, calcolo dei W medi, confronto con il profilo.

## T5.9 — Clienti e listini

Anagrafica clienti, listini, preventivi con scadenza, stati inviato/accettato.

## T5.10 — Grafici e trend

Breakdown visuale, costo per mese, trend €/kg e €/h, confronto stampanti.

## T5.11 — Extra pass-through

Permettere a un extra (es. spedizione) di essere passato al cliente senza ricarico, con IVA e sconto coerenti.

## T5.12 — Export CSV

Esportare righe e preventivi in CSV per analisi esterne, mantenendo la formattazione it-IT e la precisione dichiarata.

---

## Ordine consigliato

1. T0.1 → T0.7
2. T1.1 → T1.11
3. T2.1 → T2.12
4. T3.1 → T3.12
5. T4.1 → T4.6
6. Backlog

Non iniziare la UI prima che il motore e la persistenza siano stabili. Non iniziare il design prima del MVP funzionale.
