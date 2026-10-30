# Fase 5 — Piano operativo

**Stato:** T5.3 completato; **T5.6 chiuso** (i18n, formattazione, `Quote.locale`, selettore e verifiche); **T5.13–T5.14 chiusi** (preventivi modificabili e card del calcolatore); **T5.15–T5.17 chiusi** (preferenze rapide, azioni in alto e colore filamento); **T5.20 chiuso** (sconti di riga e di preventivo); **T5.21 chiuso** (card comprimibili nel calcolatore); **T5.22 chiuso** (rinomina del preventivo dal titolo); **T5.4.0 chiuso** (piano e ADR-0024), **T5.4.1 chiuso** (repository async), **T5.4.2 chiuso** (schema, RLS, trigger, mapper), **T5.4.3 chiuso** (auth email/password) e **T5.4.4 chiuso** (sync, outbox, conflitti)
**Data:** 28 ottobre 2026
**Base:** v1.0.0, commit `cc949b3`
**Prossima sessione:** T5.4 è **chiuso e live in produzione**. Follow-up opzionale: baseline visual delle schermate cloud. Piano completo in `t5.4-cloud-sync.md`; runbook in `docs/engineering/workspace-runbook.md`; backup in `docs/engineering/backup-restore.md`; smoke test in `docs/engineering/deployment.md` §13. Il resto del backlog è chiuso/non in scope.
**Regole:** un ADR prima del codice, nessun cambio a formule/`engineVersion`/snapshot senza ADR e test, documentazione e test nello stesso commit.

---

## 1. Ordine e dipendenze

| Ordine | Iniziativa                        | Perché ora                                                                                           | Dipende da                     |
| ------ | --------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------ |
| 1      | **T5.3 — Import `.3mf`**          | Elimina il passaggio manuale più noioso e riduce gli errori di input.                                | ADR-0017, fixture reali        |
| 2      | **T5.6 — Interfaccia inglese**    | Rende il prodotto utilizzabile fuori dall'Italia; tocca molte stringhe, meglio farlo prima del sync. | ADR-0019, migrazione schema v2 |
| 3      | **T5.4 — Sincronizzazione cloud** | Richiesta dal committente; richiede refactor async, RLS e operazioni free (backup/keep-alive).        | ADR-0018, ADR-0024, piano T5.4 |

Il sync non deve iniziare prima di 3MF e inglese: il refactor async e la migrazione schema renderebbero il lavoro più fragile.

---

## 2. T5.3 — Import diretto da `.3mf`

### 2.1 Obiettivo

Dare all'utente un pulsante **“Importa .3mf”** che, da un file già slicato, crea una o più righe del preventivo con tempo, grammi, materiali e stampante già compilati. Il file resta sul dispositivo: nessun upload.

**Non obiettivi della prima iterazione:**

- importare geometria o modelli non slicati;
- fare slicing nel browser;
- importare CSV/JSON (resta il fallback manuale);
- modificare formule, `engineVersion`, snapshot o schema del preventivo;
- aggiungere una percentuale AMS/ACE (vietato da ADR-0006).

### 2.2 File supportati

| Slicer / file                                   | Metadati utili                                                                                                                      | Supporto                                                                 |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Anycubic Slicer Next (base Orca) — `.gcode.3mf` | `Metadata/slice_info.config`: `prediction` (s), `used_g` per filamento; `project_settings.config`: `printer_model`, `filament_type` | **Primario** — verificato in T5.3.1                                      |
| OrcaSlicer — `.gcode.3mf`                       | Come sopra                                                                                                                          | **Primario** — stessa struttura; test sintetico                          |
| Bambu Studio — `.gcode.3mf`                     | Come sopra; header `X-BBL-Client-Version`                                                                                           | **Primario** — verificato localmente; fixture committabile da aggiungere |
| PrusaSlicer — progetto `.3mf`                   | `Metadata/Slic3r_PE.config` (impostazioni), nessun tempo/grammi affidabile                                                          | **Non supportato** nella prima iterazione                                |
| Qualsiasi `.3mf` non slicato                    | Solo geometria e impostazioni                                                                                                       | **Rifiutato** con messaggio azionabile                                   |

> **Export in Anycubic Slicer Next:** usare `Preview → Export plate sliced file...` (o `Export all plate sliced file...` per tutti i piatti). `Export G-code file` produce un `.gcode` puro, non supportato dall’import; `Export Generic 3MF...` produce un 3MF non slicato e viene rifiutato.

Il `.3mf` è un archivio ZIP/OPC. I file Orca/Bambu/Anycubic già slicati contengono:

- `Metadata/slice_info.config` — XML con `<plate>`, `prediction` in secondi, `weight` totale in grammi, `<filament id type color used_m used_g>`;
- `Metadata/project_settings.config` — JSON con `printer_model`, `printer_variant`, `filament_type`, `filament_colour`, `filament_density`, `filament_diameter`;
- `Metadata/model_settings.config` — XML con i piatti e i riferimenti al G-code;
- `Metadata/plate_N.gcode` — G-code incorporato, utile come fallback.

### 2.2.1 Esito della verifica T5.3.1 (26/10/2026)

Fixture ridotte in `tests/fixtures/3mf/`, con README e valori attesi:

| Fixture                             | Slicer           | Stampante | Piatti | Esito                                           |
| ----------------------------------- | ---------------- | --------- | ------ | ----------------------------------------------- |
| `anycubic-kobra3-pla.gcode.3mf`     | Anycubic 2.0.0.3 | Kobra 3   | 1      | 200 s; 1,46 g; PLA                              |
| `anycubic-kobrax-pla.gcode.3mf`     | Anycubic 2.0.0.3 | Kobra X   | 1      | 513 s; 3,76 g; PLA                              |
| `anycubic-kobrax-2plates.gcode.3mf` | Anycubic 2.0.0.3 | Kobra X   | 2      | 6.069 s / 38,41 g + 2.650 s / 13,79 g; PLA      |
| `anycubic-unsliced-project.3mf`     | Anycubic 1.4.1.1 | Kobra 3   | 0      | header presente, nessun `<plate>`: da rifiutare |

**Struttura reale di `slice_info.config`:** `prediction`, `weight` e `printer_model_id` sono `<metadata key="…" value="…">` annidati nel `<plate>`; i filamenti sono `<filament id type color used_m used_g />` con attributi. Il piano iniziale era generico su questo punto; il parser deve leggere i metadata annidati e non solo gli attributi.

**Mapping stampante:** `slice_info.printer_model_id` non è affidabile da solo. È vuoto nel file Kobra 3 generato, contiene `Anycubic Kobra X` nel file Kobra X ed è il codice interno `C12` in un file Bambu. La fonte primaria è `project_settings.printer_model`; `printer_settings_id` e `printer_model_id` sono fallback/conferma.

**Altri esiti:**

