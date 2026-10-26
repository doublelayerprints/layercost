# LayerCost — Task

**Stato:** v1.0.0 rilasciata (fasi 0–4); fase 5 pianificata; CI verde; deploy Vercel live
**Repo:** https://github.com/doublelayerprints/layercost (privata)
**Data:** 26 ottobre 2026
**Uso:** il coding agent prende il primo task non bloccato, rispetta le dipendenze, aggiorna lo stato e chiude solo quando i criteri di accettazione sono soddisfatti.

Legenda: `[ ]` da fare · `[~]` parziale/da verificare · `[x]` fatto · `[!]` bloccato

**Stato al 26/10/2026:** Fase 0–4 completata e rilasciata come **v1.0.0**. Fase 5 in corso: **T5.3 chiuso** (fixture `.3mf` reali, parser ZIP/XML, mapping puro, UI di import e performance); prossimo **T5.6** (interfaccia inglese). Ordine **T5.3 import `.3mf` → T5.6 inglese → T5.4 sync** (rimandato). ADR-0017, ADR-0018 e ADR-0019 registrano la direzione. Le prove manuali Safari/VoiceOver sono rimandate e non bloccanti.

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
**Stato:** `[x]`

**Nota:** Stylesheet di stampa rifatto in T4.4; PDF A4 verificato su Chromium (`@page` 14 mm, stack in grigi, totali, note) e stampa verificata sull'engine WebKit con `@media print`. La release 1.0 include un test che genera il PDF partendo dal tema scuro e controlla i token chiari. Resta consigliata una prova manuale su una stampante fisica e su Safari reale.

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
**Stato:** `[x]`

**Nota:** Label, focus, contrasto e struttura presenti; T4.4 ha verificato skip link, Esc sul dialogo, focus restituito e nessun overflow a 390 px. La release 1.0 aggiunge `@axe-core/playwright`: 25 scansioni su tutte le route in tema chiaro e scuro, menu mobile e modali inclusi, con **0 violazioni** WCAG 2.0/2.1/2.2 AA. Corretto l'unico difetto trovato: le tabelle con scroll orizzontale ora hanno `role="region"`, nome accessibile e `tabIndex={0}`. Resta consigliata una prova con screen reader reale.

- Label, `aria-describedby` per errori, focus visibile.
- Navigazione da tastiera.
- Contrasto.
- `axe` sulle schermate principali.

**Accettazione:** nessun errore critico axe; percorso completo da tastiera; ordine di focus sensato.

---

## T3.12 — Responsive baseline

**Dipende da:** T3.2–T3.9
**Stato:** `[x]`

**Nota:** Layout verificato a 375, 768 e 1440 px con screenshot e nessuno scroll orizzontale a 390 px su tutte le route. La release 1.0 aggiunge `tests/e2e/visual.spec.ts`: 15 screenshot di regressione a 1440/768/390 px su calcolatore, dettaglio, preventivi, materiali e impostazioni, con baseline generate su Linux in CI. I test visuali sono saltati su macOS perché il rendering dei font differisce; le baseline si rigenerano con il workflow `visual-baselines.yml`.

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
- Responsive; dark mode aggiunta in T4.7 (ADR-0016).
- Eseguire il gate visivo `inspect.mjs --app` a 1440/768/390 e la critique.

**Nota:** applicata la direzione A a tutte le schermate; confronto rapido nel pannello risultato; stampa A4 rifinita. Corretto un difetto di visualizzazione dello stack con quantità > 1 (bande × quantità, importi in centesimi allocati) e l’arrotondamento dei centesimi in `formatCurrency`: nessun cambio a formule, `engineVersion`, snapshot o persistenza. Gate: `inspect.mjs --app` 0 FAIL, 1 WARN motivato (`ragged-row` sulla rail sticky); nessun overflow a 390 px; dialogo con Esc e focus restituito; PDF A4 verificato su Chrome. Critique in `docs/design/design-system.md` §8.2 (round 1 → 2, 8,2). Safari e axe restano in T3.8/T3.11. **Merge:** PR #1, squash `42e60b7`; deploy di produzione verificato il 24/10/2026 con lo stesso gate (0 FAIL, 1 WARN).

**Accettazione:** tutti i flussi funzionano; test E2E verdi; nessuna regressione nei calcoli. → 29 test unitari, 5 E2E, `npm run check` verde.

---

## T4.5 — Stati e rifiniture

