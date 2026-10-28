# LayerCost — Stato del progetto

**Data:** 28 ottobre 2026
**Versione:** 1.0.0 — prima release stabile
**Repo:** https://github.com/doublelayerprints/layercost (privata)
**Live:** https://layercost.vercel.app
**Locale:** `/Users/tancredi/Desktop/DoubleLayeRPrints/layercost`
**Branch:** `main`

---

## 1. Sintesi

LayerCost è una SPA statica, local-first, per calcolare costo e prezzo di stampe 3D singole o di lotti. La **v1.0.0** completa le fasi 0–4 del piano:

- fondamenta, tooling, CI e documentazione;
- motore di costo e prezzo;
- configurazione, persistenza locale, export/import;
- UI funzionale, storico, condivisione, stampa/PDF e confronto;
- direzione **A — Strato**, design system, dark mode, stati e verifiche di release.

T4.1–T4.7 sono chiusi, mergiati in `main` e distribuiti in produzione. La release è verificata con test unitari, E2E, WebKit, axe, stampa/PDF, regressione visiva e budget del bundle.

**Fase 5:** **T5.3 è chiuso** il 26/10/2026. Le fixture `.3mf` reali sono verificate per Kobra 3, Kobra X, multi-piatto e progetto non slicato; il parser ZIP/XML locale è implementato con limiti di sicurezza, Web Worker e `ThreeMfSummary`; il mapping puro propone stampante/materiali e produce `PrintLine[]`; la UI “Importa .3mf” è disponibile nel calcolatore. Performance: file reale da 22 MB compressi in 915 ms, archivio sintetico da 50 MB in ~100 ms e progetto non slicato da 15 MB rifiutato in ~100 ms. **T5.6 è chiuso**: infrastruttura i18n, estrazione stringhe, formattazione, `Quote.locale`, selettore e verifiche in inglese. **T5.12 è chiuso**: export `.xlsx` locale di preventivi, righe e materiali. **T5.15–T5.19 chiusi** il 26–28/10/2026: preferenze rapide in sidebar, azioni del preventivo in alto, colore filamento per riga, utile in euro e separazione tra vista interna e cliente. Il prossimo task richiesto è **T5.4 sync** con Supabase Free, workspace condiviso e magic link; l’implementazione non è ancora iniziata.

---

## 2. Cosa è implementato

### Motore

- Materiale con più materiali per riga.
- Energia da W medi per famiglia, non da potenza nominale.
- Ammortamento + manutenzione.
- Manodopera, extra e riserva guasti `p/(1−p)`.
- Ricarico o margine, sconto, arrotondamento, IVA opzionale.
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
- Tema chiaro, scuro o di sistema (ADR-0016), con preferenza salvata sul dispositivo e stampa sempre chiara.
- Selettori rapidi di tema (Sistema/Chiaro/Scuro) e lingua (IT/EN) in fondo alla sidebar e nel menu mobile, sincronizzati con Impostazioni (T5.15).
- Azioni del preventivo (modifica, invio, completamento, duplica, archivia, elimina) in una card subito sotto la testata, prima del prezzo e delle righe (T5.16).
- Colore del filamento per riga: color picker nativo, swatch in dettaglio, tabella costi e stampa/PDF, con rimozione; è un dato opzionale, non entra nel calcolo (T5.17).
- Utile in euro in calcolatore e dettaglio (T5.18), con margine effettivo come nota; link condiviso e stampa standard per il cliente mostrano solo prezzi, IVA e note, mentre “Stampa interna” include costi e composizione ed è marcata “Uso interno”.
- Composizione del prezzo (T5.19): barra del prezzo netto divisa in costo pieno e guadagno sopra la composizione del costo; nella lista preventivi l'intera riga è cliccabile e si evidenzia all'hover, senza il pulsante “Apri”.
- Export `.xlsx` di preventivi, righe e materiali (T5.12): writer locale senza nuove dipendenze, tre fogli, valori numerici con formati Excel, intestazioni in italiano/inglese, archiviati inclusi e pulsanti in Preventivi e Impostazioni → Dati.
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
- Deploy: build `index-CKBs4VCV.js` verificata in produzione prima di questo batch. Il batch T5.15–T5.19 ha build locale `index-CZsBAkWj.js` / `index-TxJUUDVw.css`; preview Vercel e baseline visive sono da verificare al deploy.

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