- `prediction` è in secondi interi; `weight` e `used_g` in grammi; `used_m` in metri.
- `filament.id` è 1-based e punta a `project_settings.filament_type` / `filament_colour`.
- `weight` coincide con la somma di `used_g` entro 0,01 g nei file verificati. Resta l'avviso previsto se la differenza supera l'1%.
- Un progetto non slicato può avere `slice_info.config` con il solo header: la presenza del file non è prova di slicing. Servono almeno un `<plate>` con `prediction` e un `<filament>`.
- `plater_name` è vuoto nei fixture: il fallback nome file + “piatto N” è necessario.
- `3D/3dmodel.model` → `Application` è `BambuStudio-2.0.0.3` anche nei file Anycubic. Gli header `X-ACNext-Client-Version` (Anycubic) e `X-BBL-Client-Version` (Bambu) sono più affidabili di `Application`.
- Un file Bambu Studio 01.10.02.73 (P1S, 8 piatti) è stato verificato localmente: stessa struttura, `printer_model_id` = `C12`, `weight` = somma `used_g` entro 0,01 g. Non è committato per la licenza del modello; serve un fixture Bambu con permesso o modello neutro in T5.3.2.
- Non è stato possibile verificare se `prediction` include il riscaldamento iniziale: serve il confronto con una stampa reale (domanda 2).

### 2.3 Pipeline

1. **Selezione file** — input `accept=".3mf,application/zip"` e drag & drop; massimo 250 MiB compressi.
2. **Validazione ZIP** — leggere l'indice senza estrarre tutto; rifiutare archive cifrati, troppi entry (limite 10.000) e dimensioni decompresse eccessive (limite 1 GiB).
3. **Riconoscimento slicer** — cercare `Metadata/slice_info.config`; in alternativa leggere l'header del G-code. Leggere `Application` da `3D/3dmodel.model` per il messaggio di errore.
4. **Estrazione piatti** — per ogni `<plate>`: `index`, `prediction`, `weight`, `<filament>`. Se manca `slice_info.config`, provare il footer del G-code (`; estimated printing time`, `; filament used [g]`).
5. **Normalizzazione** — creare un `ThreeMfSummary` puro: nome file, slicer, piatti con secondi, grammi per tipo, stampante dichiarata, avvisi.
6. **Mappatura** — proporre stampante e materiali configurati; l'utente conferma o corregge in un modale.
7. **Anteprima** — tabella dei piatti selezionati con tempo, grammi, materiali e stampante; avvisi su campi mancanti o mismatch.
8. **Import** — creare `PrintLine[]` nel draft; se la bozza ha contenuto, usare la conferma già esistente (`draftHasContent` + `Modal`) per aggiungere o sostituire.
9. **Salvataggio** — il draft viene persistito come sempre; il preventivo entra nello storico solo con “Salva preventivo”.

### 2.3.1 Esito T5.3.2 (26/10/2026)

Parser implementato in `src/data/three-mf/`; il tipo normalizzato è in `src/domain/three-mf.ts`.

- **ZIP:** `fflate` 0.8.3 (runtime), indice centrale letto prima di estrarre; limiti 250 MiB compressi, 1 GiB decompresso, 10.000 entry, 100 piatti, 10 MB per metadato, 64 MB per fallback G-code. Rifiutati cifratura, path traversal, ZIP64, duplicati e compressioni non supportate.
- **XML:** `DOMParser` nativo nel thread principale; `@xmldom/xmldom` nel Web Worker, dove `DOMParser` non esiste. `<!DOCTYPE`/`<!ENTITY` rifiutati in entrambi i percorsi.
- **Worker:** `three-mf.worker.ts` + `worker-client.ts`; il buffer viene trasferito, la UI non viene bloccata. Il chunk worker è separato nel build Vite.
- **Fallback G-code:** se manca `slice_info.config` si leggono tempo e grammi dal footer del G-code, entro 64 MB. I materiali restano sconosciuti e vanno mappati; il fallback non sostituisce `slice_info` come percorso principale.
- **Bambu:** il percorso è coperto da un test sintetico con header `X-BBL-Client-Version`, `printer_model` e `printer_model_id = C12`. Il fixture reale non è committato per la licenza del modello.
- **Test:** 18 nuovi test in `src/data/three-mf/parse.test.ts` (60 unitari totali). Nessun cambio a formule, `engineVersion`, schema, snapshot o persistenza.
- **i18n:** messaggi di errore e avvisi del parser sono ancora in italiano; T5.6 li sposterà nei dizionari.

### 2.4 Dati e regole di mapping

| Campo `.3mf`                         | Campo LayerCost               | Regola                                                                                                               |
| ------------------------------------ | ----------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `prediction`                         | `PrintLine.timeSeconds`       | Secondi interi; nessuna maggiorazione automatica. L'avvio stampante resta aggiunto dal motore.                       |
| `used_g` per filamento               | `PrintLine.materials[].grams` | Centigrammi; sommare per tipo di materiale.                                                                          |
| `weight` del piatto                  | controllo                     | Se la somma dei filamenti differisce da `weight` oltre l'1%, mostrare un avviso.                                     |
| `filament.type`                      | `Material.family`             | Mapping per famiglia (`PLA`, `PETG`, `TPU`, `ABS`, `ASA`, `PLA-CF`, `PETG-CF`, `PVA`). Nessuna creazione automatica. |
| `filament_colour`                    | nessun campo di costo         | Mostrato solo nell'anteprima; non entra nel prezzo.                                                                  |
| `printer_model` / `printer_model_id` | `PrintLine.printerId`         | Match normalizzato con nome/modello; se assente, select manuale.                                                     |
| `plater_name`                        | `PrintLine.name`              | Fallback: nome file + “piatto N”.                                                                                    |
| piatti multipli                      | righe multiple                | Ogni piatto selezionato è una riga con quantità 1; i tempi si sommano nel totale.                                    |
| `used_g` totale                      | grammi                        | Già comprensivo di supporti, purge, flush e prime tower. Nessun supplemento.                                         |

**Attenzione:** `prediction` è una stima dello slicer e può non includere i minuti di avvio della stampante. Il motore aggiunge `startupMinutes` per riga; non si deve aggiungere una seconda volta. Documentare l'assunzione e verificarla con una stampa reale.

### 2.4.1 Esito T5.3.3 (26/10/2026)

Mapping puro in `src/domain/three-mf-mapping.ts`:

- **`proposeThreeMfMapping(summary, config)`** propone stampante e materiali senza creare entità. La stampante è cercata per nome/modello normalizzato (`exact`, `contains`, `ambiguous`, `missing`); i materiali per famiglia (`family`, `ambiguous`, `missing`). Solo stampanti e materiali attivi; le proposte ambigue espongono `candidateIds` per la select dell'anteprima.
- **`mapThreeMfToLines(summary, mapping, config, idFactory)`** converte i piatti selezionati in `PrintLine[]`. Richiede `printerId`, `plateIndexes` e una scelta di materiale per ogni filamento con grammi > 0.
- Ogni piatto selezionato produce una riga con `quantity: 1`, `finishingSecondsPerUnit: 0`, `extraIds: []`, `overrides: {}`; il nome usa `plater_name` o il fallback `file — piatto N`.
- I grammi sono in centigrammi e si sommano solo quando due filamenti sono mappati sullo stesso materiale. Nessun supplemento AMS/ACE, nessuna creazione automatica di materiali, nessun cambio di schema.
- I materiali e le stampanti archiviati vengono rifiutati; gli ID delle righe sono iniettati dall'esterno e devono essere univoci.
- **Test:** 15 in `src/domain/three-mf-mapping.test.ts` (unitari + property test su una riga per piatto, somma esatta e nessun supplemento); 75 unitari totali.
- **Conferma UI:** risolta in T5.3.4; il dialogo offre “Aggiungi alla bozza”, “Sostituisci le righe” e “Indietro”.