**Dipende da:** T4.4
**Stato:** `[x]`

**Nota:** audit completo degli stati. **Bozza:** `draftHasContent` distingue una bozza vuota da una con lavoro; `NewDraftButton` chiede conferma con un `Modal` accessibile (Esc, focus restituito) prima di scartarla. La stessa conferma protegge “Duplica nel calcolatore” e “Aggiorna ai prezzi correnti”. **Eliminazioni:** preventivo e tariffa usano `Modal`, non `window.confirm`. **Successo:** alert “Preventivo salvato” al salvataggio e all’import di un link condiviso, dismissibile e non ripetuto al reload. **Vuoti:** azioni su ricerca preventivi senza risultati e confronto con meno di due stampanti attive. **Disabilitati:** l’ultima tariffa spiega perché non è eliminabile. **Microcopy:** la bozza si salva da sola ma entra nello storico solo con “Salva preventivo”; il preventivo non ricalcolabile indica “Duplica nel calcolatore”. Test: 42 unitari, 8 E2E; gate 0 FAIL, 1 WARN (`ragged-row`); nessun overflow a 390 px. **Merge:** PR #3, squash `759ed0f`; deploy di produzione verificato il 24/10/2026.

- Empty, loading, error, success, disabled, archived, unsaved changes.
- Movimento ridotto.
- Microcopy italiano.

**Accettazione:** nessun vicolo cieco; messaggi chiari; accessibilità mantenuta. → 42 test unitari, 8 E2E, `npm run check` verde.

---

## T4.6 — Review e release v1.0

**Dipende da:** T4.5
**Stato:** `[x]`

**Nota:** release **v1.0.0** del 24/10/2026. Verifiche: `npm run check` verde con budget del bundle (206 KB gzip su 350 KB); **18 E2E** (16 Chromium + 2 WebKit, 3 visual su CI); **25 scansioni axe** con 0 violazioni WCAG 2.2 AA; PDF A4 valido anche partendo dal tema scuro; nessuna richiesta esterna; gate visivo 0 FAIL/1 WARN motivato. Documentazione in `docs/engineering/release.md`, `CHANGELOG.md`, `STATUS.md`. Tag `v1.0.0` su `cc949b3` e deploy Vercel di produzione verificati il 24/10/2026. Le prove manuali su stampante fisica e con screen reader sono **rimandate** il 26/10/2026 (non bloccanti).

- Review UX, accessibilità, performance, cross-browser.
- Checklist di release.
- Tag `v1.0.0` e deploy.

**Accettazione:** checklist completa; deploy Vercel; CHANGELOG aggiornato. → 42 unitari, 18 E2E, `npm run check` verde, produzione verificata.

---

## T4.7 — Dark mode

**Dipende da:** T4.4
**Stato:** `[x]`

**Nota:** anticipata rispetto alla v1 su richiesta del committente (ADR-0016, che supera il punto 6 di ADR-0015). Preferenza **Sistema / Chiaro / Scuro** in Impostazioni → Aspetto, salvata in `layercost:theme` fuori da `AppData`; palette grafite calda con token dedicati, scrim nero, stampa sempre chiara. Applicazione prima del primo render, sincronizzazione con `prefers-color-scheme` e `meta theme-color`. Nessun cambio a formule, `engineVersion`, snapshot o schema (resta v1). Test: 7 unitari, 1 E2E; gate visivo in tema scuro 0 FAIL, 1 WARN (`ragged-row`); contrasti AA verificati. **Merge:** PR #2, squash `a0960d3`; deploy di produzione verificato il 24/10/2026 con tema scuro persistito.

- Tema di sistema, chiaro e scuro.
- Persistenza della preferenza separata dai dati.
- Stampa sempre chiara.
- Contrasti e focus verificati in entrambi i temi.

**Accettazione:** la scelta persiste al reload; “Sistema” segue il dispositivo; nessun lampo di tema; stampa leggibile; nessuna regressione.

---

# Fase 5 — Backlog

**Stato:** in corso dal 26/10/2026. T5.3.1 chiuso; prossimo T5.3.2. Piano completo, decisioni e domande aperte in `docs/planning/phase-5.md`. Ordine: **T5.3 → T5.6 → T5.4**.

## T5.0 — Piano fase 5

**Dipende da:** v1.0.0
**Stato:** `[x]`

