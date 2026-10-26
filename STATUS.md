# LayerCost — Stato del progetto

**Data:** 26 ottobre 2026
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

**Fase 5:** **T5.3 è chiuso** il 26/10/2026. Le fixture `.3mf` reali sono verificate per Kobra 3, Kobra X, multi-piatto e progetto non slicato; il parser ZIP/XML locale è implementato con limiti di sicurezza, Web Worker e `ThreeMfSummary`; il mapping puro propone stampante/materiali e produce `PrintLine[]`; la UI “Importa .3mf” è disponibile nel calcolatore. Performance: file reale da 22 MB compressi in 915 ms, archivio sintetico da 50 MB in ~100 ms e progetto non slicato da 15 MB rifiutato in ~100 ms. **T5.6.1–T5.6.4** (infrastruttura i18n, estrazione stringhe, formattazione, `Quote.locale` e selettore) sono chiusi; **T5.6.5** in verifica (axe e visual in inglese).

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
- Stati e rifiniture (T4.5): conferma accessibile prima di scartare o sostituire la bozza; eliminazioni con `Modal`; alert “Preventivo salvato”; vuoti con azione; microcopy su bozza, storico e preventivo non ricalcolabile.
- Stampa: intestazione, meta, righe, composizione in grigi, totali e note; PDF A4 verificato su Chromium e stampa verificata sull'engine WebKit.
- Verifiche 1.0: audit `axe` WCAG 2.2 AA su tutte le route (chiaro/scuro, desktop/mobile, menu e modali), test WebKit, regressione visiva a 1440/768/390 px, budget del bundle e nessuna richiesta esterna.

### Import `.3mf`

- **T5.3.1:** fixture reali generate con Anycubic Slicer Next 2.0.0.3 e ridotte in `tests/fixtures/3mf/`: Kobra 3, Kobra X, Kobra X a due piatti e progetto non slicato.
- **T5.3.2:** parser locale in `src/data/three-mf/` con `fflate`, limiti ZIP, rifiuto di cifratura/path traversal/DOCTYPE, fallback G-code e Web Worker; riepilogo puro `ThreeMfSummary` in `src/domain/three-mf.ts`.
- **T5.3.3:** mapping puro in `src/domain/three-mf-mapping.ts`: proposte di stampante/materiali senza creare entità, una riga per piatto, grammi aggregati per materiale, ID iniettati.
- **T5.3.4:** pulsante “Importa .3mf” nella testata e nella sezione Stampe, drag & drop, dialogo con piatti selezionabili, mappatura stampante/materiali, conferma “Aggiungi / Sostituisci” se la bozza ha contenuto, alert di esito e focus sulla prima riga importata.
- **T5.3.5:** performance verificata con un file reale esportato dallo slicer (`1026-1206-prova volpe_plate(01)_PLA_0.12_6h32m3s.gcode.3mf`, 22 MB compressi, 75 MB di G-code decompresso): dialogo in 915 ms in produzione, 70,05 g, 6h 32m, PLA, Kobra 3. Archivio sintetico da 50 MB in 95–107 ms; progetto non slicato `rayquaza+230.3mf` da 15 MB rifiutato in 100–102 ms; 18 screenshot di regressione visiva, inclusi il modale import a 1440/768/390 px. Il fixture Bambu reale resta da autorizzare.
- **Nota tecnica:** `DOMParser` non è disponibile nei Web Worker; il worker usa `@xmldom/xmldom`, il thread principale il `DOMParser` nativo.

### Interfaccia inglese (T5.6, in corso)

