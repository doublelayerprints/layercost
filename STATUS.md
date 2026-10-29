# LayerCost — Stato del progetto

**Data:** 29 ottobre 2026
**Versione:** 1.0.0 — prima release stabile
**Repo:** https://github.com/doublelayerprints/layercost (privata)
**Live:** https://layercost.vercel.app
**Locale:** `/Users/tancredi/Desktop/DoubleLayeRPrints/layercost`
**Branch:** `feat/evo-1-google-login` — EVO-1 implementato, in attesa di Client ID/Secret e verifica reale

---

## 1. Sintesi

LayerCost è una SPA statica, local-first, per calcolare costo e prezzo di stampe 3D singole o di lotti. La **v1.0.0** completa le fasi 0–4 del piano:

- fondamenta, tooling, CI e documentazione;
- motore di costo e prezzo;
- configurazione, persistenza locale, export/import;
- UI funzionale, storico, condivisione, stampa/PDF e confronto;
- direzione **A — Strato**, design system, dark mode, stati e verifiche di release.

T4.1–T4.7 sono chiusi, mergiati in `main` e distribuiti in produzione. La release è verificata con test unitari, E2E, WebKit, axe, stampa/PDF, regressione visiva e budget del bundle.

**Fase 5:** **T5.3 è chiuso** il 26/10/2026. Le fixture `.3mf` reali sono verificate per Kobra 3, Kobra X, multi-piatto e progetto non slicato; il parser ZIP/XML locale è implementato con limiti di sicurezza, Web Worker e `ThreeMfSummary`; il mapping puro propone stampante/materiali e produce `PrintLine[]`; la UI “Importa .3mf” è disponibile nel calcolatore. Performance: file reale da 22 MB compressi in 915 ms, archivio sintetico da 50 MB in ~100 ms e progetto non slicato da 15 MB rifiutato in ~100 ms. **T5.6 è chiuso**: infrastruttura i18n, estrazione stringhe, formattazione, `Quote.locale`, selettore e verifiche in inglese. **T5.12 è chiuso**: export `.xlsx` locale di preventivi, righe e materiali. **T5.15–T5.19 chiusi** il 26–28/10/2026: preferenze rapide in sidebar, azioni del preventivo in alto, colore filamento per riga, utile in euro e separazione tra vista interna e cliente. **T5.20 è chiuso** il 28/10/2026: sconti percentuali o a importo fisso su singola stampa e totale preventivo, con schema v4 e motore 1.0.0. **T5.21 è chiuso** il 28/10/2026: card comprimibili nel calcolatore con riepilogo compatto e drop down, senza modifiche a dati o formule. Il prossimo task richiesto è **T5.4 sync** con Supabase Free, **email/password** e workspace condiviso (ADR-0024); piano completo in `docs/planning/t5.4-cloud-sync.md`. **T5.4.0 chiuso** (piano e ADR), **T5.4.1 chiuso** (repository async, hydration gate, coda di scrittura), **T5.4.2 chiuso** (schema Supabase, RLS, trigger, mapper, test pgTAP), **T5.4.3 chiuso** (auth email/password, login, sessione e SyncSettings), **T5.4.4 chiuso** (gateway cloud, cache separata, outbox, conflitti), **T5.4.5 chiuso** (workspace condiviso, runbook, audit e test di isolamento) e **T5.4.6 chiuso** (keep-alive, backup/restore, CI database, budget e deploy) il 28/10/2026. Il cloud è **live in produzione** su Supabase Free EU con due account owner; resta solo una baseline visual dedicata alle schermate cloud come follow-up opzionale.

**EVO-1 — Google login** è implementato il 29/10/2026 (ADR-0025) sul branch `feat/evo-1-google-login`: provider Google aggiuntivo, PKCE con redirect alla root e scambio manuale del codice, auto-link per email verificata, fallback “Collega Google” e flag pubblico `VITE_AUTH_GOOGLE_ENABLED`. Email/password resta il fallback. La verifica reale è stata eseguita il 29/10/2026 in locale contro il backend di produzione: login Google riuscito per **un account**; il database riporta **1 identità Google su 2 account**, quindi il secondo owner deve ancora fare auto-link o “Collega Google”. Il flag pubblico `VITE_AUTH_GOOGLE_ENABLED=true` è impostato su Vercel Production/Preview; il deploy segue il merge della PR #24. Nessuna modifica a formule, `engineVersion`, snapshot, schema locale, RLS o sync.

---

## 2. Cosa è implementato

### Motore