| Verifica           | Stato                                                                                          |
| ------------------ | ---------------------------------------------------------------------------------------------- |
| TypeScript strict  | verde                                                                                          |
| oxlint             | verde                                                                                          |
| Test unitari/dati  | 116 superati                                                                                   |
| Test E2E           | 36 superati in CI (30 eseguiti + 6 visual; 2 WebKit)                                           |
| Accessibilità      | axe WCAG 2.2 AA: 40 scansioni (26 it + 14 en), 0 violazioni                                    |
| Regressione visiva | 36 screenshot (18 it + 18 en) a 1440/768/390 px, baseline Linux                                |
| Build produzione   | verde (~666 KB JS main + ~108 KB worker; ~189 KB gzip JS; ~38 KB CSS; ~57 KB font)             |
| Budget bundle      | 285,8 KB gzip totali su 350 KB (limite JS 221,2 KB su 225 KB)                                  |
| CI GitHub `check`  | verde su `main`                                                                                |
| CI GitHub `e2e`    | verde su `main`                                                                                |
| Vercel produzione  | deploy 28/10/2026, build `index-C7Ct7znW.js` / `index-DH8EgtHU.css`; accent e barra verificati |

Comandi:

```bash
npm run check
npm run test:e2e
npm run budget
npm run test:visual   # solo con baseline Linux; in locale i test visual sono saltati
```

---

## 4. Dati e privacy

- Dati in `localStorage`, chiave `layercost:data`, schema v3 con `Quote.locale`, `Quote.status` e `PrintLine.color` opzionale.
- Preferenza del tema in `layercost:theme` e lingua in `layercost:locale`, separate dai dati e non incluse nei backup; i selettori rapidi in sidebar scrivono le stesse chiavi.
- Prima della migrazione v1 → v2 il raw viene salvato in `layercost:backup:schema-1`.
- Nessun backend, account o analytics.
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
- Nessuna sincronizzazione cloud: richiesta il 26/10/2026 (Supabase Free, workspace condiviso, magic link) ma non ancora implementata. Vedi ADR-0018.
- Import `.3mf` disponibile per file già slicati. Performance verificata con un file reale (22 MB compressi, 75 MB decompressi) e con un archivio sintetico da 50 MB; il fixture Bambu reale resta da autorizzare.
- Interfaccia inglese chiusa (T5.6.1–T5.6.5, ADR-0019); preventivi modificabili fino all’invio e card del calcolatore (T5.13–T5.14, ADR-0020); preferenze rapide, azioni in alto, colore filamento e vista cliente separata (T5.15–T5.19).
- Le 36 baseline visive sono state rigenerate il 28/10/2026 per includere T5.15–T5.19, T5.12, la barra “Aggiungi riga” e l'accento viola. La preview Vercel del batch è verificata al deploy su `main`.
- Export `.xlsx` per analisi esterna; il backup JSON resta l’unica copia esterna completa.
- Nessun magazzino bobine.
- Migrazioni schema minime (v3; rifiuto versioni future).
- Guida iniziale come checklist, non wizard multi-step.

---

## 7. Prossimi passi

1. **T5.3 — Import diretto da `.3mf`**: **chiuso** (fixture, parser ZIP/XML con worker, mapping puro, UI, performance e deploy).
2. **T5.6 — Interfaccia inglese** e **T5.12 — Export `.xlsx`**: chiusi. **T5.13–T5.19**: preventivi modificabili, card del calcolatore, preferenze rapide, azioni in alto, colore filamento, utile in euro e vista cliente separata. Prossimo: **T5.4 sync** (richiesto); il resto del backlog è chiuso/non in scope.
3. **T5.4 — Sync cloud**: richiesto il 26/10/2026; Supabase Free, workspace condiviso, magic link. Prima serve il refactor async di `DataRepository`/store, poi schema/RLS, conflitti e test.
4. **Rigenerare le baseline visive** di T5.15–T5.19, T5.12 e della barra “Aggiungi riga” in CI e verificare la preview Vercel.
5. Verificare se `prediction` include il riscaldamento iniziale confrontandola con una stampa reale.
6. Raccogliere feedback reale sulle due stampanti e sui valori di seed.
7. Eventuale magazzino bobine, actual vs estimated, PWA.

