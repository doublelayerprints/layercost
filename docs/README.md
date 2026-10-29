# LayerCost — Documentazione

**Stato:** v1.0.0 + T5.3/T5.6.5/T5.12/T5.20 + EVO-1/EVO-3a — fase 5 in corso
**Data:** 29 ottobre 2026
**Scopo:** definire quale documentazione esiste, cosa contiene, quando si aggiorna e come si evita che diverga dal codice.

## Stato attuale

- Fasi 0–3 implementate: fondamenta, motore, configurazione/persistenza, UI funzionale.
- Fase 4 completata e rilasciata come **v1.0.0**: T4.1–T4.7 chiusi (direzione **A — Strato**, ADR-0015, design system, redesign, stati e rifiniture, dark mode con ADR-0016, release con axe/WebKit/stampa/visual/budget).
- Fase 5 in corso: import `.3mf` chiuso (T5.3, ADR-0017); interfaccia inglese (T5.6.1–T5.6.5, ADR-0019), export `.xlsx` (T5.12), preventivi modificabili fino all’invio e calcolatore a card (T5.13–T5.14, ADR-0020), vista interna/cliente (T5.18, ADR-0022), composizione del prezzo e righe cliccabili (T5.19), sconti di riga e preventivo (T5.20, ADR-0023); sync cloud implementato e **live in produzione** (ADR-0018 e ADR-0024: Supabase Free, email/password, workspace condiviso); piano in `planning/t5.4-cloud-sync.md`, runbook in `engineering/workspace-runbook.md`, backup in `engineering/backup-restore.md`, T5.4.0–T5.4.6 chiusi; evolutive in `planning/evolutive.md`. **EVO-1** Google login (ADR-0025) è distribuito; **EVO-3a** pagina “Richiedi accesso” (ADR-0026) è implementata, configurata con Formspree e distribuita: piano in `planning/evo-3a-access-request.md`, runbook in `engineering/access-requests.md`. Il limite dell’import `.3mf` è a **250 MiB compressi / 1 GiB decompressi**.
- Inventario i18n in `planning/i18n-inventory.md`.
- Documenti normativi: `domain/cost-model.md`, `domain/data-model.md`.
- Test: 237 unitari + 51 E2E (39 default incl. accesso + 6 visual + 3 auth + 3 sync) + 33 pgTAP RLS; axe 60 scansioni, 0 violazioni; CI `main`, smoke test di produzione, keep-alive e backup verdi.
- Repo GitHub: `doublelayerprints/layercost` (privata).
- CI: verde su GitHub (`check` + `e2e` + `database`).
- Deploy: live su https://layercost.vercel.app; progetto collegato alla repo GitHub; release `v1.0.0` (tag su `cc949b3`), deploy cloud T5.4 (`1bf641e`), deploy EVO-1 (`51d3fb9`), deploy EVO-3a (`125f0d5`) e limite `.3mf` (`338d693`, build `index-BR5hKjFi.js` / `index-G-eqO2lr.css`) verificati; le preview sono protette da SSO.

---

## 1. Principi

1. **Una fonte di verità per ogni cosa.** Le formule stanno in `cost-model.md`; lo schema in `data-model.md`; le decisioni negli ADR; i task in `TASKS.md`.
2. **Normativo vs informativo.** Alcuni documenti sono vincolanti per il codice, altri spiegano. La distinzione è esplicita.
3. **Documentazione insieme al codice.** Nessun task è chiuso se la documentazione collegata non è aggiornata.
4. **Niente duplicazione.** Un documento rimanda all'altro invece di copiare intere sezioni.
5. **Italiano leggibile, inglese tecnico.** Prosa e UI in italiano; identificatori, tipi e termini di dominio in inglese quando sono più precisi.
6. **Link relativi e verificabili.** Nessun link a chat, issue temporanee o file fuori dal repository.
7. **Esempi numerici obbligatori.** Ogni formula ha almeno un esempio svolto e un test.
8. **Le decisioni non si cancellano.** Un ADR superato resta, con un rimando al nuovo.