- Materiale con più materiali per riga.
- Energia da W medi per famiglia, non da potenza nominale.
- Ammortamento + manutenzione.
- Manodopera, extra e riserva guasti `p/(1−p)`.
- Ricarico o margine, sconti di riga e di preventivo (percentuali o a importo fisso), arrotondamento, IVA opzionale.
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
- Card comprimibili nel calcolatore (T5.21): Preventivo, Stampe, Costi di lavoro, Prezzo e ogni riga di stampa hanno un header con freccia e drop down; da compressi mostrano una sintesi (data/cliente, righe/grammi/costo diretto, manodopera/extra, ricarico/IVA, nome/stampante/tempo/costo di riga) e mantengono cliccabili Importa, Ripristina default, Duplica e Rimuovi. Lo stato è locale alla schermata, nessun cambio a dati o formule.
- Tema chiaro, scuro o di sistema (ADR-0016), con preferenza salvata sul dispositivo e stampa sempre chiara.
- Selettori rapidi di tema (Sistema/Chiaro/Scuro) e lingua (IT/EN) in fondo alla sidebar e nel menu mobile, sincronizzati con Impostazioni (T5.15).
- Azioni del preventivo (modifica, invio, completamento, duplica, archivia, elimina) in una card subito sotto la testata, prima del prezzo e delle righe (T5.16).
- Colore del filamento per riga: color picker nativo, swatch in dettaglio, tabella costi e stampa/PDF, con rimozione; è un dato opzionale, non entra nel calcolo (T5.17).
- Utile in euro in calcolatore e dettaglio (T5.18), con margine effettivo come nota; link condiviso e stampa standard per il cliente mostrano solo prezzi, IVA e note, mentre “Stampa interna” include costi e composizione ed è marcata “Uso interno”.
- Composizione del prezzo (T5.19): barra del prezzo netto divisa in costo pieno e guadagno sopra la composizione del costo; nella lista preventivi l'intera riga è cliccabile e si evidenzia all'hover, senza il pulsante “Apri”.
- Export `.xlsx` di preventivi, righe e materiali (T5.12): writer locale senza nuove dipendenze, tre fogli, valori numerici con formati Excel, intestazioni in italiano/inglese, archiviati inclusi e pulsanti in Preventivi e Impostazioni → Dati.
- Sconti (T5.20): ogni riga e il preventivo hanno uno sconto opzionale percentuale o a importo fisso; l'importo di riga si applica al totale della riga, gli sconti si cumulano e un importo superiore al prezzo viene limitato a zero con avviso. Il dettaglio è visibile in riepilogo, dettaglio, stampa, link condiviso ed export `.xlsx` (schema v4, motore 1.0.0).
- Auth cloud opzionale (T5.4.3): login email/password con utenti creati dall'amministratore, sessione persistente, logout con flush, banner di sessione scaduta e sezione Sincronizzazione in Impostazioni. Senza env la UI cloud è nascosta e l'app resta identica alla modalità ospite. Il client Supabase è un chunk lazy; nessuna service role nel bundle.
- Google login (EVO-1, ADR-0025): provider aggiuntivo per i due account esistenti, visibile solo con `VITE_AUTH_GOOGLE_ENABLED=true`. PKCE (`flowType: 'pkce'`, `detectSessionInUrl: false`), redirect alla root, scambio manuale del `code` all'avvio e pulizia del query string; il fragment resta libero per `HashRouter`. Auto-link di Supabase per email verificata; “Collega Google” (`linkIdentity`) in Impostazioni → Sincronizzazione come fallback deterministico, con “Google collegato” quando l'identità è presente. Errori mappati e tradotti IT/EN, callback fallito riportato su `/#/login`. Client ID pubblico solo in Supabase; Client Secret solo nel dashboard Supabase o in una env locale non committata.
- Sync cloud (T5.4.4): configurazione e preventivi salvati vivono nel workspace condiviso; cache di lavoro separata (`layercost:cloud-cache`), outbox persistita (`layercost:sync-state`), scritture ottimistiche su `updated_at`, modifiche offline riprodotte al ritorno, conflitti espliciti con ricarica remota/duplicazione per i preventivi e mantieni locale/usa remoto per la configurazione. Primo login con backup JSON e scelta di import; al logout la cache viene rimossa se non ci sono scritture in sospeso. Indicatore di stato in sidebar/menu e azioni in Impostazioni → Sincronizzazione.
- Workspace condiviso (T5.4.5): runbook amministrativo in `docs/engineering/workspace-runbook.md` per progetto, utenti, membership, reset password, offboarding e troubleshooting. Entrambi gli owner vedono e modificano lo stesso archivio; il dettaglio del preventivo mostra “Workspace condiviso” con creatore e ultima modifica (“te” o “un altro membro”) usando `created_by`/`updated_by`, senza esporre l’email e senza entrare nello snapshot. Test pgTAP estesi a 33 asserzioni e E2E sync a 3 test, inclusi utente senza membership e workspace separato.
- Operazioni cloud (T5.4.6, parziale): workflow giornaliero di keep-alive con alert su issue, backup settimanale cifrato `public` + `auth` con restore verificato, job CI `database` con Supabase locale, pgTAP, auth E2E e sync E2E. La CI della PR #20 è verde (`check`, `e2e`, `database`); mancano deploy di produzione e visual cloud.
- Smoke di produzione (29/10/2026): il workspace temporaneo rinomina gli ID seed nel browser prima del primo login, perché gli ID delle entità sono globali e `ws-doublelayer` contiene già `tariff-default` e gli altri ID seed. Lo smoke resta isolato, verifica import/sync/salvataggio e pulisce workspace e utente; verde su https://layercost.vercel.app.
- Stati e rifiniture (T4.5): conferma accessibile prima di scartare o sostituire la bozza; eliminazioni con `Modal`; alert “Preventivo salvato”; vuoti con azione; microcopy su bozza, storico e preventivo non ricalcolabile.
- Stampa: intestazione, meta, righe, totali e note; la versione cliente non mostra costi, utile o margine, mentre la stampa interna aggiunge composizione in grigi e totali economici. PDF A4 verificato su Chromium e stampa verificata sull'engine WebKit.
- Verifiche 1.0: audit `axe` WCAG 2.2 AA su tutte le route (chiaro/scuro, desktop/mobile, menu e modali), test WebKit, regressione visiva a 1440/768/390 px, budget del bundle e nessuna richiesta esterna.