### 2.5 Modello dati

- **Nessun cambio di schema** nella prima iterazione: l'import produce solo `PrintLine` esistenti.
- Facoltativo, solo se serve tracciabilità: aggiungere `source` a `PrintLine` (`kind`, `fileName`, `plateIndex`, `slicer`, `importedAt`) con migrazione retrocompatibile. Valutarlo dopo il primo prototype; non è necessario per il costo.
- Il file originale non viene salvato: pesa troppo e contiene dati che non servono al preventivo.
- Il nome del preventivo resta “Nuovo preventivo” salvo diverso input; il nome del file può essere proposto come nome riga.

### 2.6 UX

- Pulsante **“Importa .3mf”** nella testata del calcolatore e nella sezione Stampe; l’aggiunta di una riga è una barra `+` a tutta larghezza sotto l’ultima card.
- Drag & drop sulla card “Stampe”, con stato “Rilascia il file qui”.
- Modale di anteprima con:
  - nome file e slicer riconosciuto;
  - tabella piatti con checkbox, tempo, grammi, materiali, stampante;
  - select per stampante e per materiale non mappato;
  - avvisi (file non slicato, peso incoerente, stampante non configurata);
  - azioni “Annulla” e “Importa N righe”.
- Dopo l'import: focus sulla prima riga importata, messaggio “N righe importate da <file>”, nessun alert finto di salvataggio.
- Errori con prossima azione:
  - “Questo file non è un .3mf valido.” → “Scegli un file esportato dallo slicer.”
  - “Il file non contiene un preventivo slicato.” → “Apri il progetto nello slicer, slica e esporta come .gcode.3mf.”
  - “Nessun materiale corrisponde a PLA-CF.” → “Mappa il materiale o aggiungilo in Materiali.”
  - “Il file supera 250 MB.” → “Esporta un solo piatto o riduci il progetto.”

### 2.6.1 Esito T5.3.4 (26/10/2026)

- **Componenti:** `useThreeMfImport` gestisce file input, drag & drop, parsing in worker, stati di caricamento/errore/successo e dialogo; `ThreeMfImportDialog` gestisce anteprima, selezione piatti, stampante, materiali e conferma.
- **Ingresso:** pulsante “Importa .3mf” nella testata e nella sezione Stampe; drag & drop sulla sezione con overlay “Rilascia il file qui”.
- **Anteprima:** file e slicer, stampante con proposta, piatti con checkbox (quelli incompleti sono disabilitati), tempo, grammi, filamenti, colore, select materiale per ogni filamento e avvisi globali/per piatto.
- **Conferma:** se `draftHasContent` è vero compare “Aggiungi alla bozza / Sostituisci le righe / Indietro”. L’import conserva nome, cliente, costi di lavoro e prezzo della bozza; aggiunge o sostituisce solo le righe.
- **Esito:** alert “Import completato” con conteggio e nome file; focus sul nome della prima riga importata. Errori in alert con l’azione suggerita dall’import.
- **Accessibilità:** dialogo unico, niente modali annidati; Esc e focus trap del `Modal`; campi etichettati; audit axe nel modale mobile scuro; nessun overflow a 375 px.
- **Nota tecnica:** `DOMParser` non è disponibile nei Web Worker. Il worker usa `@xmldom/xmldom` (runtime); il thread principale usa `DOMParser` nativo. Il worker resta un chunk separato (109 KB raw) e il budget totale è 249 KB gzip su 350 KB.
- **Test:** 8 E2E in `tests/e2e/import.spec.ts`; 26 E2E totali, 26 scansioni axe, 75 unitari. `npm run check` e `npm run test:e2e` verdi.

### 2.7 Sicurezza e performance

- Parsing **solo locale**, nessuna chiamata di rete.
- ZIP: limiti su entry, dimensione compressa e decompressa; rifiuto di path traversal e archive cifrati.
- XML: niente DTD/entità esterne; `DOMParser` non risolve entità esterne, ma il parser deve rifiutare `<!DOCTYPE`.
- File grandi: parsing in **Web Worker** per non bloccare la UI; limite 250 MiB compressi.
- Nessun `eval`, nessun `dangerouslySetInnerHTML`.
- Messaggi di errore senza dettagli interni del parser.

### 2.8 Test e fixture

- **Unit** sul parser normalizzato: file Orca, Bambu, Anycubic; multi-piatto; multi-materiale; `slice_info.config` assente; XML malformato; ZIP non valido; pesi incoerenti; file troppo grande.
- **Property** sul mapping: grammi e secondi non negativi; somma dei materiali = totale; nessun supplemento AMS; ogni piatto produce una riga.
- **E2E**: upload di un fixture, mapping, import, prezzo, salvataggio, reload; errore per file non slicato; focus e axe sul modale.
- **Fixture**: file reali ridotti, con permesso d'uso; niente dati personali. Salvarli in `tests/fixtures/3mf/` con README che indica slicer e versione. Il fixture Bambu reale è ancora da autorizzare.
- **Performance**: un file da 50 MB viene letto senza bloccare la UI; target < 3 s su MacBook recente.

**Stato T5.3.2:** 18 test in `src/data/three-mf/parse.test.ts`. Coperti Anycubic reale, Bambu sintetico, multi-piatto, XML/DOCTYPE, `project_settings`, pesi, materiali, fallback G-code e limiti ZIP. Orca reale, file da 50–250 MB e worker in browser restano da verificare in T5.3.5.

**Stato T5.3.3:** 15 test in `src/domain/three-mf-mapping.test.ts` (unitari + property), 75 unitari totali. Coperti mapping, aggregazione per materiale, zero grammi, errori di mapping, proposte exact/contains/family/ambiguous/missing e filtro archiviati.

**Stato T5.3.4:** 8 E2E in `tests/e2e/import.spec.ts`: file input, drag & drop, multi-piatto, mappatura ambigua, conferma append/replace, errore non slicato, salvataggio/reload e overflow a 375 px. Aggiunta una scansione axe nel modale mobile scuro: 26 E2E e 26 scansioni totali, 0 violazioni. Il test browser del worker è coperto dall'import E2E.

**Stato T5.3.5:** performance verificata con un file reale esportato dallo slicer (`1026-1206-prova volpe_plate(01)_PLA_0.12_6h32m3s.gcode.3mf`, 22 MB compressi, 75 MB di G-code decompresso): dialogo in 915 ms in produzione, 70,05 g, 6h 32m, PLA, Kobra 3. Archivio sintetico da 50 MB in 95–107 ms; progetto non slicato `rayquaza+230.3mf` (15 MB, 14 piatti) rifiutato in 100–102 ms. Aggiunti 3 screenshot di regressione del modale import (18 totali); il fixture Bambu reale resta da autorizzare o sostituire con un modello neutro.

### 2.9 Criteri di accettazione

