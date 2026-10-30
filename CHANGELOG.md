# Changelog

## [Unreleased]

### Added

- Spazi separati (EVO-4, ADR-0028): ogni utente ha uno **spazio personale** automatico e può appartenere a più **spazi condivisi**. `workspaces.kind` distingue `personal`/`shared`; le PK diventano `(workspace_id, id)` su tariffe, stampanti, materiali, extra e preventivi, così ogni spazio riusa gli stessi ID di seed senza collisioni; le FK restano confinate allo spazio. Nuova tabella `workspace_invites` con solo hash SHA-256 del codice, scadenza 1–30 giorni, ruolo, revoca e tetti (10 spazi condivisi posseduti per utente, 20 membri per spazio). RPC `create_workspace`, `ensure_personal_workspace`, `create_invite`, `revoke_invite`, `redeem_invite`, `list_my_workspaces`, `list_workspace_members`, `list_workspace_invites`, `leave_workspace`. Selettore dello spazio in sidebar e menu mobile, sezione **Spazio** in Impostazioni con nome, membri (email solo per gli owner), inviti e uscita, dialogo “Hai un codice invito?”, i18n IT/EN. Cache e outbox separate per spazio (`layercost:cloud-cache:<id>`, `layercost:sync-state:<id>`), spazio attivo in `layercost:active-workspace`, seed idempotente dei nuovi spazi con `layercost:pending-seed`; il cambio spazio non apre il dialogo di primo accesso e non mescola le modifiche in sospeso. `ws-doublelayer` resta lo spazio condiviso dei due account e nessun dato si sposta; la modalità locale senza account resta invariata. 289 unitari, 74 asserzioni `db:test` (33 RLS + 41 multi-workspace), 61 E2E default, 3 E2E auth, 5 E2E sync; budget JS iniziale 226,6/230 KB. Deploy in produzione da fare: backup, migrazione `20261030120000_multi_workspace.sql` prima del client, smoke. Nessuna modifica a formule, `engineVersion`, snapshot economici o schema locale v4.
- Documentazione in-app e Suggerimenti (EVO-6, ADR-0030): gruppo sidebar **Aiuto** con **Documentazione** (`/#/docs/primi-passi`, sezioni profonde `/#/docs/<id>`) e **Suggerimenti** (`/#/feedback`). Guida a dieci sezioni con indice sticky su desktop e orizzontale su mobile, blocchi tipizzati, avvisi, link utili, precedente/successiva, CTA finale e screenshot reali (`public/docs/`, `npm run capture:docs`). Contenuti IT/EN in un dizionario locale caricato solo dal chunk lazy della guida (179 chiavi), per non aumentare il bundle iniziale. Form Suggerimenti lazy con tipo, area, titolo (120), descrizione (2000), email opzionale (254), consenso privacy e honeypot; invio a un secondo form Formspree Free con `VITE_FEEDBACK_ENDPOINT`, `_subject` e `_replyto` solo se l’email è presente; stati success/error/endpoint mancante, nessun account o dato dell’app, nessuna autoresponse. 267 unitari, 5 E2E docs, 6 E2E feedback con endpoint mockato, 1 senza endpoint, axe su docs e feedback; budget iniziale 220,2/230 KB, lazy 73,0/80 KB, totale 286,9/350 KB. Form Formspree di produzione/test creati, `VITE_FEEDBACK_ENDPOINT` impostata in `.env.local` e su Vercel (Production = produzione, Preview/Development = test), Restrict to Domain attivo sul form di produzione e submission reale sul form di test verificata. Deploy di produzione del 30/10/2026 con la PR #36 (squash `ec321fb`, build `index-BE8ZeH6G.js` / `index-VqC-Ge2M.css`): docs, immagini e form Suggerimenti verificati. Restano submission di produzione e pulizia della submission di test. Nessuna modifica a formule, `engineVersion`, snapshot, schema locale v4, auth, RLS o sync.
- Landing page pubblica (EVO-5, ADR-0029, PR #30): route `/#/` per la landing, `/#/calculator` per il calcolatore e `/#/welcome` per la landing forzata. `PublicLayout` fuori da `HydrationGate`, `SyncController` e dialoghi cloud; marker `layercost:hasVisited`; voce **Panoramica** in sidebar; redirect al calcolatore per dati locali o sessione autenticata. Contenuti IT/EN completi (header, hero con screenshot reale, 6 funzionalità, 3 passi con demo dal vivo del motore, privacy/local-first, cloud, 5 FAQ, CTA e footer). Pre-render italiano in `index.html` a build time, canonical, Open Graph, Twitter, JSON-LD, `robots.txt` con `Allow: /`, `sitemap.xml` e rimozione di `X-Robots-Tag: noindex`. Screenshot reali in `public/landing/` e `og-image.jpg`; budget JS 218,2/230 KB e HTML 6,0/10 KB. 249 unitari, 68 E2E, 42 screenshot, 68 scansioni axe. Nessuna modifica a formule, `engineVersion`, snapshot, schema locale v4, auth, RLS o sync. Deploy di produzione del 30/10/2026: build `index-CciHjhFo.js` / `index-DicimwUj.css`, smoke verde. Copy cloud semplificata con PR #32 (`294c6f1`); switch tema/lingua in top bar con PR #34 (`8d7d2e2`): nessun dettaglio tecnico del provider; tutto gratuito, cloud compreso, su richiesta di accesso.
- Import `.3mf` (T5.3.1–T5.3.5): fixture reali verificate per Kobra 3, Kobra X, multi-piatto e progetto non slicato; parser ZIP/XML locale con limiti di sicurezza, Web Worker e fallback G-code; mapping puro con proposte di stampante/materiali e righe `PrintLine` senza supplementi AMS/ACE; UI con drag & drop, anteprima piatti, mappatura, conferma append/replace, focus e alert di esito; performance verificata con un file reale da 22 MB compressi/75 MB decompressi e con un archivio sintetico da 50 MB; regressione visiva del modale. Il worker usa `@xmldom/xmldom` perché `DOMParser` non è disponibile nei Web Worker.
- Infrastruttura inglese (T5.6.1): dizionari tipizzati it/en, `translate`/`t`/`plural`, `I18nProvider` e `useI18n`, `<html lang>`, shell collegata e inventario stringhe.
- Estrazione stringhe (T5.6.2): tutte le schermate, i componenti condivisi, le etichette di dominio, la stampa e la guida usano dizionari per area (743 chiavi); errori import/share/save mappati per codice.
- Formattazione locale (T5.6.3): `useFormat` con `Intl` (`it-IT`/`en-GB`), parsing numerico con virgola o punto, `Quote.locale` e schema v2 con migrazione e backup raw. Stampa, dettaglio e link usano la lingua del preventivo.
- Selettore lingua (T5.6.4): preferenza `layercost:locale`, Italiano/English in Impostazioni, `<html lang>`, titolo e meta description aggiornati; la bozza vuota adotta la lingua.
- Verifiche inglesi (T5.6.5): 14 scansioni axe e 18 screenshot in inglese, errori di dominio/storage tradotti, link condivisi pre-v2 compatibili. Deploy di produzione verificato.
- Preventivi modificabili (T5.13): stati `saved`/`sent`/`completed`, modifica in place con lo stesso id e prezzi congelati nello snapshot, blocco dopo invio/completamento, conferme e badge di stato; schema v3 con migrazione v1 → v2 → v3 e backup raw.
- Calcolatore a card (T5.14): intestazione, stampe, costi di lavoro e prezzo in card separate; ogni stampa in un pannello distinto con etichetta “Stampa N”.
- Preferenze rapide (T5.15): tema Sistema/Chiaro/Scuro e lingua IT/EN in fondo alla sidebar e nel menu mobile, sincronizzati con Impostazioni.
- Azioni del preventivo in alto (T5.16): gestione sotto la testata, prima del prezzo e delle righe; “Stampa / PDF” secondaria.
- Colore filamento per riga (T5.17): colore `#rrggbb` opzionale con picker, swatch in dettaglio/stampa e rimozione; schema v3 invariato.
- Utile e vista cliente (T5.18): “Guadagno” in euro nel calcolatore e nel dettaglio, con margine effettivo come nota; link condiviso e stampa standard per il cliente mostrano solo prezzi, IVA e note; “Stampa interna” dal dettaglio include costi e composizione ed è marcata “Uso interno”. Valore derivato di UI, nessun cambio a formule, schema, snapshot o `engineVersion`.
- Composizione del prezzo, righe cliccabili e stampa in tema scuro (T5.19): barra del prezzo netto divisa in costo pieno e guadagno sopra la composizione del costo; lista preventivi senza “Apri” e con riga cliccabile evidenziata all'hover; i token chiari di stampa sono limitati al foglio `.quote-print`, così l'interfaccia resta scura durante l'anteprima e il PDF mantiene i margini bianchi.
- Sconti di riga e di preventivo (T5.20, ADR-0023): sconto opzionale percentuale o a importo fisso sulla singola stampa e sul totale; l'importo fisso di riga si applica al totale della riga, gli sconti si cumulano e un importo superiore al prezzo viene limitato a zero con avviso. `QuoteResult` espone `lineDiscountTotal`, `quoteDiscount` e `discount`; `LineResult.discount` è lo sconto di riga. UI in calcolatore, riepilogo, dettaglio, stampa/PDF, link condiviso ed export `.xlsx`. Schema v4 con migrazione `discountBp` → regola percentuale, backup raw `layercost:backup:schema-3` e link condivisi pre-v4 compatibili. `engineVersion` 1.0.0.
- Card comprimibili nel calcolatore (T5.21): Preventivo, Stampe, Costi di lavoro, Prezzo e ogni riga di stampa hanno un header con drop down e sintesi compatta (data/cliente, righe/grammi/costo diretto, manodopera/extra, ricarico/IVA, nome/stampante/tempo/costo di riga). Duplica, Rimuovi, Importa `.3mf` e Ripristina default restano disponibili a card compressa. Stato locale, nessun cambio a dati, formule, schema o `engineVersion`. Baseline visive Linux rigenerate.
- Calcolatore: aggiunta riga tramite una barra trasparente a tutta larghezza sotto l’ultima card, con `+` centrale e stato accent su hover, focus e click; l’azione è stata tolta dalla testata della sezione Stampe.
- Export `.xlsx` (T5.12): writer locale senza nuove dipendenze, tre fogli (Preventivi, Righe, Materiali), valori numerici con formati Excel, intestazioni in italiano/inglese, archiviati inclusi e pulsanti in Preventivi e Impostazioni → Dati.
- Sync cloud opzionale (T5.4.1–T5.4.5): repository async con hydration gate e coda serializzata; schema Supabase con RLS, trigger e mapper; auth email/password con client lazy; gateway pull/push, cache cloud separata, outbox persistita, scritture ottimistiche su `updated_at`, primo login con backup JSON, conflitti espliciti (ricarica remota/duplica per i preventivi, mantieni locale/usa remoto per la configurazione), indicatore di stato e logout con modifiche in sospeso. Migrazioni admin per service role e cleanup dell'ultimo owner. Workspace condiviso con due owner, runbook amministrativo in `docs/engineering/workspace-runbook.md` e audit `created_by`/`updated_by` nel dettaglio (solo cloud, “te”/“un altro membro”, escluso da snapshot e link condivisi). 185 unitari, 3 E2E sync, 33 pgTAP.
- Operazioni cloud (T5.4.6): workflow giornaliero di keep-alive con alert su issue; backup settimanale data-only (`public` + `auth.users`/`auth.identities`) via session pooler, cifratura AES-256, checksum e artifact 30 giorni; restore verificato su Supabase locale e primo backup di produzione verificato; job CI `database` con Supabase locale, 33 pgTAP, 2 E2E auth e 3 E2E sync.
- Deploy cloud (28/10/2026): Supabase Free `layercost-prod` in `eu-central-1`, signup pubblico disabilitato, workspace condiviso con due account owner. Produzione https://layercost.vercel.app aggiornata a `index-D9pxS7o0.js` / `index-BPCFEMKa.css`; smoke test di produzione verde (login, sync, salvataggio, cleanup).
- Google login (EVO-1, ADR-0025): provider aggiuntivo per i due account esistenti, con email/password sempre disponibile. PKCE con redirect alla root, scambio manuale del `code` e pulizia del query string; `HashRouter` e `detectSessionInUrl: false` restano compatibili. Auto-link di Supabase per email verificata e fallback “Collega Google” (`linkIdentity`) in Impostazioni → Sincronizzazione, con “Google collegato” quando l'identità è presente. Errori OAuth mappati e tradotti IT/EN. Flag pubblico `VITE_AUTH_GOOGLE_ENABLED=true` per mostrare il pulsante e per il rollback; nessun Client Secret nel repository, nel bundle o su Vercel. Login reale verificato il 29/10/2026 in locale contro il backend di produzione e in produzione per **entrambi gli account** (2 identità Google su 2); il secondo owner ha completato il collegamento dopo la correzione dell’email. Deploy di produzione del 29/10/2026: build `index-BN8y8TA2.js` / `index-B2c8cUBY.css`, pulsante Google e callback verificati, smoke verde. Nessun cambio a formule, `engineVersion`, snapshot, schema locale, RLS o sync.
- Richiesta accesso (EVO-3a, ADR-0026): pagina pubblica e lazy `/#/request-access` raggiungibile senza login, link da login e da SyncSettings non connesso. Form con email obbligatoria (max 254), nome opzionale (max 80), messaggio opzionale (max 500), consenso privacy obbligatorio e honeypot `_gotcha`; invio `fetch` nativo a Formspree Free con `Accept: application/json`, `_subject` e `_replyto`, senza nuove dipendenze e senza secret. Stati idle/submitting/success/error/endpoint mancante; conferma `role="status"` con focus sul titolo, errore `role="alert"` con campi conservati e riprova. Nessun utente/account/membership creato, nessuna autoresponse al richiedente (conferma in pagina), Formspree processore USA con archivio 30 giorni, retention dell’email admin dopo la decisione o entro 12 mesi, nessun analytics/cookie first-party/newsletter. i18n IT/EN (36 chiavi), axe 375/1440, test unitari e E2E con Formspree mockato e doppia build con/senza endpoint. Variabile pubblica `VITE_ACCESS_REQUEST_ENDPOINT`; runbook in `docs/engineering/access-requests.md`. Nessun cambio a formule, `engineVersion`, snapshot, schema locale v4, auth, RLS o sync.
- Deploy EVO-3a (29/10/2026): PR #26 mergiata con squash `125f0d5`; produzione aggiornata a `index-B6Cg37Ap.js` / `index-G-eqO2lr.css` con Formspree attivo. Submission reale dalla pagina `/#/request-access` verificata (POST al form di produzione, nessuna scrittura Supabase, conferma in pagina) e smoke di produzione verde. Formspree: form di produzione e test separati, endpoint in `.env.local`/Vercel, notifica email verificata, Restrict to Domain sul progetto di produzione. Resta la pulizia delle submission di prova.
- Smoke di produzione (harness): gli ID delle entità sono globali, quindi un secondo workspace non può importare gli stessi ID seed di `ws-doublelayer`. Lo script rinomina gli ID seed nel browser usa-e-getta prima del primo login, resta isolato, verifica import/sync/salvataggio e pulisce workspace e utente.
- Test: 267 unitari, 80 E2E (68 precedenti + 5 docs + 7 feedback), 33 pgTAP; axe su tutte le route, incluse documentazione e Suggerimenti; 42 screenshot visuali.

### Changed

- Budget (EVO-6): i dizionari della documentazione (179 chiavi IT/EN) vivono nel chunk lazy della guida invece che nel dizionario globale; il bundle iniziale resta **220,2/230 KB** invece di salire di ~19 KB. Lazy 73,0/80 KB, totale 286,9/350 KB. Nuova variabile pubblica `VITE_FEEDBACK_ENDPOINT`; nessun segreto.
- Routing (EVO-5): tutti i link interni al calcolatore passano da `/#/` a `/#/calculator`; login, callback OAuth, condivisione, 404, richiesta accesso, smoke ed E2E aggiornati. La root è la landing pubblica; la sidebar aggiunge **Panoramica** verso `/#/welcome`.
- SEO (EVO-5): rimossi `X-Robots-Tag: noindex` e `Disallow: /`; aggiunti canonical, Open Graph, Twitter, JSON-LD, `sitemap.xml` e `Allow: /`. L’HTML iniziale contiene la landing italiana pre-renderizzata e nessun dato privato.
- Copy landing (EVO-5, PR #32): rimossi Supabase, Google/email, approvazione manuale, regione EU, workspace, localStorage e JSON dal testo pubblico. La landing e le FAQ dicono che tutto è gratuito, cloud compreso, su richiesta di accesso.
- Top bar landing (EVO-5): tema chiaro/scuro e lingua IT/EN spostati dal footer alla top bar, con due controlli compatti nello stile Strato; il footer chiude con dati e privacy.
- Budget (EVO-5): JS iniziale 218,2/230 KB (era 210 KB), HTML 6,0/10 KB (era 4 KB), totale 284,5/350 KB. Motivazione in ADR-0029.
- Import `.3mf`: il limite del file compresso passa da 100 MiB a **250 MiB** e il limite del contenuto decompresso da 500 MiB a **1 GiB**, per accettare progetti reali più grandi; il messaggio `ARCHIVE_TOO_LARGE` mostra le soglie correnti. Nuovo test sui limiti predefiniti e sul confine esatto. Nessun cambio a formule, `engineVersion`, schema o snapshot. Deploy del 29/10/2026: PR #28, squash `338d693`, produzione `index-BR5hKjFi.js` / `index-G-eqO2lr.css`, smoke verde.
- Amministrazione cloud (T5.4.4): il service role riceve grant espliciti per script admin e `protect_last_owner` consente alle richieste senza subject JWT di rimuovere l'ultimo owner, così la cancellazione di un workspace può fare cascade. Gli utenti autenticati restano protetti.
- Accento viola (T4.8, ADR-0021): `--color-data` passa a `#5b21b6` nel tema chiaro e `#9d7bf5` nel tema scuro, con selezione, pill informativa e favicon allineate; la barra “Completa i dati” del riepilogo usa l'accent, mentre la pillola “Da completare” resta warning. Test E2E aggiornati e baseline visive Linux rigenerate. Nessun cambio a formule, `engineVersion`, schema, snapshot o persistenza.
- `QuoteResult.discount` ora è la somma dello sconto di riga e dello sconto del preventivo; i due valori sono disponibili separatamente in `lineDiscountTotal` e `quoteDiscount`. `QuotePricing.discountBp` è sostituito da `QuotePricing.discount: DiscountRule`. `engineVersion` passa da `0.1.0` a `1.0.0`; lo schema passa da v3 a v4 con migrazione automatica.
- Budget del bundle: il limite JS iniziale passa da 205 KB a **210 KB** per le 36 chiavi i18n della pagina “Richiedi accesso”, che restano nei dizionari centrali anche se la pagina è lazy. Misura dopo EVO-3a: 206,6 KB gzip iniziali, 55,8 KB lazy, 271,5 KB totali. Motivazione in ADR-0026 e `STATUS.md`.

## [1.0.0] — 2026-10-24

### Added

- Direzione visiva **A — Strato** (ADR-0015) e specifiche in `docs/design/directions.md`.
- Design system Strato: token, font Archivo + Source Serif 4 self-hosted, componenti, stack dei costi, focus e stampa.
- Redesign T4.4 delle schermate: shell open plane, calcolatore 7/12 + 5/12 con risultato sticky, confronto rapido tra stampanti, preventivi e dettaglio con prezzo + stack, anagrafiche a righe o tabelle, impostazioni con anteprima del prezzo, condivisione read-only e stampa A4.
- Dark mode T4.7 (ADR-0016): preferenza Sistema/Chiaro/Scuro in Impostazioni → Aspetto, palette grafite calda con token dedicati, stampa sempre chiara; la preferenza vive in `layercost:theme` e non entra in snapshot o backup.
- Stati e rifiniture T4.5: conferma accessibile prima di scartare o sostituire la bozza, eliminazioni con `Modal`, alert “Preventivo salvato”, vuoti con azione e microcopy su bozza, storico e preventivo non ricalcolabile.
- Verifiche di release 1.0: audit `axe` WCAG 2.2 AA su tutte le route in tema chiaro e scuro, test cross-browser WebKit, stampa/PDF A4, regressione visiva con baseline Linux, budget del bundle e guardia contro richieste esterne.
- Test: 42 unitari, 18 E2E (3 visuali su CI), inspector 0 FAIL/1 WARN motivato.

### Changed

- Tariffa energia di default: **€0,20/kWh** (era €0,25/kWh).
- Manutenzione di default: **€0,01/h** per Kobra 3 e Kobra X (era €0,03/h).
- Vita utile di default: **15.000 h** per Kobra 3 e **20.000 h** per Kobra X; valore residuo **20%**.
- Stampa A4 ridisegnata: intestazione, meta, righe, composizione in grigi, totali, note e footer.
- Tema scuro: la stampa riporta sempre i token ai valori chiari, anche se lo schermo è scuro.
- Conferme distruttive e di sostituzione della bozza passano da `Modal` accessibili, non da `window.confirm`; l’alert di salvataggio non si ripete al reload.
- Versione del progetto portata a **1.0.0**.

### Fixed

- Stack dei costi: i componenti di riga vengono moltiplicati per la quantità e gli importi della legenda sono allocati in centesimi, così la somma coincide con il costo pieno mostrato.
- Tabella dettaglio: le sei componenti sono allocate al costo diretto della riga; righe e totali di colonna tornano al centesimo.
- Grammi totali: includono la quantità della riga.
- `formatCurrency`: arrotondamento dei centesimi con aritmetica intera, senza il mezzo centesimo instabile.
- Tabelle con scroll orizzontale: contenitore raggiungibile da tastiera con nome accessibile, anche a 390 px.

### Known limitations

- Nessuna sincronizzazione cloud, account o backup remoto.
- Nessun import diretto da slicer o da presa intelligente.
- Nessun magazzino bobine né confronto actual/estimated.
- Migrazioni schema minime: le versioni future vengono rifiutate.
- Baseline visuali generate su Linux: i test visuali girano in CI, non su macOS.
- Prova manuale su stampante fisica e screen reader reale consigliata.

Formato basato su [Keep a Changelog](https://keepachangelog.com/it/1.1.0/) e [SemVer](https://semver.org/).

## [0.1.0] — 2026-10-23

### Added

- Motore di calcolo puro: materiale, energia, ammortamento, manutenzione, manodopera, extra, riserva guasti.
- Prezzo con ricarico/margine, sconto, arrotondamento e IVA opzionale.
- Allocazione dei costi fissi e dei prezzi di riga con resti più grandi.
- Configurazione di stampanti, materiali, tariffe energia con storico, extra e impostazioni.
- Seed per Anycubic Kobra 3 e Kobra X con ACE 2 Pro.
- Calcolatore singola stampa e lotto, con più materiali per riga e override.
- Confronto tra due stampanti.
- Preventivi salvati con snapshot completo, storico, duplicazione, aggiornamento prezzi e archiviazione.
- Export/import JSON, reset, backup automatico prima dell'import.
- Link condivisibile compresso, import nel proprio archivio.
- Stampa/PDF tramite stylesheet dedicato.
- Formattazione italiana, layout responsive, focus e label di base.
- Test: 16 unitari/dati + 3 E2E.
- CI GitHub Actions verde (`check` + `e2e`), configurazione Vercel, documentazione completa e 14 ADR.
- Repo GitHub `doublelayerprints/layercost` (privata).
- Deploy Vercel live su https://layercost.vercel.app.

### Known limitations

- Design definitivo non ancora realizzato.
- Nessuna sincronizzazione cloud.
- Nessun import diretto da slicer o presa intelligente.
- Nessun audit automatico di accessibilità.