### Import `.3mf`

- **T5.3.1:** fixture reali generate con Anycubic Slicer Next 2.0.0.3 e ridotte in `tests/fixtures/3mf/`: Kobra 3, Kobra X, Kobra X a due piatti e progetto non slicato.
- **T5.3.2:** parser locale in `src/data/three-mf/` con `fflate`, limiti ZIP, rifiuto di cifratura/path traversal/DOCTYPE, fallback G-code e Web Worker; riepilogo puro `ThreeMfSummary` in `src/domain/three-mf.ts`.
- **T5.3.3:** mapping puro in `src/domain/three-mf-mapping.ts`: proposte di stampante/materiali senza creare entità, una riga per piatto, grammi aggregati per materiale, ID iniettati.
- **T5.3.4:** pulsante “Importa .3mf” nella testata e nella sezione Stampe, drag & drop, dialogo con piatti selezionabili, mappatura stampante/materiali, conferma “Aggiungi / Sostituisci” se la bozza ha contenuto, alert di esito e focus sulla prima riga importata.
- **T5.3.5:** performance verificata con un file reale esportato dallo slicer (`1026-1206-prova volpe_plate(01)_PLA_0.12_6h32m3s.gcode.3mf`, 22 MB compressi, 75 MB di G-code decompresso): dialogo in 915 ms in produzione, 70,05 g, 6h 32m, PLA, Kobra 3. Archivio sintetico da 50 MB in 95–107 ms; progetto non slicato `rayquaza+230.3mf` da 15 MB rifiutato in 100–102 ms; 18 screenshot di regressione visiva, inclusi il modale import a 1440/768/390 px. Il fixture Bambu reale resta da autorizzare.
- **Nota tecnica:** `DOMParser` non è disponibile nei Web Worker; il worker usa `@xmldom/xmldom`, il thread principale il `DOMParser` nativo.

### Interfaccia inglese (T5.6, chiusa)

- **T5.6.1:** dizionari tipizzati `src/i18n/{it,en}.ts`, `translate`/`t`/`plural`, `I18nProvider` + `useI18n`, `<html lang>`, shell collegata e inventario in `docs/planning/i18n-inventory.md`.
- **T5.6.2:** estrazione completa delle schermate, dei componenti condivisi, delle etichette di dominio, della stampa e della guida; 743 chiavi in moduli per area. Errori import/share/save mappati per codice; restano fallback tecnici rari di storage/schema/dominio.
- **T5.6.3:** formattazione `Intl` legata alla locale (`useFormat`), parsing numerico con virgola o punto, `Quote.locale` e schema v2 con migrazione e backup raw. Nomi predefiniti e suffissi di copia/import localizzati; stampa, dettaglio e link usano la lingua del preventivo.
- **T5.6.4:** preferenza `layercost:locale`, selettore Italiano/English in Impostazioni, `<html lang>`, titolo e meta description aggiornati; la bozza vuota adotta la lingua, i preventivi salvati restano nella loro.
- **T5.6.5:** 14 scansioni axe in inglese (0 violazioni), 18 screenshot inglesi, errori di dominio e di storage mappati per codice, link condivisi pre-v2 compatibili. Deploy di produzione verificato: build `index-CiitaCgo.js`, italiano predefinito, inglese persistente, schema 2 e stampa inglese.

### Preventivi e calcolatore (T5.13–T5.19, ADR-0020 e ADR-0022)