- Dato un `.gcode.3mf` slicato da Anycubic Slicer Next o OrcaSlicer, l'utente vede tempo e grammi corretti, mappa stampante/materiale e ottiene righe compilate.
- Il preventivo salvato conserva i prezzi dello snapshot; `engineVersion` non cambia.
- Un file non slicato o malformato non manda in crash l'app e mostra un errore con azione.
- Nessuna richiesta di rete; nessun dato lascia il browser.
- Test unitari, E2E e axe verdi; documentazione aggiornata.

**Esito T5.3 (26/10/2026):** criteri soddisfatti. Performance: archivio sintetico 50 MB in ~100 ms, progetto non slicato 15 MB rifiutato in ~100 ms. Il fixture Bambu reale resta opzionale; il percorso è coperto da un test sintetico.

### 2.10 Domande aperte / spike iniziale

1. **File reale Anycubic Slicer Next:** **verificato** con Anycubic Slicer Next 2.0.0.3. Produce `slice_info.config` con `prediction`, `weight` e `<filament>`, stessa struttura di Orca/Bambu ma header `X-ACNext-Client-Version`. Dettagli in §2.2.1.
2. **`prediction` e avvio:** **aperto.** I valori sono in secondi, ma non è verificato se includano il riscaldamento iniziale; serve il confronto con una stampa reale.
3. **Multi-piatto:** **confermato** dal fixture a 2 piatti: ogni `<plate>` è una riga separata; l'avvio del motore resta per riga.
4. **Materiali multipli dello stesso tipo:** **risolto in T5.3.3.** Ogni filamento viene mappato a un materiale scelto; i grammi si sommano solo quando due filamenti finiscono sullo stesso materiale. La proposta automatica è per famiglia e, se ci sono più materiali della stessa famiglia, chiede conferma.
5. **Dipendenza ZIP:** **risolto in T5.3.2:** `fflate` 0.8.3 come dipendenza runtime; nota tecnica in `docs/engineering/architecture.md` §9.
6. **XML:** **risolto in T5.3.2/T5.3.4:** `DOMParser` nativo nel thread principale, `@xmldom/xmldom` nel Web Worker (dove `DOMParser` non esiste) e nei test Node; DOCTYPE/ENTITY rifiutati.
7. **Limite dimensione:** **aperto.** Limiti di sicurezza impostati a 250 MiB compressi e 1 GiB decompressi; vanno misurati con file reali da 50–250 MB in T5.3.5.
8. **Tracciabilità:** **rimandato.** `PrintLine.source` non serve al costo; valutare dopo il prototipo.
9. **Import UI — aggiungere o sostituire:** **risolto in T5.3.4.** Se la bozza ha contenuto, il dialogo offre “Aggiungi alla bozza”, “Sostituisci le righe” e “Indietro”; nome, cliente, costi di lavoro e prezzo restano invariati.
10. **Fixture Bambu committabile:** **aperto.** Il percorso Bambu è coperto da test sintetico; il fixture reale attende il permesso del modello o un modello neutro.

### 2.11 Stima

Spike fixture + parser: 0,5–1 giorno. Mapping e UI: 1–2 giorni. Test e documentazione: 0,5–1 giorno. Totale indicativo: **2–4 giorni assistiti**.

---

## 3. T5.6 — Interfaccia inglese

### 3.1 Obiettivo

Permettere di usare tutta l'interfaccia in inglese, mantenendo l'italiano come lingua predefinita e senza duplicare l'app.

### 3.2 Architettura

- `src/i18n/it.ts` — dizionario sorgente, con chiavi namespaced (`nav.calculator`, `calculator.title`, `quote.saved`, `errors.import.invalid`).
- `src/i18n/en.ts` — stessa interfaccia TypeScript; una chiave mancante fallisce il typecheck o un test di parità.
- `src/i18n/index.ts` — `SUPPORTED_LOCALES`, `DEFAULT_LOCALE`, `INTL_LOCALES`, `translate`, `t`, `plural` con `Intl.PluralRules`, `isLocale`.
- `src/state/locale-store.ts` — preferenza `it`/`en` (T5.6.4).
- `src/data/locale.ts` — persistenza in `layercost:locale`, separata da `AppData` (T5.6.4).
- `src/app/I18nProvider.tsx` — provider e aggiornamento di `<html lang>` e `dir`.
- `src/app/i18n-context.ts` — contesto e `useI18n()`.
- `src/lib/format.ts` — `formatCurrency`, `formatDateOnly`, `formatDuration`, `formatGrams`, `formatPercent` ricevono la locale; default `it-IT` (T5.6.3).
- `src/lib/labels.ts` — etichette di dominio tradotte, non costanti globali (T5.6.2/T5.6.3).

### 3.3 Lingua e formattazione

- Italiano: `it-IT`, EUR, virgola decimale, `gg/mm/aaaa`.
- Inglese: **`en-GB`**, EUR, metrico, `gg/mm/aaaa`. Motivo: contesto europeo e coerenza con le unità; `en-US` solo su richiesta esplicita.
- Plurali con `Intl.PluralRules`; niente concatenazioni a mano.
- Input numerici: accettare sia virgola sia punto; mostrare il separatore della locale.
- Date e ore con `Intl.DateTimeFormat`; nessun formato hardcoded.

### 3.4 Dati e schema

- `Quote.locale?: 'it' | 'en'` — lingua del preventivo, impostata alla creazione.
- Migrazione `schemaVersion` 1 → 2: i preventivi esistenti ricevono `locale: 'it'`; nessun altro campo cambia.
- Stampa, PDF e link condivisi usano `quote.locale`; l'interfaccia usa la preferenza del dispositivo.
- La lingua non entra nello snapshot economico: è un metadato del documento, non un parametro di costo.
- `layercost:locale` non entra in `AppData`, backup o migrazioni; come il tema.

### 3.5 Scope delle stringhe

Tradurre tutto ciò che l'utente vede:

- navigazione, titoli, descrizioni, pulsanti, label, hint, placeholder;
- errori di validazione, stati vuoti, conferme, alert;
- `aria-label`, `title`, testi di aiuto;
- guida iniziale;
- stampa/PDF: intestazione, tabelle, totali, note, footer;
- messaggi di condivisione e import;
- metadati della pagina (`title`, `description`, `lang`).

Non tradurre: codice, tipi, commenti tecnici, documentazione per sviluppatori, nomi di file.

### 3.6 UX

- Sezione **Impostazioni → Lingua**: Italiano / English, con descrizione.
- La lingua cambia subito, senza reload; la preferenza persiste.
- Prima visita: default `it`. Valutare auto-detect `navigator.language` solo se il committente lo chiede; per ora niente sorprese.
- Un preventivo salvato in italiano stampato da un utente inglese resta in italiano; l'interfaccia del dettaglio è in inglese.
- Nei link condivisi, il preventivo mantiene la sua lingua; l'interfaccia del destinatario usa la propria preferenza.

### 3.7 Test

- Parità delle chiavi `it`/`en` (nessuna mancante, nessuna in più).
- Nessuna stringa hardcoded nelle schermate principali: test di scansione o review mirata.
- E2E: cambio lingua, persistenza al reload, `<html lang>`, titolo pagina, stampa in entrambe le lingue.
- Axe in inglese sulle schermate principali; screenshot di regressione inglesi a 1440/768/390.
- Test di migrazione v1 → v2: preventivi esistenti restano validi e ricevono `locale: 'it'`.
- Test `Intl`: EUR, date, plurali, input con virgola/punto.

