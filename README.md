# LayerCost

[![CI](https://github.com/doublelayerprints/layercost/actions/workflows/ci.yml/badge.svg)](https://github.com/doublelayerprints/layercost/actions/workflows/ci.yml)

**Live:** https://layercost.vercel.app

Calcolatore di costo e prezzo per stampe 3D, pensato per due stampanti reali: **Anycubic Kobra 3** (senza multicolore) e **Anycubic Kobra X** (con ACE 2 Pro). Tutti i parametri economici sono configurabili: tariffa elettrica, prezzi dei materiali, potenza media, vita utile, manutenzione, manodopera, tasso guasti, ricarico, IVA e arrotondamento.

![Calcolatore LayerCost](docs/assets/calculator.png)

## Cosa fa

- Calcola una stampa singola o un lotto, con più materiali per riga.
- Usa i grammi totali dello slicer: supporti, brim, purge e prime tower sono già inclusi.
- Stima energia dai W medi per famiglia di materiale, non dalla potenza nominale.
- Include usura: ammortamento `(prezzo − residuo) / ore di vita` + manutenzione €/h.
- Applica una riserva guasti con valore atteso `p/(1−p)`.
- Passa dal costo al prezzo con ricarico o margine, sconti di riga e di preventivo (percentuali o a importo fisso), arrotondamento e IVA opzionale.
- Salva preventivi con snapshot dei prezzi usati; “Aggiorna prezzi” crea una copia.
- Associa un colore al filamento di ogni stampa e ritrovalo in dettaglio e in stampa.
- Confronta Kobra 3 e Kobra X sullo stesso lavoro.
- Importa un `.3mf` già slicato con anteprima dei piatti, mappatura di stampante e materiali e import nel preventivo.
- Esporta/importa JSON, esporta preventivi, righe e materiali in `.xlsx`, condivide un preventivo via link, stampa il PDF dal browser.
- Mostra l'utile in euro nel calcolatore e nel dettaglio; link condiviso e stampa/PDF per il cliente mostrano solo prezzi, IVA e note. La stampa interna con costi e margine è un'azione separata.
- Divide il prezzo netto in costo pieno e guadagno con due barre, e apre un preventivo cliccando tutta la riga nella lista.
- Comprime le card del calcolatore e le singole stampe in righe compatte con drop down, con una sintesi sempre leggibile.
- Tema chiaro, scuro o di sistema e lingua italiana o inglese, con selettori rapidi in fondo alla sidebar; la stampa è sempre in nero su bianco.
- Funziona interamente nel browser: nessun backend, nessun account, nessun analytics. La pagina “Richiedi accesso” invia a Formspree solo su azione esplicita (ADR-0026).
- La root è una landing pubblica in italiano e inglese, pre-renderizzata in `index.html` per i crawler e per chi non ha JavaScript; il calcolatore vive su `/#/calculator` e `/#/welcome` riapre la landing anche da utenti esistenti (ADR-0029).

## Stack

React 19 + TypeScript strict + Vite 8 + Tailwind CSS 4 + Zustand + Zod. Test: Vitest, fast-check, Playwright. Deploy: Vercel, con build statica portabile.

## Avvio

```bash
npm install
npm run dev
```

Apri `http://localhost:5173` per la landing pubblica, `http://localhost:5173/#/calculator` per il calcolatore e `http://localhost:5173/#/welcome` per rivedere la landing anche da utenti esistenti.

## Comandi

```bash
npm run dev          # sviluppo
npm run build        # build di produzione
npm run preview      # anteprima build
npm run capture:landing # screenshot reali della landing (richiede Chrome)
npm run typecheck    # TypeScript
npm run lint         # oxlint
npm run test         # unit + dati
npm run test:e2e     # build + Playwright (Chromium + WebKit)
npm run test:visual  # regressione visiva (baseline Linux)
npm run budget       # budget del bundle
npm run check        # typecheck + lint + test + build + budget
npm run db:start     # Supabase locale (richiede Docker)
npm run db:reset     # migrazioni + seed locali
npm run db:test      # test pgTAP/RLS
npm run db:types     # rigenera i tipi TypeScript dal DB locale
npm run test:e2e:auth # build con Supabase locale + login/logout E2E
npm run test:e2e:sync # build + due contesti, offline e conflitto (azzera il DB locale)
```

## Dati e backup

I dati vivono in `localStorage` (`layercost:data`). Svuotare i dati del browser cancella anche i preventivi. Tema (`layercost:theme`) e lingua (`layercost:locale`) sono preferenze separate e non entrano nei backup.

- **Esporta backup** da Impostazioni: file `layercost-backup-YYYY-MM-DD.json`.
- **Esporta .xlsx** da Preventivi o Impostazioni: file `layercost-quotes-YYYY-MM-DD.xlsx` con tre fogli (Preventivi, Righe, Materiali). È pensato per analisi esterne e non sostituisce il backup JSON.
- **Importa backup** sostituisce i dati, ma prima scarica automaticamente una copia di quelli correnti.
- I link condivisi contengono una copia del preventivo nell'URL: non sono un backup completo e non contengono la configurazione.

I valori di partenza di prezzi, potenze e vita utile sono **stime modificabili**. La guida iniziale porta a confermare i quattro numeri che contano: prezzo stampanti, vita utile, tariffa kWh, prezzi bobine.

## Cloud opzionale

La build senza variabili Supabase resta **local-only**: login, sync e chunk cloud non vengono caricati. Per provare il cloud in locale:

1. `npm run db:start`
2. copia i valori `API_URL` e `PUBLISHABLE_KEY` da `npx supabase status -o env` in `.env.local` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`)
3. `npm run dev` e apri `#/login`

Gli account sono creati dall'amministratore; la registrazione è disabilitata. Con `VITE_AUTH_GOOGLE_ENABLED=true` compare anche “Continua con Google”; il flag è pubblico e va attivato solo dopo aver configurato il provider Google in Supabase (ADR-0025). Il Client Secret non entra mai nel repository, nel bundle o su Vercel: sta solo nel dashboard Supabase e, per lo sviluppo locale, in una variabile d'ambiente non committata.

Chi non ha un account può aprire `#/request-access` e inviare una richiesta all'amministratore. Il form usa **Formspree Free** con `VITE_ACCESS_REQUEST_ENDPOINT` (endpoint pubblico, non un segreto) e non crea utenti o account: l'amministratore legge la richiesta e crea l'utente manualmente. Il richiedente non riceve un'email automatica: la conferma è nella pagina; la notifica arriva solo all'amministratore con `_replyto` impostato all'email indicata. Formspree conserva le submission per 30 giorni; l'email dell'amministratore viene cancellata dopo la decisione o entro 12 mesi. Nessun analytics, cookie first-party o newsletter. Dettagli in `docs/engineering/access-requests.md` e ADR-0026.

Con l'account attivo, configurazione e preventivi vivono nel **workspace condiviso**; bozza, tema e lingua restano locali. Le modifiche offline entrano in una coda persistita e vengono inviate al ritorno della rete; se lo stesso dato è cambiato su un altro dispositivo, l'app mostra un conflitto e chiede come risolverlo. Il primo accesso propone di importare i dati locali dopo aver scaricato un backup JSON. Al logout la copia locale dei dati cloud viene rimossa (o conservata se ci sono modifiche ancora in sospeso). Il database locale viene azzerato da `npm run test:e2e:sync`, non dalla build normale.

## Deploy

**Live:** https://layercost.vercel.app

Repo GitHub: **https://github.com/doublelayerprints/layercost** (privata).

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/doublelayerprints/layercost)

Il progetto è una SPA statica con hash routing. Su Vercel:

- Framework preset: Vite
- Build: `npm run build`
- Output: `dist`
- Nessuna variabile d'ambiente obbligatoria; per il cloud opzionale `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`, più `VITE_AUTH_GOOGLE_ENABLED=true` per mostrare il login Google (pubblico, nessun segreto) e `VITE_ACCESS_REQUEST_ENDPOINT` per il form Formspree della pagina “Richiedi accesso” (pubblico, nessun segreto)

Sono possibili anche GitHub Pages, Netlify e Cloudflare Pages; vedi `docs/engineering/deployment.md`.

La root è indicizzabile: `index.html` contiene la landing italiana pre-renderizzata, canonical, Open Graph e Twitter; `public/robots.txt` usa `Allow: /` e `public/sitemap.xml` elenca la root. Non c’è più `X-Robots-Tag: noindex`. L’inglese è disponibile nell’interfaccia, ma l’indicizzazione inglese separata è una decisione futura.

## Documentazione

| File                                    | Contenuto                                              |
| --------------------------------------- | ------------------------------------------------------ |
| `STATUS.md`                             | Stato attuale, test, deploy e limiti                   |
| `PLAN.md`                               | Visione, scope, architettura, roadmap                  |
| `TASKS.md`                              | Task e stato di avanzamento                            |
| `AGENTS.md`                             | Regole per il coding agent                             |
| `docs/domain/cost-model.md`             | Specifica normativa del calcolo                        |
| `docs/domain/data-model.md`             | Schema e invarianti                                    |
| `docs/domain/golden-cases.md`           | Esempi numerici e test                                 |
| `docs/domain/sources.md`                | Fonti su stampanti e potenze                           |
| `docs/engineering/`                     | Architettura, persistenza, test, release, deploy       |
| `docs/engineering/workspace-runbook.md` | Workspace condiviso: utenti, membership, audit         |
| `docs/planning/phase-5.md`              | Piano fase 5: `.3mf`, inglese, `.xlsx`, sync           |
| `docs/planning/evolutive.md`            | Google login, tetti utenti/preventivi, landing, multi-workspace |
| `docs/planning/evo-5-landing-page.md`   | Piano e acceptance della landing pubblica              |
| `docs/design/ui-brief.md`               | Requisiti per la fase design                           |
| `docs/design/directions.md`             | Direzioni e scelta visiva                              |
| `docs/design/design-system.md`          | Token, componenti, accessibilità                       |
| `docs/adr/`                             | 29 decisioni architetturali                            |

## Stato

- **v1.0.0:** fasi 0–4 complete e rilasciate; tag `v1.0.0` su `cc949b3`.
- **Design:** direzione A — Strato, design system, redesign, stati e dark mode.
- **Verifiche:** 249 unitari, 68 E2E (50 default incl. 11 landing + 12 visual + 3 auth + 3 sync), 33 test pgTAP RLS, 42 screenshot di regressione, 68 scansioni axe con 0 violazioni, smoke test di produzione, keep-alive, backup cifrato e budget.
- **Fuori v1:** sync cloud (richiesto), magazzino bobine e PWA (non in scope attuale).
- **Landing:** EVO-5 implementata il 29/10/2026 e distribuita il 30/10/2026 (ADR-0029): route `/#/`, `/#/calculator`, `/#/welcome`, pre-render SEO, contenuti IT/EN, 249 unitari, 68 E2E, 42 screenshot; smoke di produzione verde.
- **Fase 5:** import `.3mf` completo (T5.3); interfaccia inglese chiusa (T5.6.1–T5.6.5), export `.xlsx` (T5.12), preventivi modificabili fino all’invio e calcolatore a card (T5.13–T5.14), preferenze rapide, azioni in alto, colore filamento, utile e vista cliente, sconti e card comprimibili (T5.15–T5.21); sync gratuito richiesto (Supabase Free, email/password, workspace condiviso; ADR-0024), piano pronto, **T5.4.1 chiuso** (repository async), **T5.4.2 chiuso** (schema, RLS, trigger, mapper), **T5.4.3 chiuso** (auth email/password), **T5.4.4 chiuso** (sync, outbox e conflitti), **T5.4.5 chiuso** (workspace condiviso, runbook e audit) e **T5.4.6 chiuso** (keep-alive, backup, CI database, budget e deploy). Il cloud è **live** su https://layercost.vercel.app con Supabase Free EU e due account owner. Piano in `docs/planning/t5.4-cloud-sync.md`, runbook in `docs/engineering/workspace-runbook.md`, backup in `docs/engineering/backup-restore.md`, riepilogo in `docs/planning/phase-5.md`, inventario in `docs/planning/i18n-inventory.md`.
- **Repo GitHub:** https://github.com/doublelayerprints/layercost (privata).
- **CI:** verde su GitHub (`check` + `e2e`).
- **Deploy Vercel:** live su https://layercost.vercel.app, collegato alla repo; cloud Supabase attivo con due account owner.

La directory locale e il repository GitHub sono `layercost`; il nome del prodotto è **LayerCost**. Per lo stato aggiornato vedi `STATUS.md`.

## Licenza

Progetto personale. Licenza da definire.
