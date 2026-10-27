# Changelog

## [Unreleased]

### Added

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
- Calcolatore: aggiunta riga tramite una barra trasparente a tutta larghezza sotto l’ultima card, con `+` centrale e stato accent su hover, focus e click; l’azione è stata tolta dalla testata della sezione Stampe.
- Export `.xlsx` (T5.12): writer locale senza nuove dipendenze, tre fogli (Preventivi, Righe, Materiali), valori numerici con formati Excel, intestazioni in italiano/inglese, archiviati inclusi e pulsanti in Preventivi e Impostazioni → Dati.
- Test: 112 unitari, 36 E2E, 36 screenshot visuali.

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