- **T5.6.1:** dizionari tipizzati `src/i18n/{it,en}.ts`, `translate`/`t`/`plural`, `I18nProvider` + `useI18n`, `<html lang>`, shell collegata e inventario in `docs/planning/i18n-inventory.md`.
- **T5.6.2:** estrazione completa delle schermate, dei componenti condivisi, delle etichette di dominio, della stampa e della guida; 743 chiavi in moduli per area. Errori import/share/save mappati per codice; restano fallback tecnici rari di storage/schema/dominio.
- **T5.6.3:** formattazione `Intl` legata alla locale (`useFormat`), parsing numerico con virgola o punto, `Quote.locale` e schema v2 con migrazione e backup raw. Nomi predefiniti e suffissi di copia/import localizzati; stampa, dettaglio e link usano la lingua del preventivo.
- **T5.6.4:** preferenza `layercost:locale`, selettore Italiano/English in Impostazioni, `<html lang>`, titolo e meta description aggiornati; la bozza vuota adotta la lingua, i preventivi salvati restano nella loro.
- **T5.6.5 (in verifica):** 14 scansioni axe in inglese (0 violazioni), 18 screenshot inglesi, errori di dominio e di storage mappati per codice. Restano baseline visive, merge e deploy.

### Seed

- Anycubic Kobra 3 (250 × 250 × 260 mm, senza multicolore).
- Anycubic Kobra X (260 × 260 × 260 mm, ACE 2 Pro).
- Materiali PLA, PETG, TPU, ABS, ASA, PLA-CF, PETG-CF, PVA.
- Tariffa energia €0,20/kWh, manutenzione €0,01/h, guasti 5%, ricarico 30%, arrotondamento €0,10, IVA disattivata.
- Vita utile 15.000 h (Kobra 3) e 20.000 h (Kobra X), valore residuo 20%, avvio 5 min.
- Valori marcati come stime dove non verificati.

---

## 3. Verifiche

| Verifica           | Stato                                                                              |
| ------------------ | ---------------------------------------------------------------------------------- |
| TypeScript strict  | verde                                                                              |
| oxlint             | verde                                                                              |
| Test unitari/dati  | 94 superati                                                                        |
| Test E2E           | 27 superati in CI (25 Chromium, 2 WebKit; 6 visual su CI)                          |
| Accessibilità      | axe WCAG 2.2 AA: 40 scansioni (26 it + 14 en), 0 violazioni                                        |
| Regressione visiva | 36 screenshot (18 it + 18 en) a 1440/768/390 px, baseline Linux             |
| Build produzione   | verde (~624 KB JS main + ~108 KB worker; ~208 KB gzip JS; ~35 KB CSS; ~58 KB font) |
| Budget bundle      | 273 KB gzip totali su 350 KB (limite JS 220 KB)                                    |
| CI GitHub `check`  | verde su `main`                                                                    |
| CI GitHub `e2e`    | verde su `main`                                                                    |
| Vercel produzione  | deployment completato, gate 0 FAIL / 1 WARN                                        |

Comandi:

```bash
npm run check
npm run test:e2e
npm run budget
npm run test:visual   # solo con baseline Linux; in locale i test visual sono saltati
```

---

## 4. Dati e privacy

- Dati in `localStorage`, chiave `layercost:data`, schema v2 con `Quote.locale`.
- Preferenza del tema in `layercost:theme` e lingua in `layercost:locale`, separate dai dati e non incluse nei backup.
- Prima della migrazione v1 → v2 il raw viene salvato in `layercost:backup:schema-1`.
- Nessun backend, account o analytics.
- Export/import JSON; backup automatico prima dell'import.
- Link condivisi = copia compressa del preventivo nell'URL, con la lingua del preventivo.
- Svuotare il browser cancella i dati: il backup è l'unica copia esterna.

---

## 5. Deploy

