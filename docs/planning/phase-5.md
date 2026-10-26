# Fase 5 — Piano operativo

**Stato:** T5.3 completato (fixture, parser, mapping, UI, performance); prossimo T5.6
**Data:** 26 ottobre 2026
**Base:** v1.0.0, commit `cc949b3`
**Prossima sessione:** partire da **T5.6** (interfaccia inglese)
**Regole:** un ADR prima del codice, nessun cambio a formule/`engineVersion`/snapshot senza ADR e test, documentazione e test nello stesso commit.

---

## 1. Ordine e dipendenze

| Ordine | Iniziativa                        | Perché ora                                                                                           | Dipende da                     |
| ------ | --------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------ |
| 1      | **T5.3 — Import `.3mf`**          | Elimina il passaggio manuale più noioso e riduce gli errori di input.                                | ADR-0017, fixture reali        |
| 2      | **T5.6 — Interfaccia inglese**    | Rende il prodotto utilizzabile fuori dall'Italia; tocca molte stringhe, meglio farlo prima del sync. | ADR-0019, migrazione schema v2 |
| 3      | **T5.4 — Sincronizzazione cloud** | Rimandata dal committente; richiede refactor async e un provider free stabile.                       | ADR-0018, spike provider       |

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

1. **Selezione file** — input `accept=".3mf,application/zip"` e drag & drop; massimo 100 MB compressi.
2. **Validazione ZIP** — leggere l'indice senza estrarre tutto; rifiutare archive cifrati, troppi entry (limite 10.000) e dimensioni decompresse eccessive (limite 500 MB).
3. **Riconoscimento slicer** — cercare `Metadata/slice_info.config`; in alternativa leggere l'header del G-code. Leggere `Application` da `3D/3dmodel.model` per il messaggio di errore.
4. **Estrazione piatti** — per ogni `<plate>`: `index`, `prediction`, `weight`, `<filament>`. Se manca `slice_info.config`, provare il footer del G-code (`; estimated printing time`, `; filament used [g]`).
5. **Normalizzazione** — creare un `ThreeMfSummary` puro: nome file, slicer, piatti con secondi, grammi per tipo, stampante dichiarata, avvisi.
6. **Mappatura** — proporre stampante e materiali configurati; l'utente conferma o corregge in un modale.
7. **Anteprima** — tabella dei piatti selezionati con tempo, grammi, materiali e stampante; avvisi su campi mancanti o mismatch.
8. **Import** — creare `PrintLine[]` nel draft; se la bozza ha contenuto, usare la conferma già esistente (`draftHasContent` + `Modal`) per aggiungere o sostituire.
9. **Salvataggio** — il draft viene persistito come sempre; il preventivo entra nello storico solo con “Salva preventivo”.

### 2.3.1 Esito T5.3.2 (26/10/2026)

Parser implementato in `src/data/three-mf/`; il tipo normalizzato è in `src/domain/three-mf.ts`.

- **ZIP:** `fflate` 0.8.3 (runtime), indice centrale letto prima di estrarre; limiti 100 MB compressi, 500 MB decompressi, 10.000 entry, 100 piatti, 10 MB per metadato, 64 MB per fallback G-code. Rifiutati cifratura, path traversal, ZIP64, duplicati e compressioni non supportate.
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

- Pulsante **“Importa .3mf”** accanto a “Aggiungi riga” e nella testata del calcolatore.
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
  - “Il file supera 100 MB.” → “Esporta un solo piatto o riduci il progetto.”

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
- File grandi: parsing in **Web Worker** per non bloccare la UI; limite 100 MB compressi.
- Nessun `eval`, nessun `dangerouslySetInnerHTML`.
- Messaggi di errore senza dettagli interni del parser.

### 2.8 Test e fixture

- **Unit** sul parser normalizzato: file Orca, Bambu, Anycubic; multi-piatto; multi-materiale; `slice_info.config` assente; XML malformato; ZIP non valido; pesi incoerenti; file troppo grande.
- **Property** sul mapping: grammi e secondi non negativi; somma dei materiali = totale; nessun supplemento AMS; ogni piatto produce una riga.
- **E2E**: upload di un fixture, mapping, import, prezzo, salvataggio, reload; errore per file non slicato; focus e axe sul modale.
- **Fixture**: file reali ridotti, con permesso d'uso; niente dati personali. Salvarli in `tests/fixtures/3mf/` con README che indica slicer e versione. Il fixture Bambu reale è ancora da autorizzare.
- **Performance**: un file da 50 MB viene letto senza bloccare la UI; target < 3 s su MacBook recente.