- **T5.13:** `Quote.status` è `draft | saved | sent | completed`. Un preventivo `saved` si modifica in place con lo stesso `id`; la modifica usa lo snapshot e conserva `capturedAt`, quindi i prezzi restano congelati. `sent` e `completed` sono bloccati e si correggono duplicando. Conferme per invio/completamento, badge in lista/dettaglio/stampa, link condivisi con lo stato originale. Schema **v3** con catena v1 → v2 → v3 e backup raw.
- **T5.14:** calcolatore diviso in card separate per intestazione, stampe, costi di lavoro e prezzo. Ogni stampa è un pannello distinto con etichetta “Stampa N”, bordo e fondo dedicato; Duplica/Rimuovi sono nell’intestazione del pannello. La nuova riga si aggiunge da una barra trasparente a tutta larghezza sotto l’ultima card, con `+` centrale e stato accent su hover/focus/click.
- **T5.15:** preferenze rapide di tema e lingua in sidebar, con radio native, sincronizzazione con Impostazioni, persistenza e adozione della lingua da parte della bozza vuota.
- **T5.16:** la gestione del preventivo è passata in alto, prima del riepilogo; “Stampa / PDF” resta secondaria nella testata.
- **T5.17:** `PrintLine.color` opzionale (`#rrggbb`) con picker, swatch e rimozione; schema v3 invariato, nessun impatto su formule o `engineVersion`.
- **T5.18:** utile in euro (`netPrice − totalCost`) in calcolatore e dettaglio, con margine effettivo come nota; `QuoteOverview` e `QuotePrint` separano `audience: 'internal' | 'customer'`. Il link condiviso e la stampa standard mostrano solo prezzi, IVA e note; “Stampa interna” dal dettaglio include i costi ed è marcata “Uso interno”. Valore derivato di UI, nessun cambio a formule, schema, snapshot o `engineVersion`.
- **T5.19:** `PriceComposition` mostra il prezzo netto diviso in costo pieno e guadagno sopra la composizione del costo, in calcolatore/dettaglio/stampa interna. Nella lista preventivi l'intera riga è cliccabile e si evidenzia all'hover, senza “Apri”; su mobile l'intera card è un link. La stampa applica i token chiari solo a `.quote-print`, così l'interfaccia resta scura durante l'anteprima e il PDF resta bianco.
- Deploy: build `index-CZsBAkWj.js` / `index-TxJUUDVw.css` deployata e verificata in produzione su https://layercost.vercel.app; CI `check` + `e2e` verdi e baseline visive rigenerate su Linux.

### Accento viola (T4.8, ADR-0021, 28/10/2026)

- Accent unico **viola**: `#5b21b6` nel tema chiaro e `#9d7bf5` nel tema scuro; selezione `#ddd6fe` / `#3b2a66`, pill informativa `#f5f3ff` / `#5b21b6` e `#2a1f45` / `#c4b5fd`.
- Contrasti AA: **8,98:1** su surface e **8,10:1** su ground in chiaro; **5,35:1** e **5,78:1** in scuro. Focus ring 2 px con l'accent.
- La barra dell'avviso “Completa i dati” nel riepilogo del calcolatore usa l'accent; la pillola “Da completare” resta warning.
- Favicon aggiornata; test E2E dei token e dell'hover della barra “Aggiungi riga” allineati. Baseline visive Linux rigenerate.
- Nessun cambio a formule, `engineVersion`, schema, snapshot, export/import o privacy.

### Seed

- Anycubic Kobra 3 (250 × 250 × 260 mm, senza multicolore).
- Anycubic Kobra X (260 × 260 × 260 mm, ACE 2 Pro).
- Materiali PLA, PETG, TPU, ABS, ASA, PLA-CF, PETG-CF, PVA.
- Tariffa energia €0,20/kWh, manutenzione €0,01/h, guasti 5%, ricarico 30%, arrotondamento €0,10, IVA disattivata.
- Vita utile 15.000 h (Kobra 3) e 20.000 h (Kobra X), valore residuo 20%, avvio 5 min.
- Valori marcati come stime dove non verificati.

---

## 3. Verifiche

| Verifica           | Stato                                                                                   |
| ------------------ | --------------------------------------------------------------------------------------- |
| TypeScript strict  | verde                                                                                   |
| oxlint             | verde                                                                                   |
| Test unitari/dati  | 216 superati (185 + 31 EVO-1)                                                           |
| Database locale    | 33 test pgTAP RLS + 8 test mapper; `npm run db:test` verde                               |
| Test E2E           | 45 totali (33 default + 6 visual + 3 auth + 3 sync; 2 WebKit)                           |
| Auth E2E           | 3 test con Supabase locale (login, reload, impostazioni, logout, errori; Google mockato e annullamento); axe 375/1440 |
| Google login       | verificato in locale contro Supabase di produzione il 29/10/2026: 1 account su 2 con identità Google; il secondo owner deve completare il collegamento |
| Sync E2E           | 3 test con Supabase locale (primo login, due contesti/offline/conflitto, isolamento)     |
| Accessibilità      | axe WCAG 2.2 AA: 49 scansioni (40 + 4 auth + 5 sync), 0 violazioni                       |
| Regressione visiva | 36 screenshot (18 it + 18 en) a 1440/768/390 px, baseline Linux rigenerate dopo T5.21; cloud visual non ancora coperto |
| Build produzione   | verde (~752,7 KB JS main con env cloud; ~108 KB worker; 204,9 KB gzip iniziale con env cloud; cloud lazy 53,5 KB) |
| Budget bundle      | JS iniziale 204,9/205 KB; cloud lazy 53,5/80 KB; worker 37,6/40 KB; totale iniziale 269,8/350 KB |
| CI GitHub PR #24   | verde: `check` 23s, `e2e` 1m48s, `database` 3m30s; preview Vercel verde                 |
| Vercel produzione  | **live** `index-D9pxS7o0.js` / `index-BPCFEMKa.css`; EVO-1 non ancora distribuito          |
| Smoke produzione   | verde il 29/10/2026 con il nuovo harness a ID univoci (login, import, sync, salvataggio e cleanup) |
| Keep-alive         | workflow manuale verde (9s)                                                             |
| Backup             | workflow manuale verde (44s); checksum e decifratura verificati                         |