### 3.8 Criteri di accettazione

- Tutte le schermate sono utilizzabili in inglese senza stringhe italiane residue.
- L'italiano resta identico alla v1.0.0 per chi non cambia lingua.
- La preferenza persiste; `<html lang>` è corretto.
- Stampa e link condivisi rispettano la lingua del preventivo.
- Migrazione senza perdita di dati; axe e visual verdi in entrambe le lingue.

### 3.9 Domande aperte

1. `en-GB` o `en-US`? Proposta: `en-GB`.
2. Auto-detect della lingua al primo accesso? Proposta: no, default italiano.
3. Tradurre anche il README o solo la UI? Proposta: UI ora; README con sezione inglese in un secondo momento.
4. La lingua del preventivo è modificabile dopo la creazione? Proposta: no, si crea una copia.
5. Quante stringhe sono? **Inventario in `docs/planning/i18n-inventory.md`**, con aree, file e note di estrazione.

### 3.10 Stima

Estrazione stringhe e infrastruttura: 1–2 giorni. Traduzione e revisione: 1 giorno. Migrazione e test: 1 giorno. Totale indicativo: **3–4 giorni assistiti**.

### 3.11 Esito T5.6.1 (26/10/2026)

- Creati `src/i18n/it.ts`, `src/i18n/en.ts` e `src/i18n/index.ts`; le chiavi sono tipizzate e la parità è garantita dal typecheck e da `src/i18n/i18n.test.ts`.
- `translate`, `t`, `plural` con `Intl.PluralRules`, `INTL_LOCALES`, `isLocale`.
- `src/app/I18nProvider.tsx` + `src/app/i18n-context.ts` con `useI18n`, `<html lang>` e `dir`; il provider è montato in `App.tsx`.
- La shell (`Layout`) usa già `useI18n` per navigazione, skip link, footer, versione motore e titolo dell’alert; il testo italiano è invariato.
- Inventario completo in `docs/planning/i18n-inventory.md`: aree, file, regole e ordine di estrazione.
- 5 nuovi test: parità chiavi, valori non vuoti, locale supportata, interpolazione, plurali. Totale 80 unitari.
- **Prossimo:** T5.6.2 — estrazione delle stringhe dalle schermate, errori, `aria-label`, stampa e guida.

### 3.12 Esito T5.6.2 (26/10/2026)

- Dizionari divisi per area in `src/i18n/it/{calculator,quotes,catalogs,settings,misc}.ts` e `src/i18n/en/...`; **743 chiavi** con parità verificata, niente chiavi duplicate tra aree e placeholder coerenti.
- Estratte tutte le schermate (calcolatore, import `.3mf`, preventivi, stampa, condivisione, stampanti, materiali, tariffe, extra, impostazioni, confronto, guida) e i componenti condivisi (`ui`, `number-fields`, `cost-stack`, `logo`, 404).
- `lib/labels.ts` e `lib/cost-bands.ts` espongono etichette locale-aware; la shell usa già `useI18n`.
- Errori di import mappati per codice (`ThreeMfImportError`), warning del parser per codice, errori di mapping, condivisione e salvataggio bozza tradotti. Restano fallback tecnici rari per storage/schema e alcuni errori di dominio.
- **Test:** 8 test i18n (parità, aree, plurali, placeholder, interpolazione, locale) e 83 unitari totali; 26 E2E, 26 scansioni axe, 18 screenshot.
- **Budget:** JS 206 KB gzip su 220 KB (limite alzato da 200 per i due dizionari), totale 270 KB su 350 KB. Il warning raw di Vite è a 650 KB con commento.
- **Prossimo:** T5.6.3 — formattazione `Intl`, `Quote.locale`, migrazione schema v2.

### 3.13 Esito T5.6.3 (26/10/2026)

- `src/lib/format.ts` e `src/app/use-format.ts`: formattatori `Intl` legati a una locale, con `createFormatters`/`useFormat`. Italiano `it-IT`, inglese `en-GB`; date senza slittamenti di fuso.
- `parseLocaleNumber` accetta virgola e punto, con separatori ripetuti trattati come raggruppamento; l’input mostra il separatore della locale attiva.
- `Quote.locale: 'it' | 'en'` e schema **v2**. La migrazione v1 → v2 aggiunge `locale: 'it'` a preventivi, bozza ed envelope; prima della migrazione lo storage salva il raw in `layercost:backup:schema-1`. Formule, snapshot ed `engineVersion` non cambiano.
- Nomi predefiniti di bozza e riga, suffissi di copia/aggiornamento/import localizzati in `src/lib/quote-defaults.ts`.
- `QuoteOverview`, `QuotePrint`, `CostDetails` e `CostStack` usano `quote.locale`; il resto dell’interfaccia usa la preferenza del dispositivo.
- **Test:** 90 unitari (7 nuovi: formattazione inglese, parsing numerico, migrazione, envelope, backup, nomi inglesi); 26 E2E; build 270,2 KB gzip su 350 KB; export E2E atteso a schema 2.
- **Prossimo:** T5.6.4 — `layercost:locale`, selettore in Impostazioni, `<html lang>` persistente e metadati pagina.

### 3.14 Esito T5.6.4 (26/10/2026)

- `src/data/locale.ts` e `src/state/locale-store.ts`: preferenza `layercost:locale` separata da `AppData`, default `it`, fallback su valori corrotti.
- `I18nProvider` usa lo store e aggiorna `<html lang>`, `dir`, `document.title` e meta description.
- Impostazioni → Lingua con Italiano / English, cambio immediato e persistente. La bozza vuota adotta la lingua; bozze con contenuto e preventivi salvati restano nella loro lingua.
- **Test:** 4 nuovi test di persistenza e 94 unitari totali; nuovo E2E su cambio lingua, reload, titolo, salvataggio e stampa inglese con UI italiana. 27 E2E totali.
- **Prossimo:** T5.6.5 — axe e screenshot in inglese, scansione stringhe residue, documentazione e deploy.

### 3.15 Esito T5.6.5 (26/10/2026)

- Axe in inglese su 11 route e 3 modali (bozza, reset, import) con 0 violazioni; **40 scansioni** totali.
- **36 screenshot** di regressione: 18 italiani e 18 inglesi a 1440/768/390 px, baseline Linux; **31 E2E** e **97 test unitari**.
- Errori di dominio mappati per codice in calcolatore e confronto; `StorageError` per backup/schema/salvataggio e warning di storage tradotti nella shell.
- I link condivisi creati prima dello schema v2 ricevono `locale: 'it'` in lettura e restano utilizzabili.
- Scansione statica dei componenti: nessuna stringa italiana hardcoded oltre al nome del prodotto. Restano fallback tecnici interni non mostrati direttamente.
- Deploy di produzione verificato il 26/10/2026: build `index-CiitaCgo.js`, italiano predefinito, inglese persistente, `<html lang>` corretto, preventivo salvato con schema 2 e `locale: en`, stampa inglese con UI italiana.
- **T5.6 chiuso.** Prossimo: T5.4 sync (richiesto). Il resto del backlog è chiuso/non in scope.

### 3.16 Esito T5.13–T5.14 (26/10/2026)