**Nota:** creati `docs/planning/phase-5.md`, ADR-0017 (import `.3mf`), ADR-0018 (sync free, rimandato) e ADR-0019 (inglese). Nessun codice. Le tre iniziative richieste dal committente sono documentate con scope, architettura, test, criteri di accettazione e stime. Il sync resta esplicitamente rimandato.

**Accettazione:** piano leggibile da una nuova sessione; ADR e fonti presenti; `TASKS.md`, `PLAN.md` e `STATUS.md` allineati.

## T5.1 — Magazzino bobine

Tracciare bobine acquistate, grammi residui, costo effettivo, avvisi di esaurimento.

## T5.2 — Actual vs estimated

Registrare tempo e filamento reali per stampa, confrontarli con le stime, suggerire calibrazioni.

## T5.3 — Import diretto da `.3mf`

**Dipende da:** ADR-0017, fixture reali
**Stato:** `[x]` — T5.3.1–T5.3.5 chiusi
**Piano:** `docs/planning/phase-5.md` §2

**Nota:** il `.3mf` è un archivio ZIP/OPC. Il percorso supportato è il file **già slicato** (`.gcode.3mf`) di Anycubic Slicer Next, OrcaSlicer o Bambu Studio: `Metadata/slice_info.config` contiene `prediction` in secondi e `used_g` per filamento. Un progetto non slicato non ha tempo/grammi affidabili e va rifiutato con un messaggio azionabile. Nessun upload, nessun cambio a formule o `engineVersion`, nessun supplemento AMS/ACE (ADR-0006). Le fixture verificate di T5.3.1 sono in `tests/fixtures/3mf/`.

Sottotask:

- **T5.3.1** — chiedere 2–3 file reali (Kobra 3 e Kobra X), verificare formato e campi, salvare fixture ridotte in `tests/fixtures/3mf/`. → **fatto** (vedi nota sotto).
- **T5.3.2** — parser ZIP/XML nel layer `data`, con limiti di sicurezza e Web Worker; normalizzazione a `ThreeMfSummary`. → **fatto** (vedi nota sotto).
- **T5.3.3** — mapping puro `ThreeMfSummary → PrintLine[]` nel dominio: tempo, grammi per tipo, stampante, piatti multipli. → **fatto** (vedi nota sotto).
- **T5.3.4** — UI “Importa .3mf”: drag & drop, anteprima piatti, mappatura stampante/materiale, conferma bozza, errori. → **fatto** (vedi nota sotto).
- **T5.3.5** — test unit/property/E2E/axe, documentazione e deploy. → **fatto** (vedi nota sotto).

**Accettazione:** da un `.gcode.3mf` valido si ottengono righe con tempo e grammi corretti, mappatura esplicita, preventivo salvabile; file non slicato/malformato gestito senza crash; nessuna richiesta di rete; `npm run check` verde. → soddisfatta il 26/10/2026.

### T5.3.1 — Fixture reali e verifica formato

**Stato:** `[x]`

**Nota:** chiuso il 26/10/2026. Non c'erano file Anycubic già slicati nei download; sono stati generati con **Anycubic Slicer Next 2.0.0.3** (build `20260904033713`) e i profili Kobra 3 / Kobra X, partendo dal modello `gancio_bacinella.3mf` e da un progetto multi-piatto. Fixture ridotte in `tests/fixtures/3mf/` con README e valori attesi: Kobra 3 (200 s, 1,46 g), Kobra X (513 s, 3,76 g), Kobra X a 2 piatti (6.069 s + 2.650 s), progetto non slicato da rifiutare.

**Esiti per il parser:** `prediction`, `weight` e `printer_model_id` sono `<metadata key=…>` annidati, non attributi; i filamenti usano attributi `used_g` / `used_m`; `printer_model` in `project_settings.config` è più affidabile di `printer_model_id`; un progetto non slicato può avere `slice_info.config` con il solo header. Un file Bambu Studio 01.10.02.73 è stato verificato localmente ma non committato per la licenza del modello. Dettagli in `docs/planning/phase-5.md` §2.2.1 e `tests/fixtures/3mf/README.md`.

**Accettazione:** fixture reali per Kobra 3 e Kobra X, verifica dei campi, fixture negativa non slicata, documentazione aggiornata. → soddisfatta; nessun codice di import.

### T5.3.2 — Parser ZIP/XML e `ThreeMfSummary`

**Stato:** `[x]`