Comandi:

```bash
npm run check
npm run test:e2e
npm run budget
npm run test:visual   # solo con baseline Linux; in locale i test visual sono saltati
npm run db:start      # Supabase locale (Docker)
npm run db:reset
npm run db:test
npm run db:types
npm run test:e2e:auth # build con Supabase locale + login/logout E2E
npm run test:e2e:sync # build + due contesti, offline, conflitto e isolamento; azzera il DB locale
```

---

## 4. Dati e privacy

- Dati in `localStorage`, chiave `layercost:data`, schema v4 con `Quote.locale`, `Quote.status`, `PrintLine.color` opzionale e sconti di riga/preventivo (`DiscountRule`).
- Preferenza del tema in `layercost:theme` e lingua in `layercost:locale`, separate dai dati e non incluse nei backup; i selettori rapidi in sidebar scrivono le stesse chiavi.
- Prima della migrazione v1 → v2 il raw viene salvato in `layercost:backup:schema-1`; la migrazione v3 → v4 conserva il raw in `layercost:backup:schema-3`.
- In modalità ospite nessun backend, account o analytics. Con account, configurazione e preventivi sono nel workspace Supabase condiviso `layercost-prod` in regione EU (Frankfurt); la sessione è un token tecnico in `localStorage` e non entra nei backup. Due account owner accedono allo stesso archivio; il signup pubblico è disabilitato.
- Google login (EVO-1): l'app usa OAuth con Supabase e Google solo per `openid`, `email` e `profile`. Non salva token Google, non accede a Drive/Gmail e non invia dati economici a Google. Supabase conserva il collegamento dell'identità (`auth.identities`) e l'email; l'app espone solo il provider collegato e l'email dell'account. Il code verifier PKCE è un valore tecnico temporaneo in `localStorage`, consumato al callback e fuori dai backup. Il Client ID è pubblico; il Client Secret vive solo nel dashboard Supabase o in una env locale non committata.
- La modalità connessa usa `layercost:cloud-cache` (copia di lavoro) e `layercost:sync-state` (outbox, metadati `updated_at`, workspace, ultimo sync). `layercost:data` resta intatto e torna attivo al logout. Se il workspace cambia, cache e outbox vengono scartati prima di riusarli.
- L’audit `created_by`/`updated_by` resta nel database e nella cache cloud; nel dettaglio viene mostrato come “te”/“un altro membro”, senza email. Non entra nello snapshot, nei calcoli o nei link condivisi.
- Al logout senza scritture in sospeso cache e outbox vengono rimosse; con scritture in sospeso restano nel browser e riprendono al prossimo accesso. Il cloud non viene cancellato.
- RLS su ogni tabella; il client usa solo la chiave pubblicabile. Gli script admin usano il service role fuori dal browser.
- Export/import JSON; backup automatico prima dell'import.
- Export `.xlsx` locale di preventivi, righe e materiali: nessun upload e nessuna richiesta di rete.
- Link condivisi = copia compressa del preventivo nell'URL, con la lingua del preventivo.
- Svuotare il browser cancella i dati: il backup è l'unica copia esterna.

---

## 5. Deploy

- **Live:** https://layercost.vercel.app
- Progetto Vercel collegato alla repo GitHub.
- Release **v1.0.0** del 24/10/2026, commit `cc949b3`, tag `v1.0.0`. Deploy di produzione verificato su https://layercost.vercel.app: build `index-C_5bQZYu.js` / `index-BGmXv2w6.css`, `inspect.mjs --app` a 1440/768/390 con **0 FAIL, 1 WARN** (`ragged-row`, rail sticky), prezzo 3,70 €, alert di salvataggio non ripetuto al reload, tema scuro persistente e PDF A4 chiaro (99 KB).
- Deploy **28/10/2026** (accento viola, T4.8/ADR-0021): build `index-C7Ct7znW.js` / `index-DH8EgtHU.css`, verificata su https://layercost.vercel.app. `--color-data` vale `#5b21b6` in chiaro e `#9d7bf5` in scuro; la barra “Completa i dati” del riepilogo è viola. Il batch T5.12–T5.17 e la barra “Aggiungi riga” sono inclusi. CI `check` + `e2e` verdi (36 E2E).
- **Deploy T5.4 (28/10/2026):** PR #20 mergiata con squash `1bf641e`; CI `main` verde in 3m25s. Produzione aggiornata a `index-D9pxS7o0.js` / `index-BPCFEMKa.css` con cloud attivo. Smoke test di produzione verde (login, sync, salvataggio preventivo, cleanup). Supabase `layercost-prod` in `eu-central-1`, signup pubblico disabilitato, due account `owner` nello stesso workspace. Keep-alive e backup eseguiti manualmente con successo; artifact cifrato verificato (checksum + decifratura).
- **EVO-1 (29/10/2026):** OAuth client Google Web creato, provider configurato in Supabase, login verificato in locale contro il backend di produzione per un account. `VITE_AUTH_GOOGLE_ENABLED=true` è impostato su Vercel Production e Preview; il deploy di produzione segue il merge della PR #24. Il secondo owner deve ancora collegare Google. Rollback: disabilitare Google in Supabase e rimuovere il flag. Procedura in `docs/engineering/workspace-runbook.md` §15.
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