- **Ciclo di vita (ADR-0020):** `Quote.status` è `draft | saved | sent | completed`. `saved` è modificabile in place con lo stesso `id`; la modifica usa la configurazione dello snapshot e conserva `capturedAt`, quindi i prezzi restano congelati. `sent` e `completed` sono bloccati e si correggono duplicando. Transizioni solo in avanti; `archived` resta separato.
- **Schema v3:** la catena v1 → v2 → v3 non cambia i dati esistenti; backup raw prima della migrazione. I link condivisi conservano lo stato, l’import crea una copia `saved`.
- **UI:** “Modifica preventivo” nel dettaglio, banner e “Annulla modifiche” nel calcolatore, conferme per invio/completamento, badge in lista/dettaglio/stampa.
- **Calcolatore:** card separate per intestazione, stampe, costi di lavoro e prezzo; ogni stampa è un pannello con etichetta “Stampa N”, bordo e fondo dedicati. La nuova riga si aggiunge con una barra trasparente a tutta larghezza sotto l’ultima card, con `+` centrale e stato accent.
- **Test:** 101 unitari e 32 E2E; build 274,1 KB gzip su 350 KB. Baseline visive italiane e inglesi rigenerate per il nuovo layout.

---

## 4. T5.4 — Sincronizzazione cloud (richiesta)

**Piano dettagliato:** `docs/planning/t5.4-cloud-sync.md` (28/10/2026). **ADR:** ADR-0024, che supersede in parte ADR-0018 (auth e tenancy).

### 4.1 Obiettivo

Sincronizzare configurazione e preventivi tra i due dispositivi, senza rendere il cloud obbligatorio e senza costi ricorrenti.

### 4.2 Vincoli

- **€0**: solo piani free, nessuna carta, nessun upgrade automatico.
- **Local-first**: l'app funziona identica senza account.
- **Sicurezza**: nessuna service role key nel client; RLS o equivalente; TLS.
- **Nessuna perdita silenziosa**: backup prima del primo sync, conflitti visibili, export sempre disponibile.
- **Nessun lock-in**: i dati restano esportabili in JSON; il provider è sostituibile.
- **Richiesta**: il committente ha chiesto il sync il 26/10/2026; implementarlo dopo T5.3, T5.6 e T5.12.

### 4.3 Opzioni gratuite (verificate il 26/10/2026)

| Provider                    | Limiti free principali                                                                                                                                            | Pro                                                   | Contro                                              |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | --------------------------------------------------- |
| **Supabase Free**           | 500 MB DB, 50.000 MAU, 5 GB egress, 1 GB storage; **pausa dopo 1 settimana di inattività**; 2 progetti attivi                                                     | Auth, RLS, Postgres, realtime; implementazione rapida | Pausa; vendor lock-in; limiti possono cambiare      |
| **Cloudflare Workers + D1** | 100.000 richieste/giorno; 10 ms CPU per invocazione; D1 5 GB, 5M righe lette/giorno, 100k righe scritte/giorno; KV 1 GB, 100k letture/giorno, 1k scritture/giorno | Nessuna pausa; limiti generosi; edge; egress assente  | Auth e sync da scrivere; più codice; KV write limit |
| **Firebase Spark**          | Firestore 1 GiB, 50k letture/giorno, 20k scritture/giorno, 20k delete/giorno; Auth 50k MAU                                                                        | Auth e realtime pronti; documentazione ampia          | Vendor lock-in; NoSQL; quote/merge da progettare    |
| **PocketBase self-host**    | Software gratuito, ma serve un host                                                                                                                               | Controllo totale; semplice                            | Non è €0 senza un server già disponibile            |
| **GitHub repo privato**     | API e rate limit; nessuna concorrenza                                                                                                                             | Già disponibile                                       | Non è un database; sconsigliato                     |

**Decisione del 26/10/2026, aggiornata il 28/10/2026 (ADR-0024):** **Supabase Free**, con **email + password**, due utenti pre-creati, signup pubblico disabilitato e **workspace condiviso** con RLS per membership. Il magic link è stato scartato per il limite di 2 email/ora del servizio integrato e per il callback con `HashRouter`; il reset password è amministrativo nella prima iterazione. Mitigare la pausa con un keep-alive GitHub Actions **giornaliero** (costo €0, pochi secondi) e l'assenza di backup automatici con un `pg_dump` settimanale. Se la pausa o i limiti non sono accettabili, passare a **Cloudflare Workers + D1**. Firebase resta la terza opzione.

### 4.4 Architettura

- **Refactor async**: `DataRepository` e lo store oggi sono sincroni; il cloud richiede `load`, `save`, `import`, `export` asincroni e idratazione ottimistica. Farlo con test di contratto, prima del provider.
- **Scope sync**: `config` + `quotes`; **non** draft, tema, lingua, onboarding.
- **Entità**: ogni stampante/materiale/tariffa/extra ha un `id` stabile e un `updatedAt` di sync separato dal dominio; i preventivi sono modificabili finché `saved` e diventano immutabili dopo invio/completamento. I `saved` si sincronizzano con update ottimistico; i bloccati si duplicano.
- **Tombstone**: archiviazione/eliminazione come evento, non cancellazione fisica immediata.
- **Conflitti**:
  - preventivi `saved`: update ottimistico con `updated_at`; se il record è cambiato, modale “Ricarica remoto / Duplica le mie modifiche”;
  - preventivi `sent`/`completed`: immutabili, si duplicano;
  - configurazione: timestamp per entità; se locale e remoto divergono, modale “Mantieni locale / Usa remoto”;
  - impostazioni: last-write-wins con avviso.
- **Auth**: email + password, due account pre-creati, signup pubblico disabilitato; reset password amministrativo, nessun SMTP nella prima iterazione. Un **workspace** condiviso con `workspace_members`; RLS per membership, non per household.
- **Sicurezza**: chiave pubblicabile/anon + RLS; nessuna service role key; TLS; cifratura end-to-end non richiesta nella prima iterazione.
- **Backup**: export automatico prima del primo sync, export manuale sempre disponibile e `pg_dump` settimanale lato database.
- **Free-tier guardrail**: pausa o limite raggiunto → sync disattivato, app local-only, messaggio chiaro. Nessun addebito.

### 4.5 UX

- Impostazioni → **Sincronizzazione**: stato (non connesso / connessione / sincronizzato / offline / in sospeso / errore / conflitto), email dell'account, ultimo sync, “Accedi”, “Sincronizza ora”, “Esci”, “Scarica backup”.
- Workspace e membership sono creati dall'amministratore nella prima iterazione: niente UI di inviti self-service.
- Indicatore discreto nell'header: ultimo sync, offline, conflitto.
- Conflitto: modale con data/ora e riepilogo delle differenze; mai overwrite silenzioso.
- Disattivazione: i dati restano locali; il cloud non viene cancellato automaticamente.

### 4.6 Test

- Contratto repository: local e cloud rispettano la stessa interfaccia.
- Conflitti: quote duplicato, config modificata su due dispositivi, tombstone.
- Offline: coda, retry, nessuna perdita.
- Errore di rete o quota: sync disattivato, local-only.
- RLS: un utente non vede i dati di un workspace a cui non appartiene; un membro dello stesso workspace li vede.
- E2E con due contesti browser e Supabase locale (CLI + Docker), inclusi utente senza membership e workspace separato.
- Migrazione schema e backup prima del primo sync.