**Nota:** chiuso il 26/10/2026. Implementati `src/data/three-mf/` (indice ZIP, estrazione sicura, XML, fallback G-code, worker) e `src/domain/three-mf.ts` (`ThreeMfSummary`, piatti, filamenti, avvisi). Dipendenze runtime: `fflate` 0.8.3 per ZIP/DEFLATE e `@xmldom/xmldom` nel Web Worker, dove `DOMParser` non è disponibile; nel thread principale resta il `DOMParser` nativo.

**Sicurezza:** 100 MB compressi, 500 MB decompressi totali, 10.000 entry, 100 piatti, 10 MB per metadato, 64 MB per fallback G-code; rifiutati cifratura, path traversal, ZIP64, duplicati e compressioni non supportate. DOCTYPE/ENTITY rifiutati. Nessun upload o chiamata di rete.

**Test:** 18 nuovi test in `src/data/three-mf/parse.test.ts` (60 unitari totali): fixture Kobra 3, Kobra X e multi-piatto, Bambu sintetico, progetto non slicato, XML/DOCTYPE, project_settings, pesi, materiali, fallback G-code, limiti, path traversal e cifratura. Il worker viene costruito da Vite in un chunk separato; il test browser arriva con l'E2E di T5.3.4.

**Accettazione:** parser locale con limiti, normalizzazione completa, errore azionabile per file non slicato/malformato, nessun cambio a formule/`engineVersion`/schema, `npm run check` verde. → soddisfatta.

### T5.3.3 — Mapping puro `ThreeMfSummary → PrintLine[]`

**Stato:** `[x]`

**Nota:** chiuso il 26/10/2026. Implementato `src/domain/three-mf-mapping.ts`:

- `proposeThreeMfMapping(summary, config)` propone stampante e materiali senza creare entità; match stampante `exact`/`contains`/`ambiguous`/`missing`, materiali per famiglia con `candidateIds` per le scelte ambigue;
- `mapThreeMfToLines(summary, mapping, config, idFactory)` produce una riga per piatto selezionato con quantità 1, tempo dello slicer, grammi in centigrammi e ID iniettati;
- i grammi si sommano solo quando più filamenti sono mappati sullo stesso materiale; filamenti a 0 g ignorati; stampanti/materiali archiviati rifiutati;
- nessun supplemento AMS/ACE, nessuna creazione automatica, nessun cambio a formule, `engineVersion`, schema o persistenza.

**Test:** 15 test in `src/domain/three-mf-mapping.test.ts` (unitari + property test su una riga per piatto, somma esatta e nessun supplemento); 75 unitari totali. La UI userà queste funzioni in T5.3.4.

**Accettazione:** mapping puro, proposte senza entità silenziose, righe valide per il motore, test unitari e property verdi. → soddisfatta.

### T5.3.4 — UI “Importa .3mf”

**Stato:** `[x]`

**Nota:** chiuso il 26/10/2026. Aggiunti:

- pulsante “Importa .3mf” nella testata del calcolatore e nella sezione Stampe;
- drag & drop sulla sezione Stampe, con overlay “Rilascia il file qui”;
- dialogo unico (niente modali annidati) con file/slicer, stampante, piatti selezionabili, tempo, grammi, filamenti, select materiali, avvisi e anteprima della mappatura;
- conferma “Aggiungi alla bozza / Sostituisci le righe / Indietro” quando `draftHasContent` è vero; l’import conserva nome, cliente, costi di lavoro e prezzo;
- azione store `importLines(lines, mode)` con append o replace;
- alert di caricamento, errore e successo; focus sulla prima riga importata;
- stato di import in corso con pulsanti disabilitati.

**Nota tecnica:** durante l’E2E è emerso che `DOMParser` non esiste nei Web Worker. Il worker usa `@xmldom/xmldom` (runtime), mentre il thread principale continua a usare `DOMParser` nativo. Il worker resta separato nel build Vite; budget aggiornato a 249 KB gzip totali su 350 KB.

**Test:** 8 E2E in `tests/e2e/import.spec.ts` (file input, drag & drop, multi-piatto, mappatura ambigua, conferma append/replace, errore non slicato, salvataggio/reload, overflow a 375 px) e una scansione axe aggiuntiva nel modale mobile scuro. Totale: 26 E2E, 26 scansioni axe, 75 unitari. `npm run check` e `npm run test:e2e` verdi; WebKit invariato.

**Accettazione:** import da UI senza richieste di rete, nessun modale annidato, focus e tastiera, 375/1440 px, tema chiaro/scuro, nessun cambio a formule/`engineVersion`/schema. → soddisfatta.