---

## 2. Lingua e stile

- Prosa: italiano, frasi brevi, voce attiva.
- Codice, tipi, funzioni, variabili: inglese.
- Termini tecnici: `markup`, `margin`, `flush`, `prime tower`, `snapshot`, `local-first` restano in inglese; la prima volta si spiegano.
- Numeri: nel testo italiano virgola decimale (`€3,99`), nei blocchi di codice punto (`3.99`).
- Date: `gg/mm/aaaa` nella UI; ISO `YYYY-MM-DD` nei dati.
- Unità: sempre esplicite (`€/kWh`, `€/h`, `g`, `h`).
- Titoli: sentence case, non Title Case.
- Tabelle per confronti, elenchi per passi, blocchi di codice per formule.

---

## 3. Struttura del repository

```text
/
├── README.md
├── STATUS.md
├── AGENTS.md
├── PLAN.md
├── TASKS.md
├── CHANGELOG.md
├── docs/
│   ├── README.md
│   ├── domain/
│   │   ├── cost-model.md
│   │   ├── data-model.md
│   │   ├── glossary.md
│   │   ├── sources.md
│   │   └── golden-cases.md
│   ├── engineering/
│   │   ├── architecture.md
│   │   ├── tech-stack.md
│   │   ├── persistence.md
│   │   ├── testing.md
│   │   ├── deployment.md
│   │   ├── workspace-runbook.md
│   │   ├── access-requests.md
│   │   ├── backup-restore.md
│   │   ├── release.md
│   │   ├── manual-checks.md
│   │   └── conventions.md
│   ├── design/
│   │   ├── ui-brief.md
│   │   ├── directions.md
│   │   └── design-system.md
│   ├── planning/
│   │   ├── phase-5.md
│   │   ├── t5.4-cloud-sync.md
│   │   ├── evolutive.md
│   │   ├── evo-3a-access-request.md
│   │   └── i18n-inventory.md
│   └── adr/
│       ├── README.md
│       ├── 0001-static-local-first.md
│       └── ...
└── src/
```

`PLAN.md` e `TASKS.md` stanno in root perché sono i due file che un agente legge per primo. I documenti di dominio stanno in `docs/domain` perché sono normativi.

---

## 4. Normativo vs informativo

| Documento                      | Tipo                           | Se diverge dal codice                   |
| ------------------------------ | ------------------------------ | --------------------------------------- |
| `docs/domain/cost-model.md`    | **Normativo**                  | Il codice è sbagliato; aprire un bug    |
| `docs/domain/data-model.md`    | **Normativo**                  | Il codice è sbagliato; migrazione o fix |
| `docs/adr/*`                   | **Normativo per le decisioni** | Serve un nuovo ADR che supersede        |
| `PLAN.md`                      | Pianificazione                 | Aggiornare scope o roadmap              |
| `TASKS.md`                     | Pianificazione                 | Aggiornare stato o criteri              |
| `AGENTS.md`                    | Operativo                      | Aggiornare le regole                    |
| `README.md`                    | Informativo                    | Aggiornare                              |
| `docs/engineering/*`           | Descrittivo                    | Aggiornare se cambia l'architettura     |
| `docs/design/ui-brief.md`      | Requisiti                      | Aggiornare prima del design             |
| `docs/design/design-system.md` | Normativo per la UI            | Aggiornare token o componente           |
| `CHANGELOG.md`                 | Storico                        | Aggiornare a ogni release               |

---

## 5. Mappa dei documenti

### 5.1 `README.md`

**Scopo:** onboarding umano in 2 minuti.

Sezioni minime:

1. Cos'è LayerCost.
2. Screenshot o descrizione (quando esiste).
3. Requisiti (Node 22).
4. Avvio locale: `npm install`, `npm run dev`.
5. Comandi principali.
6. Deploy su Vercel in 5 righe.
7. Dove sono i dati e come si fa il backup.
8. Link a `PLAN.md`, `AGENTS.md`, `docs/domain/cost-model.md`.
9. Licenza (da decidere).

**Aggiornare quando:** cambiano comandi, stack, deploy o flusso di backup.

---

### 5.2 `AGENTS.md`

**Scopo:** rendere un coding agent autonomo e disciplinato.

Sezioni minime:

1. Contesto del progetto in 5 righe.
2. Ordine di lettura.
3. Comandi.
4. Mappa dell'architettura.
5. Invarianti non negoziabili.
6. Flusso di lavoro su un task.
7. Definition of Done.
8. Regole su formule, dati, UI, test e documentazione.
9. Cosa decidere da solo e cosa chiedere.
10. Divieti.

**Aggiornare quando:** cambiano convenzioni, comandi, architettura o regole.

Le regole operative per il coding agent sono in `AGENTS.md`.

---

### 5.3 `PLAN.md`

**Scopo:** visione, scope, architettura, roadmap.

Sezioni minime:

1. Sintesi.
2. Problema e utenti.
3. Principi.
4. Scope dentro/fuori.
5. Requisiti funzionali e non funzionali.
6. Architettura.
7. Stack.
8. Hosting.
9. Modello dati (sintesi).
10. Documentazione.
11. Roadmap.
12. Dati di partenza.
13. Rischi.
14. Criteri di successo.
15. Backlog.
16. Fonti.

**Aggiornare quando:** cambia lo scope, una fase, l'architettura o un rischio importante.

---

### 5.4 `TASKS.md`

**Scopo:** backlog operativo.

Regole:

- Ogni task ha ID, dipendenze, stato e criteri di accettazione.
- Un task = un commit o una PR piccola.
- Non si inizia un task con dipendenze aperte.
- Lo stato si aggiorna nello stesso commit del codice.
- I criteri di accettazione sono verificabili, non “funziona bene”.
- I task di formule rimandano ai golden case.
- I task di UI includono accessibilità e responsive.

Formato:

```md
## T1.2 — Costo materiale

**Dipende da:** T1.1
**Stato:** `[ ]`

- ...
  **Accettazione:** ...
```

**Aggiornare quando:** si chiude, si blocca o si aggiunge un task.

---

### 5.5 `docs/domain/cost-model.md`

**Scopo:** specifica normativa del calcolo.

Sezioni minime:

1. Scopo e autorità.
2. Unità e limiti.
3. Arrotondamenti e ordine delle operazioni.
4. Input e risoluzione delle tariffe.
5. Componenti: materiale, energia, usura, manodopera, extra, guasti.
6. Costo di riga.
7. Costo del preventivo e ripartizione.
8. Prezzo, sconti, IVA, margine effettivo.
9. Snapshot e versione motore.
10. Esempi svolti.
11. Casi limite.
12. Golden case.
13. Invarianti.
14. Approssimazioni dichiarate.

**Aggiornare quando:** cambia una formula, un'unità, un arrotondamento, un default o un caso limite. Nello stesso commit: test e `engineVersion`.

---

### 5.6 `docs/domain/data-model.md`

**Scopo:** schema, invarianti, persistenza.

Sezioni minime:

1. Entità e relazioni.
2. Campi, tipi, unità, default.
3. Invarianti (es. quantità ≥ 1, tariffa obbligatoria).
4. Schema versionato e migrazioni.
5. Snapshot del preventivo.
6. Export/import.
7. Regole di archiviazione.
8. Esempi JSON.
9. Sicurezza e validazione.

**Aggiornare quando:** cambia un campo, un tipo, un default, una relazione o una migrazione.

---

### 5.7 `docs/domain/glossary.md`

**Scopo:** allineare i termini.

Voci minime:

- Costo diretto, costo pieno, costo variabile.
- Ammortamento, usura, manutenzione, valore residuo, vita utile.
- Materiale, famiglia, bobina, peso netto, prezzo €/kg.
- Slicer, tempo slicer, tempo effettivo, avvio, maggiorazione.
- Purge, flush, prime tower, brim, supporti.
- AMS, ACE, ACE 2 Pro, multicolore.
- Tariffa energia, costo marginale, kWh.
- Ricarico, margine, margine effettivo, sconti, IVA.
- Snapshot, engine version, migrazione, schema version.
- Preventivo, lotto, riga, quantità.
- Archivio, cancellazione, riferimento.

**Aggiornare quando:** nasce un termine nuovo o se ne precisa uno.

---

### 5.8 `docs/domain/sources.md`

**Scopo:** tracciare le fonti dei dati di partenza e il loro livello di confidenza.

Formato per fonte:

```md
## Anycubic Kobra X — specifiche

- URL:
- Data accesso: 2026-10-23
- Dati usati: volume, potenza nominale, letto, ugello, ACE 2 Pro
- Confidenza: alta per le specifiche dichiarate; bassa per i consumi medi
- Note: la potenza nominale non è usata nel costo
```

**Aggiornare quando:** si aggiunge o si corregge un dato di seed, una potenza, una vita utile o un prezzo indicativo.

---

### 5.9 `docs/domain/golden-cases.md`

**Scopo:** esempi numerici condivisi tra documentazione e test.

Contenuto:

- input completi;
- passaggi di calcolo;
- risultati attesi al µ€;
- riferimento al test (`G-01`, ecc.);
- note su arrotondamenti e casi limite.

**Aggiornare quando:** cambia un esempio, un default o una formula. Deve restare allineato a `cost-model.md` e ai fixture.

---

### 5.10 `docs/engineering/architecture.md`

**Scopo:** spiegare livelli, dipendenze e flussi.

Sezioni:

- diagramma dei livelli;
- responsabilità di `domain`, `application`, `data`, `features`, `components`;
- regole di dipendenza;
- flusso di calcolo;
- flusso di salvataggio;
- flusso di import;
- sync-ready;
- cosa non appartiene al dominio.

**Aggiornare quando:** cambia la struttura o il flusso.

---

### 5.11 `docs/engineering/tech-stack.md`

**Scopo:** motivare le scelte tecniche e le versioni.

Sezioni:

- tabella stack;
- versioni minime;
- dipendenze vietate in v1;
- criteri per aggiungere una dipendenza;
- browser supportati;
- note su bundle e performance.

**Aggiornare quando:** si aggiunge/rimuove una dipendenza o si cambia una versione maggiore.

---

### 5.12 `docs/engineering/persistence.md`

**Scopo:** storage, schema, migrazioni, backup.

Sezioni:

- chiavi `localStorage`;
- formato `AppData`;
- `schemaVersion`;
- catena di migrazioni;
- backup prima della migrazione;
- export/import;
- gestione dati corrotti;
- limiti di dimensione;
- privacy;
- percorso verso la sync.

**Aggiornare quando:** cambia lo schema, una chiave, una migrazione o la policy di backup.

---

### 5.13 `docs/engineering/testing.md`

**Scopo:** strategia di test.

Sezioni:

- piramide: unit, property, integration, E2E;
- golden case;
- fixture;
- test di migrazione;
- test di import;
- accessibilità;
- comandi;
- CI;
- cosa non testare (UI effimera).

**Aggiornare quando:** cambia la strategia o si aggiunge una suite.

---

### 5.14 `docs/engineering/deployment.md`

**Scopo:** deploy e release.

Sezioni:

- Vercel: setup, build, output, preview;
- variabili d'ambiente (nessuna obbligatoria);
- base path e hash routing;
- header di sicurezza;
- GitHub Pages come alternativa;
- Netlify/Cloudflare come alternative;
- checklist di release;
- rollback.

**Aggiornare quando:** cambia l'hosting o la configurazione.

---