### 4.7 Criteri di accettazione

- Due dispositivi vedono gli stessi preventivi e la stessa configurazione.
- Senza rete l'app funziona in locale e sincronizza al ritorno.
- Un conflitto è visibile e risolvibile; nessun dato sparisce.
- Il piano resta €0; se il progetto è in pausa o un limite viene raggiunto, l'app avvisa e resta locale.
- Export JSON sempre disponibile; nessuna service role key nel bundle.

### 4.8 Domande aperte

1. Provider: **Supabase Free scelto il 26/10/2026**, confermato il 28/10/2026. Resta lo spike sui limiti reali e sulla pausa.
2. Cifratura end-to-end: **non richiesta** nella prima iterazione; RLS + TLS sono il perimetro. Rivalutare solo se cambia la sensibilità dei dati.
3. Configurazione: **per entità**, con timestamp e conflitto visibile.
4. Secondo utente: **creato dall'amministratore** nel dashboard Supabase e aggiunto al workspace via SQL. Niente magic link o inviti email nella prima iterazione.
5. Progetto in pausa: keep-alive giornaliero; se la pausa avviene, l'app resta local-only e il progetto si ripristina dal dashboard (finestra documentata di 1 anno).
6. Tombstone: conservati per la cache e la sincronizzazione; nessuna UI di ripristino nella prima iterazione.
7. Tema e lingua restano locali: confermato.
8. Backup: `pg_dump` settimanale via session pooler; verifica di restore in T5.4.6.

### 4.9 Stima

Refactor async del repository: 1–2 giorni. Schema/RLS/trigger e auth: 2–3 giorni. Repository cloud, outbox e conflitti: 3–4 giorni. Operazioni, test e deploy: 1,5–2,5 giorni. Totale indicativo: **8–12 giorni assistiti**, da rivalutare dopo lo spike su RLS e backup.

---

## 5. Rifiniture ed export richiesti dal committente (T5.12, T5.15–T5.17, T5.20)

### 5.1 T5.15 — Preferenze rapide nella sidebar

- **Obiettivo:** cambiare tema e lingua senza aprire Impostazioni.
- **Posizione:** fondo della sidebar desktop; un blocco equivalente nel menu mobile.
- **Tema:** radio native Sistema / Chiaro / Scuro, sincronizzate con `layercost:theme` e con Impostazioni → Aspetto.
- **Lingua:** radio native IT / EN, sincronizzate con `layercost:locale`; il nome accessibile è esteso (“Italiano” / “English”).
- **Comportamento:** la lingua adotta la bozza vuota con la stessa regola di T5.6.4; i preventivi salvati restano nella loro lingua.
- **Vincoli:** controlli compatti ma con target 44 px su mobile, focus visibile, nessun cambio a dati, formule o schema.

### 5.2 T5.16 — Azioni del preventivo in alto

- **Obiettivo:** rendere immediate le azioni di un preventivo salvato.
- **Posizione:** la card “Gestione del preventivo” va sotto testata e avvisi, prima del prezzo e delle righe.
- **Azioni:** Modifica, invio, completamento, duplica, archivia, elimina; il blocco dopo invio/completamento resta visibile.
- **Gerarchia:** “Stampa / PDF” passa a secondaria nella testata per lasciare una sola azione primaria.
- **Verifica:** E2E sull’ordine verticale e sul ciclo di vita esistente.

### 5.3 T5.17 — Colore del filamento per riga

- **Obiettivo:** associare un colore alla singola stampa, utile soprattutto per i lavori a un colore.
- **Dato:** `PrintLine.color?: string` in formato `#rrggbb`. È un metadato di presentazione, opzionale e retrocompatibile: lo schema resta **v3**.
- **UI:** quadratino stondato nella card della stampa, color picker nativo, stato vuoto tratteggiato e “Rimuovi colore”.
- **Lettura:** swatch accanto al nome in calcolatore, dettaglio preventivo, dettaglio costi e stampa/PDF; in stampa `print-color-adjust: exact`.
- **Accessibilità:** il colore non è l’unica informazione; il nome della stampa resta leggibile. Il campo ha un’etichetta accessibile e un’azione di rimozione.
- **Fuori scope:** nessun calcolo del colore, nessun supplemento AMS/ACE, nessuna dipendenza da materiali o slicer.

### 5.4 T5.12 — Export `.xlsx`

- **Obiettivo:** esportare preventivi, righe e materiali per analisi esterne senza passare da CSV o da un servizio online.
- **Decisione del 26/10/2026:** il committente ha chiesto **`.xlsx`**, non CSV.
- **Implementazione:** writer XLSX minimale in `src/lib/xlsx.ts` (OPC/ZIP + XML) con `fflate`, già usato dal parser `.3mf`; nessuna nuova dipendenza. Mapping in `src/features/quotes/export-xlsx.ts`, pulsante in Preventivi e Impostazioni → Dati.
- **Contenuto:** fogli **Preventivi**, **Righe**, **Materiali**; archiviati inclusi; colonne economiche vuote per i preventivi non ricalcolabili; intestazioni in italiano e inglese.
- **Formati:** importi, grammi, ore, percentuali, kWh, watt e date sono celle numeriche con formati Excel; niente stringhe formattate.
- **Sicurezza:** tutto locale, nessun upload e nessuna richiesta di rete. Il backup JSON resta l’unica copia esterna completa.
- **Esito:** chiuso il 26/10/2026. 5 test sul writer, 3 sul mapping, 2 E2E; workbook verificato con `openpyxl` e LibreOffice; `npm run check` verde con budget 220,2 KB JS / 225 KB e 284,8 KB totali / 350 KB (dopo la barra “Aggiungi riga”).

### 5.5 T5.20 — Sconti di riga e di preventivo (ADR-0023)

- **Obiettivo:** permettere uno sconto percentuale o a importo fisso sia sulla singola stampa sia sul totale del preventivo.
- **Modello:** `DiscountRule = { mode: 'percent', valueBp } | { mode: 'amount', amount }`; `PrintLine.discount?` e `QuotePricing.discount?`.
- **Regole:** l'importo fisso di riga si applica al totale della riga; gli sconti si cumulano (prima righe, poi preventivo); un importo superiore al prezzo viene limitato a zero con avviso.
- **Motore:** `QuoteResult` espone `lineDiscountTotal`, `quoteDiscount` e `discount` totale; `LineResult.discount` è lo sconto di riga. `engineVersion` passa a **1.0.0**.
- **Schema:** v4 con migrazione `discountBp` → regola percentuale, backup raw `layercost:backup:schema-3` e compatibilità dei link condivisi pre-v4.
- **UI:** controllo “Nessuno / Percentuale / Importo fisso” in ogni card stampa e nella card Prezzo; sconti visibili in riepilogo, dettaglio, stampa/PDF, link condiviso ed export `.xlsx`.
- **Esito:** chiuso il 28/10/2026. 124 test unitari, 38 E2E (2 nuovi sugli sconti), axe 40 scansioni con 0 violazioni; baseline visive rigenerate in CI per le nuove card.

### 5.6 T5.21 — Card comprimibili nel calcolatore