**Stato T5.3.2:** 18 test in `src/data/three-mf/parse.test.ts`. Coperti Anycubic reale, Bambu sintetico, multi-piatto, XML/DOCTYPE, `project_settings`, pesi, materiali, fallback G-code e limiti ZIP. Orca reale, file da 50–100 MB e worker in browser restano da verificare in T5.3.5.

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
7. **Limite dimensione:** **aperto.** Limiti di sicurezza impostati; vanno misurati con file reali da 50–100 MB in T5.3.5.
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
- `src/i18n/index.ts` — `SUPPORTED_LOCALES`, `DEFAULT_LOCALE`, `t(key, params)`.
- `src/state/locale-store.ts` — preferenza `it`/`en`.
- `src/data/locale.ts` — persistenza in `layercost:locale`, separata da `AppData`.
- `src/app/I18nProvider.tsx` — contesto, `useI18n()`, aggiornamento di `<html lang>` e `dir`.
- `src/lib/format.ts` — `formatCurrency`, `formatDateOnly`, `formatDuration`, `formatGrams`, `formatPercent` ricevono la locale; default `it-IT`.
- `src/lib/labels.ts` — etichette di dominio tradotte, non costanti globali.

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
5. Quante stringhe sono? Serve un inventario prima di stimare.

### 3.10 Stima

Estrazione stringhe e infrastruttura: 1–2 giorni. Traduzione e revisione: 1 giorno. Migrazione e test: 1 giorno. Totale indicativo: **3–4 giorni assistiti**.

---

## 4. T5.4 — Sincronizzazione cloud (rimandata)

### 4.1 Obiettivo

Sincronizzare configurazione e preventivi tra i due dispositivi, senza rendere il cloud obbligatorio e senza costi ricorrenti.

### 4.2 Vincoli

- **€0**: solo piani free, nessuna carta, nessun upgrade automatico.
- **Local-first**: l'app funziona identica senza account.
- **Sicurezza**: nessuna service role key nel client; RLS o equivalente; TLS.
- **Nessuna perdita silenziosa**: backup prima del primo sync, conflitti visibili, export sempre disponibile.
- **Nessun lock-in**: i dati restano esportabili in JSON; il provider è sostituibile.
- **Rimandata**: non iniziare prima di 3MF e inglese.

### 4.3 Opzioni gratuite (verificate il 26/10/2026)

| Provider                    | Limiti free principali                                                                                                                                            | Pro                                                   | Contro                                              |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | --------------------------------------------------- |
| **Supabase Free**           | 500 MB DB, 50.000 MAU, 5 GB egress, 1 GB storage; **pausa dopo 1 settimana di inattività**; 2 progetti attivi                                                     | Auth, RLS, Postgres, realtime; implementazione rapida | Pausa; vendor lock-in; limiti possono cambiare      |
| **Cloudflare Workers + D1** | 100.000 richieste/giorno; 10 ms CPU per invocazione; D1 5 GB, 5M righe lette/giorno, 100k righe scritte/giorno; KV 1 GB, 100k letture/giorno, 1k scritture/giorno | Nessuna pausa; limiti generosi; edge; egress assente  | Auth e sync da scrivere; più codice; KV write limit |
| **Firebase Spark**          | Firestore 1 GiB, 50k letture/giorno, 20k scritture/giorno, 20k delete/giorno; Auth 50k MAU                                                                        | Auth e realtime pronti; documentazione ampia          | Vendor lock-in; NoSQL; quote/merge da progettare    |
| **PocketBase self-host**    | Software gratuito, ma serve un host                                                                                                                               | Controllo totale; semplice                            | Non è €0 senza un server già disponibile            |
| **GitHub repo privato**     | API e rate limit; nessuna concorrenza                                                                                                                             | Già disponibile                                       | Non è un database; sconsigliato                     |

**Raccomandazione per lo spike:** provare **Supabase Free** per primo, perché auth e RLS riducono il codice. Mitigare la pausa con un keep-alive GitHub Actions ogni 2–3 giorni (costo €0, pochi secondi). Se la pausa o i limiti non sono accettabili, passare a **Cloudflare Workers + D1**. Firebase resta la terza opzione.

### 4.4 Architettura

- **Refactor async**: `DataRepository` e lo store oggi sono sincroni; il cloud richiede `load`, `save`, `import`, `export` asincroni e idratazione ottimistica. Farlo con test di contratto, prima del provider.
- **Scope sync**: `config` + `quotes`; **non** draft, tema, lingua, onboarding.
- **Entità**: ogni stampante/materiale/tariffa/extra ha un `id` stabile e un `updatedAt` di sync separato dal dominio; i preventivi sono immutabili e si sincronizzano in append.
- **Tombstone**: archiviazione/eliminazione come evento, non cancellazione fisica immediata.
- **Conflitti**:
  - preventivi: append; stesso `id` non si sovrascrive;
  - configurazione: timestamp per entità; se locale e remoto divergono, modale “Mantieni locale / Usa remoto / Unisci”;
  - impostazioni: last-write-wins con avviso.
- **Auth**: magic link/OTP, due account, un “household” condiviso; RLS per household. Nessuna password gestita dall'app.
- **Sicurezza**: chiave anonima pubblica + RLS; nessuna service role key; TLS; cifratura end-to-end da valutare dopo il primo spike.
- **Backup**: export automatico prima del primo sync; export manuale sempre disponibile.
- **Free-tier guardrail**: contatore/limite, errore quota → sync disattivato, app local-only, messaggio chiaro. Nessun addebito.

### 4.5 UX