- Stampa verificata su Chromium (PDF A4) e sull'engine WebKit; resta consigliata una prova su una stampante fisica e su Safari reale.
- Audit `axe` automatico su tutte le route; resta consigliata una prova con screen reader reale (VoiceOver/NVDA).
- Test visuali di regressione con baseline Linux: girano in CI, non su macOS.
- Sync cloud **live in produzione** dal 28/10/2026: Supabase Free `layercost-prod` (EU Frankfurt), due account owner, env Vercel, keep-alive e backup verificati. Piano in `docs/planning/t5.4-cloud-sync.md`; runbook in `docs/engineering/workspace-runbook.md`; backup in `docs/engineering/backup-restore.md`; vedi ADR-0018 e ADR-0024.
- Google login **verificato live per un account** (EVO-1/ADR-0025): OAuth client e provider Supabase configurati, flag `VITE_AUTH_GOOGLE_ENABLED=true` su Vercel Production/Preview; il secondo owner deve ancora fare auto-link o “Collega Google”. Il consenso mostra il dominio Supabase finché non si configura un custom domain. Il budget JS iniziale è a 204,9/205 KB: il margine è di 0,1 KB, quindi il prossimo aumento va motivato o accompagnato da una riduzione.
- Lo smoke di produzione rinomina gli ID seed nel browser perché gli ID delle entità sono globali e `ws-doublelayer` li contiene già; non è una modifica ai dati di produzione.
- Baseline visual cloud non ancora aggiunta: le schermate login/sync/conflitto sono coperte da E2E e axe, ma non da screenshot di regressione.
- Sync senza realtime: pull completo all'avvio, al focus, dopo una scrittura e su “Sincronizza ora”. Accettabile per due utenti.
- Un solo workspace condiviso previsto. Gli ID sono PK globali: due workspace nello stesso database con gli stessi ID seed colliderebbero; una multi-tenancy piena richiederebbe PK `(workspace_id, id)`. L’E2E di isolamento usa un secondo workspace con dati propri e ID univoci, non con il seed.
- L’audit del preventivo mostra “te” o “un altro membro”, non l’email: con due owner identifica l’altra persona, ma con più membri servirà una directory o un nome visibile.
- Il comando `npm run test:e2e:sync` azzera il database Supabase **locale** e richiede `psql`; non va eseguito contro un progetto remoto.
- Import `.3mf` disponibile per file già slicati. Performance verificata con un file reale (22 MB compressi, 75 MB decompressi) e con un archivio sintetico da 50 MB; il fixture Bambu reale resta da autorizzare.
- Interfaccia inglese chiusa (T5.6.1–T5.6.5, ADR-0019); preventivi modificabili fino all’invio e card del calcolatore (T5.13–T5.14, ADR-0020); preferenze rapide, azioni in alto, colore filamento e vista cliente separata (T5.15–T5.19).
- Le 36 baseline visive sono state rigenerate il 28/10/2026 per includere T5.15–T5.21, T5.12, la barra “Aggiungi riga”, l'accento viola, le card degli sconti e le card comprimibili. Le schermate cloud non hanno ancora una baseline visual dedicata; axe copre login, impostazioni sync, primo login, conflitto e isolamento.
- Export `.xlsx` per analisi esterna; il backup JSON resta l’unica copia esterna completa.
- Nessun magazzino bobine.
- Migrazioni schema minime (v4; rifiuto versioni future).
- Guida iniziale come checklist, non wizard multi-step.

---

## 7. Prossimi passi