- **Obiettivo:** ridurre l'altezza delle card configurabili per leggere prima il riepilogo e il dettaglio, senza perdere l'accesso ai campi.
- **UI:** Preventivo, Stampe, Costi di lavoro e Prezzo hanno un header con freccia, `aria-expanded` e `aria-controls`; da compressi mostrano una sintesi (data/cliente, righe/grammi/costo diretto, manodopera/extra, ricarico/IVA). Anche ogni riga di stampa si comprime in una riga con nome, colore, stampante, grammi, tempo, pezzi e costo diretto.
- **Azioni:** Importa `.3mf`, Ripristina default, Duplica e Rimuovi restano cliccabili a card compressa.
- **Stato:** locale alla schermata, default espanso, nessuna persistenza. Nessun cambio a formule, schema, snapshot o `engineVersion`.
- **Esito:** chiuso il 28/10/2026. 4 chiavi i18n (899 totali), 1 E2E dedicato; `npm run check` verde e budget 224,6 KB JS / 225 KB. Baseline visive del calcolatore rigenerate in CI.

### 5.7 T5.22 — Rinomina del preventivo dal titolo

- **Obiettivo:** rendere modificabile il nome del preventivo dove l'utente lo legge, cioè nel titolo della pagina, invece che nella card Preventivo.
- **UI:** il titolo del calcolatore ha una sottolineatura di 1 px in `--color-data` ed è coperto da un pulsante trasparente, con cursore da testo. Al click diventa un input 24/600 con sola sottolineatura di 2 px, senza focus ring né selezione automatica; Invio o blur confermano, Esc ripristina il nome precedente e il focus torna al titolo. Un nome vuoto non viene confermato. Il campo nella card Preventivo è stato rimosso: restano data e cliente.
- **Primitiva:** `PageHeader` accetta `title: ReactNode`, `titleEdit` (label, click e ref del pulsante trasparente) e `titleClassName`; l'heading resta testo pulito.
- **Dati:** nessun cambio a formule, schema, snapshot o `engineVersion`; la bozza continua a salvarsi a ogni modifica.
- **Esito:** chiuso il 30/10/2026. 2 chiavi i18n (1235 totali), 1 E2E dedicato; `npm run check` verde e budget 220,9 KB JS / 230 KB. Baseline visive del calcolatore e del modale import rigenerate su Linux; PR #39 (squash `36303b4`) distribuita in produzione con build `index-B43SUpOJ.js` / `index-CfPGRLn4.css`, smoke e verifica reale verdi.

---

## 6. Lavoro trasversale

- **ADR:** 0017 (3MF), 0018 (sync), 0019 (inglese), 0023 (sconti) e 0024 (sync Supabase: auth, tenancy, operazioni free) sono la direzione. Ogni cambio di schema o formula richiede un ADR successivo.
- **Schema:** v4 con `Quote.locale` (inglese), `Quote.status` (ciclo di vita, ADR-0020), `PrintLine.color` opzionale (T5.17; nessuna migrazione) e sconti di riga/preventivo (T5.20, migrazione v3 → v4).
- **Test:** ogni iniziativa porta unit, property (dove ha senso), E2E, axe e visual. `npm run check` resta il gate. Gli sconti aggiungono 5 test del motore (di cui 1 property), 1 test di migrazione, 2 test sui link e 2 E2E; l’export `.xlsx` aggiunge test sul writer e sul mapping.
- **Documentazione:** `cost-model.md` aggiornato per gli sconti (T5.20); `data-model.md` per `Quote.locale`, `Quote.status`, `PrintLine.color` e `DiscountRule`; `testing.md`, `deployment.md`, `STATUS.md`, `TASKS.md`.
- **Deploy:** Vercel free; per il sync due env pubbliche (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`), un progetto cloud EU e Supabase locale per i test. Se le env mancano, l'app resta local-only.
- **Sicurezza:** nessun upload di `.3mf`; nessun analytics; nessuna chiamata esterna oltre al provider scelto per il sync.

---

## 7. Handoff per la prossima sessione

Prompt sintetico da riusare:

> Leggi `AGENTS.md`, `STATUS.md` §8, `TASKS.md` (fase 5 e sezione Evolutive), `docs/planning/evolutive.md`, `docs/planning/t5.4-cloud-sync.md` (incluso §0), `docs/planning/phase-5.md` §4, `docs/engineering/architecture.md` §4, `docs/engineering/deployment.md` §1.1 e §13, `docs/engineering/workspace-runbook.md`, `docs/engineering/backup-restore.md`, `docs/engineering/testing.md`, `docs/domain/data-model.md` §7 e ADR-0024. T5.3, T5.6, T5.12, T5.13–T5.22 e T5.4.0–T5.4.6 sono chiusi; il cloud è live su https://layercost.vercel.app con Supabase `layercost-prod` (`jcxkfhjgstdgrjazlnpq`, `eu-central-1`), due account owner e workspace `ws-doublelayer`. `main` = `origin/main` = `4017c36` (T5.4 + docs); CI `main`, smoke test, keep-alive e backup verdi. Per le evolutive future (Google login, tetti utenti/preventivi) il punto di partenza è `docs/planning/evolutive.md`. `.env.local` contiene le credenziali di produzione ed è gitignored; su Vercel ci sono solo le due env pubbliche. Non cambiare formule, `engineVersion` o snapshot economici senza un nuovo ADR. Un task = un commit; `npm run check`, `npm run db:test`, `npm run test:e2e`, `npm run test:e2e:auth`, `npm run test:e2e:sync`, `npm run smoke:production` e il job CI `database` verdi.

---

## 8. Fonti

- 3MF Consortium, **3MF Core Specification 1.4.0**: https://github.com/3MFConsortium/spec_core — formato ZIP/OPC, metadati, estensioni.
- Printago, **3MF File Format: How Bambu Studio and Orca Slicer Structure Your Prints** (13 aprile 2026): https://printago.io/blog/3mf-file-format — struttura `slice_info.config`, `prediction`, `used_g`, caveat. Fonte terza, utile ma da verificare con file reali.
- OrcaSlicer, `src/libslic3r/Format/3mf.cpp`: https://github.com/SoftFever/OrcaSlicer — nomi dei file e gestione del progetto.
- PrusaSlicer, `src/libslic3r/Format/3mf.cpp`: https://github.com/prusa3d/PrusaSlicer — `Metadata/Slic3r_PE.config`; i progetti non contengono tempo/grammi affidabili.
- Supabase, **Pricing** (consultato il 28/10/2026): https://supabase.com/pricing — limiti Free e pausa dopo una settimana.
- Supabase, **Project Pausing** (consultato il 28/10/2026): https://supabase.com/docs/guides/platform/free-project-pausing — attività richiesta, ripristino fino a 1 anno.
- Supabase, **Auth Email** (consultato il 28/10/2026): https://supabase.com/docs/guides/auth/auth-email — servizio email integrato limitato a 2 email/ora.
- Cloudflare, **Workers Pricing** (2 ottobre 2026): https://developers.cloudflare.com/workers/platform/pricing/ — Workers, D1, KV, R2.
- Firebase, **Pricing** (consultato il 26/10/2026): https://firebase.google.com/pricing — Firestore e Auth Spark.
- MDN, **Intl**: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl — formattazione locale.
