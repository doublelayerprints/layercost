# LayerCost — Stato del progetto

**Data:** 29 ottobre 2026
**Versione:** 1.0.0 — prima release stabile
**Repo:** https://github.com/doublelayerprints/layercost (privata)
**Live:** https://layercost.vercel.app
**Locale:** `/Users/tancredi/Desktop/DoubleLayeRPrints/layercost`
**Branch:** `main` — EVO-1 (PR #24), EVO-3a (PR #26, squash `125f0d5`), limite `.3mf` a 250 MiB (PR #28, squash `338d693`), **EVO-5 landing pubblica** (PR #30, squash `29b954b`) e **copy gratuita** (PR #32, squash `294c6f1`) mergiati e distribuiti in produzione

---

## 1. Sintesi

LayerCost è una SPA statica, local-first, per calcolare costo e prezzo di stampe 3D singole o di lotti. La **v1.0.0** completa le fasi 0–4 del piano:

- fondamenta, tooling, CI e documentazione;
- motore di costo e prezzo;
- configurazione, persistenza locale, export/import;
- UI funzionale, storico, condivisione, stampa/PDF e confronto;
- direzione **A — Strato**, design system, dark mode, stati e verifiche di release.

T4.1–T4.7 sono chiusi, mergiati in `main` e distribuiti in produzione. La release è verificata con test unitari, E2E, WebKit, axe, stampa/PDF, regressione visiva e budget del bundle.

**Fase 5:** **T5.3 è chiuso** il 26/10/2026. Le fixture `.3mf` reali sono verificate per Kobra 3, Kobra X, multi-piatto e progetto non slicato; il parser ZIP/XML locale è implementato con limiti di sicurezza, Web Worker e `ThreeMfSummary`; il mapping puro propone stampante/materiali e produce `PrintLine[]`; la UI “Importa .3mf” è disponibile nel calcolatore. Performance: file reale da 22 MB compressi in 915 ms, archivio sintetico da 50 MB in ~100 ms e progetto non slicato da 15 MB rifiutato in ~100 ms. **T5.6 è chiuso**: infrastruttura i18n, estrazione stringhe, formattazione, `Quote.locale`, selettore e verifiche in inglese. **T5.12 è chiuso**: export `.xlsx` locale di preventivi, righe e materiali. **T5.15–T5.19 chiusi** il 26–28/10/2026: preferenze rapide in sidebar, azioni del preventivo in alto, colore filamento per riga, utile in euro e separazione tra vista interna e cliente. **T5.20 è chiuso** il 28/10/2026: sconti percentuali o a importo fisso su singola stampa e totale preventivo, con schema v4 e motore 1.0.0. **T5.21 è chiuso** il 28/10/2026: card comprimibili nel calcolatore con riepilogo compatto e drop down, senza modifiche a dati o formule. **T5.4 sync è chiuso** con Supabase Free, **email/password** e workspace condiviso (ADR-0024); piano completo in `docs/planning/t5.4-cloud-sync.md`. **T5.4.0 chiuso** (piano e ADR), **T5.4.1 chiuso** (repository async, hydration gate, coda di scrittura), **T5.4.2 chiuso** (schema Supabase, RLS, trigger, mapper, test pgTAP), **T5.4.3 chiuso** (auth email/password, login, sessione e SyncSettings), **T5.4.4 chiuso** (gateway cloud, cache separata, outbox, conflitti), **T5.4.5 chiuso** (workspace condiviso, runbook, audit e test di isolamento) e **T5.4.6 chiuso** (keep-alive, backup/restore, CI database, budget e deploy) il 28/10/2026. Il cloud è **live in produzione** su Supabase Free EU con due account owner; resta solo una baseline visual dedicata alle schermate cloud come follow-up opzionale.

**EVO-1 — Google login** è implementato il 29/10/2026 (ADR-0025) in `main` (PR #24, squash `51d3fb9`) e distribuito in produzione con build `index-BN8y8TA2.js` / `index-B2c8cUBY.css`: provider Google aggiuntivo, PKCE con redirect alla root e scambio manuale del codice, auto-link per email verificata, fallback “Collega Google” e flag pubblico `VITE_AUTH_GOOGLE_ENABLED`. Email/password resta il fallback. La verifica reale è stata eseguita il 29/10/2026 in locale contro il backend di produzione e poi in produzione: **entrambi gli account hanno un’identità Google (2 su 2)**, verificati il 29/10/2026; il secondo owner ha completato il collegamento dopo la correzione dell’email. Il flag pubblico `VITE_AUTH_GOOGLE_ENABLED=true` è impostato su Vercel Production/Preview; in produzione il pulsante, il redirect al provider e il callback di annullamento sono verificati. Nessuna modifica a formule, `engineVersion`, snapshot, schema locale, RLS o sync.

**EVO-3a — Richiedi accesso** è implementato e distribuito il 29/10/2026 (ADR-0026, PR #26, squash `125f0d5`): route lazy `/#/request-access` raggiungibile senza login, form Formspree Free con email obbligatoria, nome/messaggio opzionali, consenso privacy e honeypot, stati success/error/endpoint mancante, link da login e da SyncSettings, i18n IT/EN, axe e test con Formspree mockato. La pagina non crea utenti, account o membership; il richiedente non riceve un’email automatica (Formspree Free non include autoresponse) e l’amministratore riceve la notifica con `_replyto`. Formspree è configurato con form di produzione e test, endpoint in `.env.local`/Vercel, notifica verificata, progetti separati e Restrict to Domain sul progetto di produzione. Produzione dopo EVO-3a: build `index-B6Cg37Ap.js` / `index-G-eqO2lr.css`, submission reale verificata e smoke verde; il deploy successivo del limite `.3mf` porta a `index-BR5hKjFi.js`. Il budget JS iniziale è passato da 204,9 KB a **206,6 KB** gzip e il limite è stato alzato a **210 KB** con motivazione in ADR-0026. Nessuna modifica a formule, `engineVersion`, snapshot, schema locale v4, auth, RLS o sync.

**EVO-5 — Landing page pubblica** è implementata il 29/10/2026 e **distribuita in produzione il 30/10/2026** (ADR-0029, piano `docs/planning/evo-5-landing-page.md`): route `/#/` per la landing, `/#/calculator` per l’app e `/#/welcome` per la landing forzata; utenti con dati locali, marker `layercost:hasVisited` o sessione autenticata vengono riportati al calcolatore. La landing usa `PublicLayout` fuori da `HydrationGate`, `SyncController` e dialoghi cloud, non crea `layercost:data` e offre header pubblico, hero con screenshot reale, 6 funzionalità in tabella, 3 passi con demo dal vivo del motore reale, privacy/local-first, cloud, 5 FAQ, CTA finale e footer IT/EN. L’italiano è pre-renderizzato in `index.html` a build time; canonical, Open Graph, Twitter, JSON-LD, `robots.txt` con `Allow: /`, sitemap e rimozione di `X-Robots-Tag: noindex` completano la parte SEO. La voce **Panoramica** in sidebar riapre `/#/welcome`; tema chiaro/scuro e lingua IT/EN stanno nella top bar. Copy cloud semplificata il 30/10/2026 (PR #32, squash `294c6f1`): nessun dettaglio tecnico del provider, tutto gratuito, cloud compreso, su richiesta di accesso. Verifiche: 249 unitari (+12), 68 E2E (50 default incl. 11 landing + 12 visual + 3 auth + 3 sync), 42 screenshot (+6), 68 scansioni axe (+8), `npm run check` verde, budget JS **218,2/230 KB** e HTML **6,0/10 KB**, totale 284,5/350 KB. Deploy di produzione del 30/10/2026: build `index-DskoieRT.js` / `index-DYXu1jt6.css`, landing su https://layercost.vercel.app, `/#/calculator` e `/#/welcome` verificati, `robots.txt`/`sitemap.xml` e asset `landing/` + `og-image.jpg` a 200, nessun `X-Robots-Tag`, smoke verde. Nessuna modifica a formule, `engineVersion`, snapshot, schema locale v4, auth, RLS o sync.

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
- Richiesta accesso (EVO-3a, ADR-0026): pagina pubblica e lazy `/#/request-access` con form Formspree Free, raggiungibile senza login e linkata da login e da SyncSettings non connesso. Email obbligatoria (max 254), nome opzionale (max 80), messaggio opzionale (max 500), consenso privacy obbligatorio e honeypot `_gotcha`; invio `fetch` nativo con `Accept: application/json`, `_subject` e `_replyto`, senza nuove dipendenze e senza secret. Stati idle/submitting/success/error/endpoint mancante; conferma `role="status"` con focus sul titolo, errore `role="alert"` con campi conservati e riprova. Nessun utente/account/membership creato, nessuna autoresponse al richiedente, Formspree processore USA con archivio 30 giorni, retention dell’email admin dopo la decisione o entro 12 mesi, nessun analytics/cookie first-party/newsletter. i18n IT/EN, axe 375/1440, unit e E2E con Formspree mockato e doppia build con/senza endpoint. Variabile pubblica `VITE_ACCESS_REQUEST_ENDPOINT`; runbook in `docs/engineering/access-requests.md`.
- Sync cloud (T5.4.4): configurazione e preventivi salvati vivono nel workspace condiviso; cache di lavoro separata (`layercost:cloud-cache`), outbox persistita (`layercost:sync-state`), scritture ottimistiche su `updated_at`, modifiche offline riprodotte al ritorno, conflitti espliciti con ricarica remota/duplicazione per i preventivi e mantieni locale/usa remoto per la configurazione. Primo login con backup JSON e scelta di import; al logout la cache viene rimossa se non ci sono scritture in sospeso. Indicatore di stato in sidebar/menu e azioni in Impostazioni → Sincronizzazione.
- Workspace condiviso (T5.4.5): runbook amministrativo in `docs/engineering/workspace-runbook.md` per progetto, utenti, membership, reset password, offboarding e troubleshooting. Entrambi gli owner vedono e modificano lo stesso archivio; il dettaglio del preventivo mostra “Workspace condiviso” con creatore e ultima modifica (“te” o “un altro membro”) usando `created_by`/`updated_by`, senza esporre l’email e senza entrare nello snapshot. Test pgTAP estesi a 33 asserzioni e E2E sync a 3 test, inclusi utente senza membership e workspace separato.
- Operazioni cloud (T5.4.6): workflow giornaliero di keep-alive con alert su issue, backup settimanale cifrato `public` + `auth` con restore verificato, job CI `database` con Supabase locale, pgTAP, auth E2E e sync E2E. Deploy di produzione del 28/10/2026 verificato; la baseline visual cloud resta un follow-up.
- Smoke di produzione (29/10/2026): il workspace temporaneo rinomina gli ID seed nel browser prima del primo login, perché gli ID delle entità sono globali e `ws-doublelayer` contiene già `tariff-default` e gli altri ID seed. Lo smoke resta isolato, verifica import/sync/salvataggio e pulisce workspace e utente; verde su https://layercost.vercel.app.
- Stati e rifiniture (T4.5): conferma accessibile prima di scartare o sostituire la bozza; eliminazioni con `Modal`; alert “Preventivo salvato”; vuoti con azione; microcopy su bozza, storico e preventivo non ricalcolabile.
- Stampa: intestazione, meta, righe, totali e note; la versione cliente non mostra costi, utile o margine, mentre la stampa interna aggiunge composizione in grigi e totali economici. PDF A4 verificato su Chromium e stampa verificata sull'engine WebKit.
- Verifiche 1.0: audit `axe` WCAG 2.2 AA su tutte le route (chiaro/scuro, desktop/mobile, menu e modali), test WebKit, regressione visiva a 1440/768/390 px, budget del bundle e nessuna richiesta esterna al caricamento (l’invio esplicito della richiesta di accesso a Formspree è l’unica eccezione, ADR-0026).

### Import `.3mf`

- **T5.3.1:** fixture reali generate con Anycubic Slicer Next 2.0.0.3 e ridotte in `tests/fixtures/3mf/`: Kobra 3, Kobra X, Kobra X a due piatti e progetto non slicato.
- **T5.3.2:** parser locale in `src/data/three-mf/` con `fflate`, limiti ZIP (250 MiB compressi, 1 GiB decompressi), rifiuto di cifratura/path traversal/DOCTYPE, fallback G-code e Web Worker; riepilogo puro `ThreeMfSummary` in `src/domain/three-mf.ts`.
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

| Verifica           | Stato                                                                                                                                                   |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TypeScript strict  | verde                                                                                                                                                   |
| oxlint             | verde                                                                                                                                                   |
| Test unitari/dati  | 249 superati (237 + 12 EVO-5)                                                                                                                            |
| Database locale    | 33 test pgTAP RLS + 8 test mapper; `npm run db:test` verde                                                                                              |
| Test E2E           | 68 totali (50 default incl. 11 landing + 12 visual + 3 auth + 3 sync; 2 WebKit)                                                                          |
| Richiesta accesso  | 17 unit, 5 E2E con Formspree mockato, 1 E2E senza endpoint, 8 scansioni axe; form reali, notifica email, deploy e submission verificati                 |
| Auth E2E           | 3 test con Supabase locale (login, reload, impostazioni, logout, errori; Google mockato e annullamento; link richiesta accesso); axe 375/1440           |
| Google login       | verificato in locale contro Supabase di produzione e in produzione (pulsante, redirect, callback) il 29/10/2026; **2 account su 2 con identità Google** |
| Sync E2E           | 3 test con Supabase locale (primo login, due contesti/offline/conflitto, isolamento)                                                                    |
| Accessibilità      | axe WCAG 2.2 AA: 68 scansioni (43 default + 8 landing + 4 auth + 5 sync + 4 access + 4 missing), 0 violazioni                                           |
| Regressione visiva | 42 screenshot (21 it + 21 en) a 1440/768/390 px, incl. 6 landing nuovi; baseline Linux verificate; cloud e accesso non ancora coperti                 |
| Build produzione   | verde (806,8 KB JS main con env cloud; ~108 KB worker; 218,2 KB gzip iniziale; lazy 55,8 KB; HTML 6,0 KB gzip)                                          |
| Budget bundle      | JS iniziale 218,2/230 KB; lazy 55,8/80 KB; worker 37,7/40 KB; HTML 6,0/10 KB; totale iniziale 284,5/350 KB                                              |
| CI GitHub `main`   | verde su `294c6f1`: `check`, `e2e` (57 passati, 11 saltati), `database`; PR #30 e #32 mergiate                                                    |
| Vercel produzione  | **live** `index-DskoieRT.js` / `index-DYXu1jt6.css`; EVO-5 landing, `/calculator`, `/welcome`, SEO e pre-render attivi                                   |
| Smoke produzione   | verde il 30/10/2026 dopo il deploy EVO-5 (login, import, sync, salvataggio e cleanup)                                                                     |
| Keep-alive         | workflow manuale verde (9s)                                                                                                                             |
| Backup             | workflow manuale verde (44s); checksum e decifratura verificati                                                                                         |

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
- La landing pubblica non crea né legge `layercost:data`: usa il marker separato `layercost:hasVisited` solo per riportare al calcolatore chi ha già aperto l’app. Il marker non entra nei backup, non è un dato economico e non viene inviato al cloud.
- Preferenza del tema in `layercost:theme` e lingua in `layercost:locale`, separate dai dati e non incluse nei backup; i selettori rapidi in sidebar scrivono le stesse chiavi.
- Prima della migrazione v1 → v2 il raw viene salvato in `layercost:backup:schema-1`; la migrazione v3 → v4 conserva il raw in `layercost:backup:schema-3`.
- In modalità ospite nessun backend, account o analytics. Con account, configurazione e preventivi sono nel workspace Supabase condiviso `layercost-prod` in regione EU (Frankfurt); la sessione è un token tecnico in `localStorage` e non entra nei backup. Due account owner accedono allo stesso archivio; il signup pubblico è disabilitato.
- Google login (EVO-1): l'app usa OAuth con Supabase e Google solo per `openid`, `email` e `profile`. Non salva token Google, non accede a Drive/Gmail e non invia dati economici a Google. Supabase conserva il collegamento dell'identità (`auth.identities`) e l'email; l'app espone solo il provider collegato e l'email dell'account. Il code verifier PKCE è un valore tecnico temporaneo in `localStorage`, consumato al callback e fuori dai backup. Il Client ID è pubblico; il Client Secret vive solo nel dashboard Supabase o in una env locale non committata.
- Richiesta accesso (EVO-3a): la pagina `/#/request-access` invia a **Formspree** (processore, USA) solo i campi del modulo (email, nome, messaggio) e solo dopo un invio esplicito. L'endpoint `VITE_ACCESS_REQUEST_ENDPOINT` è pubblico e non è un segreto. Formspree conserva le submission per **30 giorni**; l'email di notifica dell'amministratore viene cancellata dopo la decisione o entro **12 mesi**. Nessun account, utente o membership viene creato; nessun dato dell'app, preventivo o configurazione viene inviato. Nessun analytics, cookie first-party o newsletter. Runbook e cancellazione in `docs/engineering/access-requests.md`.
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
- **EVO-1 (29/10/2026):** OAuth client Google Web creato, provider configurato in Supabase, login verificato in locale contro il backend di produzione e in produzione. PR #24 mergiata con squash `51d3fb9`; produzione aggiornata a `index-BN8y8TA2.js` / `index-B2c8cUBY.css` con `VITE_AUTH_GOOGLE_ENABLED=true` su Production e Preview. In produzione sono verificati il pulsante, il redirect a Supabase/Google e il callback di annullamento; smoke verde. Il secondo owner ha completato il collegamento Google il 29/10/2026. Rollback: disabilitare Google in Supabase e rimuovere il flag. Procedura in `docs/engineering/workspace-runbook.md` §15.
- **EVO-3a (29/10/2026):** PR #26 mergiata con squash `125f0d5` e distribuita. Formspree è configurato: form di produzione e di test creati, endpoint impostati in `.env.local` e su Vercel (Production/Preview/Development), notifica email all’amministratore verificata, progetti separati e **Restrict to Domain = `layercost.vercel.app`** sul progetto di produzione. Produzione aggiornata a `index-B6Cg37Ap.js` / `index-G-eqO2lr.css`; submission reale dalla pagina `/#/request-access` verificata (POST a `https://formspree.io/f/xrpplrwn`, nessuna scrittura Supabase, card “Richiesta inviata”) e smoke di produzione verde. Runbook in `docs/engineering/access-requests.md`; rollback: rimuovere la env o disabilitare il form.
- **EVO-5 (30/10/2026):** landing pubblica, routing `/#/calculator`, pre-render SEO e `PublicLayout` distribuiti con la PR #30 (squash `29b954b`) e la copy gratuita della PR #32 (squash `294c6f1`, build `index-DskoieRT.js` / `index-DYXu1jt6.css`). Verificati in produzione: HTML pre-renderizzato, `/calculator` e `/welcome`, `robots.txt` con `Allow: /`, `sitemap.xml`, assenza di `X-Robots-Tag`, asset `landing/` e `og-image.jpg`; smoke verde. In locale: `npm run check` (249 unitari, budget 218,2/230 KB e HTML 6,0/10 KB), `npm run test:e2e` (68 E2E, 49 + 1 passati, 19 saltati), auth 3, sync 3, baseline visuali Linux (12 test, 42 screenshot); `inspect.mjs` sulla landing 0 FAIL, 1 WARN `no-footage` motivato. Dettagli in `docs/planning/evo-5-landing-page.md` e ADR-0029.
- **Limite `.3mf` (29/10/2026):** PR #28 mergiata con squash `338d693` e distribuita; produzione aggiornata a `index-BR5hKjFi.js` / `index-G-eqO2lr.css`. Limite del file compresso portato a **250 MiB** e del contenuto decompresso a **1 GiB**; il messaggio `ARCHIVE_TOO_LARGE` mostra le soglie correnti. Smoke di produzione verde.
- Le preview Vercel sono protette da SSO; la produzione è pubblica. Per verificare una preview serve un browser autenticato su Vercel.
- `vercel.json` configurato (framework Vite, output `dist`, header di sicurezza).
- Deploy automatico su push su `main` (verificato dallo status check Vercel).
- Header verificati in produzione: `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`; con EVO-5 `X-Robots-Tag` non è più presente, così la root è indicizzabile.
- `robots.txt` con `Allow: /` e `sitemap.xml`; `sitemap.xml` contiene la root; `index.html` ha canonical, Open Graph, Twitter e JSON-LD.

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
- Google login **distribuito e verificato live per entrambi gli account** (EVO-1/ADR-0025): OAuth client e provider Supabase configurati, flag `VITE_AUTH_GOOGLE_ENABLED=true` su Vercel Production/Preview; entrambi gli account hanno un’identità Google (2 su 2). Il consenso mostra il dominio Supabase finché non si configura un custom domain. Il budget JS iniziale è a **218,2/230 KB** dopo EVO-5: il limite è stato alzato con motivazione in ADR-0026 e ADR-0029, quindi il prossimo aumento va motivato o accompagnato da una riduzione.
- Richiesta accesso **live in produzione** (EVO-3a/ADR-0026): form Formspree di produzione e test creati, endpoint configurati in `.env.local` e su Vercel, notifica email all’amministratore verificata, progetti separati e **Restrict to Domain = `layercost.vercel.app`** sul progetto di produzione. La submission reale dalla pagina `/#/request-access` è arrivata a Formspree e lo smoke è verde. Il piano Free include **50 invii/mese**, archivio **30 giorni** e nessun export. Non c’è autoresponse al richiedente: la conferma è in pagina e l’amministratore risponde manualmente. La pagina non crea utenti/account/membership. Se l’endpoint manca, la route mostra “Il modulo non è disponibile in questa build”. Resta solo la pulizia delle submission di prova.
- La landing EVO-5 è **live**; l’indicizzazione inglese separata (`/en` o `?lang=en`) è rimandata; gli screenshot della landing sono in tema chiaro anche quando l’interfaccia è scura; il marker `layercost:hasVisited` non è un dato dell’app e non entra nei backup. Dopo EVO-5 il budget JS è a **218,2/230 KB** e l’HTML a **6,0/10 KB**: il prossimo aumento va motivato o accompagnato da una riduzione.
- Lo smoke di produzione rinomina gli ID seed nel browser perché gli ID delle entità sono globali e `ws-doublelayer` li contiene già; non è una modifica ai dati di produzione.
- Baseline visual cloud non ancora aggiunta: le schermate login/sync/conflitto sono coperte da E2E e axe, ma non da screenshot di regressione.
- Sync senza realtime: pull completo all'avvio, al focus, dopo una scrittura e su “Sincronizza ora”. Accettabile per due utenti.
- Un solo workspace condiviso previsto. Gli ID sono PK globali: due workspace nello stesso database con gli stessi ID seed colliderebbero; una multi-tenancy piena richiederebbe PK `(workspace_id, id)`. L’E2E di isolamento usa un secondo workspace con dati propri e ID univoci, non con il seed.
- L’audit del preventivo mostra “te” o “un altro membro”, non l’email: con due owner identifica l’altra persona, ma con più membri servirà una directory o un nome visibile.
- Il comando `npm run test:e2e:sync` azzera il database Supabase **locale** e richiede `psql`; non va eseguito contro un progetto remoto.
- Import `.3mf` disponibile per file già slicati. Performance verificata con un file reale (22 MB compressi, 75 MB decompressi) e con un archivio sintetico da 50 MB; il fixture Bambu reale resta da autorizzare.
- Interfaccia inglese chiusa (T5.6.1–T5.6.5, ADR-0019); preventivi modificabili fino all’invio e card del calcolatore (T5.13–T5.14, ADR-0020); preferenze rapide, azioni in alto, colore filamento e vista cliente separata (T5.15–T5.19).
- Le baseline visive sono **42** (21 italiane e 21 inglesi): 36 dell'app rigenerate il 28/10/2026 e 6 della landing aggiunte con EVO-5 a 1440/768/390 px. Le baseline desktop dell'app sono state rigenerate dopo la voce **Panoramica**. Le schermate cloud non hanno ancora una baseline visual dedicata; axe copre login, impostazioni sync, primo login, conflitto e isolamento.
- Export `.xlsx` per analisi esterna; il backup JSON resta l’unica copia esterna completa.
- Nessun magazzino bobine.
- Migrazioni schema minime (v4; rifiuto versioni future).
- Guida iniziale come checklist, non wizard multi-step.

---

## 7. Prossimi passi

1. **T5.3 — Import diretto da `.3mf`**: **chiuso** (fixture, parser ZIP/XML con worker, mapping puro, UI, performance e deploy).
2. **T5.6 — Interfaccia inglese**, **T5.12 — Export `.xlsx`** e **T5.20 — Sconti**: chiusi. **T5.13–T5.19**: preventivi modificabili, card del calcolatore, preferenze rapide, azioni in alto, colore filamento, utile in euro e vista cliente separata. **T5.4.0–T5.4.6 chiusi**. Il resto del backlog è chiuso/non in scope.
3. **T5.4 — Sync cloud**: richiesto il 26/10/2026; Supabase Free, email/password, workspace condiviso (ADR-0024). **T5.4.0–T5.4.6 chiusi** e cloud live in produzione. Follow-up opzionale: baseline visual dedicata alle schermate cloud.
4. **Produzione Vercel:** aggiornata il 30/10/2026 (`index-DskoieRT.js` / `index-DYXu1jt6.css`), landing EVO-5 con copy gratuita, cloud, Google, EVO-3a e limite `.3mf` attivi; smoke test verde; `main` = `origin/main` = `294c6f1` (EVO-5 + copy gratuita, PR #30 e #32).
5. Verificare se `prediction` include il riscaldamento iniziale confrontandola con una stampa reale.
6. Raccogliere feedback reale sulle due stampanti e sui valori di seed.
7. **Evolutive:** **EVO-1 — Google login** implementato (ADR-0025) e distribuito in produzione, verificato live per **entrambi gli account** (2 identità Google su 2). **EVO-3a — Richiedi accesso** implementato, configurato con Formspree e distribuito (ADR-0026). **EVO-5 — Landing page pubblica** distribuita in produzione il 30/10/2026 (ADR-0029, PR #30): route `/#/`, `/#/calculator` e `/#/welcome`, pre-render SEO, contenuti IT/EN, 249 unitari, 68 E2E, 42 screenshot e budget 218,2/230 KB; smoke verde. Prossimo: **EVO-2 — tetti utenti/preventivi** (ADR-0027) quando si decide il modello di apertura; poi **EVO-3b** (invite-only/allowlist) ed EVO-4 (multi-workspace, ADR-0028) solo su decisione esplicita. Piano in `docs/planning/evolutive.md` e `docs/planning/evo-5-landing-page.md`.
8. Eventuale magazzino bobine, actual vs estimated, PWA.

---

## 8. Ripresa rapida

- **Stato:** v1.0.0 + T5.4 + **EVO-1 Google login** + **EVO-3a Richiedi accesso** + **EVO-5 Landing pubblica** rilasciati e **cloud live in produzione**. `main` = `origin/main` = **`294c6f1`** (EVO-5, PR #30; copy gratuita, PR #32); EVO-3a è `125f0d5` (PR #26); EVO-1 è `51d3fb9` (PR #24); T5.4 è lo squash `1bf641e` della PR #20. Produzione: https://layercost.vercel.app, build `index-DskoieRT.js` / `index-DYXu1jt6.css`, landing su `/#/`, app su `/#/calculator`, landing forzata su `/#/welcome`, cloud, Google, richiesta accesso e import `.3mf` fino a 250 MiB attivi. Progetto Supabase `layercost-prod` (`jcxkfhjgstdgrjazlnpq`, `eu-central-1`), due account `owner` nello stesso workspace, entrambi con Google. **T5.4.0–T5.4.6 chiusi**; follow-up opzionale: baseline visual cloud/accesso.
- **Ultima verifica (30/10/2026):** `npm run check` verde (249 unitari, budget 218,2/230 KB iniziali e 284,5/350 KB totali, HTML 6,0/10 KB), `db:test` 33 pgTAP, `test:e2e` 68 test (prima esecuzione 49 passati + 19 saltati, seconda 1 passato per l’endpoint mancante), auth 3, sync 3, 68 scansioni axe, 12 test visuali Linux (42 screenshot). La landing aggiunge 11 E2E e 6 screenshot; `inspect.mjs` sulla landing dà 0 FAIL, 1 WARN `no-footage` motivato (prodotto software, demo interattiva e screenshot reali). Deploy EVO-5 completato il 30/10/2026 (`index-DskoieRT.js` / `index-DYXu1jt6.css`): HTML pre-renderizzato, `/calculator`, `/welcome`, `robots.txt`, `sitemap.xml`, header senza `X-Robots-Tag`, asset `landing/` e `og-image.jpg` verificati; smoke di produzione verde. Keep-alive e backup manuali restano verdi. CI di `main` (`294c6f1`) verde (`check`, `e2e`, `database`).
- **Da leggere prima di riprendere:** `AGENTS.md`, `TASKS.md` (fase 5 e sezione Evolutive), **`docs/planning/evolutive.md`**, **`docs/planning/evo-3a-access-request.md`**, **`docs/planning/evo-5-landing-page.md`**, **`docs/engineering/access-requests.md`**, **`docs/planning/t5.4-cloud-sync.md`** (incluso §0), `docs/planning/phase-5.md` §4, `docs/planning/i18n-inventory.md`, `docs/engineering/architecture.md` §4, `docs/engineering/persistence.md` §9, `docs/engineering/deployment.md` §1.1 e §13, **`docs/engineering/workspace-runbook.md`** (incluso §15 Google), **`docs/engineering/backup-restore.md`**, `docs/engineering/testing.md`, `docs/domain/data-model.md` §7, ADR-0017/0018/0019/0020/0022/0023/**0024**/**0025**/**0026**/**0029**, `supabase/config.toml`, le tre migrazioni in `supabase/migrations/`, `supabase/tests/rls.test.sql`, `src/data/cloud/{client,auth,oauth,gateway,sync,sync-state}.ts`, `src/data/cloud-cache.ts`, `src/state/{auth-store,sync-store}.ts`, `src/features/{auth,sync,access,landing}/`, `src/app/{PublicLayout,AppShell}.tsx`, `src/data/visit.ts`, `tests/e2e/landing.spec.ts`.
- **Comandi:** `npm run dev`, `npm run check`, `npm run test:e2e` (due build: con e senza endpoint Formspree), `npm run budget`, `npm run db:test` (Supabase locale/Docker), `npm run test:e2e:auth`, `npm run test:e2e:sync` (azzera il DB locale e richiede `psql`), `npm run smoke:production` (richiede `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `PROD_URL`), `npm run capture:landing` (screenshot reali della landing). Per lo stato git: `git status -sb` e `git log -1 --oneline`.
- **Ambiente:** Supabase locale (Docker) e progetto di produzione EU sono attivi. `.env.local` contiene le credenziali di produzione (`SUPABASE_DB_PASSWORD`, `SUPABASE_URL`, chiavi, `SUPABASE_DB_URL`, `BACKUP_ENCRYPTION_KEY`) ed è gitignored: non committarlo e non condividere. Su Vercel ci sono `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_AUTH_GOOGLE_ENABLED=true` e `VITE_ACCESS_REQUEST_ENDPOINT` (Production = form reale, Preview/Development = form di test). In locale `VITE_ACCESS_REQUEST_ENDPOINT` punta al form di test. La service role e il Client Secret Google non sono su Vercel. Secret GitHub presenti: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_DB_URL`, `BACKUP_ENCRYPTION_KEY`.
- **Punti aperti:** **EVO-1** è distribuito e verificato per entrambi gli account (2 identità Google su 2); il collegamento del secondo owner è completato. **EVO-3a** è live e verificato; resta solo la cancellazione delle submission di prova dal form Formspree. Il piano Free ha 50 invii/mese, archivio 30 giorni e nessun export, e non manda email al richiedente. **EVO-5** è distribuita e verificata in produzione; lo smoke è verde e gli header SEO sono corretti. **EVO-2 tetti utenti/preventivi** è il task successivo (ADR-0027) e dipende dalla decisione sul modello di apertura. Baseline visual cloud e accesso come follow-up; un solo workspace previsto e ID globali; l’audit UI mostra “un altro membro”, non l’email. Verificare se `prediction` include il riscaldamento iniziale con una stampa reale; aggiungere un fixture Bambu committabile; misurare l'import con un file reale da 150–250 MB. Prove manuali Safari/VoiceOver **rimandate** il 26/10/2026 (non bloccanti); checklist in `docs/engineering/manual-checks.md` (ora include Google). La preview Vercel richiede login SSO; la produzione è pubblica.
- **Branch:** `main` = `origin/main` = `294c6f1` e tag `v1.0.0`; EVO-1 è mergiata con la PR #24 (`51d3fb9`), EVO-3a con la PR #26 (`125f0d5`), il limite `.3mf` con la PR #28 (`338d693`), EVO-5 con la PR #30 (`29b954b`) e la copy gratuita con la PR #32 (`294c6f1`); i branch dedicati sono stati eliminati. Non push diretto su `main`.
- **Vincolo:** non toccare dominio, formule, `engineVersion`, snapshot o persistenza senza un nuovo ADR e i test collegati. EVO-1/ADR-0025 non cambia formule, `engineVersion`, snapshot, schema locale v4, RLS o sync: cambia solo il modo di ottenere la sessione. EVO-3a/ADR-0026 aggiunge una pagina pubblica e una chiamata esplicita a Formspree, ma non tocca `AppData`, auth, RLS, sync, formule, `engineVersion` o snapshot. EVO-5/ADR-0029 aggiunge la landing pubblica, il routing e il pre-render SEO, ma non tocca `AppData`, auth, RLS, sync, formule, `engineVersion`, snapshot o schema locale v4. Tema e lingua restano fuori da `AppData`; `Quote.locale` e gli sconti hanno le migrazioni v2 e v4 descritte in ADR-0019 e ADR-0023. Il sync Supabase introduce backend/auth: decisione in **ADR-0024**, che supersede in parte ADR-0018.

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
- `docs/adr/0026-request-access-formspree.md` — pagina pubblica “Richiedi accesso”, Formspree Free, privacy, retention e budget.
- `docs/adr/0029-public-landing-page.md` — landing pubblica, routing `/#/calculator`, pre-render SEO e budget.
- `docs/planning/evo-3a-access-request.md` — piano operativo di EVO-3a.
- `docs/planning/evo-5-landing-page.md` — piano operativo e acceptance della landing.
- `docs/engineering/access-requests.md` — runbook amministratore per richieste, approvazione manuale, retention e cancellazione.
- `scripts/test-e2e.mjs` — doppia build con/senza endpoint Formspree per gli E2E.
- `scripts/smoke-production.mjs` — smoke di produzione con workspace temporaneo e ID rinnovati.
- `docs/adr/0019-english-ui.md` — interfaccia inglese e `Quote.locale`.
- `docs/adr/0022-internal-customer-quote-views.md` — vista interna e vista cliente.
- `docs/adr/0023-line-and-quote-discounts.md` — sconti di riga e di preventivo.
- `docs/design/ui-brief.md` — requisiti per la fase design.
- `docs/design/directions.md` — direzioni e scelta visiva.
- `docs/design/design-system.md` — token, componenti, accessibilità e stampa.
- `docs/adr/0015-direzione-visiva.md` — decisione sulla direzione.