1. **T5.3 — Import diretto da `.3mf`**: **chiuso** (fixture, parser ZIP/XML con worker, mapping puro, UI, performance e deploy).
2. **T5.6 — Interfaccia inglese**, **T5.12 — Export `.xlsx`** e **T5.20 — Sconti**: chiusi. **T5.13–T5.19**: preventivi modificabili, card del calcolatore, preferenze rapide, azioni in alto, colore filamento, utile in euro e vista cliente separata. **T5.4.0–T5.4.5 chiusi**; prossimo **T5.4.6** (keep-alive, backup, CI DB, deploy). Il resto del backlog è chiuso/non in scope.
3. **T5.4 — Sync cloud**: richiesto il 26/10/2026; Supabase Free, email/password, workspace condiviso (ADR-0024). **T5.4.0–T5.4.6 chiusi** e cloud live in produzione. Follow-up opzionale: baseline visual dedicata alle schermate cloud.
4. **Produzione Vercel:** aggiornata il 28/10/2026 (`index-D9pxS7o0.js` / `index-BPCFEMKa.css`), cloud attivo e smoke test verde; `main` = `origin/main` = `4017c36` (T5.4 + docs).
5. Verificare se `prediction` include il riscaldamento iniziale confrontandola con una stampa reale.
6. Raccogliere feedback reale sulle due stampanti e sui valori di seed.
7. **Evolutive:** **EVO-1 — Google login** implementato (ADR-0025), verificato live per un account e in deploy su produzione; resta il collegamento del secondo owner. Prossimo: **EVO-2 — tetti utenti/preventivi** (ADR-0026) quando si decide il modello di apertura; poi EVO-3 (invite-only/allowlist) ed EVO-4 (multi-workspace) solo su decisione esplicita. Piano in `docs/planning/evolutive.md`.
8. Eventuale magazzino bobine, actual vs estimated, PWA.

---

## 8. Ripresa rapida