- Impostazioni → **Sincronizzazione**: stato (disattiva / in attesa / attiva / errore), “Crea spazio condiviso”, “Invita l'altro dispositivo”, “Sincronizza ora”, “Disattiva”.
- Indicatore discreto nell'header: ultimo sync, offline, conflitto.
- Conflitto: modale con data/ora e riepilogo delle differenze; mai overwrite silenzioso.
- Disattivazione: i dati restano locali; il cloud non viene cancellato automaticamente.

### 4.6 Test

- Contratto repository: local e cloud rispettano la stessa interfaccia.
- Conflitti: quote duplicato, config modificata su due dispositivi, tombstone.
- Offline: coda, retry, nessuna perdita.
- Quota: errore simulato → sync disattivato, local-only.
- RLS: un utente non vede i dati dell'altro household.
- E2E con due contesti browser e un backend di test (mock o progetto Supabase di test).
- Migrazione schema e backup prima del primo sync.

### 4.7 Criteri di accettazione

- Due dispositivi vedono gli stessi preventivi e la stessa configurazione.
- Senza rete l'app funziona in locale e sincronizza al ritorno.
- Un conflitto è visibile e risolvibile; nessun dato sparisce.
- Il piano resta €0; alla quota l'app avvisa e resta locale.
- Export JSON sempre disponibile; nessuna service role key nel bundle.

### 4.8 Domande aperte

1. Provider: Supabase o Cloudflare? Serve uno spike con limiti reali.
2. Serve la cifratura end-to-end subito o è sufficiente RLS + TLS?
3. La configurazione si sincronizza per entità o come documento unico?
4. Come si invita il secondo utente senza un servizio email a pagamento? Magic link Supabase o codice d'invito.
5. Cosa succede se il progetto free viene messo in pausa? Keep-alive o fallback local-only.
6. Si sincronizzano anche archiviati e tombstone per quanto tempo?
7. Il tema/lingua restano locali: confermato.

### 4.9 Stima

Spike provider + auth: 1–2 giorni. Refactor async + adapter: 2–3 giorni. Conflitti/UX/test: 2–3 giorni. Totale indicativo: **5–8 giorni assistiti**, da rivalutare dopo lo spike.

---

## 5. Lavoro trasversale

- **ADR:** 0017 (3MF), 0018 (sync), 0019 (inglese) sono la direzione. Ogni cambio di schema o formula richiede un ADR successivo.
- **Schema:** l'unico cambio previsto è `Quote.locale` (v2) per l'inglese. L'import 3MF non cambia lo schema nella prima iterazione.
- **Test:** ogni iniziativa porta unit, property (dove ha senso), E2E, axe e visual. `npm run check` resta il gate.
- **Documentazione:** aggiornare `cost-model.md` solo se cambia una formula (non previsto); `data-model.md` per `Quote.locale`; `testing.md`, `deployment.md`, `STATUS.md`, `TASKS.md`.
- **Deploy:** Vercel free; per il sync valutare env pubbliche (URL + anon key) e un progetto di test separato.
- **Sicurezza:** nessun upload di `.3mf`; nessun analytics; nessuna chiamata esterna oltre al provider scelto per il sync.

---

## 6. Handoff per la prossima sessione

Prompt sintetico da riusare:

> Leggi `AGENTS.md`, `STATUS.md`, `TASKS.md` (fase 5), `docs/planning/phase-5.md` §3 e l’ADR-0019. T5.3 è chiuso. Parti da T5.6: infrastruttura i18n tipizzata, estrazione stringhe, formattazione locale e migrazione `Quote.locale` (schema v2), selettore lingua e test E2E/axe/visual in inglese. Non cambiare formule, `engineVersion`, snapshot o i dati esistenti senza migrazione e test. Un task = un commit; `npm run check` verde.

---

## 7. Fonti

- 3MF Consortium, **3MF Core Specification 1.4.0**: https://github.com/3MFConsortium/spec_core — formato ZIP/OPC, metadati, estensioni.
- Printago, **3MF File Format: How Bambu Studio and Orca Slicer Structure Your Prints** (13 aprile 2026): https://printago.io/blog/3mf-file-format — struttura `slice_info.config`, `prediction`, `used_g`, caveat. Fonte terza, utile ma da verificare con file reali.
- OrcaSlicer, `src/libslic3r/Format/3mf.cpp`: https://github.com/SoftFever/OrcaSlicer — nomi dei file e gestione del progetto.
- PrusaSlicer, `src/libslic3r/Format/3mf.cpp`: https://github.com/prusa3d/PrusaSlicer — `Metadata/Slic3r_PE.config`; i progetti non contengono tempo/grammi affidabili.
- Supabase, **Pricing** (consultato il 26/10/2026): https://supabase.com/pricing — limiti Free e pausa dopo una settimana.
- Cloudflare, **Workers Pricing** (2 ottobre 2026): https://developers.cloudflare.com/workers/platform/pricing/ — Workers, D1, KV, R2.
- Firebase, **Pricing** (consultato il 26/10/2026): https://firebase.google.com/pricing — Firestore e Auth Spark.
- MDN, **Intl**: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl — formattazione locale.