### T5.3.5 — Performance, visual, documentazione e deploy

**Stato:** `[x]`

**Nota:** chiuso il 26/10/2026.

- **Performance:** file reale esportato dallo slicer (`1026-1206-prova volpe_plate(01)_PLA_0.12_6h32m3s.gcode.3mf`, 22 MB compressi, 75 MB di G-code decompresso) con dialogo visibile in **915 ms** in produzione, 70,05 g, 6h 32m, PLA e Kobra 3. Archivio sintetico da 50 MB in **95–107 ms**; progetto non slicato `rayquaza+230.3mf` da 15 MB rifiutato in **100–102 ms**. Target < 3 s rispettato. Il file sintetico e il progetto non slicato non sono committati.
- **Visual:** aggiunti 3 screenshot del modale import (1440/768/390 px); totale 18 screenshot con baseline Linux rigenerate.
- **Test:** 75 unitari, 26 E2E, 26 scansioni axe, 0 violazioni. `npm run check` e `npm run test:e2e` verdi.
- **Deploy:** produzione https://layercost.vercel.app aggiornata con T5.3.4 e verificata a 1440/390 px con import reale (Kobra 3, 1,46 g, nessun errore console, nessun overflow). T5.3.5 non cambia il bundle applicativo.
- **Bambu:** il fixture reale resta opzionale; il percorso è coperto dal test sintetico con header `X-BBL-Client-Version` e `printer_model_id = C12`. Serve l’autorizzazione del modello o un modello neutro per committarlo.

**Accettazione:** performance sotto target, regressione visiva aggiornata, documentazione e deploy verificati; nessun cambio a formule/`engineVersion`/schema. → soddisfatta.

## T5.4 — Sincronizzazione cloud (rimandata)

**Dipende da:** ADR-0018, T5.3, T5.6
**Stato:** `[ ]` — non iniziare senza esplicita richiesta del committente
**Piano:** `docs/planning/phase-5.md` §4

**Nota:** il sync è opzionale, local-first e **solo su piano gratuito**. Il provider non è scelto: lo spike confronta Supabase Free (auth/RLS pronti, pausa dopo 1 settimana di inattività), Cloudflare Workers + D1 (limiti generosi, nessuna pausa, auth da scrivere) e Firebase Spark. Serve prima il refactor async di `DataRepository`/store. Dati sincronizzati: configurazione e preventivi; bozza, tema e lingua restano locali. Backup prima del primo sync, conflitti visibili, export sempre disponibile.

## T5.5 — PWA/offline

Service worker, cache degli asset, promemoria backup.

## T5.6 — Interfaccia inglese

**Dipende da:** ADR-0019
**Stato:** `[ ]`
**Piano:** `docs/planning/phase-5.md` §3

**Nota:** italiano predefinito, inglese selezionabile. Dizionari tipizzati `src/i18n/{it,en}.ts`, `useI18n`, nessuna libreria runtime. Formattazione con `Intl`, inglese `en-GB` (EUR, metrico, `gg/mm/aaaa`). `Quote.locale` richiede la migrazione schema v1 → v2, con default `it` per i preventivi esistenti. Stampa e link condivisi usano la lingua del preventivo; l'interfaccia usa la preferenza del dispositivo. `layercost:locale` resta fuori da `AppData`.

Sottotask:

- **T5.6.1** — inventario delle stringhe e infrastruttura `i18n` con test di parità.
- **T5.6.2** — estrazione stringhe da schermate, errori, `aria-label`, stampa e guida.
- **T5.6.3** — formattazione locale e migrazione `Quote.locale` (schema v2).
- **T5.6.4** — selettore lingua, persistenza, `<html lang>`, stampa/link condivisi.
- **T5.6.5** — test E2E/axe/visual in inglese, documentazione e deploy.

**Accettazione:** tutte le schermate in inglese senza stringhe residue; italiano invariato; preferenza persistente; stampa/link nella lingua del preventivo; migrazione senza perdita dati; `npm run check` verde.

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
5. T4.1 → T4.7
6. T5.0 → T5.3 → T5.6 → T5.4 (sync solo su richiesta esplicita)
7. Resto del backlog

Non iniziare la UI prima che il motore e la persistenza siano stabili. Non iniziare il design prima del MVP funzionale. Non iniziare il sync prima di 3MF e inglese.