- **Stato:** v1.0.0 + T5.4 rilasciata e **cloud live in produzione**; **EVO-1 Google login implementato** sul branch `feat/evo-1-google-login`, con codice, test e documentazione pronti. `main` resta a **`4017c36`** (T5.4 squash `1bf641e`, PR #20). Produzione: https://layercost.vercel.app, build `index-D9pxS7o0.js` / `index-BPCFEMKa.css`, cloud attivo. Progetto Supabase `layercost-prod` (`jcxkfhjgstdgrjazlnpq`, `eu-central-1`), due account `owner` nello stesso workspace. **T5.4.0–T5.4.6 chiusi**; follow-up opzionale: baseline visual cloud.
- **Ultima verifica (29/10/2026):** `npm run check` verde (216 unitari, budget 204,9/205 KB iniziali con env cloud e 269,8/350 KB totali), `db:test` 33 pgTAP, `test:e2e` 33 passati + 12 saltati, auth 3, sync 3, 49 scansioni axe. Smoke di produzione verde con il nuovo harness a ID univoci. Keep-alive e backup manuali restano verdi. La CI della PR #24 è verde (`check`, `e2e`, `database`); il deploy di produzione non è ancora stato eseguito.
- **Da leggere prima di riprendere:** `AGENTS.md`, `TASKS.md` (fase 5 e sezione Evolutive), **`docs/planning/evolutive.md`**, **`docs/planning/t5.4-cloud-sync.md`** (incluso §0), `docs/planning/phase-5.md` §4, `docs/planning/i18n-inventory.md`, `docs/engineering/architecture.md` §4, `docs/engineering/persistence.md` §9, `docs/engineering/deployment.md` §1.1 e §13, **`docs/engineering/workspace-runbook.md`** (incluso §15 Google), **`docs/engineering/backup-restore.md`**, `docs/engineering/testing.md`, `docs/domain/data-model.md` §7, ADR-0017/0018/0019/0020/0022/0023/**0024**/**0025**, `supabase/config.toml`, le tre migrazioni in `supabase/migrations/`, `supabase/tests/rls.test.sql`, `src/data/cloud/{client,auth,oauth,gateway,sync,sync-state}.ts`, `src/data/cloud-cache.ts`, `src/state/{auth-store,sync-store}.ts`, `src/features/{auth,sync}/`.
- **Comandi:** `npm run dev`, `npm run check`, `npm run test:e2e`, `npm run budget`, `npm run db:test` (Supabase locale/Docker), `npm run test:e2e:auth`, `npm run test:e2e:sync` (azzera il DB locale e richiede `psql`), `npm run smoke:production` (richiede `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `PROD_URL`). Per lo stato git: `git status -sb` e `git log -1 --oneline`.
- **Ambiente:** Supabase locale (Docker) e progetto di produzione EU sono attivi. `.env.local` contiene le credenziali di produzione (`SUPABASE_DB_PASSWORD`, `SUPABASE_URL`, chiavi, `SUPABASE_DB_URL`, `BACKUP_ENCRYPTION_KEY`) ed è gitignored: non committarlo e non condividerlo. Su Vercel ci sono `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`; dopo il rollout Google va aggiunto il flag pubblico `VITE_AUTH_GOOGLE_ENABLED=true`. La service role e il Client Secret Google non sono su Vercel. Secret GitHub presenti: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_DB_URL`, `BACKUP_ENCRYPTION_KEY`.
- **Punti aperti:** **EVO-1** richiede OAuth client Google Web, configurazione del provider in Supabase, “Allow manual linking”, `VITE_AUTH_GOOGLE_ENABLED=true` e verifica reale (runbook §15). **EVO-2 tetti utenti/preventivi** è il prossimo task (ADR-0026) e dipende dalla decisione sul modello di apertura. Baseline visual cloud come follow-up; un solo workspace previsto e ID globali; l’audit UI mostra “un altro membro”, non l’email. Verificare se `prediction` include il riscaldamento iniziale con una stampa reale; aggiungere un fixture Bambu committabile; misurare l’import con un file reale da 50–100 MB. Prove manuali Safari/VoiceOver **rimandate** il 26/10/2026 (non bloccanti); checklist in `docs/engineering/manual-checks.md` (ora include Google). La preview Vercel richiede login SSO; la produzione è pubblica.
- **Branch:** `main` = `origin/main` = `4017c36` e tag `v1.0.0`; il lavoro EVO-1 è sul branch `feat/evo-1-google-login` e nella PR #24. Non push diretto su `main`.
- **Vincolo:** non toccare dominio, formule, `engineVersion`, snapshot o persistenza senza un nuovo ADR e i test collegati. EVO-1/ADR-0025 non cambia formule, `engineVersion`, snapshot, schema locale v4, RLS o sync: cambia solo il modo di ottenere la sessione. Tema e lingua restano fuori da `AppData`; `Quote.locale` e gli sconti hanno le migrazioni v2 e v4 descritte in ADR-0019 e ADR-0023. Il sync Supabase introduce backend/auth: decisione in **ADR-0024**, che supersede in parte ADR-0018.

---

## 9. Riferimenti

- `README.md` — onboarding e comandi.
- `PLAN.md` — visione e roadmap.
- `TASKS.md` — task e stato.
- `docs/domain/cost-model.md` — formule normative.
- `docs/engineering/architecture.md` — livelli, flussi e parser `.3mf` (§9).
- `docs/engineering/testing.md` — strategia, fixture `.3mf` e conteggi.
- `docs/engineering/deployment.md` — deploy.
- `docs/engineering/workspace-runbook.md` — setup e manutenzione del workspace condiviso, utenti, membership, audit, Google OAuth (§15) e troubleshooting.
- `docs/engineering/backup-restore.md` — backup settimanale cifrato, verifica e restore.
- `.github/workflows/keepalive.yml`, `.github/workflows/backup.yml` — operazioni free automatiche.
- `.github/workflows/ci.yml` — job `check`, `e2e` e `database` con Supabase locale.
- `docs/engineering/release.md` — checklist e verifiche della v1.0.0.
- `docs/planning/phase-5.md` — piano operativo di import `.3mf`, inglese, export `.xlsx` e sync.
- `docs/planning/t5.4-cloud-sync.md` — piano dettagliato di T5.4: schema, RLS, auth, sync, task e operazioni free.
- `supabase/migrations/20261028120000_init.sql` — schema cloud, RLS, trigger e keep-alive.
- `supabase/migrations/20261028130000_service_role_grants.sql` — grant amministrativi per service role (solo script).
- `supabase/migrations/20261028140000_admin_last_owner.sql` — cleanup admin dell'ultimo owner, protezione invariata per gli utenti.
- `supabase/tests/rls.test.sql` — 33 test pgTAP su quote condivise, audit, isolamento, membership e cleanup admin.
- `src/data/cloud/gateway.ts` — pull/push Supabase, import iniziale e conflitti.
- `src/data/cloud/oauth.ts` — parsing del callback PKCE, mapping errori OAuth, redirect e pulizia URL.
- `src/data/cloud/sync.ts`, `src/data/cloud/sync-state.ts` — diff, outbox, metadati e stato locale del sync.
- `src/state/sync-store.ts` — orchestrazione di connessione, primo login, sync e conflitti.
- `src/features/sync/` — controller, indicatore e dialoghi di primo login/conflitto.
- `docs/adr/0017-3mf-import.md` — formato di import diretto.
- `docs/adr/0018-cloud-sync-free.md` — sync opzionale e gratuito; provider e vincoli free restano validi.
- `docs/adr/0024-supabase-auth-workspace.md` — auth email/password, workspace condiviso e operazioni free del sync.
- `docs/adr/0025-google-oauth.md` — Google OAuth, PKCE, auto-link, “Collega Google”, segreti e rollback.
- `scripts/smoke-production.mjs` — smoke di produzione con workspace temporaneo e ID rinnovati.
- `docs/adr/0019-english-ui.md` — interfaccia inglese e `Quote.locale`.
- `docs/adr/0022-internal-customer-quote-views.md` — vista interna e vista cliente.
- `docs/adr/0023-line-and-quote-discounts.md` — sconti di riga e di preventivo.
- `docs/design/ui-brief.md` — requisiti per la fase design.
- `docs/design/directions.md` — direzioni e scelta visiva.
- `docs/design/design-system.md` — token, componenti, accessibilità e stampa.
- `docs/adr/0015-direzione-visiva.md` — decisione sulla direzione.