### 5.15 `docs/engineering/release.md`

**Scopo:** checklist e verbale della release.

Sezioni:

- scope della versione;
- checklist con esito;
- verifiche eseguite (test, axe, WebKit, stampa, visual, budget);
- limiti noti;
- procedura di rilascio e rollback;
- attività successive.

**Aggiornare quando:** si prepara o si chiude una release.

---

### 5.16 `docs/engineering/conventions.md`

**Scopo:** stile di codice e collaborazione.

Sezioni:

- TypeScript strict;
- naming;
- struttura file;
- import alias;
- error handling;
- commenti;
- commit Conventional Commits;
- branch e PR;
- versioning SemVer;
- review checklist.

**Aggiornare quando:** cambia una convenzione.

---

### 5.17 `docs/design/ui-brief.md`

**Scopo:** preparare la fase di design senza imporre uno stile.

Sezioni:

- obiettivi UX;
- personas e scenari;
- inventario schermate;
- flussi principali;
- dati e stati;
- requisiti di accessibilità;
- responsive;
- microcopy;
- cosa non cambiare (formule, snapshot, semantica dei dati);
- criteri di successo.

**Aggiornare quando:** cambia un flusso o un requisito UI. Non contiene colori, font o moodboard: quelli arrivano dalla skill di design.

Le direzioni visive sono in `docs/design/directions.md`: proposte con palette, tipografia, wireframe e criteri di scelta. La decisione è registrata in `docs/adr/0015-direzione-visiva.md`; il tema scuro è in `docs/adr/0016-dark-mode.md`. Il design system implementato — token, font, componenti, accessibilità, tema scuro e stampa — è in `docs/design/design-system.md`. Aggiornare quando cambia la direzione o il design system.

---

### 5.18 `docs/adr/README.md`

**Scopo:** indice degli ADR e template.

Contenuto:

- tabella ADR → tema → stato;
- template;
- regola: un ADR accettato non si modifica, si supersede;
- quando scrivere un ADR (decisione costosa, irreversibile, trasversale, con alternative reali).

**Aggiornare quando:** si aggiunge un ADR.

---

### 5.19 `CHANGELOG.md`

**Scopo:** storia delle release.

Formato: Keep a Changelog + SemVer.

Sezioni: Added, Changed, Fixed, Removed, Security.

**Aggiornare quando:** si tagga una release.

---

### 5.20 `docs/engineering/manual-checks.md`

**Scopo:** verifiche che richiedono un dispositivo o un lettore di schermo reale.

Sezioni:

- Safari reale: calcolo, salvataggio, tema, stampa/PDF, link condiviso;
- VoiceOver: titoli, landmark, form, tab order, modali;
- prova su carta;
- tabella d'esito e cosa riportare in caso di problema.

**Aggiornare quando:** cambia un flusso critico o la procedura di verifica.

---

### 5.21 `docs/planning/phase-5.md`

**Scopo:** handoff operativo della fase 5.

Sezioni:

- ordine e dipendenze;
- import `.3mf`: file supportati, pipeline, mapping, UX, sicurezza, test, criteri;
- interfaccia inglese: dizionari, `Intl`, `Quote.locale`, migrazione, test;
- sync: vincoli, confronto piani gratuiti, architettura, conflitti, sicurezza, test;
- lavoro trasversale, prompt di handoff e fonti.

**Aggiornare quando:** si chiude un'iniziativa o cambia una decisione di fase 5.

---

### 5.22 `docs/planning/i18n-inventory.md`

**Scopo:** inventario delle stringhe da tradurre e ordine di estrazione per T5.6.

Sezioni:

- regole su cosa tradurre e cosa no;
- infrastruttura i18n già pronta;
- inventario per area e file;
- ordine di estrazione;
- test e verifiche.

**Aggiornare quando:** si estrae o si aggiunge una stringa, o cambia lo scope della traduzione.

---

### 5.23 `docs/planning/t5.4-cloud-sync.md`