---

## 8. Ripresa rapida

- **Stato:** v1.0.0 rilasciata; `main` pulito e allineato a `origin/main`. **T5.3 chiuso**, **T5.6 chiuso** (T5.6.1–T5.6.5), **T5.12 chiuso** (export `.xlsx`) e **T5.13–T5.19 chiusi**: i18n, formattazione locale, schema v3 con `Quote.locale`/`Quote.status`, selettori rapidi di tema e lingua, preventivi modificabili fino all’invio, card del calcolatore, azioni in alto, colore filamento, export Excel e vista cliente separata con utile in euro. Prossimo task: **T5.4** (sync, richiesto); il resto del backlog è chiuso/non in scope.
- **Da leggere prima di riprendere:** `AGENTS.md`, `TASKS.md` (fase 5), `docs/planning/phase-5.md` §2.2.1–§2.8, §3 e §5, `docs/planning/i18n-inventory.md`, `docs/engineering/architecture.md` §9–§10, `tests/fixtures/3mf/README.md`, `docs/engineering/release.md`, ADR-0017/0018/0019/0020/0022.
- **Comandi:** `npm run dev`, `npm run check`, `npm run test:e2e`, `npm run budget`.
- **Punti aperti:** rigenerare le 36 baseline visive in CI per T5.15–T5.19, T5.12 e la barra “Aggiungi riga” e verificare la preview Vercel; definire schema/RLS e refactor async per il sync Supabase; verificare se `prediction` include il riscaldamento iniziale con una stampa reale; aggiungere un fixture Bambu committabile; misurare l’import con un file reale da 50–100 MB (il target è già verificato con un archivio sintetico). Prove manuali Safari/VoiceOver **rimandate** il 26/10/2026 (non bloccanti); checklist in `docs/engineering/manual-checks.md`. La preview Vercel richiede login SSO; la produzione è pubblica.
- **Branch remoti:** i branch di feature sono eliminati dopo il merge; su `origin` resta `main` e il tag `v1.0.0`.
- **Vincolo:** non toccare dominio, formule, `engineVersion`, snapshot o persistenza senza un nuovo ADR e i test collegati. Tema e lingua restano fuori da `AppData`; `Quote.locale` richiede la migrazione v2 pianificata in ADR-0019. Il sync Supabase introduce backend/auth: aggiornare ADR-0018 prima del codice.

---

## 9. Riferimenti

- `README.md` — onboarding e comandi.
- `PLAN.md` — visione e roadmap.
- `TASKS.md` — task e stato.
- `docs/domain/cost-model.md` — formule normative.
- `docs/engineering/architecture.md` — livelli, flussi e parser `.3mf` (§9).
- `docs/engineering/testing.md` — strategia, fixture `.3mf` e conteggi.
- `docs/engineering/deployment.md` — deploy.
- `docs/engineering/release.md` — checklist e verifiche della v1.0.0.
- `docs/planning/phase-5.md` — piano operativo di import `.3mf`, inglese, export `.xlsx` e sync.
- `docs/adr/0017-3mf-import.md` — formato di import diretto.
- `docs/adr/0018-cloud-sync-free.md` — sync opzionale e gratuito, richiesto e pianificato.
- `docs/adr/0019-english-ui.md` — interfaccia inglese e `Quote.locale`.
- `docs/design/ui-brief.md` — requisiti per la fase design.
- `docs/design/directions.md` — direzioni e scelta visiva.
- `docs/design/design-system.md` — token, componenti, accessibilità e stampa.
- `docs/adr/0015-direzione-visiva.md` — decisione sulla direzione.