- **Live:** https://layercost.vercel.app
- Progetto Vercel collegato alla repo GitHub.
- Release **v1.0.0** del 24/10/2026, commit `cc949b3`, tag `v1.0.0`. Deploy di produzione verificato su https://layercost.vercel.app: build `index-C_5bQZYu.js` / `index-BGmXv2w6.css`, `inspect.mjs --app` a 1440/768/390 con **0 FAIL, 1 WARN** (`ragged-row`, rail sticky), prezzo 3,70 €, alert di salvataggio non ripetuto al reload, tema scuro persistente e PDF A4 chiaro (99 KB).
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
- Nessuna sincronizzazione cloud (pianificata e rimandata: ADR-0018).
- Import `.3mf` disponibile per file già slicati. Performance verificata con un file reale (22 MB compressi, 75 MB decompressi) e con un archivio sintetico da 50 MB; il fixture Bambu reale resta da autorizzare.
- Interfaccia inglese in corso: infrastruttura ed estrazione (T5.6.1–T5.6.2), formattazione/`Quote.locale` (T5.6.3) e selettore persistente (T5.6.4) pronti; restano verifiche e deploy in inglese (ADR-0019).
- Nessun magazzino bobine.
- Migrazioni schema minime (v1; rifiuto versioni future).
- Guida iniziale come checklist, non wizard multi-step.

---

## 7. Prossimi passi

1. **T5.3 — Import diretto da `.3mf`**: **chiuso** (fixture, parser ZIP/XML con worker, mapping puro, UI, performance e deploy).
2. **T5.6 — Interfaccia inglese**: T5.6.1–T5.6.4 chiusi (infrastruttura, estrazione, formattazione, `Quote.locale` e selettore); T5.6.5 in verifica: baseline visive inglesi, deploy e chiusura.
3. **T5.4 — Sync cloud**: rimandato, solo dopo 3MF e inglese e su richiesta esplicita.
4. Verificare se `prediction` include il riscaldamento iniziale confrontandola con una stampa reale.
5. Raccogliere feedback reale sulle due stampanti e sui valori di seed.
6. Eventuale magazzino bobine, actual vs estimated, PWA.

---

## 8. Ripresa rapida

- **Stato:** v1.0.0 rilasciata; `main` pulito e allineato a `origin/main`. **T5.3 chiuso** e **T5.6.1–T5.6.4 chiusi**: i18n in `src/i18n/`, provider in `src/app/`, dizionari divisi per area, formattazione locale, schema v2 e selettore lingua; T5.6.5 in verifica (baseline visive inglesi, deploy e chiusura).
- **Da leggere prima di riprendere:** `AGENTS.md`, `TASKS.md` (fase 5), `docs/planning/phase-5.md` §2.2.1–§2.8 e §3, `docs/planning/i18n-inventory.md`, `docs/engineering/architecture.md` §9–§10, `tests/fixtures/3mf/README.md`, `docs/engineering/release.md`, ADR-0017/0018/0019.
- **Comandi:** `npm run dev`, `npm run check`, `npm run test:e2e`, `npm run budget`.
- **Punti aperti:** verificare se `prediction` include il riscaldamento iniziale con una stampa reale; aggiungere un fixture Bambu committabile; misurare l’import con un file reale da 50–100 MB (il target è già verificato con un archivio sintetico). Prove manuali Safari/VoiceOver **rimandate** il 26/10/2026 (non bloccanti); checklist in `docs/engineering/manual-checks.md`. Le baseline visuali includono il modale import a 1440/768/390 px. La preview Vercel richiede login SSO; la produzione è pubblica.
- **Branch remoti:** i branch di feature sono eliminati dopo il merge; su `origin` resta `main` e il tag `v1.0.0`.
- **Vincolo:** non toccare dominio, formule, `engineVersion`, snapshot o persistenza senza un nuovo ADR e i test collegati. Tema e lingua restano fuori da `AppData`; `Quote.locale` richiede la migrazione v2 pianificata in ADR-0019.

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
- `docs/planning/phase-5.md` — piano operativo di import `.3mf`, inglese e sync.
- `docs/adr/0017-3mf-import.md` — formato di import diretto.
- `docs/adr/0018-cloud-sync-free.md` — sync opzionale e gratuito, rimandato.
- `docs/adr/0019-english-ui.md` — interfaccia inglese e `Quote.locale`.
- `docs/design/ui-brief.md` — requisiti per la fase design.
- `docs/design/directions.md` — direzioni e scelta visiva.
- `docs/design/design-system.md` — token, componenti, accessibilità e stampa.
- `docs/adr/0015-direzione-visiva.md` — decisione sulla direzione.