**Scopo:** piano operativo dettagliato del sync cloud (T5.4).

Sezioni:

- decisioni (ADR-0024) e fuori scope;
- architettura, contratti e modalità ospite/connesso/offline;
- auth email/password e route;
- schema Postgres, RLS, trigger e mapping;
- sincronizzazione, outbox, conflitti e primo login;
- UX, microcopy e accessibilità;
- operazioni free: keep-alive, backup, progetti, bundle e deploy;
- task T5.4.0–T5.4.6 con accettazione e stime;
- test, runbook, rischi, domande aperte e fonti.

**Aggiornare quando:** cambia una decisione di T5.4, si chiude un subtask o cambiano i limiti free.

---

### 5.24 `docs/engineering/workspace-runbook.md`

**Scopo:** procedura amministrativa del workspace condiviso Supabase.

Sezioni:

- setup del progetto, utenti e membership;
- SQL di bootstrap e verifica;
- aggiunta, rimozione e cambio ruolo;
- reset password e offboarding;
- audit `created_by`/`updated_by`;
- smoke test, risultati attesi della RLS, troubleshooting e sicurezza;
- ambiente locale e checklist.

**Aggiornare quando:** cambiano utenti, membership, policy RLS o procedure amministrative.

---

### 5.25 `docs/engineering/backup-restore.md`

**Scopo:** backup settimanale cifrato e restore del database Supabase.

Sezioni:

- dati inclusi ed esclusi;
- workflow, secret, cifratura e retention;
- verifica checksum e decifratura;
- restore auth → public;
- verifica post-restore;
- restore testato e limiti di sicurezza.

**Aggiornare quando:** cambiano schema, workflow di backup, secret o procedura di restore.

---

### 5.26 `docs/planning/evolutive.md`

**Scopo:** piano delle evolutive future: Google login, tetti utenti/preventivi e apertura multi-workspace.

Sezioni:

- stato di partenza e file rilevanti;
- Google OAuth: Google Cloud, Supabase, app, account esistenti, test e rollback;
- tetti: `workspace_limits`, trigger membri/preventivi, Auth Hook, UI e test;
- decisione multi-workspace con impatto su PK, sync, cache e onboarding;
- roadmap EVO-1–EVO-4, domande aperte e prompt di handoff.

**Aggiornare quando:** si decide o si implementa una evolutiva, o cambiano i limiti del piano.

---

### 5.27 `docs/engineering/access-requests.md`

**Scopo:** runbook amministratore della pagina “Richiedi accesso” e del form Formspree.

Sezioni:

- funzionamento della pagina e limiti Free;
- setup del form di produzione e di test, Restrict to domain e notifica;
- lettura delle richieste e creazione manuale dell’utente;
- retention, cancellazione e privacy;
- troubleshooting e checklist.

**Aggiornare quando:** cambia il form, la retention, la procedura di approvazione o il piano Formspree.

---

### 5.28 `docs/planning/evo-3a-access-request.md`

**Scopo:** piano operativo di EVO-3a: route, payload, privacy, setup Formspree, test e acceptance.

Sezioni:

- decisioni e scope;
- route e stati UI;
- dati, payload ed errori;
- privacy e retention;
- setup manuale ed env;
- accessibilità, test, file, rischi e gate.

**Aggiornare quando:** cambia la pagina, il payload, la retention o la procedura di configurazione.

---

## 6. Come cambiare una formula

1. Apri un ADR se la modifica cambia il significato del costo o del prezzo.
2. Aggiorna `docs/domain/cost-model.md` (formula, ordine di arrotondamento, esempi).
3. Aggiorna `docs/domain/golden-cases.md`.
4. Aggiorna i fixture e i test.
5. Aggiorna `engineVersion`.
6. Verifica che i preventivi salvati restino invariati.
7. Aggiorna `CHANGELOG.md`.
8. Esegui `npm run check`.
9. Commit unico con codice + docs + test.

Se la modifica è solo un refactor senza cambio di risultati, non serve un nuovo ADR, ma i test devono restare verdi e `engineVersion` non cambia.

---

## 7. Come aggiungere un'entità o un campo

1. Aggiorna `docs/domain/data-model.md`.
2. Aggiungi il tipo nel dominio (senza React).
3. Aggiungi lo schema Zod al confine.
4. Aggiungi default e seed, se serve.
5. Aggiungi la migrazione se il campo è obbligatorio o cambia semantica.
6. Aggiungi test di roundtrip, import e migrazione.
7. Aggiorna la UI solo dopo.
8. Aggiorna `TASKS.md` e `CHANGELOG.md`.

---

## 8. Come aggiungere una schermata

1. Aggiorna `docs/design/ui-brief.md` con flusso, dati e stati.
2. Aggiungi la route e la voce di navigazione.
3. Definisci gli stati: vuoto, caricamento, errore, successo, disabilitato, archiviati.
4. Usa componenti esistenti o primitivi minimi.
5. Verifica tastiera, focus, label, contrasto.
6. Verifica 375 px e 1440 px.
7. Aggiungi un test E2E se la schermata è nel flusso critico.
8. Aggiorna `README` solo se cambia l'onboarding.

---

## 9. Definition of Done della documentazione

Un task che tocca la documentazione è chiuso quando:

- [ ] Il documento aggiornato ha tutte le sezioni minime.
- [ ] I link relativi funzionano.
- [ ] Gli esempi numerici sono verificati da un test.
- [ ] Non ci sono contraddizioni con `PLAN.md`, `TASKS.md` o gli ADR.
- [ ] I termini nuovi sono nel glossario.
- [ ] Le fonti nuove sono in `sources.md` con data e confidenza.
- [ ] Il changelog è aggiornato se è una release.

---

## 10. Checklist di review della documentazione

- [ ] Si capisce **cosa** fare senza leggere il codice?
- [ ] Si capisce **perché** è stata presa una decisione?
- [ ] Le formule hanno unità e ordine di arrotondamento?
- [ ] Gli esempi sono riproducibili?
- [ ] I casi limite sono elencati?
- [ ] Le alternative scartate sono motivate?
- [ ] I link sono relativi e validi?
- [ ] La lingua è coerente (italiano + termini tecnici inglesi)?
- [ ] Non ci sono numeri hardcoded non spiegati?
- [ ] Un agente può implementare il task senza chiedere chiarimenti?

---

## 11. Fonti e confidenza

Ogni dato di seed che non è certo deve avere:

- URL o riferimento;
- data di accesso;
- dati usati;
- confidenza: **alta** (specifica ufficiale), **media** (misura indipendente), **bassa** (stima).
- nota su come verificarlo.

La UI mostra un badge “stimato” per i valori a confidenza bassa. Il wizard iniziale chiede conferma.

---

## 12. Changelog e versioning

- SemVer: `MAJOR.MINOR.PATCH`.
- `0.x` fino alla v1.0 (dopo il redesign).
- `MAJOR` per cambi di schema non retrocompatibili o cambi di significato dei risultati.
- `MINOR` per nuove funzionalità e cambi di formula.
- `PATCH` per fix che non cambiano i risultati attesi.
- Ogni release ha una voce in `CHANGELOG.md`.
- Ogni cambio di formula ha una nota esplicita nel changelog.

---

## 13. Manutenzione

- Una volta al mese: verificare link, fonti, versioni e task obsoleti.
- A ogni rilascio: aggiornare README, CHANGELOG e checklist.
- A ogni cambio di stack: aggiornare `tech-stack.md` e `conventions.md`.
- A ogni nuovo ADR: aggiornare l'indice.
- A ogni modifica di schema: aggiornare `persistence.md` e i fixture di migrazione.

La documentazione non è un archivio: se un documento non serve più, si archivia con una nota, non si lascia a marcire.
